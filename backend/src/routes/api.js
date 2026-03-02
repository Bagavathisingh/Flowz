import express from 'express';
import axios from 'axios';
import { generateWorkflowConfig, explainErrorLog, modifyWorkflowConfig } from '../controllers/aiController.js';
import { runWorkflow } from '../engine/index.js';
import Workflow from '../models/Workflow.js';
import { registerSchedule, stopSchedule, intervalToCron } from '../triggers/scheduler.js';
import { registerChatTrigger, sendChatMessage, getChatHistory, addBotMessage } from '../triggers/chatStore.js';

const router = express.Router();

// Request Logger for Debugging
router.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
});

// Test route
router.get('/trigger/test', (req, res) => res.json({ message: 'Trigger routes are active' }));

// ─── AI Routes ───────────────────────────────────────────────────────────────
router.post('/ai/generate-workflow', generateWorkflowConfig);
router.post('/ai/modify-workflow', modifyWorkflowConfig);
router.post('/ai/explain-error', explainErrorLog);

// ─── Workflow Test Execution ──────────────────────────────────────────────────
router.post('/workflows/:id/execute', async (req, res) => {
    try {
        const { nodes, edges, payload } = req.body;
        if (!nodes || !edges) return res.status(400).json({ error: 'Nodes and edges are required' });
        const result = await runWorkflow(nodes, edges, payload || {});
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Workflow CRUD ────────────────────────────────────────────────────────────
router.get('/workflows', async (req, res) => {
    try {
        const workflows = await Workflow.find().sort({ createdAt: -1 });
        res.json(workflows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/workflows', async (req, res) => {
    try {
        const { name, nodes, edges } = req.body;
        const saved = await new Workflow({ name, nodes, edges }).save();

        // Auto-register schedule triggers when a workflow is saved
        const scheduleTrigger = nodes?.find(n => n.data?.type === 'schedule_trigger');
        if (scheduleTrigger && scheduleTrigger.data?.config?.interval) {
            const cronExpr = intervalToCron(scheduleTrigger.data.config.interval);
            registerSchedule(saved._id.toString(), cronExpr, async (ctx) => {
                try {
                    await runWorkflow(nodes, edges, ctx.trigger.payload);
                    console.log(`[SCHEDULER] Workflow ${saved._id} executed successfully.`);
                } catch (e) {
                    console.error(`[SCHEDULER] Workflow ${saved._id} failed:`, e.message);
                }
            });
        }

        // Auto-register chat trigger
        const chatTrigger = nodes?.find(n => n.data?.type === 'chat_message');
        if (chatTrigger) {
            registerChatTrigger(saved._id.toString(), async (ctx) => {
                try {
                    const result = await runWorkflow(nodes, edges, ctx.trigger.payload);
                    const lastOutput = Object.values(result.nodeResults || {}).pop();
                    const botReply = lastOutput?.response || lastOutput?.output || lastOutput?.result || JSON.stringify(lastOutput);
                    addBotMessage(saved._id.toString(), botReply || 'Workflow completed.');
                } catch (e) {
                    addBotMessage(saved._id.toString(), `Error: ${e.message}`);
                }
            });
        }

        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        res.status(201).json({ ...saved.toObject(), baseUrl });
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

// ─── TRIGGER 1: Webhook ───────────────────────────────────────────────────────
// External systems POST to this URL to trigger a workflow
router.post('/trigger/webhook/:workflowId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });

        const result = await runWorkflow(wf.nodes, wf.edges, req.body || {});
        res.json({ success: true, workflowId: req.params.workflowId, result });
    } catch (error) {
        console.error(`[WEBHOOK TRIGGER] Error:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get webhook URL info for a workflow
router.get('/trigger/webhook/:workflowId/info', async (req, res) => {
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.json({
        url: `${baseUrl}/api/trigger/webhook/${req.params.workflowId}`,
        method: 'POST',
        note: 'Send any JSON payload to this URL to trigger the workflow.'
    });
});

// ─── TRIGGER 2: Manual ───────────────────────────────────────────────────────
router.post('/trigger/manual/:workflowId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });
        const result = await runWorkflow(wf.nodes, wf.edges, { source: 'manual', ...req.body });
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── TRIGGER 3: Schedule (manual re-register) ─────────────────────────────────
router.post('/trigger/schedule/:workflowId', async (req, res) => {
    try {
        const { interval } = req.body; // interval in seconds
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });

        const cronExpr = intervalToCron(interval || 3600);
        registerSchedule(req.params.workflowId, cronExpr, async (ctx) => {
            await runWorkflow(wf.nodes, wf.edges, ctx.trigger.payload);
        });

        res.json({ success: true, cronExpression: cronExpr, message: `Schedule registered: ${cronExpr}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/trigger/schedule/:workflowId', (req, res) => {
    stopSchedule(req.params.workflowId);
    res.json({ success: true, message: 'Schedule stopped.' });
});

// ─── TRIGGER 4: Form Submission ───────────────────────────────────────────────
// A public POST endpoint that acts as a form receiver
router.post('/trigger/form/:workflowId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });

        const formData = req.body;
        console.log(`[FORM TRIGGER] Workflow ${req.params.workflowId} - Form data received:`, formData);
        const result = await runWorkflow(wf.nodes, wf.edges, { source: 'form', form_data: formData });
        res.json({ success: true, message: 'Form submitted successfully', result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get form metadata / submission URL
router.get('/trigger/form/:workflowId/info', async (req, res) => {
    const wf = await Workflow.findById(req.params.workflowId);
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });

    const formTrigger = wf.nodes?.find(n => n.data?.type === 'form_submission');
    const fields = formTrigger?.data?.config?.fields
        ? JSON.parse(formTrigger.data.config.fields)
        : [{ name: 'name', type: 'text' }, { name: 'email', type: 'email' }];

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.json({
        submission_url: `${baseUrl}/api/trigger/form/${req.params.workflowId}`,
        method: 'POST',
        fields
    });
});

// ─── TRIGGER 5: Sub-Workflow ──────────────────────────────────────────────────
router.post('/trigger/sub-workflow/:workflowId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Sub-workflow not found' });

        const result = await runWorkflow(wf.nodes, wf.edges, { source: 'sub_workflow', caller_payload: req.body });
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── TRIGGER 6: Chat Message ──────────────────────────────────────────────────
// POST a chat message to trigger the workflow
router.post('/trigger/chat/:workflowId', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });

        // Register callback if not already
        if (!getChatHistory(req.params.workflowId).length) {
            registerChatTrigger(req.params.workflowId, async (ctx) => {
                try {
                    const result = await runWorkflow(wf.nodes, wf.edges, ctx.trigger.payload);
                    const lastOutput = Object.values(result.nodeResults || {}).pop();
                    const botReply = lastOutput?.response || lastOutput?.output || lastOutput?.result || JSON.stringify(lastOutput);
                    addBotMessage(req.params.workflowId, botReply || 'Workflow completed.');
                } catch (e) {
                    addBotMessage(req.params.workflowId, `Error: ${e.message}`);
                }
            });
        }

        sendChatMessage(req.params.workflowId, message, 'user');

        // Wait briefly for async bot reply
        await new Promise(r => setTimeout(r, 1500));
        const history = getChatHistory(req.params.workflowId);
        const lastEntry = history[history.length - 1];

        res.json({ success: true, reply: lastEntry?.role === 'bot' ? lastEntry.content : null, history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET chat history
router.get('/trigger/chat/:workflowId/history', (req, res) => {
    res.json({ history: getChatHistory(req.params.workflowId) });
});

// ─── TRIGGER 7: App Event (Telegram) ─────────────────────────────────────────
// Telegram sends updates to this webhook endpoint
router.post('/trigger/app-event/:workflowId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });

        // Normalise Telegram / generic app event payload
        const telegramMsg = req.body?.message;
        const payload = {
            source: 'app_event',
            raw: req.body,
            text: telegramMsg?.text || null,
            from: telegramMsg?.from || null,
            chat_id: telegramMsg?.chat?.id || null,
        };

        // Respond 'ok' to Telegram immediately to prevent timeout/502
        res.json({ ok: true });

        // Run workflow in background
        (async () => {
            try {
                const result = await runWorkflow(wf.nodes, wf.edges, payload);

                // If bot reply is needed, call Telegram sendMessage
                const appTrigger = wf.nodes?.find(n => n.data?.type === 'app_event');
                const botToken = appTrigger?.data?.config?.telegram_token;
                const chatId = payload.chat_id || appTrigger?.data?.config?.chat_id;

                // Find a meaningful reply: Prefer AI Model output, then fall back to the last node
                let reply;
                const aiNode = wf.nodes.find(n => n.data?.type === 'ai_model');
                if (aiNode && result.nodeResults[aiNode.id]) {
                    reply = result.nodeResults[aiNode.id].output;
                } else {
                    const lastOutput = Object.values(result.nodeResults || {}).pop();
                    reply = lastOutput?.response || lastOutput?.output || lastOutput?.result;
                }

                if (botToken && chatId && reply) {
                    console.log(`[TELEGRAM] Sending reply to chat ${chatId}...`);
                    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        chat_id: chatId,
                        text: typeof reply === 'string' ? reply : JSON.stringify(reply)
                    }).catch(err => {
                        console.error('[TELEGRAM] Error sending message:', err.response?.data || err.message);
                    });
                } else {
                    console.warn(`[TELEGRAM] No reply sent: token=${!!botToken}, chat=${!!chatId}, reply=${!!reply}`);
                }
            } catch (err) {
                console.error('[TELEGRAM] Background workflow error:', err.message);
            }
        })();

    } catch (error) {
        console.error('[APP EVENT ERROR]', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Register Telegram webhook for a workflow
router.post('/trigger/app-event/:workflowId/register-telegram', async (req, res) => {
    try {
        const { telegram_token } = req.body;
        if (!telegram_token) return res.status(400).json({ error: 'telegram_token required' });
        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        const webhookUrl = `${baseUrl}/api/trigger/app-event/${req.params.workflowId}`;
        const tgRes = await axios.post(`https://api.telegram.org/bot${telegram_token}/setWebhook`, { url: webhookUrl });
        res.json({ success: true, webhookUrl, telegram: tgRes.data });
    } catch (error) {
        console.error('[TELEGRAM REGISTRATION]', error.response?.data || error.message);
        let errorMsg = error.response?.data?.description || error.message;

        // Add a helpful hint for localhost users
        if (errorMsg.includes('HTTPS url must be provided')) {
            errorMsg += '. TIP: Telegram requires an HTTPS URL. Since you are on localhost, you need to use a tool like ngrok to create a secure tunnel (e.g. "ngrok http 5000") and use that URL.';
        }

        res.status(500).json({ error: errorMsg });
    }
});

// ─── TRIGGER 8: Other Ways (error, file-change) ───────────────────────────────
// Error event trigger — call this when another workflow errors
router.post('/trigger/error/:workflowId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });
        const result = await runWorkflow(wf.nodes, wf.edges, {
            source: 'error_trigger',
            error: req.body?.error || 'Unknown error',
            origin_workflow: req.body?.origin_workflow || null
        });
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── GitHub Push ──────────────────────────────────────────────────────────────
router.post('/workflows/push-to-github', async (req, res) => {
    try {
        const { owner, repo, token, path, message, content } = req.body;
        if (!owner || !repo || !token) return res.status(400).json({ error: 'Missing GitHub configuration' });

        let sha;
        try {
            const getRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                headers: { Authorization: `token ${token}` }
            });
            sha = getRes.data.sha;
        } catch (e) { /* File doesn't exist yet */ }

        const pushRes = await axios.put(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            message,
            content: Buffer.from(content).toString('base64'),
            sha
        }, { headers: { Authorization: `token ${token}` } });

        res.json({ success: true, url: pushRes.data.content.html_url });
    } catch (error) {
        res.status(500).json({ error: error.response?.data?.message || error.message });
    }
});

export default router;


