import express from 'express';
import fs from 'fs';
import axios from 'axios';
import { generateWorkflowConfig, explainErrorLog, modifyWorkflowConfig, chatDebug } from '../controllers/aiController.js';
import { runWorkflow } from '../engine/index.js';
import Workflow from '../models/Workflow.js';
import ExecutionLog from '../models/ExecutionLog.js';
import { registerSchedule, stopSchedule, intervalToCron } from '../triggers/scheduler.js';
import { registerChatTrigger, sendChatMessage, getChatHistory, addBotMessage } from '../triggers/chatStore.js';
import { requireAuth } from '../middleware/auth.js';
import secretRoutes from './secretRoutes.js';

const router = express.Router();

router.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
});

// ── Public Trigger Routes (No Auth) ──────────────────────────────────────────
router.get('/trigger/test', (req, res) => res.json({ message: 'Trigger routes are active' }));

router.post('/trigger/webhook/:workflowId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });
        const result = await runWorkflow(wf.nodes, wf.edges, req.body || {}, wf.userId, wf._id.toString(), 'webhook');
        res.json({ success: true, workflowId: req.params.workflowId, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/trigger/webhook/:workflowId/info', async (req, res) => {
    const baseUrl = (process.env.BASE_URL || "").trim() || 
                    (req.get('x-forwarded-proto') && req.get('x-forwarded-host') 
                        ? `${req.get('x-forwarded-proto')}://${req.get('x-forwarded-host')}` 
                        : `${req.protocol}://${req.get('host')}`);
    res.json({ url: `${baseUrl.replace(/\/$/, '')}/api/trigger/webhook/${req.params.workflowId}`, method: 'POST' });
});

router.post('/trigger/form/:workflowId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });
        const result = await runWorkflow(wf.nodes, wf.edges, { source: 'form', form_data: req.body }, wf.userId, wf._id.toString(), 'form');
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/trigger/form/:workflowId/info', async (req, res) => {
    const wf = await Workflow.findById(req.params.workflowId);
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    const baseUrl = (process.env.BASE_URL || "").trim() || 
                    (req.get('x-forwarded-proto') && req.get('x-forwarded-host') 
                        ? `${req.get('x-forwarded-proto')}://${req.get('x-forwarded-host')}` 
                        : `${req.protocol}://${req.get('host')}`);
    res.json({ submission_url: `${baseUrl.replace(/\/$/, '')}/api/trigger/form/${req.params.workflowId}`, method: 'POST' });
});

