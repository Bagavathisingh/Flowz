import { X, CheckCircle2, XCircle, Clock, Info, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function PropertiesSidebar({ selectedNode, setSelectedNode, updateNodeConfig }) {
    if (!selectedNode) return null;

    const { executionStatus, executionResult } = selectedNode.data;
    const [showSmtpPass, setShowSmtpPass] = useState(false);
    const [showAiKey, setShowAiKey] = useState(false);

    return (
        <div className="absolute top-0 right-0 w-80 h-screen bg-slate-900/95 backdrop-blur-xl border-l border-white/10 flex flex-col z-30 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] animate-[slideLeft_0.3s_ease]">
            <div className="p-5 flex items-center justify-between border-b border-white/10 text-[1.2rem] font-semibold text-white">
                <h3 className="m-0 text-xl font-bold">Node Properties</h3>
                <button className="bg-transparent border-none text-slate-400 p-1 rounded hover:bg-white/5 hover:text-white transition-colors" onClick={() => setSelectedNode(null)}>
                    <X size={20} />
                </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">

                {/* Status Section */}
                {executionStatus && (
                    <div className={`p-4 rounded-xl border flex flex-col gap-2 ${executionStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
                        executionStatus === 'failure' ? 'bg-red-500/10 border-red-500/20' :
                            'bg-blue-500/10 border-blue-500/20'
                        }`}>
                        <div className="flex items-center gap-2 font-semibold">
                            {executionStatus === 'success' && <CheckCircle2 size={16} className="text-emerald-500" />}
                            {executionStatus === 'failure' && <XCircle size={16} className="text-red-500" />}
                            {executionStatus === 'loading' && <Clock size={16} className="text-blue-500 animate-pulse" />}
                            <span className="capitalize">{executionStatus === 'loading' ? 'Executing...' : executionStatus}</span>
                        </div>
                        {executionResult && (
                            <div className="mt-2 text-xs font-mono text-slate-300 break-all bg-black/40 p-2 rounded max-h-[150px] overflow-auto">
                                <span className="text-slate-500 mb-1 block">Output Data:</span>
                                {executionResult.previewUrl ? (
                                    <div className="flex flex-col gap-2">
                                        <p>Email Sent Successfully!</p>
                                        <a href={executionResult.previewUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline hover:text-blue-300">
                                            View Sent Email Preview
                                        </a>
                                    </div>
                                ) : (
                                    <pre className="m-0 text-[0.75rem]">
                                        {typeof executionResult === 'object' ? JSON.stringify(executionResult, null, 2) : executionResult}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <label className="text-[0.9rem] text-slate-400 font-medium">Display Label</label>
                    <input type="text" value={selectedNode.data.label} disabled className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] disabled:opacity-50 disabled:cursor-not-allowed outline-none" />
                </div>

                <div className="flex flex-col gap-3">
                    <label className="text-[0.9rem] text-slate-400 font-medium">Node ID</label>
                    <input type="text" value={selectedNode.id} disabled className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-slate-500 text-[0.85rem] disabled:cursor-not-allowed outline-none font-mono" />
                </div>

                <div className="flex flex-col gap-3">
                    <label className="text-[0.9rem] text-slate-200 font-semibold border-b border-white/5 pb-2">Configuration</label>

                    {selectedNode.data.type === 'http_request' && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[0.8rem] text-slate-400 font-medium">Target URL</label>
                            <input
                                type="text"
                                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                placeholder="https://api.example.com"
                                value={selectedNode.data.config?.url || ''}
                                onChange={(e) => updateNodeConfig('url', e.target.value)}
                            />
                        </div>
                    )}

                    {selectedNode.data.type === 'send_email' && (
                        <>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">SMTP Host</label>
                                <input type="text" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="smtp.gmail.com" value={selectedNode.data.config?.smtp_host || ''} onChange={(e) => updateNodeConfig('smtp_host', e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">SMTP Port</label>
                                <input type="number" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="587" value={selectedNode.data.config?.smtp_port || ''} onChange={(e) => updateNodeConfig('smtp_port', e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-404 font-medium">SMTP User</label>
                                <input type="text" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="email@example.com" value={selectedNode.data.config?.smtp_user || ''} onChange={(e) => updateNodeConfig('smtp_user', e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">SMTP Password</label>
                                <div className="relative">
                                    <input
                                        type={showSmtpPass ? "text" : "password"}
                                        name="smtp-pass-unique"
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-white text-[0.95rem] transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        placeholder="App Password"
                                        value={selectedNode.data.config?.smtp_pass || ''}
                                        onChange={(e) => updateNodeConfig('smtp_pass', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowSmtpPass(!showSmtpPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-slate-500 hover:text-white cursor-pointer transition-colors"
                                    >
                                        {showSmtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="h-px bg-white/5 my-2"></div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">To Address</label>
                                <input type="text" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="admin@example.com" value={selectedNode.data.config?.to || ''} onChange={(e) => updateNodeConfig('to', e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Subject</label>
                                <input type="text" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="Alert" value={selectedNode.data.config?.subject || ''} onChange={(e) => updateNodeConfig('subject', e.target.value)} />
                            </div>
                        </>
                    )}

                    {selectedNode.data.type === 'delay' && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[0.8rem] text-slate-400 font-medium">Duration (Seconds)</label>
                            <input type="number" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="5" value={selectedNode.data.config?.duration_seconds || ''} onChange={(e) => updateNodeConfig('duration_seconds', e.target.value)} />
                        </div>
                    )}

                    {selectedNode.data.type === 'ai_model' && (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">AI Provider</label>
                                <select
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] outline-none"
                                    value={selectedNode.data.config?.provider || 'google'}
                                    onChange={(e) => updateNodeConfig('provider', e.target.value)}
                                >
                                    <option value="google">Google Gemini</option>
                                    <option value="openai">OpenAI</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">API Key</label>
                                <div className="relative">
                                    <input
                                        type={showAiKey ? "text" : "password"}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-white text-[0.95rem] transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        placeholder="sk-..."
                                        value={selectedNode.data.config?.api_key || ''}
                                        onChange={(e) => updateNodeConfig('api_key', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAiKey(!showAiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-slate-500 hover:text-white cursor-pointer transition-colors"
                                    >
                                        {showAiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Model Name</label>
                                <input
                                    type="text"
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] outline-none"
                                    placeholder={selectedNode.data.config?.provider === 'openai' ? "gpt-4o" : "gemini-1.5-flash"}
                                    value={selectedNode.data.config?.model || ''}
                                    onChange={(e) => updateNodeConfig('model', e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Prompt / Instruction</label>
                                <textarea
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.85rem] h-[100px] resize-none outline-none overflow-y-auto"
                                    placeholder="e.g. Summarize the input text..."
                                    value={selectedNode.data.config?.prompt || ''}
                                    onChange={(e) => updateNodeConfig('prompt', e.target.value)}
                                />
                                <span className="text-[0.7rem] text-slate-500 italic flex items-center gap-1"><Info size={10} /> Use {'{{input}}'} to reference incoming data.</span>
                            </div>
                        </div>
                    )}

                    {selectedNode.data.type === 'save_to_database' && (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Connection String (MongoDB)</label>
                                <input
                                    type="text"
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-mono"
                                    placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
                                    value={selectedNode.data.config?.connection_string || ''}
                                    onChange={(e) => updateNodeConfig('connection_string', e.target.value)}
                                />
                                <span className="text-[0.7rem] text-slate-500 italic flex items-center gap-1"><Info size={10} /> Leave empty to use system default database.</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Collection Name</label>
                                <input
                                    type="text"
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    placeholder="e.g. users_data"
                                    value={selectedNode.data.config?.collection || ''}
                                    onChange={(e) => updateNodeConfig('collection', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {['webhook_trigger', 'log'].includes(selectedNode.data.type) && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[0.8rem] text-slate-400 font-medium">Raw Config (JSON)</label>
                            <textarea
                                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.85rem] font-mono transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 h-[100px] resize-none outline-none overflow-y-auto"
                                value={JSON.stringify(selectedNode.data.config, null, 2)}
                                onChange={(e) => {
                                    try {
                                        const parsed = JSON.parse(e.target.value);
                                        updateNodeConfig('full_config', parsed);
                                    } catch (err) { }
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
