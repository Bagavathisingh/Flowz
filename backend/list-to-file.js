import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function listModels() {
    const key = process.env.OPENAI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const response = await fetch(url);
    const data = await response.json();
    const names = data.models ? data.models.map(m => m.name) : [JSON.stringify(data)];
    fs.writeFileSync('supported_models.txt', names.join('\n'));
}
listModels();
