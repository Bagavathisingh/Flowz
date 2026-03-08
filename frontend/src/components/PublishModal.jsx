import { useState } from 'react';
import {
    X, Rocket, CheckCircle2, Loader2, Copy, Check,
    Radio, Webhook, Clock, FileEdit, MessageSquare,
    ArrowRightToLine, Folder, MousePointer2, ExternalLink,
    AlertCircle, ChevronRight, Zap
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STEPS = ['name', 'publish', 'done'];

const TRIGGER_INFO = {
    app_event: {
        icon: Radio, color: 'purple',
        title: 'Telegram Bot',
        description: 'Your workflow will go live as a Telegram bot. Any message sent to the bot will trigger this workflow.',
        requiresToken: true,
    },
    webhook_trigger: {
        icon: Webhook, color: 'blue',
        title: 'Webhook',
        description: 'Your workflow will be live at a public URL. POST any JSON payload to trigger it.',
        requiresToken: false,
    },
    schedule_trigger: {
        icon: Clock, color: 'amber',
        title: 'Scheduled',
        description: 'Your workflow will run automatically on the configured interval starting now.',
        requiresToken: false,
    },
    form_submission: {
        icon: FileEdit, color: 'cyan',
        title: 'Form Endpoint',
        description: 'Your workflow will receive form submissions at a public POST endpoint.',
        requiresToken: false,
    },
    sub_workflow_trigger: {
        icon: ArrowRightToLine, color: 'rose',
        title: 'Sub-Workflow',
        description: 'Your workflow will be callable by other workflows as a module.',
        requiresToken: false,
    },
    chat_message: {
        icon: MessageSquare, color: 'indigo',
        title: 'Chat Bot',
        description: 'Your workflow will respond to chat messages sent via the API chat endpoint.',
        requiresToken: false,
    },
    other_ways: {
        icon: Folder, color: 'orange',
        title: 'Error Handler',
        description: 'Your workflow will activate when an error trigger is fired by another workflow.',
        requiresToken: false,
    },
    manual_trigger: {
        icon: MousePointer2, color: 'emerald',
        title: 'Manual',
        description: 'Your workflow is published and can be triggered manually via the API at any time.',
        requiresToken: false,
    },
};

const COLOR_BTN = {
    purple: 'bg-purple-600 hover:bg-purple-700 shadow-[0_4px_14px_rgba(147,51,234,0.4)]',
    blue: 'bg-blue-600 hover:bg-blue-700 shadow-[0_4px_14px_rgba(37,99,235,0.4)]',
    amber: 'bg-amber-600 hover:bg-amber-700 shadow-[0_4px_14px_rgba(217,119,6,0.4)]',
    cyan: 'bg-cyan-600 hover:bg-cyan-700 shadow-[0_4px_14px_rgba(8,145,178,0.4)]',
    rose: 'bg-rose-600 hover:bg-rose-700 shadow-[0_4px_14px_rgba(225,29,72,0.4)]',
    indigo: 'bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_14px_rgba(79,70,229,0.4)]',
    orange: 'bg-orange-600 hover:bg-orange-700 shadow-[0_4px_14px_rgba(234,88,12,0.4)]',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_4px_14px_rgba(5,150,105,0.4)]',
};

const CopyLine = ({ text }) => {
    const [copied, setCopied] = useState(false);
    return (
        <div className="flex items-center gap-2 bg-black/40 border border-white/8 rounded-xl px-4 py-3">
            <code className="flex-1 text-[0.8rem] font-mono text-slate-200 break-all">{text}</code>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: copied ? '#34d399' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
        </div>
    );
};

