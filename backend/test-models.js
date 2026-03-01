import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function listModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.OPENAI_API_KEY}`);
        const data = await response.json();
        fs.writeFileSync('models_list.json', JSON.stringify(data, null, 2));
        console.log("Models list saved to models_list.json");
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

listModels();
