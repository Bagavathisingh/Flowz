const chatHistory = new Map(); 
const chatCallbacks = new Map(); 

export const registerChatTrigger = (workflowId, callback) => {
    chatCallbacks.set(workflowId, callback);
    if (!chatHistory.has(workflowId)) {
        chatHistory.set(workflowId, []);
    }
    console.log(`[CHAT] Registered chat trigger for workflow: ${workflowId}`);
};

export const sendChatMessage = (workflowId, message, role = 'user') => {
    const history = chatHistory.get(workflowId) || [];
    const entry = { role, content: message, timestamp: new Date().toISOString() };
    history.push(entry);
    chatHistory.set(workflowId, history);

    if (role === 'user' && chatCallbacks.has(workflowId)) {
        const cb = chatCallbacks.get(workflowId);
        cb({ trigger: { type: 'chat_message', payload: { message, history, timestamp: entry.timestamp } } });
    }

    return entry;
};

export const getChatHistory = (workflowId) => {
    return chatHistory.get(workflowId) || [];
};

export const addBotMessage = (workflowId, content) => {
    const history = chatHistory.get(workflowId) || [];
    const entry = { role: 'bot', content, timestamp: new Date().toISOString() };
    history.push(entry);
    chatHistory.set(workflowId, history);
    return entry;
};
