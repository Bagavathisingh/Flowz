/**
 * Secrets Vault Routes — /api/secrets
 * All routes require authentication (requireAuth applied in api.js).
 *
 * Endpoints:
 *   POST   /api/secrets          → create or overwrite a secret
 *   GET    /api/secrets          → list all secret names (NO values ever returned)
 *   DELETE /api/secrets/:id      → delete a secret by MongoDB _id
 *
 * Usage in workflow nodes:
 *   Set node config to: {{secret.MY_OPENAI_KEY}}
 *   The engine resolves this at runtime via decryptSecret()
 */
import express from 'express';
import { encrypt } from '../services/crypto.js';
import Secret from '../models/Secret.js';

const router = express.Router();

// POST /api/secrets — create or overwrite a named secret
router.post('/', async (req, res) => {
    try {
        const { name, value } = req.body;

        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: '`name` is required (e.g. "MY_OPENAI_KEY")' });
        }
        if (!value || typeof value !== 'string') {
            return res.status(400).json({ error: '`value` is required' });
        }
        if (!/^[A-Z0-9_]+$/i.test(name)) {
            return res.status(400).json({ error: 'Secret name must contain only letters, numbers, and underscores' });
        }

        const encrypted = encrypt(value);
        const normalizedName = name.toUpperCase().trim();

        const secret = await Secret.findOneAndUpdate(
            { name: normalizedName, userId: req.user.id },
            { ...encrypted },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Never return the encrypted payload — just confirmation
        res.status(201).json({
            id: secret._id,
            name: secret.name,
            createdAt: secret.createdAt,
            updatedAt: secret.updatedAt,
            message: 'Secret saved successfully. The value is encrypted and cannot be retrieved.'
        });
    } catch (err) {
        console.error('[SECRETS] Create error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/secrets — list secret names only (values NEVER exposed)
router.get('/', async (req, res) => {
    try {
        const secrets = await Secret.find(
            { userId: req.user.id },
            'name createdAt updatedAt' // explicitly exclude iv, ciphertext, tag
        ).sort({ name: 1 });

        res.json(secrets);
    } catch (err) {
        console.error('[SECRETS] List error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/secrets/:id — delete by MongoDB _id
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Secret.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id // scoped to caller — can't delete other users' secrets
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Secret not found or access denied' });
        }

        res.json({ success: true, message: `Secret "${deleted.name}" deleted.` });
    } catch (err) {
        console.error('[SECRETS] Delete error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

export default router;
