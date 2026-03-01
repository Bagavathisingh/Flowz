import { Globe, Zap, Mail, Database, Clock, Sparkles } from 'lucide-react';

export default function Sidebar() {
    const onDragStart = (event, nodeType, label, isTrigger) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label, isTrigger }));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="w-80 bg-slate-900/80 backdrop-blur-xl border-r border-white/10 flex flex-col z-20">
            <div className="p-6 text-2xl font-bold text-white flex items-center gap-3 border-b border-white/10">
                <Zap size={24} className="text-pink-500" />
                <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Flowz
                </span>
            </div>
            <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-3">
                <h4 className="text-slate-200 font-semibold mb-1">Triggers</h4>
                <div
                    className="p-4 border border-white/5 rounded-xl bg-slate-800/50 cursor-grab text-[0.95rem] flex items-center gap-3 text-slate-400 transition-all hover:bg-slate-700/80 hover:border-blue-500/50 hover:text-white hover:-translate-y-0.5 hover:shadow-lg"
                    onDragStart={(e) => onDragStart(e, 'webhook_trigger', 'Webhook Trigger', true)} draggable>
                    <Globe size={18} /> Webhook Trigger
                </div>

                <h4 className="text-slate-200 font-semibold mt-4 mb-1">Actions</h4>
                <div
                    className="p-4 border border-white/5 rounded-xl bg-slate-800/50 cursor-grab text-[0.95rem] flex items-center gap-3 text-slate-400 transition-all hover:bg-slate-700/80 hover:border-blue-500/50 hover:text-white hover:-translate-y-0.5 hover:shadow-lg"
                    onDragStart={(e) => onDragStart(e, 'http_request', 'HTTP Request', false)} draggable>
                    <Globe size={18} /> HTTP Request
                </div>
                <div
                    className="p-4 border border-white/5 rounded-xl bg-slate-800/50 cursor-grab text-[0.95rem] flex items-center gap-3 text-slate-400 transition-all hover:bg-slate-700/80 hover:border-blue-500/50 hover:text-white hover:-translate-y-0.5 hover:shadow-lg"
                    onDragStart={(e) => onDragStart(e, 'send_email', 'Send Email', false)} draggable>
                    <Mail size={18} /> Send Email
                </div>
                <div
                    className="p-4 border border-white/5 rounded-xl bg-slate-800/50 cursor-grab text-[0.95rem] flex items-center gap-3 text-slate-400 transition-all hover:bg-slate-700/80 hover:border-blue-500/50 hover:text-white hover:-translate-y-0.5 hover:shadow-lg"
                    onDragStart={(e) => onDragStart(e, 'save_to_database', 'Save to DB', false)} draggable>
                    <Database size={18} /> Save to DB
                </div>
                <div
                    className="p-4 border border-white/5 rounded-xl bg-slate-800/50 cursor-grab text-[0.95rem] flex items-center gap-3 text-slate-400 transition-all hover:bg-slate-700/80 hover:border-blue-500/50 hover:text-white hover:-translate-y-0.5 hover:shadow-lg"
                    onDragStart={(e) => onDragStart(e, 'ai_model', 'AI Model', false)} draggable>
                    <Sparkles size={18} className="text-purple-400" /> AI Model
                </div>
                <div
                    className="p-4 border border-white/5 rounded-xl bg-slate-800/50 cursor-grab text-[0.95rem] flex items-center gap-3 text-slate-400 transition-all hover:bg-slate-700/80 hover:border-blue-500/50 hover:text-white hover:-translate-y-0.5 hover:shadow-lg"
                    onDragStart={(e) => onDragStart(e, 'delay', 'Delay', false)} draggable>
                    <Clock size={18} /> Delay
                </div>
            </div>
        </div>
    );
}
