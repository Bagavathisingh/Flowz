import axios from 'axios';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

let transporter;
const setupEmail = async () => {
    if (!transporter) {
        try {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
        } catch (e) {
            console.error("[EMAIL] Error creating test account:", e);
        }
    }
};

const dbConnections = new Map();
const smtpTransporters = new Map();

const getExternalDb = async (connectionString) => {
    if (dbConnections.has(connectionString)) {
        return dbConnections.get(connectionString);
    }
    const client = new MongoClient(connectionString);
    await client.connect();
    dbConnections.set(connectionString, client);
    return client;
};

export const executeAction = async (action, context) => {
    console.log(`[ENGINE] Executing Node: ${action.label || action.id} (${action.type})`);

    // Helper to interpolate payload and result variables dynamically (e.g., {{payload.data.email}})
    const interpolate = (str) => {
        if (typeof str !== 'string' || !str.includes('{{')) return str;

        // Match variables including spaces (e.g., {{ AI Node.output }})
        let result = str.replace(/\{\{\s*([\w\.\_\s]+?)\s*\}\}/g, (match, path) => {
            let current = context;

            if (path === 'payload' || path === 'input') return JSON.stringify(context.trigger?.payload || {});
            if (path === 'results') return JSON.stringify(context.results || {});

            let keys = path.trim().split('.');
            if (keys[0] === 'payload' || keys[0] === 'input') {
                keys = ['trigger', 'payload', ...keys.slice(1)];
            } else if (keys[0] === 'results') {
                // leave as is
            } else {
                // Determine base fallback
                if (context.results && context.results[keys[0]]) {
                    keys = ['results', ...keys];
                } else if (context.trigger?.payload?.[keys[0]]) {
                    keys = ['trigger', 'payload', ...keys];
                }
            }

            for (const k of keys) {
                if (current === null || current === undefined) { current = ''; break; }
                current = current[k] !== undefined ? current[k] : current[k.replace(/_/g, ' ')];
            }

            // If the user requested a whole node object, get its output context intelligently
            if (typeof current === 'object' && current !== null && current.output !== undefined) {
                current = current.output;
            }

            if (current === undefined || current === null || current === '') return '';
            return typeof current === 'object' ? JSON.stringify(current) : String(current);
        });

        // Clean up any remaining unresolved variables to prevent execution errors
        result = result.replace(/\{\{.*?\}\}/g, '');

        return result;
    };

    // Recursively apply interpolation to all string values in node configuration
    const processConfig = (obj) => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'string') return interpolate(obj);
        if (Array.isArray(obj)) return obj.map(processConfig);
        if (typeof obj === 'object') {
            const newObj = {};
            for (const key in obj) {
                newObj[key] = processConfig(obj[key]);
            }
            return newObj;
        }
        return obj;
    };

    action.config = processConfig(action.config);

    switch (action.type) {
        case 'webhook_trigger':
            return {
                status: 'received',
                trigger_type: 'webhook',
                timestamp: new Date().toISOString(),
                input: context.trigger.payload
            };

        case 'manual_trigger':
            return {
                status: 'triggered',
                trigger_type: 'manual',
                timestamp: new Date().toISOString(),
                message: 'Workflow started manually.',
                input: context.trigger.payload || {}
            };

        case 'schedule_trigger': {
            const intervalSec = parseInt(action.config?.interval || 3600);
            return {
                status: 'triggered',
                trigger_type: 'schedule',
                interval_seconds: intervalSec,
                timestamp: new Date().toISOString(),
                next_run: new Date(Date.now() + intervalSec * 1000).toISOString(),
                input: context.trigger.payload || {}
            };
        }

        case 'app_event':
            return {
                status: 'triggered',
                trigger_type: 'app_event',
                timestamp: new Date().toISOString(),
                note: 'App event integration is in development.',
                input: context.trigger.payload || {}
            };

        case 'form_submission':
            return {
                status: 'triggered',
                trigger_type: 'form_submission',
                timestamp: new Date().toISOString(),
                form_data: context.trigger.payload || {},
                note: 'Form submission received.'
            };

        case 'sub_workflow_trigger':
            return {
                status: 'triggered',
                trigger_type: 'sub_workflow',
                timestamp: new Date().toISOString(),
                caller_payload: context.trigger.payload || {},
                note: 'Triggered by a parent workflow.'
            };

        case 'chat_message': {
            const message = context.trigger.payload?.message || context.trigger.payload?.text || '';
            return {
                status: 'triggered',
                trigger_type: 'chat_message',
                timestamp: new Date().toISOString(),
                message,
                input: context.trigger.payload || {}
            };
        }

        case 'other_ways':
            return {
                status: 'triggered',
                trigger_type: 'custom',
                timestamp: new Date().toISOString(),
                input: context.trigger.payload || {},
                note: 'Custom trigger activated.'
            };

        case 'http_request':
            const url = action.config?.url || 'https://jsonplaceholder.typicode.com/posts/1';
            const method = action.config?.method || 'GET';
            try {
                const response = await axios({
                    method,
                    url,
                    data: method !== 'GET' ? context.trigger.payload : undefined,
                    timeout: 5000
                });
                return {
                    statusCode: response.status,
                    data: response.data,
                    headers: response.headers
                };
            } catch (err) {
                throw new Error(`HTTP Error: ${err.response?.status || err.message}`);
            }

        case 'ai_model':
            const provider = action.config?.provider || 'google';
            const apiKey = action.config?.api_key || (
                provider === 'google'
                    ? (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || (process.env.OPENAI_API_KEY?.startsWith('AIza') ? process.env.OPENAI_API_KEY : undefined))
                    : process.env.OPENAI_API_KEY
            );
            let modelName = action.config?.model || (provider === 'google' ? 'gemini-3.1-flash-preview' : 'gpt-4o');
            console.log(`[AI ENGINE] Node "${action.label}" - Provider: ${provider}, Model: ${modelName}`);

            let finalPrompt = action.config?.prompt || '';
            const systemPrompt = action.config?.system_prompt || '';

            if (!apiKey) throw new Error(`API Key for ${provider} is missing. Please configure it in node properties.`);

            try {
                if (provider === 'google') {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        systemInstruction: systemPrompt
                    });
                    const result = await model.generateContent(finalPrompt);
                    const response = await result.response;
                    return {
                        provider: 'Google Gemini',
                        model: modelName,
                        output: response.text()
                    };
                } else {
                    const openai = new OpenAI({ apiKey });
                    const messages = [];
                    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
                    messages.push({ role: 'user', content: finalPrompt });

                    const completion = await openai.chat.completions.create({
                        model: modelName,
                        messages,
                        timeout: 10000
                    });
                    return {
                        provider: 'OpenAI',
                        model: modelName,
                        output: completion.choices[0].message.content
                    };
                }
            } catch (err) {
                throw new Error(`${provider.toUpperCase()} AI Error: ${err.message}`);
            }
        case 'send_email':
            let activeTransporter;
            const smtpUser = action.config?.smtp_user;
            const smtpHost = action.config?.smtp_host || (smtpUser ? 'smtp.gmail.com' : null);
            const smtpPort = parseInt(action.config?.smtp_port) || 587;
            const smtpPass = action.config?.smtp_pass;
            const useRealSmtp = !!(smtpHost && smtpUser && smtpPass);

            if (!useRealSmtp) {
                console.log(`[EMAIL DEBUG] SMTP Connection disabled. Missing: ${!smtpHost ? 'Host ' : ''}${!smtpUser ? 'User ' : ''}${!smtpPass ? 'Password' : ''}`);
            }

            console.log(`[EMAIL] Node "${action.label}" - Using Real SMTP: ${useRealSmtp}`);
            const transporterKey = useRealSmtp ? `${smtpHost}:${smtpUser}` : 'ethereal';

            if (useRealSmtp) {
                if (smtpTransporters.has(transporterKey)) {
                    activeTransporter = smtpTransporters.get(transporterKey);
                } else {
                    console.log(`[EMAIL] Attempting connection to: ${smtpHost} as ${smtpUser}`);
                    activeTransporter = nodemailer.createTransport({
                        host: smtpHost,
                        port: smtpPort,
                        secure: smtpPort === 465,
                        auth: { user: smtpUser, pass: smtpPass },
                        debug: false,
                        logger: false,
                        tls: { rejectUnauthorized: false }
                    });
                    smtpTransporters.set(transporterKey, activeTransporter);
                }
            } else {
                await setupEmail();
                activeTransporter = transporter;
            }

            const fromEmail = smtpUser || 'noreplay@ethereal.email';
            const toEmail = (action.config?.to || "").trim() || "test@example.com";
            // Find the most recent result that isn't null and isn't the trigger
            const resultIds = Object.keys(context.results);
            const lastResultId = resultIds[resultIds.length - 1];
            const lastOutput = context.results[lastResultId]?.output || context.results[lastResultId];

            console.log(`[EMAIL] Sending from: ${fromEmail} to: ${toEmail}`);

            const info = await activeTransporter.sendMail({
                from: `"Flowz" <${fromEmail}>`,
                to: toEmail,
                subject: action.config?.subject || "Hello from Flowz",
                text: `Execution result: ${typeof lastOutput === 'string' ? lastOutput : JSON.stringify(lastOutput)}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #4F46E5; border-radius: 12px; max-width: 600px; margin: auto;">
                        <h1 style="color: #4F46E5; font-size: 24px; margin-bottom: 20px;">Automation Triggered</h1>
                        <p style="color: #334155; font-size: 16px;">The workflow <strong>"${context.workflowName || 'Default Flow'}"</strong> has executed a notification step.</p>
                        
                        ${lastOutput ? `
                        <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #C7D2FE;">
                            <strong style="display: block; margin-bottom: 10px; color: #3730A3;">Latest Output (AI/Data):</strong>
                            <div style="font-size: 15px; color: #1E1B4B; line-height: 1.5; white-space: pre-wrap;">${typeof lastOutput === 'string' ? lastOutput : JSON.stringify(lastOutput, null, 2)}</div>
                        </div>
                        ` : ''}

                        <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #E2E8F0;">
                            <strong style="display: block; margin-bottom: 10px; color: #1E293B;">Original Trigger Data:</strong>
                            <pre style="font-size: 13px; color: #475569; overflow-x: auto; margin: 0;">${JSON.stringify(context.trigger.payload, null, 2)}</pre>
                        </div>
                        <p style="font-size: 12px; color: #94A3B8; text-align: center; margin-top: 30px;">Sent via Flowz Engine</p>
                    </div>
                `,
            });

            console.log(`[EMAIL] Server Response: ${info.response}`);
            if (info.accepted?.length) console.log(`[EMAIL] Accepted by: ${info.accepted.join(', ')}`);

            const previewUrl = nodemailer.getTestMessageUrl(info);
            return {
                messageId: info.messageId,
                accepted: info.accepted,
                previewUrl: previewUrl || null,
                status: 'sent',
                service: useRealSmtp ? 'Custom SMTP' : 'Ethereal Test'
            };

        case 'delay':
            const delayMs = (parseInt(action.config?.duration_seconds) || 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return { waited_ms: delayMs };

        case 'save_to_database':
            const collectionName = (action.config?.collection || 'workflow_results').trim();
            const connString = action.config?.connection_string;

            try {
                let db;
                let storageType;

                if (connString) {

                    const client = await getExternalDb(connString);
                    db = client.db();
                    storageType = 'External MongoDB';
                } else {

                    db = mongoose.connection.db;
                    storageType = 'System Default MongoDB';
                }

                const collections = await db.listCollections({ name: collectionName }).toArray();
                if (collections.length === 0) {
                    await db.createCollection(collectionName);
                    console.log(`[DB] New collection created in ${storageType}: ${collectionName}`);
                }

                const result = await db.collection(collectionName).insertOne({
                    ...context.trigger.payload,
                    _autoflow_metadata: {
                        executed_at: new Date(),
                        node_id: action.id,
                        workflow_name: context.workflowName || 'test_run'
                    }
                });

                return {
                    storage: storageType,
                    collection: collectionName,
                    insertedId: result.insertedId,
                    status: 'success'
                };

            } catch (err) {
                console.error("[DB ERROR]:", err);
                throw new Error(`Database Error (${action.config?.collection}): ${err.message}`);
            }

        case 'ifElse':
            const condition = action.config?.condition || "true";
            let evaluation = false;
            try {
                const evalFn = new Function('payload', 'results', `
                    try {
                        return ${condition};
                    } catch (e) {
                        return false;
                    }
                `);
                evaluation = !!(evalFn(context.trigger.payload, context.results));
            } catch (err) {
                evaluation = false;
            }
            return {
                outcome: evaluation ? 'true' : 'false',
                evaluatedCondition: condition,
                evaluationStatus: 'success'
            };


        case 'log':
            const msg = action.config?.message || 'Standard Execution Log';
            console.log(`[USER LOG]: ${msg}`);
            return { logged: true, message: msg };

        default:
            return { status: 'executed', type: action.type };
    }
};

