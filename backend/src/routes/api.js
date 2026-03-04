import express from 'express';
import axios from 'axios';
import { generateWorkflowConfig, explainErrorLog, modifyWorkflowConfig } from '../controllers/aiController.js';
import { runWorkflow } from '../engine/index.js';
import Workflow from '../models/Workflow.js';
import { registerSchedule, stopSchedule, intervalToCron } from '../triggers/scheduler.js';
import { registerChatTrigger, sendChatMessage, getChatHistory, addBotMessage } from '../triggers/chatStore.js';

const router = express.Router();

router.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
});

router.get('/trigger/test', (req, res) => res.json({ message: 'Trigger routes are active' }));

router.post('/ai/generate-workflow', generateWorkflowConfig);
router.post('/ai/modify-workflow', modifyWorkflowConfig);
router.post('/ai/explain-error', explainErrorLog);

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

router.get('/trigger/webhook/:workflowId/info', async (req, res) => {
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.json({
        url: `${baseUrl}/api/trigger/webhook/${req.params.workflowId}`,
        method: 'POST',
        note: 'Send any JSON payload to this URL to trigger the workflow.'
    });
});

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

router.post('/trigger/schedule/:workflowId', async (req, res) => {
    try {
        const { interval } = req.body;
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

router.post('/trigger/chat/:workflowId', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });

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

        await new Promise(r => setTimeout(r, 1500));
        const history = getChatHistory(req.params.workflowId);
        const lastEntry = history[history.length - 1];

        res.json({ success: true, reply: lastEntry?.role === 'bot' ? lastEntry.content : null, history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/trigger/chat/:workflowId/history', (req, res) => {
    res.json({ history: getChatHistory(req.params.workflowId) });
});

router.post('/trigger/app-event/:workflowId', async (req, res) => {
    try {
        const wf = await Workflow.findById(req.params.workflowId);
        if (!wf) return res.status(404).json({ error: 'Workflow not found' });

        const telegramMsg = req.body?.message;
        const payload = {
            source: 'app_event',
            raw: req.body,
            text: telegramMsg?.text || null,
            from: telegramMsg?.from || null,
            chat_id: telegramMsg?.chat?.id || null,
        };

        res.json({ ok: true });

        (async () => {
            try {
                const result = await runWorkflow(wf.nodes, wf.edges, payload);

                const appTrigger = wf.nodes?.find(n => n.data?.type === 'app_event');
                const botToken = appTrigger?.data?.config?.telegram_token;
                const chatId = payload.chat_id || appTrigger?.data?.config?.chat_id;

                console.log(`[TELEGRAM] Workflow finished. Status: ${result.status}`);
                console.log(`[TELEGRAM] nodeResults keys:`, Object.keys(result.nodeResults || {}));

                let reply = null;

                // 1. Check every node result for any text-like field (most-to-least specific)
                const TEXT_FIELDS = ['output', 'response', 'result', 'message', 'text', 'logged'];
                const allResults = Object.values(result.nodeResults || {});

                // Prefer AI model node output first
                const aiNode = wf.nodes.find(n => n.data?.type === 'ai_model');
                if (aiNode && result.nodeResults[aiNode.id]) {
                    const aiOut = result.nodeResults[aiNode.id];
                    reply = aiOut.output || aiOut.response || aiOut.result || null;
                    console.log(`[TELEGRAM] AI node output found:`, reply ? reply.substring(0, 60) + '...' : 'null');
                }

                // If still no reply, scan ALL node results in reverse order (last node first)
                if (!reply) {
                    for (const nodeResult of [...allResults].reverse()) {
                        for (const field of TEXT_FIELDS) {
                            const val = nodeResult?.[field];
                            if (val && typeof val === 'string' && val.trim().length > 0) {
                                reply = val;
                                console.log(`[TELEGRAM] Found reply in field "${field}":`, reply.substring(0, 60));
                                break;
                            }
                        }
                        if (reply) break;

                        // Stringify non-null object results as last resort
                        if (nodeResult && typeof nodeResult === 'object') {
                            const clean = Object.fromEntries(
                                Object.entries(nodeResult).filter(([k]) => !k.startsWith('_'))
                            );
                            if (Object.keys(clean).length > 0) {
                                reply = JSON.stringify(clean);
                                console.log(`[TELEGRAM] Using JSON stringified result as reply`);
                                break;
                            }
                        }
                    }
                }

                // 2. Fall back to static reply_message configured on the app_event node
                if (!reply) {
                    reply = appTrigger?.data?.config?.reply_message || null;
                    if (reply) console.log(`[TELEGRAM] Using static reply_message from node config`);
                }

                // 3. Last resort: echo the user's own message back
                if (!reply && payload.text) {
                    reply = `Received: "${payload.text}" — workflow ran successfully (${result.status}).`;
                    console.log(`[TELEGRAM] Using echo fallback`);
                }

                if (botToken && chatId && reply) {
                    console.log(`[TELEGRAM] Sending reply to chat ${chatId}...`);
                    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        chat_id: chatId,
                        text: typeof reply === 'string' ? reply : JSON.stringify(reply),
                        parse_mode: 'Markdown'
                    }).then(() => {
                        console.log(`[TELEGRAM] Message sent successfully to chat ${chatId}`);
                    }).catch(err => {
                        // Markdown parse failed — retry as plain text
                        console.warn(`[TELEGRAM] Markdown send failed, retrying as plain text...`);
                        return axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                            chat_id: chatId,
                            text: typeof reply === 'string' ? reply : JSON.stringify(reply)
                        }).catch(err2 => {
                            console.error('[TELEGRAM] Error sending message:', err2.response?.data || err2.message);
                        });
                    });
                } else {
                    console.warn(`[TELEGRAM] No reply sent: token=${!!botToken}, chat=${!!chatId}, reply=${!!reply}`);
                    if (!botToken) console.warn(`[TELEGRAM] FIX: Set "telegram_token" in the App Event node config.`);
                    if (!chatId) console.warn(`[TELEGRAM] FIX: chat_id was not found in the Telegram message payload. Make sure Telegram is sending updates correctly.`);
                    if (!reply) console.warn(`[TELEGRAM] FIX: No text output was produced by any node. Add an AI Model node or set a static "reply_message" in the App Event node config.`);
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

// ─── GitHub OAuth & Push ───────────────────────────────────────────────────────
router.get('/auth/github', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId || clientId.includes('your_github_client_id')) {
        return res.status(400).send('ERROR: GITHUB_CLIENT_ID is not configured in backend/.env. Please follow the instructions to create a GitHub OAuth App and update your .env file.');
    }
    const redirectUri = `${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/github/callback`;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,workflow`;
    res.redirect(githubAuthUrl);
});

router.get('/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code
        }, {
            headers: { Accept: 'application/json' }
        });

        const accessToken = response.data.access_token;
        // Redirect back to frontend with the token
        // Assuming frontend is at localhost:5173 for dev
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}?github_token=${accessToken}`);
    } catch (error) {
        console.error('[GITHUB OAUTH ERROR]', error.message);
        res.status(500).send('Authentication failed');
    }
});

router.post('/workflows/push-to-github', async (req, res) => {
    try {
        const { owner, repo, token, path, message, content } = req.body;
        const finalToken = token || req.headers['x-github-token'];

        if (!owner || !repo || !finalToken) {
            return res.status(400).json({ error: 'Missing GitHub configuration (Owner, Repo, or Token)' });
        }

        let sha;
        try {
            const getRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                headers: { Authorization: `token ${finalToken}` }
            });
            sha = getRes.data.sha;
        } catch (e) { /* File doesn't exist yet */ }

        const pushRes = await axios.put(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            message,
            content: Buffer.from(content).toString('base64'),
            sha
        }, { headers: { Authorization: `token ${finalToken}` } });

        res.json({ success: true, url: pushRes.data.content.html_url });
    } catch (error) {
        console.error('[GITHUB PUSH ERROR]', error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.message || error.message });
    }
});

export default router;


