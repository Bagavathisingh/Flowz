import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.OPENAI_API_KEY || '');

async function testAll() {
    const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    for (const m of models) {
        console.log(`--- Testing ${m} ---`);
        try {
            const model = genAI.getGenerativeModel({
                model: m,
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent("Return JSON: {\"status\": \"ok\"}");
            console.log(`${m} Result:`, result.response.text());
        } catch (e) {
            console.error(`${m} Failed:`, e.status, e.message);
        }
    }
}
testAll();
