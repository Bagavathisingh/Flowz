import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import Workspace from '../models/Workspace.js';
import WorkspaceMember from '../models/WorkspaceMember.js';
import Workflow from '../models/Workflow.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// ─── Middleware: resolve & authorize workspace ────────────────────────────────
export const requireWorkspaceMember = async (req, res, next) => {
    const { workspaceId } = req.params;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const member = await WorkspaceMember.findOne({
        workspaceId,
        userId: req.user.id,
        status: 'active'
    });
    if (!member) return res.status(403).json({ error: 'Not a member of this workspace' });

    req.workspaceMember = member;
    req.workspaceRole = member.role;
    next();
};

export const requireWorkspaceAdmin = async (req, res, next) => {
    await requireWorkspaceMember(req, res, () => {
        if (!['owner', 'admin'].includes(req.workspaceRole)) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
};

// ── GET /workspaces — list all workspaces current user belongs to ─────────────
router.get('/', async (req, res) => {
    try {
        const memberships = await WorkspaceMember.find({
            userId: req.user.id,
            status: 'active'
        }).populate('workspaceId');

        const workspaces = memberships.map(m => ({
            ...m.workspaceId.toObject(),
            role: m.role
        }));

        res.json(workspaces);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /workspaces — create a new workspace ─────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Workspace name is required' });

        const workspace = await new Workspace({ name, ownerId: req.user.id }).save();

        // Auto-add creator as owner member
        const user = await User.findById(req.user.id);
        await new WorkspaceMember({
            workspaceId: workspace._id,
            userId:      req.user.id,
            email:       user.email,
            role:        'owner',
            status:      'active'
        }).save();

        res.status(201).json(workspace);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ── GET /workspaces/:workspaceId — workspace detail with members ──────────────
router.get('/:workspaceId', requireWorkspaceMember, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.workspaceId);
        const members = await WorkspaceMember.find({ workspaceId: req.params.workspaceId })
            .populate('userId', 'email');
        res.json({ ...workspace.toObject(), members });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /workspaces/:workspaceId — delete workspace (owner only) ───────────
router.delete('/:workspaceId', requireWorkspaceMember, async (req, res) => {
    try {
        if (req.workspaceRole !== 'owner') return res.status(403).json({ error: 'Only the owner can delete a workspace' });
        await Workspace.findByIdAndDelete(req.params.workspaceId);
        await WorkspaceMember.deleteMany({ workspaceId: req.params.workspaceId });
        await Workflow.deleteMany({ workspaceId: req.params.workspaceId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /workspaces/:workspaceId/invite — invite by email ───────────────────
router.post('/:workspaceId/invite', requireWorkspaceAdmin, async (req, res) => {
    try {
        const { email, role = 'editor' } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const workspace = await Workspace.findById(req.params.workspaceId);
        const inviteToken = crypto.randomBytes(32).toString('hex');

        // Find existing user by email (optional)
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        // Upsert WorkspaceMember row
        await WorkspaceMember.findOneAndUpdate(
            { workspaceId: req.params.workspaceId, email: email.toLowerCase() },
            {
                workspaceId: req.params.workspaceId,
                userId: existingUser?._id || null,
                email: email.toLowerCase(),
                role,
                status: 'pending',
                inviteToken,
                invitedBy: req.user.id
            },
            { upsert: true, new: true }
        );

        // Send invite email (using Ethereal test SMTP or real SMTP)
        try {
            const testAccount = await nodemailer.createTestAccount();
            const transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email', port: 587, secure: false,
                auth: { user: testAccount.user, pass: testAccount.pass }
            });
            const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/accept?token=${inviteToken}`;
            const info = await transporter.sendMail({
                from:    '"Flowz" <noreply@flowz.app>',
                to:      email,
                subject: `You've been invited to ${workspace.name} on Flowz`,
                html:    `
                    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;border:1px solid #4F46E5;border-radius:16px">
                        <h2 style="color:#4F46E5">You're invited!</h2>
                        <p>You've been invited to join <strong>${workspace.name}</strong> as a <strong>${role}</strong>.</p>
                        <a href="${acceptUrl}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#4F46E5;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">Accept Invitation</a>
                        <p style="margin-top:24px;color:#64748b;font-size:13px">If you didn't expect this, ignore this email.</p>
                    </div>`
            });
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log(`[INVITE] Email preview: ${previewUrl}`);
            res.status(201).json({ success: true, inviteToken, previewUrl });
        } catch (emailErr) {
            console.error('[INVITE] Email failed:', emailErr.message);
            // Still succeed — return token so caller can share manually
            res.status(201).json({ success: true, inviteToken, emailError: emailErr.message });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /workspaces/invite/accept — accept an invite token ──────────────────
router.post('/invite/accept', requireAuth, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        const member = await WorkspaceMember.findOne({ inviteToken: token, status: 'pending' });
        if (!member) return res.status(404).json({ error: 'Invalid or expired invite token' });

        const user = await User.findById(req.user.id);
        if (member.email !== user.email.toLowerCase()) {
            return res.status(403).json({ error: 'This invite is for a different email address' });
        }

        member.userId      = req.user.id;
        member.status      = 'active';
        member.inviteToken = null;
        await member.save();

        res.json({ success: true, workspaceId: member.workspaceId, role: member.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /workspaces/:workspaceId/members — list members ──────────────────────
router.get('/:workspaceId/members', requireWorkspaceMember, async (req, res) => {
    try {
        const members = await WorkspaceMember.find({ workspaceId: req.params.workspaceId })
            .populate('userId', 'email')
            .sort({ role: 1, createdAt: 1 });
        res.json(members);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /workspaces/:workspaceId/members/:memberId — remove member ─────────
router.delete('/:workspaceId/members/:memberId', requireWorkspaceAdmin, async (req, res) => {
    try {
        const member = await WorkspaceMember.findOne({ _id: req.params.memberId, workspaceId: req.params.workspaceId });
        if (!member) return res.status(404).json({ error: 'Member not found' });
        if (member.role === 'owner') return res.status(400).json({ error: 'Cannot remove the workspace owner' });
        await WorkspaceMember.findByIdAndDelete(req.params.memberId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /workspaces/:workspaceId/workflows — scoped workflow list ─────────────
router.get('/:workspaceId/workflows', requireWorkspaceMember, async (req, res) => {
    try {
        const workflows = await Workflow.find({ workspaceId: req.params.workspaceId }).sort({ createdAt: -1 });
        res.json(workflows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
