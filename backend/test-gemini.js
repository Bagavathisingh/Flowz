import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.OPENAI_API_KEY || '');

async function testGemini() {
    console.log('--- Diagnosis ---');
    console.log('Node:', process.version);
    console.log('GenAI Key exists:', !!process.env.OPENAI_API_KEY);

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = "Briefly explain what you do.";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log('SUCCESS: Content Generated!');
        console.log('Response content:', response.text().substring(0, 50) + '...');
    } catch (error) {
        console.error('ERROR during generation:', error);
        if (error.status) console.log('HTTP Status:', error.status);
    }
}

testGemini();
