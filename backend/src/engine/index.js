import axios from 'axios';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Secret from '../models/Secret.js';
import { decrypt } from '../services/crypto.js';
import ExecutionLog from '../models/ExecutionLog.js';
import { getIO } from '../config/socket.js';
// ─── Secret vault ─────────────────────────────────────────────────────────────
const decryptSecret = async (secretName, userId) => {
    if (!userId) {
        console.warn(`[ENGINE] {{secret.${secretName}}} used but no userId — skipping.`);
        return '';
    }
    try {
        const s = await Secret.findOne({ name: secretName.toUpperCase().trim(), userId });
        if (!s) { console.warn(`[ENGINE] Secret "${secretName}" not found for user ${userId}`); return ''; }
        return decrypt({ iv: s.iv, ciphertext: s.ciphertext, tag: s.tag });
    } catch (err) {
        console.error(`[ENGINE] Failed to decrypt secret "${secretName}":`, err.message);
        return '';
    }
};

// ─── Email helpers ─────────────────────────────────────────────────────────────
let transporter;
const setupEmail = async () => {
    if (!transporter) {
        try {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email', port: 587, secure: false,
                auth: { user: testAccount.user, pass: testAccount.pass }
            });
        } catch (e) { console.error('[EMAIL] Error creating test account:', e); }
    }
};

const dbConnections = new Map();
const smtpTransporters = new Map();

const getExternalDb = async (connectionString) => {
    if (dbConnections.has(connectionString)) return dbConnections.get(connectionString);
    const client = new MongoClient(connectionString);
    await client.connect();
    dbConnections.set(connectionString, client);
    return client;
};

