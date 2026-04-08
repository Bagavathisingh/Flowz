import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

// Required env vars:
// GEMINI_API_KEY  — primary Gemini provider
// NVIDIA_API_KEY_DEBUG  — fallback NVIDIA NIM provider

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY || ''
);

// ─── Helper: Extract JSON from AI text response ────────────────────────────────
function extractJson(text) {
    try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) return text; // Return as is if no JSON found
        return text.substring(start, end + 1).trim();
    } catch (e) {
        return text;
    }
}

// ─── Zod schemas — strictly for Workflow Architecture ──────────────────────────
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
    'ai_model', 'ifElse', 'log', 'user_registration', 'user_login',
    'mongodb', 'postgresql', 'mysql'
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

const WORKFLOW_SYSTEM_PROMPT = `You are an advanced workflow architect generator. Return ONLY JSON.
Reference Node Types: ${ALLOWED_NODE_TYPES.join(', ')}.
Ensure data mapping uses {{payload.field}} or {{results.NODE.output}}.`;

// ─── Core: Generic NVIDIA NIM Completion ────────────────────────────────────
const nvidiaChatCompletion = async (systemPrompt, userPrompt, modelName = 'meta/llama-3.3-70b-instruct') => {
    const apiKey = process.env.NVIDIA_API_KEY_DEBUG;
    if (!apiKey) throw new Error('NVIDIA_API_KEY_DEBUG not configured');

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelName,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userPrompt }
            ],
            temperature: 0.1,
            max_tokens: 2048,
        })
    });

    if (!response.ok) throw new Error(`NVIDIA API Error: ${response.status}`);
    const json = await response.json();
    return json.choices?.[0]?.message?.content || '';
};

export const generateWorkflowConfig = async (req, res) => {
    const { prompt } = req.body;
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json', responseSchema: WORKFLOW_RESPONSE_SCHEMA }
        });
        const result = await model.generateContent(prompt);
        return res.json(JSON.parse(result.response.text()));
    } catch (err) {
        console.warn('[AI] Gemini failed, trying NVIDIA NIM...');
        try {
            const raw = await nvidiaChatCompletion(WORKFLOW_SYSTEM_PROMPT, prompt);
            const parsed = JSON.parse(extractJson(raw));
            return res.json(parsed);
        } catch (nvErr) {
            res.status(500).json({ error: 'All AI models failed' });
        }
    }
};

export const modifyWorkflowConfig = async (req, res) => {
    const { currentWorkflow, prompt } = req.body;
    const sys = `Modify this workflow JSON: ${JSON.stringify(currentWorkflow)}. Return ONLY JSON.`;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(`${sys}\n\nUser: ${prompt}`);
        return res.json(JSON.parse(extractJson(result.response.text())));
    } catch (err) {
        res.status(500).json(currentWorkflow);
    }
};

export const explainErrorLog = async (req, res) => {
    const { logs, error, currentWorkflow } = req.body;
    const sys = `You are a Senior Debugger. Analyze failure and return JSON:
{ "classification": "USER_SIDE_ERROR" | "SYSTEM_LOGIC_BUG", "explanation": "string", "cause": "string", "fix": "string", "suggestedFixWorkflow": null }`;
    const user = `Error: ${error}\nLogs: ${JSON.stringify(logs)}\nWorkflow: ${JSON.stringify(currentWorkflow)}`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(`${sys}\n\n${user}`);
        return res.json(JSON.parse(extractJson(result.response.text())));
    } catch (err) {
        console.warn('[AI] Explain fallback...');
        try {
            const raw = await nvidiaChatCompletion(sys, user);
            return res.json(JSON.parse(extractJson(raw)));
        } catch (nvErr) {
            res.status(500).json({ explanation: "Analysis failed." });
        }
    }
};

export const chatDebug = async (req, res) => {
    const { message, history, currentWorkflow, lastError } = req.body;
    const sys = `You are Flowz AI Assistant. Return JSON: { "text": "string", "suggestedFixWorkflow": null }`;
    const user = `History: ${JSON.stringify(history)}\nWorkflow: ${JSON.stringify(currentWorkflow)}\nError: ${lastError}\nUser: ${message}`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(`${sys}\n\n${user}`);
        return res.json(JSON.parse(extractJson(result.response.text())));
    } catch (err) {
        try {
            const raw = await nvidiaChatCompletion(sys, user);
            return res.json(JSON.parse(extractJson(raw)));
        } catch (nvErr) {
            res.status(500).json({ text: "Assistant error." });
        }
    }
};