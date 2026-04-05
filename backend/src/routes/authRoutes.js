/**
 * Auth Routes — /api/auth
 * Public endpoints (no requireAuth). Mounts BEFORE protected routes in index.js.
 *
 * POST /api/auth/register  → create account, returns JWT
 * POST /api/auth/login     → validate credentials, returns JWT
 *
 * The JWT payload is: { id: user._id, email }
 * Token lifetime: 7 days
 * Frontend: store token in localStorage, send as:
 *   Authorization: Bearer <token>
 */
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';

const router = express.Router();

// Strict rate limit on auth endpoints — 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

router.use(authLimiter);

// ── POST /api/auth/register ────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'password must be at least 8 characters' });
        }

        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await new User({
            email: email.toLowerCase().trim(),
            passwordHash
        }).save();

        const token = jwt.sign(
            { id: user._id.toString(), email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: { id: user._id, email: user.email, createdAt: user.createdAt }
        });
    } catch (err) {
        console.error('[AUTH] Register error:', err.message);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        // Constant-time comparison to prevent user enumeration
        const isValid = user
            ? await bcrypt.compare(password, user.passwordHash)
            : await bcrypt.compare(password, '$2a$12$invalidhashfortimingprotection00000000000000000');

        if (!user || !isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user._id.toString(), email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user._id, email: user.email }
        });
    } catch (err) {
        console.error('[AUTH] Login error:', err.message);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

export default router;