export default function PublishModal({ isOpen, onClose, nodes, edges, triggerNode, workflowId, defaultName }) {
    // Helper for initial states
    const checkSaved = () => workflowId && !workflowId.startsWith('unsaved_');
    const isAlreadySaved = checkSaved();

    const [step, setStep] = useState(isAlreadySaved ? 'publish' : 'name');
    const [workflowName, setWorkflowName] = useState(defaultName || 'My Workflow');
    const [savedWorkflow, setSavedWorkflow] = useState(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishResult, setPublishResult] = useState(null);
    const [error, setError] = useState(null);

    const triggerType = triggerNode?.data?.type || 'manual_trigger';
    const triggerConfig = triggerNode?.data?.config || {};
    const info = TRIGGER_INFO[triggerType] || TRIGGER_INFO['manual_trigger'];
    const Icon = info.icon;
    const btnCls = COLOR_BTN[info.color];

    const reset = () => {
        const currentlySaved = checkSaved();
        setStep(currentlySaved ? 'publish' : 'name');
        setSavedWorkflow(null);
        setPublishResult(null);
        setError(null);
        setWorkflowName(defaultName || 'My Workflow');
    };

    const handleClose = () => { reset(); onClose(); };

    const handlePublish = async () => {
        setIsPublishing(true);
        setError(null);

        try {
            let wf;
            if (isAlreadySaved) {
                // Skip POST, just retrieve what the ID is (we use the passed ID)
                // But we should ideally ensure it's up-to-date. For now, following user's 'no need to save' request strictly.
                wf = { _id: workflowId, name: workflowName, baseUrl: API_URL.replace('/api', '') };
            } else {
                // 1. Save workflow to get a permanent ID
                const saveRes = await axios.post(`${API_URL}/workflows`, {
                    name: workflowName,
                    nodes,
                    edges,
                });
                wf = saveRes.data;
            }

            setSavedWorkflow(wf);

            const finalWorkflowId = wf._id;
            const baseUrl = wf.baseUrl || API_URL.replace('/api', '');
            let result = { workflowId: finalWorkflowId, baseUrl };

            // 2. Trigger-specific activation
            if (triggerType === 'app_event' && triggerConfig.telegram_token) {
                // Register Telegram webhook
                const tgRes = await axios.post(`${API_URL}/trigger/app-event/${workflowId}/register-telegram`, {
                    telegram_token: triggerConfig.telegram_token,
                });
                result.telegram = tgRes.data;
                result.webhookUrl = tgRes.data.webhookUrl; // This is the ngrok URL from backend
                result.endpointUrl = tgRes.data.webhookUrl || `${baseUrl}/api/trigger/app-event/${workflowId}`;

            } else if (triggerType === 'schedule_trigger' && triggerConfig.interval) {
                // Re-register schedule
                await axios.post(`${API_URL}/trigger/schedule/${workflowId}`, {
                    interval: triggerConfig.interval,
                });
                result.interval = triggerConfig.interval;
                result.endpointUrl = `Schedule active — runs every ${triggerConfig.interval}s`;

            } else if (triggerType === 'webhook_trigger') {
                result.endpointUrl = `${baseUrl}/api/trigger/webhook/${workflowId}`;

            } else if (triggerType === 'form_submission') {
                result.endpointUrl = `${baseUrl}/api/trigger/form/${workflowId}`;

            } else if (triggerType === 'sub_workflow_trigger') {
                result.endpointUrl = `${baseUrl}/api/trigger/sub-workflow/${workflowId}`;

            } else if (triggerType === 'chat_message') {
                result.endpointUrl = `${baseUrl}/api/trigger/chat/${workflowId}`;
                result.chatPayloadExample = `{ "message": "Hello!" }`;

            } else if (triggerType === 'manual_trigger') {
                result.endpointUrl = `${baseUrl}/api/trigger/manual/${workflowId}`;

            } else if (triggerType === 'other_ways') {
                result.endpointUrl = `${baseUrl}/api/trigger/error/${workflowId}`;
            }

            setPublishResult(result);
            setStep('done');

        } catch (e) {
            console.error('[PUBLISH]', e);
            setError(e.response?.data?.error || e.message || 'Publishing failed. Check backend logs.');
        } finally {
            setIsPublishing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-[560px] max-h-[85vh] bg-slate-950 border border-white/10 rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="px-7 py-5 border-b border-white/5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Rocket size={22} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-white font-bold text-[1.05rem] m-0">Publish Workflow</p>
                        <p className="text-slate-500 text-[0.78rem] m-0 mt-0.5">Make it live for real use</p>
                    </div>

                    {/* Step pills */}
                    <div className="flex items-center gap-1.5 text-[0.68rem] font-bold">
                        {['name', 'publish', 'done'].map((s, i) => (
                            <div key={s} className="flex items-center gap-1.5">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === s ? 'bg-indigo-500 text-white' : STEPS.indexOf(step) > i ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-500'}`}>
                                    {STEPS.indexOf(step) > i ? <Check size={11} /> : i + 1}
                                </div>
                                {i < 2 && <ChevronRight size={10} className="text-slate-600" />}
                            </div>
                        ))}
                    </div>

                    <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 8, cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-5">

                    {/* ── Step 1: Name ── */}
                    {step === 'name' && (
                        <>
                            <div className={`p-4 rounded-2xl border flex items-start gap-4 bg-${info.color}-500/[0.06] border-${info.color}-500/20`}
                                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    <Icon size={20} className="text-slate-300" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-[0.9rem] m-0">{info.title} Trigger Detected</p>
                                    <p className="text-slate-400 text-[0.8rem] m-0 mt-1 leading-relaxed">{info.description}</p>
                                </div>
                            </div>

                            {/* Telegram token warning */}
                            {triggerType === 'app_event' && !triggerConfig.telegram_token && (
                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                                    <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-amber-300 font-bold text-[0.85rem] m-0">Bot Token Missing</p>
                                        <p className="text-amber-400/70 text-[0.78rem] m-0 mt-1 leading-relaxed">
                                            Click the Telegram trigger node on your canvas, open its Properties panel, and add your <b>Telegram Bot Token</b> before publishing.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Workflow Name</label>
                                <input
                                    type="text"
                                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-[0.95rem] outline-none"
                                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                                    value={workflowName}
                                    onChange={e => setWorkflowName(e.target.value)}
                                    placeholder="e.g. Telegram AI Bot"
                                    onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-300 text-[0.82rem]">
                                    <AlertCircle size={14} /> {error}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Step 2: Publishing ── */}
                    {step === 'publish' && (
                        <div className="flex flex-col items-center justify-center gap-5 py-10">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center">
                                    {isPublishing
                                        ? <Loader2 size={36} className="text-indigo-400 animate-spin" />
                                        : <Rocket size={36} className="text-indigo-400" />
                                    }
                                </div>
                                {isPublishing && (
                                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500/50 animate-ping" />
                                )}
                            </div>
                            <div className="text-center">
                                <p className="text-white font-bold text-[1.1rem] m-0">
                                    {isPublishing ? 'Publishing...' : 'Ready to publish'}
                                </p>
                                <p className="text-slate-500 text-[0.82rem] m-0 mt-1">
                                    {isPublishing
                                        ? 'Saving workflow and activating trigger...'
                                        : 'Workflow will be saved and trigger activated'
                                    }
                                </p>
                            </div>
                            <div className="w-full flex flex-col gap-2 text-[0.8rem] text-slate-400">
                                {['Save workflow to database', 'Generate live workflow ID', `Activate ${info.title} trigger`].map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                        {isPublishing
                                            ? <Loader2 size={13} className="text-indigo-400 animate-spin flex-shrink-0" />
                                            : <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                                        }
                                        {s}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Done ── */}
                    {step === 'done' && publishResult && (
                        <>
                            <div className="flex flex-col items-center gap-4 py-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center">
                                    <CheckCircle2 size={34} className="text-emerald-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-white font-bold text-[1.1rem] m-0">🎉 Workflow is Live!</p>
                                    <p className="text-slate-400 text-[0.82rem] m-0 mt-1">
                                        <b className="text-white">{workflowName}</b> is now published and active.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <p className="text-[0.72rem] uppercase tracking-widest text-slate-500 font-bold m-0">Workflow ID</p>
                                <CopyLine text={publishResult.workflowId} />
                            </div>

                            {publishResult.endpointUrl && (
                                <div className="flex flex-col gap-3">
                                    <p className="text-[0.72rem] uppercase tracking-widest text-slate-500 font-bold m-0">
                                        {triggerType === 'app_event' ? 'Telegram Webhook Registered At' : 'Trigger Endpoint'}
                                    </p>
                                    <CopyLine text={publishResult.endpointUrl} />
                                </div>
                            )}

                            {triggerType === 'app_event' && (
                                <div className="p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 flex flex-col gap-3">
                                    <p className="text-emerald-400 font-bold text-[0.85rem] m-0 flex items-center gap-2">
                                        <Zap size={14} /> Telegram Bot Ready
                                    </p>
                                    <div className="flex flex-col gap-1.5 text-[0.8rem] text-slate-300 leading-relaxed">
                                        <p className="m-0">✅ Telegram has been told to send all messages to your workflow.</p>
                                        <p className="m-0">✅ Any message to your bot will instantly trigger this flow.</p>
                                        <p className="m-0">✅ The last node's output will be sent back as a reply automatically.</p>
                                    </div>
                                </div>
                            )}

                            {triggerType === 'chat_message' && publishResult.chatPayloadExample && (
                                <div className="flex flex-col gap-2">
                                    <p className="text-[0.72rem] uppercase tracking-widest text-slate-500 font-bold m-0">Example Request</p>
                                    <CopyLine text={`POST ${publishResult.endpointUrl}\n${publishResult.chatPayloadExample}`} />
                                </div>
                            )}

                            {publishResult.telegram?.telegram?.description && (
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[0.75rem] text-slate-500 font-mono">
                                    Telegram: {publishResult.telegram.telegram.description}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-7 py-5 border-t border-white/5 flex items-center justify-between">
                    <p className="text-[0.7rem] text-slate-600 m-0">
                        {step === 'name' && 'Test passed ✓ — ready to go live'}
                        {step === 'publish' && 'Do not close this window...'}
                        {step === 'done' && 'Workflow is active and receiving events'}
                    </p>

                    <div className="flex gap-3">
                        {step !== 'done' && (
                            <button onClick={handleClose}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 20px', cursor: 'pointer', color: '#94a3b8', fontWeight: 600, fontSize: 14 }}>
                                Cancel
                            </button>
                        )}

                        {step === 'name' && (
                            <button
                                onClick={() => { setStep('publish'); setTimeout(handlePublish, 300); }}
                                disabled={!workflowName.trim() || (triggerType === 'app_event' && !triggerConfig.telegram_token)}
                                className={`px-6 py-2.5 rounded-xl text-white font-bold text-[0.85rem] flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${btnCls}`}
                                style={{ border: 'none', cursor: 'pointer' }}
                            >
                                <Rocket size={16} /> Publish Now
                            </button>
                        )}

                        {step === 'done' && (
                            <button onClick={handleClose}
                                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[0.85rem] flex items-center gap-2 transition-all"
                                style={{ border: 'none', cursor: 'pointer' }}>
                                <CheckCircle2 size={16} /> Done
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