router.post('/trigger/sub-workflow/:workflowId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Sub-workflow not found' });
        const result = await runWorkflow(wf.nodes, wf.edges, { source: 'sub_workflow', caller_payload: req.body }, wf.userId, wf._id.toString(), 'sub_workflow');
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/trigger/chat/:workflowId', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });

        const workflowId = req.params.workflowId;

        // Register trigger if this is the first message
        if (!getChatHistory(workflowId).length) {
            registerChatTrigger(workflowId, async (ctx) => {
                try {
                    const result = await runWorkflow(wf.nodes, wf.edges, ctx.trigger.payload, wf.userId, wf._id.toString(), 'chat');
                    const lastOutput = Object.values(result.nodeResults || {}).pop();
                    const botReply = lastOutput?.response || lastOutput?.output || lastOutput?.result || JSON.stringify(lastOutput);
                    const reply = botReply || 'Workflow completed.';
                    addBotMessage(workflowId, reply);

                    // Push the bot reply to the client via Socket.IO (no polling needed)
                    const { getIO } = await import('../config/socket.js');
                    const io = getIO();
                    if (io) io.to(`workflow_${workflowId}`).emit('chat:reply', { role: 'bot', content: reply, timestamp: new Date().toISOString() });
                } catch (e) {
                    const errMsg = `Error: ${e.message}`;
                    addBotMessage(workflowId, errMsg);
                    const { getIO } = await import('../config/socket.js');
                    const io = getIO();
                    if (io) io.to(`workflow_${workflowId}`).emit('chat:reply', { role: 'bot', content: errMsg, timestamp: new Date().toISOString() });
                }
            });
        }

        // Send user message and immediately return 202 — reply comes via socket
        sendChatMessage(workflowId, message, 'user');
        const history = getChatHistory(workflowId);
        res.status(202).json({ success: true, status: 'processing', history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/trigger/chat/:workflowId/history', (req, res) => res.json({ history: getChatHistory(req.params.workflowId) }));

router.post('/trigger/app-event/:workflowId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });

        const telegramMsg = req.body?.message;
        console.log(`[TELEGRAM] Received message for WF ${req.params.workflowId}: "${telegramMsg?.text || '(no text)'}"`);
        const payload = { source: 'app_event', raw: req.body, text: telegramMsg?.text, from: telegramMsg?.from, chat_id: telegramMsg?.chat?.id };
        res.json({ ok: true });

        (async () => {
            console.log(`[TELEGRAM] Starting background workflow execution for ${wf.name}...`);
            try {
                const result = await runWorkflow(wf.nodes, wf.edges, payload, wf.userId, wf._id.toString(), 'app_event');
                const appTrigger = wf.nodes?.find(n => n.data?.type === 'app_event');
                const botToken = appTrigger?.data?.config?.telegram_token;
                const chatId = payload.chat_id || appTrigger?.data?.config?.chat_id;

                let reply;
                const aiNode = wf.nodes.find(n => n.data?.type === 'ai_model');
                if (aiNode && result.nodeResults[aiNode.id]) reply = result.nodeResults[aiNode.id].output;
                if (!reply && result.nodeLogs?.length) reply = result.nodeLogs[result.nodeLogs.length - 1].result?.output;
                if (!reply) reply = result.status === 'success' ? 'Workflow finished.' : `Error: ${result.error}`;

                if (botToken && chatId) {
                    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: chatId, text: String(reply) }).catch(err => console.error('[TELEGRAM] Error:', err.message));
                }
            } catch (e) { console.error('[APP EVENT ERROR]', e.message); }
        })();
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/trigger/app-event/:workflowId/register-telegram', async (req, res) => {
    try {
        const { telegram_token } = req.body;
        // Ensure no trailing slash in baseUrl
        const baseUrl = (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).trim().replace(/\/+$/, '');
        // Ensure no leading slash in workflowId
        const workflowId = req.params.workflowId.replace(/^\/+/, '');
        const webhookUrl = `${baseUrl}/api/trigger/app-event/${workflowId}`;
        
        console.log(`[TELEGRAM] Registering webhook: ${webhookUrl}`);
        const tgRes = await axios.post(`https://api.telegram.org/bot${telegram_token}/setWebhook`, { url: webhookUrl });
        res.json({ success: true, webhookUrl, telegram: tgRes.data });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/trigger/error/:workflowId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });
        const result = await runWorkflow(wf.nodes, wf.edges, { source: 'error_trigger', error: req.body?.error }, wf.userId, wf._id.toString(), 'api');
        res.json({ success: true, result });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ── Protected Routes (Require Auth) ──────────────────────────────────────────
router.use(requireAuth);
router.use('/secrets', secretRoutes);

router.post('/ai/generate-workflow', generateWorkflowConfig);
router.post('/ai/modify-workflow', modifyWorkflowConfig);
router.post('/ai/explain-error', explainErrorLog);
router.post('/ai/chat-debug', chatDebug);

