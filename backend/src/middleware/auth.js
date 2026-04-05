/**
 * requireAuth Middleware
 * Validates a Bearer JWT on every protected request.
 * Attaches req.user = { id, email } on success.
 *
 * Usage in api.js:
 *   import { requireAuth } from '../middleware/auth.js';
 *   router.use(requireAuth); // protects all routes declared after this line
 *
 * Frontend must send:
 *   Authorization: Bearer <token>
 */
import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authorization header missing or malformed. Expected: Bearer <token>'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token not provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id, email: decoded.email };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token has expired. Please log in again.' });
        }
        return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }
};
