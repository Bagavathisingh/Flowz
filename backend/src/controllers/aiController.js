import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

// Required env vars:
// GEMINI_API_KEY  — primary Gemini provider
// NVIDIA_API_KEY  — fallback NVIDIA NIM provider (meta/llama-3.3-70b-instruct)

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY || ''
);

// ─── Zod schema — strict WorkflowSchema ───────────────────────────────────────
const NodeConfigSchema = z.object({
    method:            z.string().optional(),
    interval:          z.number().optional(),
    url:               z.string().optional(),
    to:                z.string().optional(),
    subject:           z.string().optional(),
    smtp_host:         z.string().optional(),
    smtp_port:         z.number().optional(),
    duration_seconds:  z.number().optional(),
    collection:        z.string().optional(),
    connection_string: z.string().optional(),
    provider:          z.enum(['google', 'openai', 'nvidia']).optional(),
    model:             z.string().optional(),
    prompt:            z.string().optional(),
    system_prompt:     z.string().optional(),
    condition:         z.string().optional(),
    message:           z.string().optional(),
    telegram_token:    z.string().optional(),
    fields:            z.string().optional(),
    body:              z.string().optional(),
    data:              z.any().optional(),
}).passthrough();

const NodeDataSchema = z.object({
    label:  z.string().min(1),
    config: NodeConfigSchema.optional().default({})
}).passthrough();

const ALLOWED_NODE_TYPES = [
    'webhook_trigger', 'schedule_trigger', 'manual_trigger',
    'app_event', 'form_submission', 'chat_message', 'other_ways', 'sub_workflow_trigger',
    'http_request', 'send_email', 'delay', 'save_to_database',
    'ai_model', 'ifElse', 'log'
];

const WorkflowNodeSchema = z.object({
    id:   z.string().min(1),
    type: z.enum(ALLOWED_NODE_TYPES),
    data: NodeDataSchema,
    position: z.object({ x: z.number(), y: z.number() }).optional().default({ x: 0, y: 0 })
});

const WorkflowEdgeSchema = z.object({
    id:           z.string().min(1),
    source:       z.string().min(1),
    target:       z.string().min(1),
    sourceHandle: z.string().optional()
});

export const WorkflowSchema = z.object({
    nodes: z.array(WorkflowNodeSchema).min(1),
    edges: z.array(WorkflowEdgeSchema)
});

// ─── Gemini responseSchema ─────────────────────────────────────────────────────
const WORKFLOW_RESPONSE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        nodes: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id:   { type: SchemaType.STRING },
                    type: { type: SchemaType.STRING },
                    data: {
                        type: SchemaType.OBJECT,
                        properties: {
                            label:  { type: SchemaType.STRING },
                            config: { type: SchemaType.OBJECT }
                        },
                        required: ['label']
                    },
                    position: {
                        type: SchemaType.OBJECT,
                        properties: {
                            x: { type: SchemaType.NUMBER },
                            y: { type: SchemaType.NUMBER }
                        }
                    }
                },
                required: ['id', 'type', 'data']
            }
        },
        edges: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id:           { type: SchemaType.STRING },
                    source:       { type: SchemaType.STRING },
                    target:       { type: SchemaType.STRING },
                    sourceHandle: { type: SchemaType.STRING }
                },
                required: ['id', 'source', 'target']
            }
        }
    },
    required: ['nodes', 'edges']
};

// ─── Shared system prompt ──────────────────────────────────────────────────────
// ─── Shared system prompt ──────────────────────────────────────────────────────
const WORKFLOW_SYSTEM_PROMPT = `You are an advanced workflow architect generator like n8n or Zapier. 
Your goal is to convert user requirements into a high-quality, executable Directed Acyclic Graph (DAG) JSON.

Node Type Reference & Schema:
- webhook_trigger:     { "method": "GET"|"POST" }
- schedule_trigger:    { "interval": number }  (seconds)
- manual_trigger:      {}
- app_event:           { "telegram_token": "string", "chat_id": "string" } (Telegram Trigger)
- form_submission:     {}
- chat_message:        {} (Chat Widget Trigger)
- sub_workflow_trigger:{}
- http_request:        { "url": "string", "method": "GET"|"POST"|"PUT"|"DELETE", "body": "string" }
- send_email:          { "to": "email", "subject": "string", "body": "string", "smtp_host": "string", "smtp_port": number, "smtp_user": "string", "smtp_pass": "string" }
- delay:               { "wait_time": number } (in MILLISECONDS)
- save_to_database:    { "uri": "string", "collection": "string", "document": "string (JSON)" }
- ai_model:            { "provider": "google"|"openai"|"nvidia", "model": "string", "prompt": "string", "system_prompt": "string" }
- ifElse:              { "condition": "javascript_expression" } (evaluates payload or results)
- log:                 { "message": "string" }

Templating & Variables:
- Access Trigger Data: Use {{input.text}} for Telegram/Chat messages, or {{payload.field}} for webhooks.
- Access Node Results: Use {{results.NODE_LABEL.output}} or {{results.NODE_ID.output}}.
- Interpolate strings using double curly braces: "Process {{input.text}} right now".

Graph Rules:
1. Every node MUST have: id (unique string), type (from list), data: { label: "Human Readable Name", config: { ... } }, position: { x, y }
2. Spacing: Separate nodes by 260px horizontally (x) and 150px vertically (y) to look professional.
3. Edges: Connect nodes from source to target. For ifElse, use sourceHandle: "true" or "false".
4. Acyclic: NO cycles.
5. Return ONLY a single JSON object. No markdown, no commentary.`;


