import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.OPENAI_API_KEY || '');

const cleanJson = (text) => {
    try {
        // Try to find the first '{' and the last '}'
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            return text.substring(start, end + 1);
        }
    } catch (e) {
        console.error("Error cleaning JSON:", e);
    }
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const generateWorkflowConfig = async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        try {
            const rawJsonFallback = JSON.parse(prompt);
            if (rawJsonFallback && (rawJsonFallback.nodes || rawJsonFallback.trigger)) {
                return res.json(rawJsonFallback);
            }
        } catch (e) { }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const systemPrompt = `You are an advanced workflow architect generator like n8n. 
        Convert user text into a structured JSON Directed Acyclic Graph (DAG).
        
        Allowed Node Types & Config Schemas:
        - webhook_trigger: { "method": "GET"|"POST" }
        - schedule_trigger: { "cron": "string" }
        - http_request: { "url": "string", "method": "GET"|"POST"|"PUT"|"DELETE" }
        - send_email: { "to": "email", "subject": "string" }
        - delay: { "duration_minutes": number }
        - save_to_database: { "collection": "string" }
        - ai_model: { "provider": "google"|"openai", "model": "string", "prompt": "Instruction with {{input}}" }
        - ifElse: { "condition": "javascript_expression_using_payload" } (e.g. "payload.age > 18")
        - log: { "message": "string" }

        Nodes must contain: id, type, data: { label, config }. Labels should be concise.
        Edges must contain: id, source, target, sourceHandle (for ifElse connections, use "true" or "false").
        
        Return ONLY valid JSON.
        Format: { "nodes": [...], "edges": [...] }`;

        const result = await model.generateContent([
            { text: systemPrompt },
            { text: `User request: ${prompt}` }
        ]);

        const text = result.response.text();
        const flowJson = JSON.parse(cleanJson(text));
        return res.json(flowJson);

    } catch (error) {
        console.error("Gemini Error:", error);

        if (error.status === 429) {
            return res.status(429).json({
                error: "AI Quota Exceeded. Please wait a minute and try again."
            });
        }

        return res.status(500).json({
            error: "Failed to generate workflow configuration.",
            details: error.message
        });
    }
};

export const explainErrorLog = async (req, res) => {
    try {
        const { logs, error } = req.body;
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `You explain automation execution errors. Given the logs and error message, output JSON with 'explanation', 'cause', and 'fix' keys.
        Logs: ${JSON.stringify(logs)}
        Error: ${error}
        
        IMPORTANT: Return ONLY the JSON object.`;

        const result = await model.generateContent(prompt);
        res.json(JSON.parse(cleanJson(result.response.text())));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const modifyWorkflowConfig = async (req, res) => {
    try {
        const { currentWorkflow, prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const systemPrompt = `You are a professional workflow architect. 
        Modify the provided workflow (nodes and edges) based on the user's instructions.
        
        Keep existing node IDs where possible.
        Ensure logic remains sound and connections are valid.
        
        Allowed Node Types & Config Schemas:
        - webhook_trigger: { "method": "GET"|"POST" }
        - schedule_trigger: { "cron": "string" }
        - http_request: { "url": "string", "method": "GET"|"POST"|"PUT"|"DELETE" }
        - send_email: { "to": "email", "subject": "string" }
        - delay: { "duration_minutes": number }
        - save_to_database: { "collection": "string" }
        - ai_model: { "provider": "google"|"openai", "model": "string", "prompt": "Instruction with {{input}}" }
        - ifElse: { "condition": "javascript_expression_using_payload" }
        - log: { "message": "string" }

        Current Workflow:
        ${JSON.stringify(currentWorkflow, null, 2)}
        
        Return ONLY valid JSON.
        Format: { "nodes": [...], "edges": [...] }`;

        const result = await model.generateContent([
            { text: systemPrompt },
            { text: `User instruction to modify the workflow: ${prompt}` }
        ]);

        const text = result.response.text();
        const flowJson = JSON.parse(cleanJson(text));
        return res.json(flowJson);

    } catch (error) {
        console.error("AI Modification Error:", error);

        if (error.status === 429) {
            return res.status(429).json({
                error: "AI Quota Exceeded. You have reached the daily limit for the free tier. Please wait a bit or try again later."
            });
        }

        res.status(500).json({ error: error.message });
    }
};
