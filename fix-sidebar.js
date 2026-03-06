import fs from 'fs';
const path = 'frontend/src/components/PropertiesSidebar.jsx';
let content = fs.readFileSync(path, 'utf8');

const target = '<option value="gemini-3-flash-preview">Gemini 3 Flash Preview (Experimental)</option>';
const replacement = `
                                                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                                                <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                                                <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
                                                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>`.trim();

content = content.replace(target, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log('Added more models to PropertiesSidebar.jsx');
