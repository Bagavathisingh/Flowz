import { X, CheckCircle2, XCircle, Clock, Info, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function PropertiesSidebar({ selectedNode, setSelectedNode, updateNodeConfig }) {
    if (!selectedNode) return null;

    const { executionStatus, executionResult } = selectedNode.data;
    const [showSmtpPass, setShowSmtpPass] = useState(false);
    const [showAiKey, setShowAiKey] = useState(false);
    const [showGithubToken, setShowGithubToken] = useState(false);

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
                                    <option value="anthropic">Anthropic Claude</option>
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
                                    placeholder={
                                        selectedNode.data.config?.provider === 'openai' ? 'gpt-4o' :
                                            selectedNode.data.config?.provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' :
                                                'gemini-1.5-flash-latest'
                                    }
                                    value={selectedNode.data.config?.model || ''}
                                    onChange={(e) => updateNodeConfig('model', e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">System Prompt / Persona</label>
                                <textarea
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.85rem] h-[80px] resize-none outline-none overflow-y-auto"
                                    placeholder="e.g. You are a friendly friend who talks casually..."
                                    value={selectedNode.data.config?.system_prompt || ''}
                                    onChange={(e) => updateNodeConfig('system_prompt', e.target.value)}
                                />
                                <span className="text-[0.7rem] text-slate-500 italic flex items-center gap-1"><Info size={10} /> Sets the AI's behavior and personality.</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Prompt / Instruction</label>
                                <textarea
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.85rem] h-[100px] resize-none outline-none overflow-y-auto"
                                    placeholder="e.g. Summarize the input text..."
                                    value={selectedNode.data.config?.prompt || ''}
                                    onChange={(e) => updateNodeConfig('prompt', e.target.value)}
                                />
                                <span className="text-[0.7rem] text-slate-500 italic flex items-center gap-1"><Info size={10} /> Use {'{{text}}'} to reference the user's message.</span>
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

                    {selectedNode.data.type === 'webhook_trigger' && (
                        <div className="flex flex-col gap-4">
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col gap-2">
                                <label className="text-[0.7rem] uppercase tracking-widest text-blue-400 font-bold">Live Webhook URL</label>
                                <code className="text-[0.78rem] text-blue-200 font-mono break-all bg-black/30 p-3 rounded-lg border border-blue-500/10">
                                    POST /api/trigger/webhook/[workflow-id]
                                </code>
                                <p className="text-[0.75rem] text-slate-500 m-0">Save this workflow first to get a permanent ID, then POST any JSON to this URL to trigger the flow.</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Expected Payload Key (optional)</label>
                                <input type="text" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] outline-none focus:border-blue-500 transition-all" placeholder="e.g. data" value={selectedNode.data.config?.payload_key || ''} onChange={(e) => updateNodeConfig('payload_key', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {selectedNode.data.type === 'manual_trigger' && (
                        <div className="flex flex-col gap-4">
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-2">
                                <label className="text-[0.7rem] uppercase tracking-widest text-emerald-400 font-bold">How to Use</label>
                                <p className="text-[0.82rem] text-slate-300 m-0 leading-relaxed">
                                    Click <b>Test Run</b> in the top bar to execute this workflow manually. Your test payload will be passed to downstream nodes.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Test Input Payload (JSON)</label>
                                <textarea className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.85rem] font-mono h-[100px] resize-none outline-none focus:border-blue-500 transition-all" placeholder='{ "key": "value" }' value={selectedNode.data.config?.test_payload || ''} onChange={(e) => updateNodeConfig('test_payload', e.target.value)} />
                                <span className="text-[0.7rem] text-slate-500 italic">This payload will be available to all connected action nodes.</span>
                            </div>
                        </div>
                    )}

                    {selectedNode.data.type === 'schedule_trigger' && (
                        <div className="flex flex-col gap-4">
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2">
                                <label className="text-[0.7rem] uppercase tracking-widest text-amber-400 font-bold">Auto-Scheduling</label>
                                <p className="text-[0.82rem] text-slate-300 m-0 leading-relaxed">Saving the workflow will automatically register this schedule. The workflow will execute at the configured interval until it is deleted.</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Interval (seconds)</label>
                                <input type="number" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] outline-none focus:border-blue-500 transition-all" placeholder="3600" value={selectedNode.data.config?.interval || ''} onChange={(e) => updateNodeConfig('interval', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {[['60', 'Every min'], ['300', '5 min'], ['3600', 'Hourly'], ['86400', 'Daily']].map(([v, l]) => (
                                    <button key={v} onClick={() => updateNodeConfig('interval', v)} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${selectedNode.data.config?.interval == v ? 'bg-amber-500 border-amber-500 text-white' : 'bg-black/20 border-white/10 text-slate-400 hover:border-amber-500/50 hover:text-amber-300'}`}>{l}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedNode.data.type === 'app_event' && (
                        <div className="flex flex-col gap-4">
                            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col gap-2">
                                <label className="text-[0.7rem] uppercase tracking-widest text-purple-400 font-bold">Telegram Bot Setup</label>
                                <p className="text-[0.78rem] text-slate-400 m-0 leading-relaxed">1. Create a bot via @BotFather on Telegram. 2. Copy the token below. 3. Save the workflow and use "Register Webhook" to connect.</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Telegram Bot Token</label>
                                <input type="password" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] outline-none focus:border-blue-500 transition-all" placeholder="1234567890:AAF..." value={selectedNode.data.config?.telegram_token || ''} onChange={(e) => updateNodeConfig('telegram_token', e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Default Chat ID (optional)</label>
                                <input type="text" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] outline-none focus:border-blue-500 transition-all" placeholder="e.g. -1001234567890" value={selectedNode.data.config?.chat_id || ''} onChange={(e) => updateNodeConfig('chat_id', e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Fallback Reply Message (optional)</label>
                                <textarea
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.85rem] h-[70px] resize-none outline-none focus:border-purple-500 transition-all"
                                    placeholder="e.g. Got it! Your request is being processed..."
                                    value={selectedNode.data.config?.reply_message || ''}
                                    onChange={(e) => updateNodeConfig('reply_message', e.target.value)}
                                />
                                <span className="text-[0.7rem] text-slate-500 italic flex items-center gap-1">
                                    <Info size={10} /> Sent to Telegram if no AI node produces output. Leave empty to auto-echo the user's message.
                                </span>
                            </div>
                            <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                                <code className="text-[0.73rem] text-purple-200 font-mono break-all">POST /api/trigger/app-event/[workflow-id]</code>
                                <p className="text-[0.7rem] text-slate-500 mt-1 m-0">Telegram will send updates to this URL after webhook registration.</p>
                            </div>
                        </div>
                    )}

                    {selectedNode.data.type === 'form_submission' && (
                        <div className="flex flex-col gap-4">
                            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col gap-2">
                                <label className="text-[0.7rem] uppercase tracking-widest text-cyan-400 font-bold">Form Endpoint</label>
                                <code className="text-[0.78rem] text-cyan-200 font-mono break-all bg-black/30 p-3 rounded-lg">
                                    POST /api/trigger/form/[workflow-id]
                                </code>
                                <p className="text-[0.75rem] text-slate-500 m-0">Any form that POSTs to this URL will trigger the workflow with the form data.</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Form Fields (JSON array)</label>
                                <textarea className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.85rem] font-mono h-[100px] resize-none outline-none focus:border-blue-500 transition-all" placeholder='[{"name":"email","type":"email"},{"name":"message","type":"text"}]' value={selectedNode.data.config?.fields || ''} onChange={(e) => updateNodeConfig('fields', e.target.value)} />
                                <span className="text-[0.7rem] text-slate-500 italic">Define the expected fields for documentation. Actual submission accepts any JSON body.</span>
                            </div>
                        </div>
                    )}

                    {selectedNode.data.type === 'sub_workflow_trigger' && (
                        <div className="flex flex-col gap-4">
                            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-2">
                                <label className="text-[0.7rem] uppercase tracking-widest text-rose-400 font-bold">Sub-Workflow Endpoint</label>
                                <code className="text-[0.78rem] text-rose-200 font-mono break-all bg-black/30 p-3 rounded-lg">
                                    POST /api/trigger/sub-workflow/[workflow-id]
                                </code>
                                <p className="text-[0.75rem] text-slate-500 m-0">Call this endpoint from another workflow's HTTP Request node to chain workflows together.</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Workflow Description</label>
                                <input type="text" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] outline-none focus:border-blue-500 transition-all" placeholder="e.g. Sends email notification" value={selectedNode.data.config?.description || ''} onChange={(e) => updateNodeConfig('description', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {selectedNode.data.type === 'chat_message' && (
                        <div className="flex flex-col gap-4">
                            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col gap-2">
                                <label className="text-[0.7rem] uppercase tracking-widest text-indigo-400 font-bold">Chat API Endpoint</label>
                                <code className="text-[0.78rem] text-indigo-200 font-mono break-all bg-black/30 p-3 rounded-lg">
                                    POST /api/trigger/chat/[workflow-id]<br />
                                    {'{'} "message": "Hello!" {'}'}
                                </code>
                                <p className="text-[0.75rem] text-slate-500 m-0">Send a message to this endpoint to trigger the workflow. The response will include the bot's reply.</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Bot Persona / System Prompt</label>
                                <textarea className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.85rem] h-[80px] resize-none outline-none focus:border-blue-500 transition-all" placeholder="You are a helpful assistant..." value={selectedNode.data.config?.system_prompt || ''} onChange={(e) => updateNodeConfig('system_prompt', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {selectedNode.data.type === 'other_ways' && (
                        <div className="flex flex-col gap-4">
                            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-col gap-2">
                                <label className="text-[0.7rem] uppercase tracking-widest text-orange-400 font-bold">Error Trigger Endpoint</label>
                                <code className="text-[0.78rem] text-orange-200 font-mono break-all bg-black/30 p-3 rounded-lg">
                                    POST /api/trigger/error/[workflow-id]<br />
                                    {'{'} "error": "...", "origin_workflow": "id" {'}'}
                                </code>
                                <p className="text-[0.75rem] text-slate-500 m-0">Call this from another workflow's error handler to trigger a recovery or notification flow.</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium">Trigger Condition</label>
                                <select className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] outline-none" value={selectedNode.data.config?.condition || 'error'} onChange={(e) => updateNodeConfig('condition', e.target.value)}>
                                    <option value="error">On Workflow Error</option>
                                    <option value="file_change">On File Change (coming soon)</option>
                                    <option value="custom_event">Custom Event (coming soon)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {selectedNode.data.type === 'github_push' && (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium whitespace-nowrap">Repository Owner</label>
                                <input type="text" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] outline-none focus:border-blue-500 transition-all" placeholder="e.g. Bagavathisingh" value={selectedNode.data.config?.owner || ''} onChange={(e) => updateNodeConfig('owner', e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium whitespace-nowrap">Repository Name</label>
                                <input type="text" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] outline-none focus:border-blue-500 transition-all" placeholder="e.g. miniN8N" value={selectedNode.data.config?.repo || ''} onChange={(e) => updateNodeConfig('repo', e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium whitespace-nowrap">Access Token</label>
                                <div className="relative">
                                    <input type={showGithubToken ? "text" : "password"} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-white text-[0.95rem] outline-none focus:border-blue-500 transition-all" placeholder="ghp_..." value={selectedNode.data.config?.token || ''} onChange={(e) => updateNodeConfig('token', e.target.value)} />
                                    <button type="button" onClick={() => setShowGithubToken(!showGithubToken)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-slate-500 hover:text-white transition-colors">{showGithubToken ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium whitespace-nowrap">File Path</label>
                                <input type="text" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] outline-none focus:border-blue-500 transition-all" placeholder="data/results.json" value={selectedNode.data.config?.path || ''} onChange={(e) => updateNodeConfig('path', e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium whitespace-nowrap">Commit Message</label>
                                <input type="text" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.95rem] outline-none focus:border-blue-500 transition-all" placeholder="Update data" value={selectedNode.data.config?.message || ''} onChange={(e) => updateNodeConfig('message', e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] text-slate-400 font-medium whitespace-nowrap">Content</label>
                                <textarea className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.85rem] h-[100px] resize-none outline-none" placeholder="Custom content..." value={selectedNode.data.config?.content || ''} onChange={(e) => updateNodeConfig('content', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {['log'].includes(selectedNode.data.type) && (
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
