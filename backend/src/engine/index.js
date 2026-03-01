import axios from 'axios';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Setup email transporter (using Ethereal for "real" but free testing)
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

// Cache for external MongoDB connections to avoid re-connecting every node
const dbConnections = new Map();

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

    switch (action.type) {
        case 'webhook_trigger':
            return {
                status: 'received',
                timestamp: new Date().toISOString(),
                input: context.trigger.payload
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
            const apiKey = action.config?.api_key || (provider === 'google' ? process.env.OPEN_API_KEY : process.env.OPENAI_API_KEY);
            const modelName = action.config?.model || (provider === 'google' ? 'gemini-flash-latest' : 'gpt-4o');
            let promptTemplate = action.config?.prompt || 'Summarize this: {{input}}';

            if (!apiKey) throw new Error(`API Key for ${provider} is missing. Please configure it in node properties.`);

            // Replace {{input}} with stringified payload
            const finalPrompt = promptTemplate.replace('{{input}}', JSON.stringify(context.trigger.payload));

            try {
                if (provider === 'google') {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(finalPrompt);
                    const response = await result.response;
                    return {
                        provider: 'Google Gemini',
                        model: modelName,
                        output: response.text()
                    };
                } else {
                    const openai = new OpenAI({ apiKey });
                    const completion = await openai.chat.completions.create({
                        model: modelName,
                        messages: [{ role: 'user', content: finalPrompt }],
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
            if (useRealSmtp) {
                console.log(`[EMAIL] Attempting connection to: ${smtpHost} as ${smtpUser}`);
                activeTransporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: smtpPort,
                    secure: smtpPort === 465,
                    auth: {
                        user: smtpUser,
                        pass: smtpPass,
                    },
                    debug: true,
                    logger: true,
                    tls: {
                        rejectUnauthorized: false
                    }
                });
            } else {
                console.log(`[EMAIL] Falling back to Ethereal test mode.`);
                await setupEmail();
                activeTransporter = transporter;
            }

            const fromEmail = smtpUser || 'noreplay@ethereal.email';
            const toEmail = action.config?.to || "test@example.com";

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
            const delayMs = (parseInt(action.config?.duration_minutes) || 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return { waited_ms: delayMs };

        case 'save_to_database':
            const collectionName = (action.config?.collection || 'workflow_results').trim();
            const connString = action.config?.connection_string;

            try {
                let db;
                let storageType;

                if (connString) {
                    // External MongoDB storage
                    const client = await getExternalDb(connString);
                    db = client.db();
                    storageType = 'External MongoDB';
                } else {
                    // Internal MongoDB storage
                    db = mongoose.connection.db;
                    storageType = 'System Default MongoDB';
                }

                // USER REQUEST: Check if collection exists, if not create it
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
                evaluation = !!(new Function('payload', `return ${condition}`)(context.trigger.payload));
            } catch (e) {
                evaluation = false;
            }
            return {
                outcome: evaluation ? 'true' : 'false',
                evaluatedCondition: condition
            };

        case 'log':
            const msg = action.config?.message || 'Standard Execution Log';
            console.log(`[USER LOG]: ${msg}`);
            return { logged: true, message: msg };

        default:
            return { status: 'executed', type: action.type };
    }
};

export const runWorkflow = async (nodes, edges, initialPayload) => {
    console.log("[ENGINE] Starting workflow execution...");
    const context = {
        trigger: { payload: initialPayload },
        results: {}
    };

    const nodeLogs = [];
    const visited = new Set();

    // Find trigger
    const triggerNode = nodes.find(n => n.data?.isTrigger || n.data?.type?.toLowerCase().includes('trigger'));

    if (!triggerNode) {
        console.error("[ENGINE] Execution error: No trigger node found.");
        throw new Error('No trigger node found');
    }

    console.log(`[ENGINE] Found Trigger: ${triggerNode.data?.label} (${triggerNode.data?.type})`);

    let queue = [triggerNode];
    let stepCount = 0;

    try {
        while (queue.length > 0) {
            stepCount++;
            const currentNode = queue.shift();
            if (visited.has(currentNode.id)) continue;
            visited.add(currentNode.id);

            console.log(`[ENGINE] Step ${stepCount}: Processing ${currentNode.data?.label}`);
            const startTime = Date.now();
            try {
                const actionData = {
                    id: currentNode.id,
                    type: currentNode.data.type,
                    label: currentNode.data.label,
                    config: currentNode.data.config || {}
                };

                const result = await executeAction(actionData, context);
                context.results[currentNode.id] = result;

                nodeLogs.push({
                    nodeId: currentNode.id,
                    nodeType: currentNode.data.type,
                    status: 'success',
                    result,
                    duration: Date.now() - startTime
                });

                // Get outgoing edges
                const outgoingEdges = edges.filter(e => e.source === currentNode.id);

                for (const edge of outgoingEdges) {
                    const nextNode = nodes.find(n => n.id === edge.target);
                    if (!nextNode) continue;

                    if (currentNode.data.type === 'ifElse') {
                        const branch = result.outcome;
                        if (edge.sourceHandle === branch) {
                            queue.push(nextNode);
                        }
                    } else {
                        queue.push(nextNode);
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
        return { status: 'success', nodeLogs };
    } catch (error) {
        return { status: 'failure', error: error.message, nodeLogs };
    }
};