// ─── Single-node executor ──────────────────────────────────────────────────────
export const executeAction = async (action, context) => {
    console.log(`[ENGINE] Executing Node: ${action.label || action.id} (${action.type})`);

    const interpolate = async (str) => {
        if (typeof str !== 'string' || !str.includes('{{')) return str;
        const secretMatches = [...str.matchAll(/\{\{\s*secret\.([A-Z0-9_]+)\s*\}\}/gi)];
        for (const [fullMatch, secretName] of secretMatches) {
            const plaintext = await decryptSecret(secretName, context.userId);
            str = str.replace(fullMatch, plaintext);
        }
        let resolved = str.replace(/\{\{\s*([\w\.\_ ]+?)\s*\}\}/g, (match, path) => {
            let current = context;
            if (path === 'payload' || path === 'input') return JSON.stringify(context.trigger?.payload || {});
            if (path === 'results') return JSON.stringify(context.results || {});
            let keys = path.trim().split('.');
            if (keys[0] === 'payload' || keys[0] === 'input') {
                keys = ['trigger', 'payload', ...keys.slice(1)];
            } else if (keys[0] !== 'results') {
                if (context.results?.[keys[0]]) keys = ['results', ...keys];
                else if (context.trigger?.payload?.[keys[0]]) keys = ['trigger', 'payload', ...keys];
            }
            for (const k of keys) {
                if (current == null) { current = ''; break; }
                current = current[k] !== undefined ? current[k] : current[k.replace(/_/g, ' ')];
            }
            if (typeof current === 'object' && current !== null && current.output !== undefined) current = current.output;
            if (current == null || current === '') return '';
            return typeof current === 'object' ? JSON.stringify(current) : String(current);
        });
        return resolved.replace(/\{\{.*?\}\}/g, '');
    };

    const processConfig = async (obj) => {
        if (obj == null) return obj;
        if (typeof obj === 'string') return interpolate(obj);
        if (Array.isArray(obj)) return Promise.all(obj.map(processConfig));
        if (typeof obj === 'object') {
            const out = {};
            for (const key in obj) out[key] = await processConfig(obj[key]);
            return out;
        }
        return obj;
    };

    action.config = await processConfig(action.config);

    switch (action.type) {
        case 'webhook_trigger':
            return { status: 'received', trigger_type: 'webhook', timestamp: new Date().toISOString(), input: context.trigger.payload };
        case 'manual_trigger':
            return { status: 'triggered', trigger_type: 'manual', timestamp: new Date().toISOString(), input: context.trigger.payload || {} };
        case 'schedule_trigger': {
            const intervalSec = parseInt(action.config?.interval || 3600);
            return { status: 'triggered', trigger_type: 'schedule', interval_seconds: intervalSec, timestamp: new Date().toISOString(), next_run: new Date(Date.now() + intervalSec * 1000).toISOString(), input: context.trigger.payload || {} };
        }
        case 'app_event':
            return { status: 'triggered', trigger_type: 'app_event', timestamp: new Date().toISOString(), input: context.trigger.payload || {} };
        case 'form_submission':
            return { status: 'triggered', trigger_type: 'form_submission', timestamp: new Date().toISOString(), form_data: context.trigger.payload || {} };
        case 'sub_workflow_trigger':
            return { status: 'triggered', trigger_type: 'sub_workflow', timestamp: new Date().toISOString(), caller_payload: context.trigger.payload || {} };
        case 'chat_message': {
            const message = context.trigger.payload?.message || context.trigger.payload?.text || '';
            return { status: 'triggered', trigger_type: 'chat_message', timestamp: new Date().toISOString(), message, input: context.trigger.payload || {} };
        }
        case 'other_ways':
            return { status: 'triggered', trigger_type: 'custom', timestamp: new Date().toISOString(), input: context.trigger.payload || {} };

        case 'http_request': {
            const url    = action.config?.url || 'https://jsonplaceholder.typicode.com/posts/1';
            const method = action.config?.method || 'GET';
            const body   = action.config?.body || action.config?.data || (method !== 'GET' ? context.trigger.payload : undefined);
            try {
                const response = await axios({ method, url, data: body, timeout: 10000 });
                return { statusCode: response.status, data: response.data, headers: response.headers };
            } catch (err) { throw new Error(`HTTP Error: ${err.response?.status || err.message}`); }
        }

        case 'ai_model': {
            const provider  = action.config?.provider || 'google';
            const apiKey    = action.config?.api_key || (provider === 'google'
                ? (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)
                : process.env.OPENAI_API_KEY);
            const modelName = action.config?.model || (provider === 'google' ? 'gemini-2.5-flash' : 'gpt-4o');
            const finalPrompt  = action.config?.prompt || '';
            const systemPrompt = action.config?.system_prompt || '';
            if (!apiKey) throw new Error(`API Key for ${provider} is missing.`);
            try {
                if (provider === 'google') {
                    const genAI  = new GoogleGenerativeAI(apiKey);
                    const model  = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });
                    const result = await model.generateContent(finalPrompt);
                    return { provider: 'Google Gemini', model: modelName, output: result.response.text() };
                } else {
                    const openai = new OpenAI({ apiKey });
                    const msgs   = [];
                    if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
                    msgs.push({ role: 'user', content: finalPrompt });
                    const completion = await openai.chat.completions.create({ model: modelName, messages: msgs, timeout: 10000 });
                    return { provider: 'OpenAI', model: modelName, output: completion.choices[0].message.content };
                }
            } catch (err) { throw new Error(`${provider.toUpperCase()} AI Error: ${err.message}`); }
        }

        case 'send_email': {
            const smtpUser     = action.config?.smtp_user;
            const smtpHost     = action.config?.smtp_host || (smtpUser ? 'smtp.gmail.com' : null);
            const smtpPort     = parseInt(action.config?.smtp_port) || 587;
            const smtpPass     = action.config?.smtp_pass;
            const useRealSmtp  = !!(smtpHost && smtpUser && smtpPass);
            const transportKey = useRealSmtp ? `${smtpHost}:${smtpUser}` : 'ethereal';
            let activeTransporter;
            if (useRealSmtp) {
                if (smtpTransporters.has(transportKey)) {
                    activeTransporter = smtpTransporters.get(transportKey);
                } else {
                    activeTransporter = nodemailer.createTransport({
                        host: smtpHost, port: smtpPort, secure: smtpPort === 465,
                        auth: { user: smtpUser, pass: smtpPass },
                        tls: { rejectUnauthorized: false }
                    });
                    smtpTransporters.set(transportKey, activeTransporter);
                }
            } else {
                await setupEmail();
                activeTransporter = transporter;
            }
            const fromEmail = smtpUser || 'noreply@ethereal.email';
            const toEmail   = (action.config?.to || '').trim() || 'test@example.com';
            const resultIds = Object.keys(context.results);
            const lastOutput = context.results[resultIds[resultIds.length - 1]]?.output
                             || context.results[resultIds[resultIds.length - 1]];
            const info = await activeTransporter.sendMail({
                from: `"Flowz" <${fromEmail}>`,
                to:   toEmail,
                subject: action.config?.subject || 'Hello from Flowz',
                text: `Execution result: ${typeof lastOutput === 'string' ? lastOutput : JSON.stringify(lastOutput)}`,
                html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #4F46E5;border-radius:12px;max-width:600px;margin:auto">
                    <h1 style="color:#4F46E5">Automation Triggered</h1>
                    <p>The workflow <strong>"${context.workflowName || 'Flowz Run'}"</strong> executed a notification step.</p>
                    ${lastOutput ? `<div style="background:#EEF2FF;padding:20px;border-radius:8px;border:1px solid #C7D2FE">
                        <strong>Latest Output:</strong><div style="white-space:pre-wrap">${typeof lastOutput === 'string' ? lastOutput : JSON.stringify(lastOutput, null, 2)}</div>
                    </div>` : ''}
                    <div style="background:#F8FAFC;padding:20px;border-radius:8px;border:1px solid #E2E8F0;margin-top:16px">
                        <strong>Trigger Data:</strong><pre>${JSON.stringify(context.trigger.payload, null, 2)}</pre>
                    </div></div>`
            });
            return { messageId: info.messageId, accepted: info.accepted, previewUrl: nodemailer.getTestMessageUrl(info) || null, status: 'sent', service: useRealSmtp ? 'Custom SMTP' : 'Ethereal Test' };
        }

        case 'delay': {
            const delayMs = (parseInt(action.config?.duration_seconds) || 1) * 1000;
            await new Promise(r => setTimeout(r, delayMs));
            return { waited_ms: delayMs };
        }

        case 'save_to_database': {
            const collectionName = (action.config?.collection || 'workflow_results').trim();
            const connString     = action.config?.connection_string;
            try {
                const db = connString ? (await getExternalDb(connString)).db() : mongoose.connection.db;
                const storageType = connString ? 'External MongoDB' : 'System Default MongoDB';
                const cols = await db.listCollections({ name: collectionName }).toArray();
                if (cols.length === 0) await db.createCollection(collectionName);
                const result = await db.collection(collectionName).insertOne({
                    ...context.trigger.payload,
                    _autoflow_metadata: { executed_at: new Date(), node_id: action.id, workflow_name: context.workflowName || 'test_run' }
                });
                return { storage: storageType, collection: collectionName, insertedId: result.insertedId, status: 'success' };
            } catch (err) { throw new Error(`Database Error (${action.config?.collection}): ${err.message}`); }
        }

        case 'ifElse': {
            const condition = action.config?.condition || 'true';
            let evaluation = false;
            try {
                const evalFn = new Function('payload', 'results', `try { return ${condition}; } catch(e) { return false; }`);
                evaluation = !!(evalFn(context.trigger.payload, context.results));
            } catch (_) { evaluation = false; }
            return { outcome: evaluation ? 'true' : 'false', evaluatedCondition: condition, evaluationStatus: 'success' };
        }

        case 'log': {
            const msg = action.config?.message || 'Standard Execution Log';
            console.log(`[USER LOG]: ${msg}`);
            return { logged: true, message: msg };
        }

        default:
            return { status: 'executed', type: action.type };
    }
};

// ─── Topology-aware parallel DAG executor ─────────────────────────────────────
/**
 * runWorkflow — executes a workflow as a parallel DAG.
 *
 * Fan-out nodes (multiple children) execute ALL children simultaneously with
 * Promise.all(). ifElse nodes fire only the matching branch and propagate a
 * "skip" marker down the dead branch's entire sub-graph.
 *
 * @param {Array}  nodes         React-Flow node array
 * @param {Array}  edges         React-Flow edge array
 * @param {Object} triggerPayload  Incoming payload
 * @param {string} userId        Owner user ID (for secret resolution)
 * @param {string} workflowId    MongoDB ObjectId — if provided, run is persisted to ExecutionLog
 * @param {string} triggeredBy   How the run was started (manual|webhook|schedule|…)
 */
export const runWorkflow = async (
    nodes,
    edges,
    triggerPayload = {},
    userId = null,
    workflowId = null,
    triggeredBy = 'api'
) => {
    const workflowStart = Date.now();
    const io = getIO();
    if (io && workflowId) {
        io.to(`workflow_${workflowId}`).emit('workflow:start', { workflowId, triggeredBy });
    }

    const context = { trigger: { payload: triggerPayload }, results: {}, userId };
    const nodeLogs = [];

    // ── 1. Build DAG structures ─────────────────────────────────────────────
    const nodeMap   = new Map(nodes.map(n => [n.id, n]));

    // pending[id] = number of incoming edges not yet satisfied
    const pending   = new Map(nodes.map(n => [n.id, 0]));
    // children[id] = [{ target, handle }]
    const children  = new Map(nodes.map(n => [n.id, []]));

    for (const edge of edges) {
        pending.set(edge.target, (pending.get(edge.target) || 0) + 1);
        if (!children.has(edge.source)) children.set(edge.source, []);
        children.get(edge.source).push({ target: edge.target, handle: edge.sourceHandle });
    }

    // ── 2. Find initial ready set (in-degree 0) ─────────────────────────────
    let ready = nodes.filter(n => pending.get(n.id) === 0);

    // Fallback: explicit trigger nodes, then first node
    if (ready.length === 0) {
        const TRIGGER_TYPES = new Set(['app_event', 'form_submission', 'chat_message', 'other_ways']);
        ready = nodes.filter(n => {
            const t = n.data?.type?.toLowerCase() || '';
            return n.data?.isTrigger || t.includes('trigger') || TRIGGER_TYPES.has(t);
        });
    }
    if (ready.length === 0 && nodes.length > 0) ready = [nodes[0]];
    if (ready.length === 0) throw new Error('Workflow is empty or has no starting point');

    console.log(`[ENGINE] Found ${ready.length} initial node(s): ${ready.map(n => n.data?.label || n.id).join(', ')}`);

    // ── 3. Create ExecutionLog (running) ────────────────────────────────────
    let logDoc = null;
    if (workflowId) {
        try {
            logDoc = await new ExecutionLog({ workflowId, status: 'running', triggeredBy, nodeLogs: [] }).save();
        } catch (e) { console.warn('[ENGINE] Could not create ExecutionLog:', e.message); }
    }

    // ── 4. Helpers ──────────────────────────────────────────────────────────
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const executed = new Set();
    const skipped  = new Set();

    // Recursively mark a node and all its downstream as skipped (dead ifElse branch)
    const propagateSkip = (nodeId) => {
        if (skipped.has(nodeId) || executed.has(nodeId)) return;
        skipped.add(nodeId);
        console.log(`[ENGINE] ⏭ Skipping node ${nodeId} (blocked by ifElse branch)`);
        for (const { target } of (children.get(nodeId) || [])) propagateSkip(target);
    };

    // Execute a single node with retry/backoff, returns { status, result, log }
    const runNode = async (currentNode) => {
        executed.add(currentNode.id);
        const nodeLabel    = currentNode.data?.label || currentNode.id;
        const startTime    = Date.now();
        const actionData   = {
            id:     currentNode.id,
            type:   currentNode.data.type,
            label:  currentNode.data.label,
            config: { ...(currentNode.data.config || {}) }
        };
        const inputSnapshot = {
            trigger_payload:  context.trigger.payload,
            previous_results: { ...context.results }  // snapshot before this wave
        };

        const onError    = actionData.config?.on_error    || 'stop';
        const maxRetries = Math.max(0, parseInt(actionData.config?.retry_count)    || 0);
        const baseDelay  = Math.max(500, parseInt(actionData.config?.retry_delay_ms) || 1000);

        let nodeResult = null;
        let lastError  = null;

        if (io && workflowId) {
            io.to(`workflow_${workflowId}`).emit('node:start', { nodeId: currentNode.id, label: nodeLabel, type: currentNode.data.type });
        }

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.log(`[ENGINE] ↻ Retry ${attempt}/${maxRetries} for "${nodeLabel}" in ${delay}ms…`);
                await sleep(delay);
            }
            try {
                nodeResult = await executeAction(actionData, context);
                if (attempt > 0) console.log(`[ENGINE] ✓ "${nodeLabel}" succeeded on retry ${attempt}.`);
                break;
            } catch (err) {
                lastError = err;
                console.warn(`[ENGINE] ✗ Attempt ${attempt + 1}/${maxRetries + 1} failed for "${nodeLabel}": ${err.message}`);
            }
        }

        const duration = Date.now() - startTime;

        if (nodeResult === null) {
            // All attempts exhausted
            const log = {
                nodeId:    currentNode.id,
                nodeLabel,
                nodeType:  currentNode.data.type,
                status:    'failure',
                error:     lastError.message,
                retries:   maxRetries,
                duration
            };
            if (onError === 'stop') {
                if (io && workflowId) io.to(`workflow_${workflowId}`).emit('node:error', { nodeId: currentNode.id, error: lastError.message });
                return { node: currentNode, status: 'fatal', error: lastError.message };
            }

            console.warn(`[ENGINE] on_error=continue: skipping "${nodeLabel}" and resuming downstream.`);
            nodeResult = { error: lastError.message, failed: true, skipped: true };
            if (io && workflowId) io.to(`workflow_${workflowId}`).emit('node:error', { nodeId: currentNode.id, error: lastError.message, continue: true });
            return { node: currentNode, status: 'continue', result: nodeResult };
        }

        nodeLogs.push({
            nodeId:    currentNode.id,
            nodeLabel,
            nodeType:  currentNode.data.type,
            status:    'success',
            input:     inputSnapshot,
            result:    nodeResult,
            retries:   maxRetries,
            duration
        });
        
        if (io && workflowId) io.to(`workflow_${workflowId}`).emit('node:complete', { nodeId: currentNode.id, duration, result: nodeResult });
        
        return { node: currentNode, status: 'ok', result: nodeResult };
    };

    // ── 5. Parallel wave-by-wave DAG execution ──────────────────────────────
    let overallStatus = 'success';
    let overallError  = null;
    let waveNum       = 0;

    while (ready.length > 0) {
        // Filter out any nodes already executed or skipped (deduplication safety)
        const wave = ready.filter(n => !executed.has(n.id) && !skipped.has(n.id));
        if (wave.length === 0) break;

        waveNum++;
        console.log(`[ENGINE] ⚡ Wave ${waveNum}: executing [${wave.map(n => n.data?.label || n.id).join(' | ')}] in parallel`);

        // ── Execute entire wave in parallel ──────────────────────────────────
        const waveResults = await Promise.all(wave.map(runNode));

        // ── Check for fatal failure ───────────────────────────────────────────
        const fatal = waveResults.find(r => r.status === 'fatal');
        if (fatal) {
            overallStatus = 'failure';
            overallError  = `Node "${fatal.node.data?.label || fatal.node.id}" failed: ${fatal.error}`;
            console.error(`[ENGINE] ✗ Fatal: ${overallError}`);
            break;
        }

        // ── Commit results to shared context (after full wave resolves) ───────
        for (const { node, result } of waveResults) {
            if (!result) continue;
            context.results[node.id] = result;
            if (node.data?.label) {
                context.results[node.data.label.replace(/\s+/g, '_')] = result;
            }
        }

        // ── Release / block downstream nodes ─────────────────────────────────
        const pendingDecrement = new Map();  // targetId -> how many edges just fired

        for (const { node, result } of waveResults) {
            if (!result) continue;
            for (const { target, handle } of (children.get(node.id) || [])) {
                if (node.data.type === 'ifElse') {
                    if (handle === result.outcome) {
                        pendingDecrement.set(target, (pendingDecrement.get(target) || 0) + 1);
                    } else {
                        // Dead branch — skip the entire sub-graph
                        propagateSkip(target);
                    }
                } else {
                    pendingDecrement.set(target, (pendingDecrement.get(target) || 0) + 1);
                }
            }
        }

        // ── Find next ready wave ──────────────────────────────────────────────
        const nextReady = [];
        for (const [targetId, decBy] of pendingDecrement) {
            const remaining = (pending.get(targetId) || 0) - decBy;
            pending.set(targetId, remaining);
            if (remaining <= 0 && !executed.has(targetId) && !skipped.has(targetId)) {
                const targetNode = nodeMap.get(targetId);
                if (targetNode) nextReady.push(targetNode);
            }
        }
        ready = nextReady;
    }

    const duration    = Date.now() - workflowStart;
    const finalResult = {
        status: overallStatus,
        nodeLogs,
        nodeResults: context.results,
        duration,
        ...(overallError ? { error: overallError } : {})
    };

    console.log(`[ENGINE] ■ Workflow finished — status: ${overallStatus}, duration: ${duration}ms, waves: ${waveNum}`);

    // ── 6. Persist final ExecutionLog ────────────────────────────────────────
    if (logDoc) {
        try {
            await ExecutionLog.findByIdAndUpdate(logDoc._id, {
                status:   overallStatus,
                nodeLogs: nodeLogs,
                duration,
                ...(overallError ? { error: overallError } : {})
            });
        } catch (e) { console.warn('[ENGINE] Could not finalise ExecutionLog:', e.message); }
    }

    if (io && workflowId) io.to(`workflow_${workflowId}`).emit('workflow:done', { status: overallStatus, duration });

    return finalResult;
};