router.get('/workflows/:id/runs', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.id);
        if (!wf || wf.userId.toString() !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        const runs = await ExecutionLog.find({ workflowId: req.params.id })
            .sort({ createdAt: -1 })
            .select('-nodeLogs.input -nodeLogs.result') // Omit heavy payload unless requested
            .limit(50);

        res.json(runs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/workflows/:id/runs/:runId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.id);
        if (!wf || wf.userId.toString() !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        const run = await ExecutionLog.findOne({ _id: req.params.runId, workflowId: req.params.id });
        if (!run) return res.status(404).json({ error: 'Run not found' });

        res.json(run);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/workflows/:id/execute', async (req, res) => {
    try {
        const { nodes, edges, payload } = req.body;
        if (!nodes || !edges) return res.status(400).json({ error: 'Nodes and edges are required' });
        const result = await runWorkflow(nodes, edges, payload || {}, req.user.id, req.params.id, 'api');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/workflows', async (req, res) => {
    try {
        const workflows = await Workflow.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(workflows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/workflows', async (req, res) => {
    try {
        const { name, nodes, edges } = req.body;
        const saved = await new Workflow({ name, nodes, edges, userId: req.user.id }).save();

        const scheduleTrigger = nodes?.find(n => n.data?.type === 'schedule_trigger');
        if (scheduleTrigger && scheduleTrigger.data?.config?.interval) {
            const cronExpr = intervalToCron(scheduleTrigger.data.config.interval);
            registerSchedule(saved._id.toString(), cronExpr, async (ctx) => {
                try {
                    await runWorkflow(nodes, edges, ctx.trigger.payload, req.user.id, saved._id.toString(), 'schedule');
                } catch (e) {
                    console.error(`[SCHEDULER] Workflow ${saved._id} failed:`, e.message);
                }
            });
        }

        const chatTrigger = nodes?.find(n => n.data?.type === 'chat_message');
        if (chatTrigger) {
            registerChatTrigger(saved._id.toString(), async (ctx) => {
                try {
                    const result = await runWorkflow(nodes, edges, ctx.trigger.payload, req.user.id, saved._id.toString(), 'chat');
                    const lastOutput = Object.values(result.nodeResults || {}).pop();
                    const botReply = lastOutput?.response || lastOutput?.output || lastOutput?.result || JSON.stringify(lastOutput);
                    const reply = botReply || 'Workflow completed.';
                    addBotMessage(saved._id.toString(), reply);
                } catch (e) {
                    addBotMessage(saved._id.toString(), `Error: ${e.message}`);
                }
            });
        }

        const baseUrl = (process.env.BASE_URL || "").trim() || 
                        (req.get('x-forwarded-proto') && req.get('x-forwarded-host') 
                            ? `${req.get('x-forwarded-proto')}://${req.get('x-forwarded-host')}` 
                            : `${req.protocol}://${req.get('host')}`);
        res.status(201).json({ ...saved.toObject(), baseUrl: baseUrl.replace(/\/$/, '') });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/workflows/:id', async (req, res) => {
    try {
        const { name, nodes, edges } = req.body;
        const wf = await Workflow.findById(req.params.id);
        
        if (!wf || wf.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied or workflow not found' });
        }

        wf.name = name || wf.name;
        wf.nodes = nodes || wf.nodes;
        wf.edges = edges || wf.edges;
        wf.updatedAt = Date.now();
        const saved = await wf.save();

        // Refresh triggers
        stopSchedule(req.params.id);
        const scheduleTrigger = nodes?.find(n => n.data?.type === 'schedule_trigger');
        if (scheduleTrigger && scheduleTrigger.data?.config?.interval) {
            const cronExpr = intervalToCron(scheduleTrigger.data.config.interval);
            registerSchedule(saved._id.toString(), cronExpr, async (ctx) => {
                try {
                    await runWorkflow(nodes, edges, ctx.trigger.payload, req.user.id, saved._id.toString(), 'schedule');
                } catch (e) {
                    console.error(`[SCHEDULER] Workflow update failed:`, e.message);
                }
            });
        }

        const baseUrl = (process.env.BASE_URL || "").trim() || 
                        (req.get('x-forwarded-proto') && req.get('x-forwarded-host') 
                            ? `${req.get('x-forwarded-proto')}://${req.get('x-forwarded-host')}` 
                            : `${req.protocol}://${req.get('host')}`);
        res.json({ ...saved.toObject(), baseUrl: baseUrl.replace(/\/$/, '') });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/workflows/:id', async (req, res) => {
    try {
        stopSchedule(req.params.id);
        await Workflow.findByIdAndDelete(req.params.id);
        res.json({ message: 'Workflow deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/trigger/manual/:workflowId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });
        const result = await runWorkflow(wf.nodes, wf.edges, { source: 'manual', ...req.body }, wf.userId, wf._id.toString(), 'manual');
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/trigger/schedule/:workflowId', async (req, res) => {
    try {
        const { interval } = req.body;
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });

        const cronExpr = intervalToCron(interval || 3600);
        registerSchedule(req.params.workflowId, cronExpr, async (ctx) => {
            await runWorkflow(wf.nodes, wf.edges, ctx.trigger.payload, wf.userId, wf._id.toString(), 'schedule');
        });

        res.json({ success: true, cronExpression: cronExpr });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/trigger/schedule/:workflowId', (req, res) => {
    stopSchedule(req.params.workflowId);
    res.json({ success: true });
});

export default router;
