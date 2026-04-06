import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import apiRoutes from './routes/api.js';
import authRoutes from './routes/authRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import { registerSchedule, intervalToCron } from './triggers/scheduler.js';
import { runWorkflow } from './engine/index.js';
import Workflow from './models/Workflow.js';
import { initSocketParams } from './config/socket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Initialize Global Socket Server attached to HTTP Server
export const io = initSocketParams(httpServer);



// ── Fix #4: Locked CORS — replaces wildcard app.use(cors()) ───────────────────
// In development, VITE_FRONTEND_URL is typically http://localhost:5173
// In production, set FRONTEND_URL in your Render/deployment environment
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
        callback(new Error(`CORS policy: origin ${origin} is not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '2mb' }));

// ── Health check (public) ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Flowz Engine Running' });
});

// ── Auth routes (public — MUST be before /api which is protected) ──────────────
app.use('/api/auth', authRoutes);

// ── Protected API routes ───────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Workspace routes ───────────────────────────────────────────────────────────
app.use('/api/workspaces', workspaceRoutes);

// ── Startup ────────────────────────────────────────────────────────────────────
console.log('--- Flowz Backend Starting ---');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || 5000);
console.log('Allowed CORS origins:', allowedOrigins);
console.log('Base URL:', (process.env.BASE_URL || "").trim() || 'No BASE_URL set (using fallback)');

if (!process.env.MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI is not defined in environment variables.');
}
if (!process.env.JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET is not defined. Auth will not work.');
}
if (!process.env.MASTER_ENCRYPTION_KEY) {
    console.warn('WARNING: MASTER_ENCRYPTION_KEY is not set. Secrets vault will not work.');
}

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
    // Restore all scheduled workflows that were alive before server restart
    try {
        const scheduledWorkflows = await Workflow.find({
            isActive: true,
            'nodes.type': 'schedule_trigger'
        }).lean();

        let restored = 0;
        for (const wf of scheduledWorkflows) {
            const trigger = wf.nodes.find(n => n.type === 'schedule_trigger' || n.data?.type === 'schedule_trigger');
            const interval = trigger?.data?.config?.interval;
            if (!interval) continue;

            const cronExpr = intervalToCron(interval);
            registerSchedule(wf._id.toString(), cronExpr, async (ctx) => {
                try {
                    await runWorkflow(wf.nodes, wf.edges, ctx.trigger.payload);
                    console.log(`[SCHEDULER] Workflow "${wf.name}" (${wf._id}) ran successfully.`);
                } catch (e) {
                    console.error(`[SCHEDULER] Workflow "${wf.name}" failed:`, e.message);
                }
            });
            restored++;
        }
        if (restored > 0) {
            console.log(`[SCHEDULER] Restored ${restored} cron schedule(s) from database.`);
        }
    } catch (e) {
        console.error('[SCHEDULER] Failed to restore schedules on boot:', e.message);
    }

    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
});