const MAX_ATTEMPTS = 2;

// ─── Gemini self-correcting generation helper ──────────────────────────────────
const selfCorrectingGenerate = async (modelName, userPrompt, previousAttempt = null) => {
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema:   WORKFLOW_RESPONSE_SCHEMA,
            temperature:      0.3,
        }
    });

    const correctionPrefix = previousAttempt
        ? `Your previous response had validation errors:\n${previousAttempt.errors}\n\nYour previous (invalid) response was:\n${previousAttempt.rawText}\n\nFix ALL of the above errors and return a corrected workflow.\n\n`
        : '';

    const contents = [
        { role: 'user',  parts: [{ text: WORKFLOW_SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I will generate a valid workflow JSON.' }] },
        { role: 'user',  parts: [{ text: `${correctionPrefix}User request: ${userPrompt}` }] }
    ];

    const result  = await model.generateContent({ contents });
    const rawText = result.response.text();
    const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed  = JSON.parse(cleaned);

    const zodResult = WorkflowSchema.safeParse(parsed);
    if (!zodResult.success) {
        const errors = zodResult.error.errors.map(e => `  • ${e.path.join('.')} — ${e.message}`).join('\n');
        return { success: false, rawText, errors, parsed };
    }

    return { success: true, data: zodResult.data };
};

// ─── NEW: NVIDIA NIM fallback generation helper ────────────────────────────────
const generateWithNvidia = async (userPrompt, previousAttempt = null) => {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
        console.warn('[AI] NVIDIA_API_KEY not set — skipping NVIDIA fallback.');
        return { success: false, errors: 'NVIDIA_API_KEY not configured', rawText: '' };
    }

    const correctionPrefix = previousAttempt
        ? `Your previous response had validation errors:\n${previousAttempt.errors}\n\nYour previous (invalid) response was:\n${previousAttempt.rawText}\n\nFix ALL of the above errors and return a corrected workflow.\n\n`
        : '';

    const messages = [
        {
            role: 'system',
            content: WORKFLOW_SYSTEM_PROMPT
        },
        {
            role: 'user',
            content: `${correctionPrefix}User request: ${userPrompt}`
        }
    ];

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model:       'meta/llama-3.3-70b-instruct',
            messages,
            temperature: 0.2,
            max_tokens:  2048,
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw Object.assign(
            new Error(`NVIDIA API error ${response.status}: ${errText}`),
            { status: response.status }
        );
    }

    const json    = await response.json();
    const rawText = json.choices?.[0]?.message?.content || '';
    const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed  = JSON.parse(cleaned);

    const zodResult = WorkflowSchema.safeParse(parsed);
    if (!zodResult.success) {
        const errors = zodResult.error.errors.map(e => `  • ${e.path.join('.')} — ${e.message}`).join('\n');
        return { success: false, rawText, errors, parsed };
    }

    return { success: true, data: zodResult.data };
};

