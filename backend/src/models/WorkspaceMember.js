import mongoose from 'mongoose';

const workspaceMemberSchema = new mongoose.Schema({
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false   // null = invited but not yet registered
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'editor', 'viewer'],
        default: 'editor'
    },
    status: {
        type: String,
        enum: ['active', 'pending', 'revoked'],
        default: 'pending'
    },
    inviteToken: {
        type: String,
        default: null
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Unique per workspace+email combo
workspaceMemberSchema.index({ workspaceId: 1, email: 1 }, { unique: true });

const WorkspaceMember = mongoose.model('WorkspaceMember', workspaceMemberSchema);
export default WorkspaceMember;