export const runWorkflow = async (nodes, edges, triggerPayload = {}) => {
    console.log("[ENGINE] Starting workflow execution...");
    const workflowStart = Date.now();
    const context = {
        trigger: { payload: triggerPayload },
        results: {},
    };

    const nodeLogs = [];
    const visited = new Set();

    // Improved Trigger Detection
    const triggerNodes = nodes.filter(n => {
        const type = n.data?.type?.toLowerCase() || '';
        return n.data?.isTrigger ||
            type.includes('trigger') ||
            ['app_event', 'form_submission', 'chat_message', 'other_ways'].includes(type);
    });

    if (triggerNodes.length === 0) {
        console.error("[ENGINE] Execution error: No trigger node found.");
        throw new Error('No trigger node found');
    }

    console.log(`[ENGINE] Found ${triggerNodes.length} Trigger Node(s)`);

    let queue = [...triggerNodes];
    let stepCount = 0;

    try {
        while (queue.length > 0) {
            stepCount++;
            const currentNode = queue.shift();
            if (visited.has(currentNode.id)) continue;
            visited.add(currentNode.id);

            console.log(`[ENGINE] Step ${stepCount}: Processing ${currentNode.data?.label || currentNode.id}`);
            const startTime = Date.now();
            try {
                const actionData = {
                    id: currentNode.id,
                    type: currentNode.data.type,
                    label: currentNode.data.label,
                    config: currentNode.data.config || {}
                };

                const inputSnapshot = {
                    trigger_payload: context.trigger.payload,
                    previous_results: { ...context.results }
                };

                const result = await executeAction(actionData, context);
                context.results[currentNode.id] = result;
                if (currentNode.data?.label) {
                    const labelKey = currentNode.data.label.replace(/\s+/g, '_');
                    context.results[labelKey] = result;
                }

                nodeLogs.push({
                    nodeId: currentNode.id,
                    nodeType: currentNode.data.type,
                    status: 'success',
                    input: inputSnapshot,
                    result,
                    duration: Date.now() - startTime
                });

                const outgoingEdges = edges.filter(e => e.source === currentNode.id);
                for (const edge of outgoingEdges) {
                    const nextNode = nodes.find(n => n.id === edge.target);
                    if (nextNode) {
                        if (currentNode.data.type === 'ifElse') {
                            if (edge.sourceHandle === result.outcome) {
                                queue.push(nextNode);
                            }
                        } else {
                            queue.push(nextNode);
                        }
                    }
                }
            } catch (error) {
                nodeLogs.push({
                    nodeId: currentNode.id,
                    nodeType: currentNode.data.type,
                    status: 'failure',
                    error: error.message,
                    duration: Date.now() - startTime
                });
                throw new Error(`Node "${currentNode.data.label || currentNode.id}" failed: ${error.message}`);
            }
        }
        return { status: 'success', nodeLogs, nodeResults: context.results, duration: Date.now() - workflowStart };
    } catch (error) {
        return { status: 'failure', error: error.message, nodeLogs, nodeResults: context.results, duration: Date.now() - workflowStart };
    }
};