// ─── generateWorkflowConfig ────────────────────────────────────────────────────
export const generateWorkflowConfig = async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    // Faster models prioritized
    const modelsToTry = [
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash',
        'gemini-2.5-flash'
    ];

    // Parallelize the primary attempt for maximum speed
    const fastModels = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];
    console.log(`[AI] Racing models: ${fastModels.join(', ')}`);
    
    try {
        const result = await Promise.any(
            fastModels.map(model => selfCorrectingGenerate(model, prompt))
        ).then(res => {
            if (res.success) return res;
            throw new Error('Initial generation failed');
        });

        if (result.success) {
            console.log(`[AI] ✓ Parallel race winner: ${result.data?.nodes?.length} nodes`);
            return res.json(result.data);
        }
    } catch (e) {
        console.warn('[AI] Parallel attempts failed or timed out. Falling back to serial cascade.', e.message);
    }

    // ── Gemini cascade (Fallback) ─────────────────────────────────────────────
    for (const modelName of modelsToTry) {
        console.log(`[AI] Attempting fallback generation with ${modelName}…`);
        let lastAttempt = null;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const result = await selfCorrectingGenerate(modelName, prompt, lastAttempt);

                if (result.success) {
                    console.log(`[AI] ✓ Generation succeeded — model: ${modelName}, attempt: ${attempt}`);
                    return res.json(result.data);
                }

                console.warn(`[AI] ✗ Attempt ${attempt}/${MAX_ATTEMPTS} Zod validation failed:\n${result.errors}`);
                lastAttempt = { errors: result.errors, rawText: result.rawText };

            } catch (error) {
                console.error(`[AI] Error with ${modelName} attempt ${attempt}:`, error.message);

                if (error.status === 429 || error.status === 503 || error.status === 404) {
                    console.warn(`[AI] ${modelName} unavailable (${error.status}), skipping to next model…`);
                    break;
                }

                lastAttempt = {
                    errors:  `JSON parse error: ${error.message}`,
                    rawText: error.rawText || '(unparseable)'
                };
            }
        }
        console.warn(`[AI] ${modelName} exhausted all ${MAX_ATTEMPTS} correction attempts.`);
    }

    // ── NVIDIA NIM fallback ───────────────────────────────────────────────────
    console.log('[AI] All Gemini models failed. Trying NVIDIA NIM fallback (meta/llama-3.3-70b-instruct)…');
    let nvidiaLastAttempt = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const result = await generateWithNvidia(prompt, nvidiaLastAttempt);

            if (result.success) {
                console.log(`[AI] ✓ NVIDIA NIM succeeded on attempt ${attempt}`);
                return res.json(result.data);
            }

            console.warn(`[AI] ✗ NVIDIA attempt ${attempt}/${MAX_ATTEMPTS} Zod validation failed:\n${result.errors}`);
            nvidiaLastAttempt = { errors: result.errors, rawText: result.rawText };

        } catch (error) {
            console.error(`[AI] NVIDIA NIM error attempt ${attempt}:`, error.message);

            if (error.status === 429 || error.status === 503 || error.status === 401) {
                console.warn(`[AI] NVIDIA NIM unavailable (${error.status}), stopping fallback.`);
                break;
            }

            nvidiaLastAttempt = {
                errors:  `JSON parse error: ${error.message}`,
                rawText: ''
            };
        }
    }

    console.warn('[AI] NVIDIA NIM fallback also failed. Returning static fallback workflow.');

    // ── Static fallback ───────────────────────────────────────────────────────
    return res.json({
        nodes: [
            { id: 'node_1', type: 'webhook_trigger', data: { label: 'Incoming Webhook', config: { method: 'POST' } },                              position: { x: 300, y: 100 } },
            { id: 'node_2', type: 'ai_model',        data: { label: 'AI Process',       config: { provider: 'google', prompt: 'Summarize: {{input}}' } }, position: { x: 300, y: 300 } },
            { id: 'node_3', type: 'log',             data: { label: 'Log Result',        config: { message: 'Workflow complete' } },                 position: { x: 300, y: 500 } }
        ],
        edges: [
            { id: 'e1', source: 'node_1', target: 'node_2' },
            { id: 'e2', source: 'node_2', target: 'node_3' }
        ],
        is_fallback: true,
        note: 'AI service is currently at capacity. Here is a starter template.'
    });
};

