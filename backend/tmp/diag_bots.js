import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const workflowSchema = new mongoose.Schema({}, { strict: false });
const Workflow = mongoose.model('Workflow', workflowSchema);

async function checkBots() {
    await mongoose.connect(process.env.MONGODB_URI);
    const workflows = await Workflow.find();

    console.log(`\n--- BOT STATUS REPORT ---`);
    console.log(`Current BASE_URL: ${process.env.BASE_URL}\n`);

    for (const wf of workflows) {
        const trig = wf.nodes?.find(n => n.data?.type === 'app_event');
        if (trig && trig.data?.config?.telegram_token) {
            const token = trig.data.config.telegram_token;
            console.log(`Workflow: ${wf.name} (${wf._id})`);
            console.log(`Token: ${token.substring(0, 10)}... (truncated)`);

            try {
                const res = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`);
                console.log(`Webhook URL: ${res.data.result.url}`);
                console.log(`Last Error (if any): ${res.data.result.last_error_message || 'None'}`);
                console.log(`Pending Updates: ${res.data.result.pending_update_count}`);
                if (res.data.result.url !== `${process.env.BASE_URL}/api/trigger/app-event/${wf._id}`) {
                    console.warn(`WARNING: Registered URL does not match current BASE_URL!`);
                }
            } catch (err) {
                console.error(`Failed to fetch bot info: ${err.message}`);
            }
            console.log(`-------------------------\n`);
        }
    }
    await mongoose.disconnect();
}

checkBots();
