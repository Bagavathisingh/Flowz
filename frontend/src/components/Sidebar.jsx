import {
    Globe, Zap, Mail, Database, Clock, Sparkles, Github, X, Plus,
    MousePointer2, Radio, Webhook, FileEdit, ArrowRightToLine, MessageSquare, Folder, Play
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
    const onDragStart = (event, nodeType, label, isTrigger) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label, isTrigger }));
        event.dataTransfer.effectAllowed = 'move';
    };

    const triggers = [
        { type: 'manual_trigger', label: 'Trigger manually', desc: 'Runs the flow on clicking a button. Good for getting started quickly', icon: MousePointer2, color: 'text-slate-400' },
        { type: 'app_event', label: 'On app event', desc: 'Runs when something happens in an app like Telegram, Notion or Airtable', icon: Radio, color: 'text-slate-400' },
        { type: 'schedule_trigger', label: 'On a schedule', desc: 'Runs the flow every day, hour, or custom interval', icon: Clock, color: 'text-slate-400' },
        { type: 'webhook_trigger', label: 'On webhook call', desc: 'Runs the flow on receiving an HTTP request', icon: Webhook, color: 'text-slate-400' },
        { type: 'form_submission', label: 'On form submission', desc: 'Pass webform responses to the workflow', icon: FileEdit, color: 'text-slate-400' },
        { type: 'sub_workflow_trigger', label: 'When executed by another workflow', desc: 'Runs when called by the Execute Workflow node from a different workflow', icon: ArrowRightToLine, color: 'text-slate-400' },
        { type: 'chat_message', label: 'On chat message', desc: 'Runs the flow when a user sends a chat message. For use with AI nodes', icon: MessageSquare, color: 'text-slate-400' },
        { type: 'other_ways', label: 'Other ways...', desc: 'Runs on workflow errors, file changes, etc.', icon: Folder, color: 'text-slate-400' }
    ];

    return (
        <div className={`fixed top-0 left-0 h-screen w-96 bg-slate-950/95 backdrop-blur-3xl border-r border-white/10 flex flex-col z-[100] transition-all duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] ${isOpen ? 'translate-x-0 opacity-100 shadow-[20px_0_50px_rgba(0,0,0,0.5)]' : '-translate-x-full opacity-0'}`}>
            <div className="p-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Plus size={22} className="text-white" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight leading-none">Add Nodes</span>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border-none"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar pb-10">
                <div className="p-6">
                    <h4 className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500 font-bold mb-6 px-1">Choose a Trigger</h4>
                    <div className="flex flex-col gap-3">
                        {triggers.map((item) => (
                            <div
                                key={item.type}
                                className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 cursor-grab transition-all hover:bg-white/[0.08] hover:border-blue-500/50 hover:-translate-y-1 active:cursor-grabbing group flex items-start gap-4"
                                onDragStart={(e) => onDragStart(e, item.type, item.label, true)} draggable>
                                <div className="mt-1 p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <item.icon size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h5 className="text-[1rem] font-bold text-slate-200 group-hover:text-white transition-colors m-0 leading-tight">{item.label}</h5>
                                    <p className="text-[0.8rem] text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 pt-0">
                    <h4 className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500 font-bold mb-6 px-1">Common Actions</h4>
                    <div className="flex flex-col gap-3">
                        {[
                            { type: 'http_request', label: 'HTTP Request', icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-500/10', hbg: 'hover:bg-emerald-500' },
                            { type: 'send_email', label: 'Send Email', icon: Mail, color: 'text-amber-400', bg: 'bg-amber-500/10', hbg: 'hover:bg-amber-500' },
                            { type: 'save_to_database', label: 'Save to DB', icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-500/10', hbg: 'hover:bg-cyan-500' },
                            { type: 'ai_model', label: 'AI Model', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10', hbg: 'hover:bg-purple-500' },
                            { type: 'github_push', label: 'GitHub Push', icon: Github, color: 'text-slate-200', bg: 'bg-slate-500/10', hbg: 'hover:bg-slate-700' },
                            { type: 'delay', label: 'Delay', icon: Clock, color: 'text-rose-400', bg: 'bg-rose-500/10', hbg: 'hover:bg-rose-500' },
                        ].map((item) => (
                            <div
                                key={item.type}
                                className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 cursor-grab transition-all hover:bg-white/[0.08] hover:border-blue-500/50 hover:-translate-y-1 active:cursor-grabbing group flex items-center gap-4"
                                onDragStart={(e) => onDragStart(e, item.type, item.label, false)} draggable>
                                <div className={`p-2 rounded-lg ${item.bg} ${item.color} group-hover:text-white group-hover:${item.hbg} transition-all`}>
                                    <item.icon size={18} />
                                </div>
                                <span className="font-bold text-slate-200 group-hover:text-white transition-colors">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-6 border-t border-white/5 bg-black/20">
                <p className="text-[0.65rem] text-slate-600 text-center uppercase tracking-widest font-bold">Flowz v2.0 • Build with precision</p>
            </div>
        </div>
    );
}