// ─── modifyWorkflowConfig ──────────────────────────────────────────────────────
export const modifyWorkflowConfig = async (req, res) => {
    const { currentWorkflow, prompt, selectedNodeId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash'];

    const modifySystemPrompt = `You are a professional workflow architect.
Modify the provided workflow (nodes and edges) based on the user's instructions.
Keep existing node IDs where possible.
${selectedNodeId ? `The node with id "${selectedNodeId}" is currently selected — prioritise modifying it if the prompt is ambiguous.` : ''}

CRITICAL Node Structure:
Each node MUST have: "id" (string), "type" (from allowed list), "data": { "label": string, "config": {} }

Allowed Node Types: webhook_trigger, schedule_trigger, manual_trigger, app_event, form_submission,
chat_message, sub_workflow_trigger, http_request, send_email, delay, save_to_database,
ai_model, ifElse, log

Current Workflow:
${JSON.stringify(currentWorkflow, null, 2)}

Return ONLY valid JSON: { "nodes": [...], "edges": [...] }`;

    // ── Gemini cascade ────────────────────────────────────────────────────────
    for (const modelName of modelsToTry) {
        console.log(`[AI] Attempting modification with ${modelName}…`);
        let lastAttempt = null;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema:   WORKFLOW_RESPONSE_SCHEMA,
                        temperature:      0.2
                    }
                });

                const correctionPrefix = lastAttempt
                    ? `Your previous response had errors:\n${lastAttempt.errors}\n\nFix them in the new response.\n\n`
                    : '';

                const result    = await model.generateContent([
                    { text: modifySystemPrompt },
                    { text: `${correctionPrefix}User instruction: ${prompt}` }
                ]);
                const rawText   = result.response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                const parsed    = JSON.parse(rawText);
                const zodResult = WorkflowSchema.safeParse(parsed);

                if (zodResult.success) {
                    console.log(`[AI] ✓ Modification succeeded — model: ${modelName}, attempt: ${attempt}`);
                    return res.json(zodResult.data);
                }

                const errors = zodResult.error.errors.map(e => `  • ${e.path.join('.')} — ${e.message}`).join('\n');
                console.warn(`[AI] ✗ Modification attempt ${attempt} Zod errors:\n${errors}`);
                lastAttempt = { errors, rawText };

            } catch (error) {
                console.error(`[AI] Modification error ${modelName} attempt ${attempt}:`, error.message);
                if (error.status === 429 || error.status === 503) break;
                lastAttempt = { errors: `Parse error: ${error.message}`, rawText: '' };
            }
        }
    }

    // ── NVIDIA NIM fallback for modify ────────────────────────────────────────
    console.log('[AI] Gemini modification failed. Trying NVIDIA NIM fallback…');
    let nvidiaLastAttempt = null;

    const nvidiaModifyPrompt = `${modifySystemPrompt}\n\nUser instruction: ${prompt}`;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const result = await generateWithNvidia(nvidiaModifyPrompt, nvidiaLastAttempt);

            if (result.success) {
                console.log(`[AI] ✓ NVIDIA NIM modification succeeded on attempt ${attempt}`);
                return res.json(result.data);
            }

            console.warn(`[AI] ✗ NVIDIA modify attempt ${attempt}/${MAX_ATTEMPTS} Zod errors:\n${result.errors}`);
            nvidiaLastAttempt = { errors: result.errors, rawText: result.rawText };

        } catch (error) {
            console.error(`[AI] NVIDIA NIM modify error attempt ${attempt}:`, error.message);

            if (error.status === 429 || error.status === 503 || error.status === 401) {
                console.warn(`[AI] NVIDIA NIM unavailable (${error.status}), stopping.`);
                break;
            }

            nvidiaLastAttempt = { errors: `Parse error: ${error.message}`, rawText: '' };
        }
    }

    console.warn('[AI] Modification failed — returning current workflow unchanged.');
    return res.json({ ...currentWorkflow, is_fallback: true, note: 'AI service busy; workflow was not modified.' });
};

// ─── explainErrorLog ───────────────────────────────────────────────────────────
// (unchanged)
export const explainErrorLog = async (req, res) => {
    try {
        const { logs, error, currentWorkflow } = req.body;
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `You are a professional workflow debugger. An error occurred while executing the following workflow.

Current Workflow:
${JSON.stringify(currentWorkflow, null, 2)}

Execution Logs:
${JSON.stringify(logs, null, 2)}

Error Message: ${error}

Output JSON with:
- "explanation": Clear summary of what went wrong + ask permission before applying any fix.
- "cause": The specific node or configuration that caused it.
- "fix": Human-readable instruction on how to fix it.
- "suggestedFixWorkflow": (Optional) Updated nodes and edges JSON using original node IDs.

IMPORTANT: Return ONLY the JSON object.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        res.json(JSON.parse(text));
    } catch (error) {
        console.error('[AI] Debug error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ─── chatDebug ─────────────────────────────────────────────────────────────────
// (unchanged)
export const chatDebug = async (req, res) => {
    try {
        const { message, history, currentWorkflow, lastError } = req.body;
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `You are a helpful AI Debug Assistant for a workflow builder tool (Flowz / miniN8N).

Current Workflow:
${JSON.stringify(currentWorkflow, null, 2)}

Last Known Error: ${lastError || 'None'}

Chat History:
${JSON.stringify(history, null, 2)}

New User Message: "${message}"

Instructions:
1. Focus ONLY on workflow errors, logic issues, or debugging steps.
2. If you provide a 'suggestedFixWorkflow', your 'text' MUST ask for the user's consent first.
3. NEVER apply changes without explicit permission.
4. DO NOT change node positions or visual UI properties.

Output JSON:
- "text": Your response (including permission prompt if a fix is offered).
- "suggestedFixWorkflow": (Optional) { "nodes": [...], "edges": [...] }

Return ONLY the JSON object.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        res.json(JSON.parse(text));
    } catch (error) {
        console.error('[AI] Chat debug error:', error);
        res.status(500).json({ error: error.message });
    }
};