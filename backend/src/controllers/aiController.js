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
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    // Models to try in order of preference to bypass individual quota limits
    const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite"
    ];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`[AI] Attempting generation with ${modelName}...`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
            });

            const systemPrompt = `You are an advanced workflow architect generator like n8n. 
            Convert user text into a structured JSON Directed Acyclic Graph (DAG).
            
            Allowed Node Types & Config Schemas:
            - webhook_trigger: { "method": "GET"|"POST" }
            - schedule_trigger: { "interval": number } (seconds)
            - http_request: { "url": "string", "method": "GET"|"POST"|"PUT"|"DELETE" }
            - send_email: { "to": "email", "subject": "string", "smtp_host": "string", "smtp_port": number }
            - delay: { "duration_seconds": number }
            - save_to_database: { "collection": "string", "connection_string": "string" }
            - ai_model: { "provider": "google"|"openai", "model": "string", "prompt": "string", "system_prompt": "string" }
            - ifElse: { "condition": "javascript_expression" } (e.g. "payload.age > 18")
            - log: { "message": "string" }
            - manual_trigger: {}
            - app_event: { "telegram_token": "string" }
            - form_submission: { "fields": "string (JSON array)" }
            - chat_message: { "system_prompt": "string" }

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
            console.log(`[AI] Generation successful with ${modelName}`);
            return res.json(flowJson);

        } catch (error) {
            console.error(`[AI] Error with ${modelName}:`, error.message);
            lastError = error;

            // If it's not a rate limit error or not-found, don't bother trying other models
            if (error.status !== 429 && error.status !== 503 && error.status !== 404) {
                break;
            }
            console.warn(`[AI] ${modelName} unavailable, trying next model...`);
        }
    }

    // FINAL FALLBACK: If AI is completely down or quota exceeded across all models
    console.warn("[AI] All models failed. Returning static fallback workflow.");

    return res.json({
        nodes: [
            { id: "node_1", type: "webhook_trigger", data: { label: "Incoming Webhook", config: { method: "POST" } }, position: { x: 300, y: 100 } },
            { id: "node_2", type: "ai_model", data: { label: "AI Process", config: { provider: "google", prompt: "Summarize the input: {{input}}" } }, position: { x: 300, y: 250 } },
            { id: "node_3", type: "log", data: { label: "Log Result", config: { message: "Workflow completed successfully" } }, position: { x: 300, y: 400 } }
        ],
        edges: [
            { id: "e1", source: "node_1", target: "node_2" },
            { id: "e2", source: "node_2", target: "node_3" }
        ],
        is_fallback: true,
        note: "AI service is currently at capacity. Here is a starter template for your request."
    });
};

export const explainErrorLog = async (req, res) => {
    try {
        const { logs, error, currentWorkflow } = req.body;
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `You are a professional workflow debugger. An error occurred while executing the following workflow.
        
        Current Workflow:
        ${JSON.stringify(currentWorkflow, null, 2)}
        
        Execution Logs:
        ${JSON.stringify(logs, null, 2)}
        
        Error Message:
        ${error}
        
        Analyze the error and provide a fix. 
        Output JSON with:
        - 'explanation': Clear summary of what went wrong.
        - 'cause': The specific node or configuration that caused it.
        - 'fix': Human-readable instruction on how to fix it.
        - 'suggestedFixWorkflow': (Optional) An updated nodes and edges JSON that fixes the problem. Use original node IDs.
        
        IMPORTANT: Return ONLY the JSON object.`;

        const result = await model.generateContent(prompt);
        res.json(JSON.parse(cleanJson(result.response.text())));
    } catch (error) {
        console.error("[AI] Debug error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const modifyWorkflowConfig = async (req, res) => {
    const { currentWorkflow, prompt, selectedNodeId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`[AI] Attempting modification with ${modelName}...`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
            });

            const systemPrompt = `You are a professional workflow architect. 
            Modify the provided workflow (nodes and edges) based on the user's instructions.
            
            Keep existing node IDs where possible.
            Ensure logic remains sound and connections are valid.
            If a node ID "${selectedNodeId}" is provided, it means this node is currently selected by the user, so prioritize modifying this node or its direct connections if the prompt is ambiguous.
            
            Allowed Node Types & Config Schemas:
            - webhook_trigger: { "method": "GET"|"POST" }
            - schedule_trigger: { "interval": number } (seconds)
            - http_request: { "url": "string", "method": "GET"|"POST"|"PUT"|"DELETE" }
            - send_email: { "to": "email", "subject": "string", "smtp_host": "string", "smtp_port": number }
            - delay: { "duration_seconds": number }
            - save_to_database: { "collection": "string", "connection_string": "string" }
            - ai_model: { "provider": "google"|"openai", "model": "string", "prompt": "string", "system_prompt": "string" }
            - ifElse: { "condition": "javascript_expression" }
            - log: { "message": "string" }
            - manual_trigger: {}
            - app_event: { "telegram_token": "string" }
            - form_submission: { "fields": "string (JSON array)" }
            - chat_message: { "system_prompt": "string" }

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
            console.log(`[AI] Modification successful with ${modelName}`);
            return res.json(flowJson);

        } catch (error) {
            console.error(`[AI] Modification error with ${modelName}:`, error.message);
            lastError = error;
            if (error.status !== 429 && error.status !== 503) {
                break;
            }
            console.warn(`[AI] ${modelName} rate limited, trying next model for modification...`);
        }
    }

    // FALLBACK for Modification: If AI is completely down or quota exceeded.
    // Return the original workflow so the UI doesn't crash or show a scary error.
    console.warn("[AI] Modification failed or quota exceeded. Returning current workflow as fallback.");

    return res.json({
        ...currentWorkflow,
        is_fallback: true,
        note: "AI service is currently busy. Your workflow was not modified, but you can try again shortly."
    });
};

