import {
    Globe, Zap, Mail, Database, Clock, Sparkles, X, Plus,
    MousePointer2, Radio, Webhook, FileEdit, ArrowRightToLine, MessageSquare, Folder, Play,
    MessageCircle, AlertCircle, Bot, Loader2, Send, Check
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Sidebar({
    isOpen, setIsOpen, sidebarMode = 'nodes', setSidebarMode,
    debugMessages = [], onApplyFix, isExplainingError
}) {
    const chatEndRef = useRef(null);
    const [userMessage, setUserMessage] = useState('');

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (sidebarMode === 'chat') scrollToBottom();
    }, [debugMessages, sidebarMode]);

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

            {/* Header with Tab Switcher */}
            <div className="p-6 pb-2 flex flex-col gap-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            {sidebarMode === 'nodes' ? <Plus size={22} className="text-white" /> : <Bot size={22} className="text-white" />}
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight leading-none">
                            {sidebarMode === 'nodes' ? 'Workflow Library' : 'AI Debugger'}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border-none"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setSidebarMode('nodes')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border-none cursor-pointer ${sidebarMode === 'nodes' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300 bg-transparent'}`}
                    >
                        <Folder size={14} /> Nodes
                    </button>
                    <button
                        onClick={() => setSidebarMode('chat')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border-none cursor-pointer ${sidebarMode === 'chat' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 'text-slate-500 hover:text-slate-300 bg-transparent'}`}
                    >
                        <MessageCircle size={14} /> AI Debug
                        {debugMessages.some(m => m.isNew) && <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar pb-6 relative">

                {/* ─── NODE LIBRARY MODE ─── */}
                {sidebarMode === 'nodes' ? (
                    <>
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
                                    { type: 'ai_model', label: 'AI Agent', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10', hbg: 'hover:bg-purple-500' },
                                    { type: 'delay', label: 'Delay', icon: Clock, color: 'text-rose-400', bg: 'bg-rose-500/10', hbg: 'hover:bg-rose-500' },
                                    { type: 'ifElse', label: 'If / Else', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10', hbg: 'hover:bg-orange-500' },
                                    { type: 'log', label: 'Log Result', icon: FileEdit, color: 'text-slate-400', bg: 'bg-slate-500/10', hbg: 'hover:bg-slate-500' },
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
                    </>
                ) : (
                    /* ─── AI DEBUG ASSISTANT MODE ─── */
                    <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                            {debugMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-10 text-center px-4">
                                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mb-4 text-slate-700">
                                        <Bot size={32} />
                                    </div>
                                    <p className="text-slate-300 font-bold text-sm m-0 mb-2">No Errors Detected</p>
                                    <p className="text-slate-500 text-[0.75rem] m-0 leading-relaxed">
                                        Run your workflow to start testing. If an error occurs, I'll automatically analyze it and suggest a fix here.
                                    </p>
                                </div>
                            ) : (
                                debugMessages.map((msg, i) => (
                                    <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] p-4 rounded-2xl text-[0.82rem] leading-relaxed ${msg.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-slate-900 border border-white/10 text-slate-300 rounded-tl-none'
                                            }`}>
                                            {msg.role === 'assistant' && (
                                                <div className="flex items-center gap-2 mb-2 text-purple-400 font-bold uppercase tracking-tighter text-[0.65rem]">
                                                    <Sparkles size={12} /> AI Debugger
                                                </div>
                                            )}

                                            {msg.text}

                                            {msg.suggestedFix && (
                                                <div className="mt-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 flex flex-col gap-3">
                                                    <div className="flex items-center gap-2 text-purple-400 font-bold text-[0.7rem] uppercase">
                                                        <AlertCircle size={14} /> Suggested Action
                                                    </div>
                                                    <p className="text-[0.75rem] text-slate-400 m-0 italic">"I have generated an updated workflow configuration that should resolve the issue."</p>
                                                    <button
                                                        onClick={() => onApplyFix(msg.suggestedFix)}
                                                        className="w-full bg-purple-500 hover:bg-purple-400 text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20 border-none cursor-pointer flex items-center justify-center gap-2"
                                                    >
                                                        <Check size={14} /> Apply Auto-Fix
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            {isExplainingError && (
                                <div className="flex items-center gap-3 text-purple-400 py-4 font-bold text-xs">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>AI is analyzing the error log...</span>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-md">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-300"></div>
                                <div className="relative flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ask about your workflow..."
                                        className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-purple-500/40 transition-all font-medium"
                                        value={userMessage}
                                        onChange={(e) => setUserMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && userMessage.trim() && (setUserMessage(''), debugMessages.push({ role: 'user', text: userMessage }))}
                                    />
                                    <button
                                        className="bg-white/5 border border-white/10 text-slate-400 p-3 rounded-xl hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                                        onClick={() => userMessage.trim() && (setUserMessage(''), debugMessages.push({ role: 'user', text: userMessage }))}
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-white/5 bg-black/20">
                <p className="text-[0.65rem] text-slate-600 text-center uppercase tracking-widest font-bold">
                    {sidebarMode === 'nodes' ? 'Flowz v2.0 • Build with precision' : 'Flowz AI • Debug with clarity'}
                </p>
            </div>
        </div>
    );
}

