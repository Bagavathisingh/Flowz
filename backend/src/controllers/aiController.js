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

// ─── Helper: Extract JSON from AI text response ────────────────────────────────
function extractJson(text) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('AI output contained no JSON object.');
    return text.substring(start, end + 1).trim();
}

// ─── Zod schema — strict WorkflowSchema ───────────────────────────────────────
const NodeConfigSchema = z.object({
    method:            z.string().optional(),
    interval:          z.number().optional(),
    url:               z.string().optional(),
    to:                z.string().optional(),
    subject:           z.string().optional(),
    smtp_host:         z.string().optional(),
    smtp_port:         z.number().optional(),
    wait_time:         z.number().optional(),
    collection:        z.string().optional(),
    uri:               z.string().optional(),
    document:          z.string().optional(),
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
  *   CRITICAL: For ai_model nodes, the 'system_prompt' MUST be a detailed persona (e.g. "You are an AI customer service agent..."). 
  *   CRITICAL: The 'prompt' MUST use template variables to process input (e.g. "Summarize this: {{input.text}}"). DO NOT leave these blank.
- ifElse:              { "condition": "javascript_expression" } (evaluates payload or results)
- log:                 { "message": "string" }

Templating & Variables:
- Access Trigger Data: Use {{input.text}} for Telegram/Chat messages, or {{payload.form_data.field}} for forms, or {{payload.field}} for webhooks.
- Access Node Results: Use {{results.NODE_LABEL.output}}. (Example: {{results.AI_Assistant.output}})
- Interpolate strings using double curly braces: "Send this to {{payload.form_data.email}}".

Graph Rules:
1. Every node MUST have: id (unique string), type (from list), data: { label: "Human Readable Name", config: { ... } }, position: { x, y }
2. Spacing: Separate nodes by 260px horizontally (x) and 150px vertically (y) to look professional.
3. Edges: Connect nodes from source to target. For ifElse, use sourceHandle: "true" or "false".
4. Acyclic: NO cycles.
5. Return ONLY a single JSON object. No markdown, no commentary.`;


const MAX_ATTEMPTS = 2;

const selfCorrectingGenerate = async (modelName, userPrompt, previousAttempt = null) => {
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema:   WORKFLOW_RESPONSE_SCHEMA,
            temperature:      0.1,
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
    const cleaned = extractJson(rawText);
    const parsed  = JSON.parse(cleaned);

    const zodResult = WorkflowSchema.safeParse(parsed);
    if (!zodResult.success) {
        const issues = zodResult.error?.issues || zodResult.error?.errors || [];
        const errors = issues.map(e => `  • ${e.path.join('.')} — ${e.message}`).join('\n');
        return { success: false, rawText, errors, parsed };
    }

    return { success: true, data: zodResult.data };
};

const generateWithNvidia = async (userPrompt, previousAttempt = null, modelName = 'meta/llama-3.3-70b-instruct') => {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
        console.warn('[AI] NVIDIA_API_KEY not set — skipping NVIDIA fallback.');
        return { success: false, errors: 'NVIDIA_API_KEY not configured', rawText: '' };
    }

    const correctionPrefix = previousAttempt
        ? `Your previous response had validation errors:\n${previousAttempt.errors}\n\nYour previous (invalid) response was:\n${previousAttempt.rawText}\n\nFix ALL of the above errors and return a corrected workflow.\n\n`
        : '';

    const messages = [
        { role: 'system', content: WORKFLOW_SYSTEM_PROMPT },
        { role: 'user', content: `${correctionPrefix}User request: ${userPrompt}` }
    ];

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelName,
            messages,
            temperature: 0.1,
            max_tokens: 2048,
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
    const cleaned = extractJson(rawText);
    const parsed  = JSON.parse(cleaned);

    const zodResult = WorkflowSchema.safeParse(parsed);
    if (!zodResult.success) {
        const issues = zodResult.error?.issues || zodResult.error?.errors || [];
        const errors = issues.map(e => `  • ${e.path.join('.')} — ${e.message}`).join('\n');
        return { success: false, rawText, errors, parsed };
    }

    return { success: true, data: zodResult.data };
};

export const generateWorkflowConfig = async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];

    const fastModels = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];
    console.log(`[AI] Racing models: ${fastModels.join(', ')}`);
    
    try {
        const result = await Promise.any(
            fastModels.map(model => selfCorrectingGenerate(model, prompt))
        );

        if (result.success) {
            console.log(`[AI] ✓ Parallel race winner: ${result.data?.nodes?.length} nodes`);
            return res.json(result.data);
        }
    } catch (e) {
        console.warn('[AI] Parallel attempts failed or timed out. Falling back to serial cascade.');
    }

    let isQuotaExceeded = false;
    for (const modelName of modelsToTry) {
        if (isQuotaExceeded) break;
        console.log(`[AI] Attempting fallback generation with ${modelName}…`);
        let lastAttempt = null;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const result = await selfCorrectingGenerate(modelName, prompt, lastAttempt);
                if (result.success) {
                    console.log(`[AI] ✓ Generation succeeded — model: ${modelName}, attempt: ${attempt}`);
                    return res.json(result.data);
                }
                lastAttempt = { errors: result.errors, rawText: result.rawText };
            } catch (error) {
                console.error(`[AI] Error with ${modelName} attempt ${attempt}:`, error.message);
                if (error.message?.includes('429') || error.status === 429) {
                    console.warn('[AI] Gemini quota exceeded. Jumping to stable fallback…');
                    isQuotaExceeded = true;
                    break;
                }
                if (error.status === 503 || error.status === 404) break;
            }
        }
    }

    // ── NVIDIA NIM fallback ───────────────────────────────────────────────────
    console.log('[AI] All Gemini models failed. Trying NVIDIA NIM (High-Speed Mode)…');
    const nvidiaModels = [
        'meta/llama-3.1-8b-instruct',           // Fastest
        'deepseek-ai/deepseek-v3.2',           // Requested powerhouse
        'nvidia/llama-3.1-nemotron-70b-instruct' // High-quality fallback
    ];

    for (const nvidiaModel of nvidiaModels) {
        console.log(`[AI] Attempting NVIDIA NIM with: ${nvidiaModel}…`);
        let nvidiaLastAttempt = null;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const result = await generateWithNvidia(prompt, nvidiaLastAttempt, nvidiaModel);
                if (result.success) {
                    console.log(`[AI] ✓ NVIDIA NIM (${nvidiaModel}) succeeded on attempt ${attempt}`);
                    return res.json(result.data);
                }
                nvidiaLastAttempt = { errors: result.errors, rawText: result.rawText };
            } catch (error) {
                console.error(`[AI] NVIDIA NIM error (${nvidiaModel}) attempt ${attempt}:`, error.message);
                if (error.status === 429 || error.status === 503 || error.status === 401) break;
                nvidiaLastAttempt = { errors: `Parse error: ${error.message}`, rawText: '' };
            }
        }
    }

    return res.json({
        nodes: [
            { id: 'node_1', type: 'webhook_trigger', data: { label: 'Incoming Webhook', config: { method: 'POST' } }, position: { x: 300, y: 100 } },
            { id: 'node_2', type: 'ai_model', data: { label: 'AI Process', config: { provider: 'google', prompt: 'Summarize: {{input}}' } }, position: { x: 300, y: 300 } },
            { id: 'node_3', type: 'log', data: { label: 'Log Result', config: { message: 'Workflow complete' } }, position: { x: 300, y: 500 } }
        ],
        edges: [
            { id: 'e1', source: 'node_1', target: 'node_2' },
            { id: 'e2', source: 'node_2', target: 'node_3' }
        ],
        is_fallback: true
    });
};

export const modifyWorkflowConfig = async (req, res) => {
    const { currentWorkflow, prompt, selectedNodeId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];

    const modifySystemPrompt = `You are a professional workflow architect.
Modify the provided workflow (nodes and edges) based on the user's instructions.
Keep existing node IDs where possible.
${selectedNodeId ? `The node with id "${selectedNodeId}" is currently selected — prioritise modifying it if the prompt is ambiguous.` : ''}

Current Workflow:
${JSON.stringify(currentWorkflow, null, 2)}

Return ONLY valid JSON: { "nodes": [...], "edges": [...] }`;

    for (const modelName of modelsToTry) {
        let lastAttempt = null;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(`${modifySystemPrompt}\n\nUser instruction: ${prompt}`);
                const rawText = result.response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                const parsed = JSON.parse(rawText);
                const zodResult = WorkflowSchema.safeParse(parsed);
                if (zodResult.success) return res.json(zodResult.data);
                lastAttempt = { errors: zodResult.error.issues.map(i => i.message).join(','), rawText };
            } catch (error) {
                if (error.status === 429) break;
            }
        }
    }
    return res.json(currentWorkflow);
};

export const explainErrorLog = async (req, res) => {
    try {
        const { logs, error, currentWorkflow } = req.body;
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(`Explain this error:\n${error}\nLogs:\n${JSON.stringify(logs)}`);
        res.json({ explanation: result.response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const chatDebug = async (req, res) => {
    try {
        const { message, history } = req.body;
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(`User: ${message}\nHistory: ${JSON.stringify(history)}`);
        res.json({ text: result.response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};