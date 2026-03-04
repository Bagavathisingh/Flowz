import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

const cleanJson = (text) => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const WORKFLOW_SYSTEM_PROMPT = `You are an advanced workflow architect generator like n8n. 
Convert user text into a structured JSON Directed Acyclic Graph (DAG).

Allowed Node Types & Config Schemas:
- webhook_trigger: { "method": "GET"|"POST" }
- schedule_trigger: { "cron": "string" }
- app_event: { "telegram_token": "string" }
- http_request: { "url": "string", "method": "GET"|"POST"|"PUT"|"DELETE" }
- send_email: { "to": "email", "subject": "string" }
- delay: { "duration_minutes": number }
- save_to_database: { "collection": "string" }
- ai_model: { "provider": "google"|"openai"|"anthropic", "model": "string", "prompt": "Instruction with {{input}}", "system_prompt": "optional persona" }
- ifElse: { "condition": "javascript_expression_using_payload" }
- log: { "message": "string" }

Nodes must contain: id, type, data: { label, type, config }.
Labels should be concise and human-friendly.
Edges must contain: id, source, target.
For ifElse connections, use sourceHandle "true" or "false".

Return ONLY valid JSON.
Format: { "nodes": [...], "edges": [...] }`;

const callAI = async (provider, model, prompt, systemPrompt) => {
    if (provider === 'google') {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        const m = genAI.getGenerativeModel({ model, systemInstruction: systemPrompt });
        const result = await m.generateContent(prompt);
        return result.response.text();
    } else if (provider === 'anthropic') {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        const claude = new Anthropic({ apiKey });
        const msg = await claude.messages.create({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }]
        });
        return msg.content[0]?.text || '';
    } else {
        // OpenAI
        const apiKey = process.env.OPENAI_API_KEY;
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ]
        });
        return completion.choices[0].message.content;
    }
};

export const generateWorkflowConfig = async (req, res) => {
    try {
        const { prompt, provider = 'google', model = 'gemini-1.5-flash-latest' } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        // Check if raw JSON was pasted
        try {
            const rawJsonFallback = JSON.parse(prompt);
            if (rawJsonFallback && (rawJsonFallback.nodes || rawJsonFallback.trigger)) {
                return res.json(rawJsonFallback);
            }
        } catch (e) { }

        console.log(`[AI GENERATOR] Provider: ${provider}, Model: ${model}`);

        const text = await callAI(provider, model, `User request: ${prompt}`, WORKFLOW_SYSTEM_PROMPT);
        const flowJson = JSON.parse(cleanJson(text));
        return res.json(flowJson);

    } catch (error) {
        console.error('Workflow Generation Error:', error.message);

        if (error.status === 429) {
            return res.status(429).json({ error: 'AI Quota Exceeded. Please wait a minute and try again.' });
        }

        return res.json({
            nodes: [
                { id: 'node_trigger', type: 'webhook_trigger', data: { label: 'Incoming Webhook', type: 'webhook_trigger', config: { method: 'POST' } } },
                { id: 'node_success', type: 'http_request', data: { label: 'Notify', type: 'http_request', config: { url: 'https://api.example.com' } } }
            ],
            edges: [{ id: 'e1', source: 'node_trigger', target: 'node_success' }]
        });
    }
};

export const explainErrorLog = async (req, res) => {
    try {
        const { logs, error, provider = 'google', model = 'gemini-1.5-flash-latest' } = req.body;
        const prompt = `You explain automation execution errors. Given the logs and error message, output JSON with 'explanation', 'cause', and 'fix' keys.
Logs: ${JSON.stringify(logs)}
Error: ${error}

IMPORTANT: Return ONLY the JSON object.`;

        const text = await callAI(provider, model, prompt, 'You are an expert automation debugger. Always respond with valid JSON only.');
        res.json(JSON.parse(cleanJson(text)));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const modifyWorkflowConfig = async (req, res) => {
    try {
        const { currentWorkflow, prompt, provider = 'google', model = 'gemini-1.5-flash-latest' } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        console.log(`[AI MODIFIER] Provider: ${provider}, Model: ${model}`);

        const systemPrompt = `${WORKFLOW_SYSTEM_PROMPT}

You are modifying an existing workflow. Keep existing node IDs where possible.
Current Workflow:
${JSON.stringify(currentWorkflow, null, 2)}`;

        const text = await callAI(provider, model, `User instruction to modify the workflow: ${prompt}`, systemPrompt);
        const flowJson = JSON.parse(cleanJson(text));
        return res.json(flowJson);

    } catch (error) {
        console.error('AI Modification Error:', error.message);

        if (error.status === 429) {
            return res.status(429).json({ error: 'AI Quota Exceeded. Please wait a bit and try again.' });
        }
        res.status(500).json({ error: error.message });
    }
};
