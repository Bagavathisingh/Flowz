import { X, CheckCircle2, XCircle, Clock, Info, Eye, EyeOff, Sparkles, Activity, AlertCircle } from 'lucide-react';
import { useState } from 'react';

// ── Shared Config Field ───────────────────────────────────────────────────────
const ConfigField = ({ label, children, description }) => (
    <div className="flex flex-col gap-1.5 mb-4">
        <label className="text-[0.65rem] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {label}
        </label>
        {children}
        {description && (
            <p className="text-[0.65rem] m-0 mt-1" style={{ color: 'var(--text-muted)' }}>{description}</p>
        )}
    </div>
);

// ── Main Sidebar ─────────────────────────────────────────────────────────────
export default function PropertiesSidebar({ selectedNode, setSelectedNode, updateNodeConfig }) {
    if (!selectedNode) return null;

    const { executionStatus, executionResult } = selectedNode.data;
    const [showSmtpPass, setShowSmtpPass] = useState(false);
    const [showAiKey, setShowAiKey] = useState(false);

    return (
        <div
            className="absolute top-4 right-4 bottom-4 z-50 flex flex-col pointer-events-auto"
            style={{
                width: 340,
                background: 'linear-gradient(145deg, rgba(13,17,27,0.95), rgba(7,9,15,0.98))',
                backdropFilter: 'blur(32px)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: '0 16px 64px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset',
                animation: 'slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="m-0 text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)' }}>
                    Node Settings
                </h3>
                <button
                    className="flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 0, transition: 'all 0.15s ease' }}
                    onClick={() => setSelectedNode(null)}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                >
                    <X size={14} />
                </button>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto p-5 pb-8 flex flex-col gap-6 no-scrollbar">
                
                {/* Status Block */}
                {executionStatus && (
                    <div className="rounded-2xl p-4 flex flex-col gap-3"
                        style={{
                            background: executionStatus === 'success' ? 'rgba(16,185,129,0.08)' :
                                executionStatus === 'failure' ? 'rgba(239,68,68,0.08)' : 'rgba(0,212,255,0.08)',
                            border: `1px solid ${
                                executionStatus === 'success' ? 'rgba(16,185,129,0.2)' :
                                executionStatus === 'failure' ? 'rgba(239,68,68,0.2)' : 'rgba(0,212,255,0.2)'
                            }`
                        }}>
                        <div className="flex items-center gap-2">
                            {executionStatus === 'success' && <CheckCircle2 size={14} className="text-[#10b981]" />}
                            {executionStatus === 'failure' && <XCircle size={14} className="text-[#ef4444]" />}
                            {executionStatus === 'loading' && <Activity size={14} className="text-[#00d4ff] animate-pulse" />}
                            <span className="text-[0.65rem] font-black uppercase tracking-widest"
                                  style={{ color: executionStatus === 'success' ? '#10b981' : executionStatus === 'failure' ? '#ef4444' : '#00d4ff', fontFamily: 'var(--font-mono)' }}>
                                {executionStatus === 'loading' ? 'Executing' : executionStatus}
                            </span>
                        </div>
                        {executionResult && (
                            <div className="mt-1 rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <p className="text-[0.6rem] font-black uppercase tracking-widest m-0 mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Output</p>
                                {executionResult.previewUrl ? (
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[0.7rem] text-[#10b981]">Email Sent Successfully</span>
                                        <a href={executionResult.previewUrl} target="_blank" rel="noreferrer" className="text-[0.7rem] underline" style={{ color: '#00d4ff' }}>
                                            View Preview
                                        </a>
                                    </div>
                                ) : (
                                    <pre className="text-[0.7rem] m-0 max-h-32 overflow-y-auto no-scrollbar whitespace-pre-wrap break-all" style={{ color: executionStatus === 'failure' ? '#fca5a5' : '#6ee7b7', fontFamily: 'var(--font-mono)' }}>
                                        {typeof executionResult === 'object' ? JSON.stringify(executionResult, null, 2) : String(executionResult)}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Info block */}
                <div className="flex flex-col gap-4">
                    <ConfigField label="Display Label">
                        <input
                            type="text"
                            value={selectedNode.data.label}
                            disabled
                            className="flowz-input disabled:opacity-50"
                        />
                    </ConfigField>
                    <ConfigField label="Node ID">
                        <input
                            type="text"
                            value={selectedNode.id}
                            disabled
                            className="flowz-input disabled:opacity-50 text-[0.7rem] font-mono"
                            style={{ color: 'var(--text-muted)' }}
                        />
                    </ConfigField>
                </div>

                {/* Configuration divider */}
                <div className="h-px w-full" style={{ background: 'var(--border)' }} />

                {/* Dynamic Configuration */}
                <div className="flex flex-col">
                    <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)' }}>
                        Parameters
                    </h4>

                    {selectedNode.data.type === 'http_request' && (
                        <>
                            <ConfigField label="Target URL">
                                <input
                                    type="text"
                                    className="flowz-input"
                                    placeholder="https://api.example.com"
                                    value={selectedNode.data.config?.url || ''}
                                    onChange={(e) => updateNodeConfig('url', e.target.value)}
                                />
                            </ConfigField>
                            <ConfigField label="Method">
                                <select
                                    className="flowz-input appearance-none"
                                    value={selectedNode.data.config?.method || 'GET'}
                                    onChange={(e) => updateNodeConfig('method', e.target.value)}
                                >
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="PUT">PUT</option>
                                    <option value="DELETE">DELETE</option>
                                </select>
                            </ConfigField>
                        </>
                    )}

                    {selectedNode.data.type === 'send_email' && (
                        <>
                            <ConfigField label="SMTP Host">
                                <input type="text" className="flowz-input" placeholder="smtp.gmail.com" value={selectedNode.data.config?.smtp_host || ''} onChange={(e) => updateNodeConfig('smtp_host', e.target.value)} />
                            </ConfigField>
                            <ConfigField label="SMTP Port">
                                <input type="number" className="flowz-input" placeholder="587" value={selectedNode.data.config?.smtp_port || ''} onChange={(e) => updateNodeConfig('smtp_port', e.target.value)} />
                            </ConfigField>
                            <ConfigField label="SMTP User">
                                <input type="text" className="flowz-input" placeholder="email@example.com" value={selectedNode.data.config?.smtp_user || ''} onChange={(e) => updateNodeConfig('smtp_user', e.target.value)} />
                            </ConfigField>
                            <ConfigField label="SMTP Password" description="Use an app-specific password, not your real password.">
                                <div className="relative">
                                    <input
                                        type={showSmtpPass ? "text" : "password"}
                                        className="flowz-input pr-10"
                                        placeholder="App Password"
                                        value={selectedNode.data.config?.smtp_pass || ''}
                                        onChange={(e) => updateNodeConfig('smtp_pass', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2"
                                        onClick={() => setShowSmtpPass(!showSmtpPass)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                    >
                                        {showSmtpPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </ConfigField>
                            <ConfigField label="To Email">
                                <input type="email" className="flowz-input" placeholder="recipient@example.com" value={selectedNode.data.config?.to || ''} onChange={(e) => updateNodeConfig('to', e.target.value)} />
                            </ConfigField>
                            <ConfigField label="Subject">
                                <input type="text" className="flowz-input" placeholder="Hello from Flowz" value={selectedNode.data.config?.subject || ''} onChange={(e) => updateNodeConfig('subject', e.target.value)} />
                            </ConfigField>
                            <ConfigField label="Body">
                                <textarea className="flowz-input" placeholder="Email body..." rows={4} value={selectedNode.data.config?.body || ''} onChange={(e) => updateNodeConfig('body', e.target.value)} />
                            </ConfigField>
                        </>
                    )}

                    {selectedNode.data.type === 'ai_model' && (
                        <>
                            <ConfigField label="Provider">
                                <select
                                    className="flowz-input appearance-none"
                                    value={selectedNode.data.config?.provider || 'openai'}
                                    onChange={(e) => updateNodeConfig('provider', e.target.value)}
                                >
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic</option>
                                    <option value="google">Google Gemini</option>
                                    <option value="nvidia">NVIDIA (OpenAI Compatible)</option>
                                </select>
                            </ConfigField>
                            <ConfigField label="Model">
                                <input
                                    type="text"
                                    className="flowz-input"
                                    placeholder={
                                        selectedNode.data.config?.provider === 'google' ? 'gemini-2.0-flash' :
                                        selectedNode.data.config?.provider === 'nvidia' ? 'meta/llama-3.1-405b-instruct' :
                                        'gpt-4o'
                                    }
                                    value={selectedNode.data.config?.model || ''}
                                    onChange={(e) => updateNodeConfig('model', e.target.value)}
                                />
                            </ConfigField>
                            <ConfigField label="API Key">
                                <div className="relative">
                                    <input
                                        type={showAiKey ? "text" : "password"}
                                        className="flowz-input pr-10"
                                        placeholder={
                                            selectedNode.data.config?.provider === 'google' ? 'GEMINI_API_KEY' : 
                                            selectedNode.data.config?.provider === 'nvidia' ? 'nvapi-...' : 
                                            'sk-...'
                                        }
                                        value={selectedNode.data.config?.api_key || ''}
                                        onChange={(e) => updateNodeConfig('api_key', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2"
                                        onClick={() => setShowAiKey(!showAiKey)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                    >
                                        {showAiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </ConfigField>
                            <ConfigField label="System Prompt">
                                <textarea className="flowz-input" placeholder="You are a helpful assistant..." rows={3} value={selectedNode.data.config?.system_prompt || ''} onChange={(e) => updateNodeConfig('system_prompt', e.target.value)} />
                            </ConfigField>
                            <ConfigField label="User Prompt">
                                <textarea className="flowz-input" placeholder="Analyze the following data: {{trigger.data}}" rows={4} value={selectedNode.data.config?.prompt || ''} onChange={(e) => updateNodeConfig('prompt', e.target.value)} />
                            </ConfigField>
                        </>
                    )}

                    {selectedNode.data.type === 'save_to_database' && (
                        <>
                            <ConfigField label="MongoDB URI">
                                <input type="text" className="flowz-input" placeholder="mongodb+srv://..." value={selectedNode.data.config?.uri || ''} onChange={(e) => updateNodeConfig('uri', e.target.value)} />
                            </ConfigField>
                            <ConfigField label="Collection Name">
                                <input type="text" className="flowz-input" placeholder="users" value={selectedNode.data.config?.collection || ''} onChange={(e) => updateNodeConfig('collection', e.target.value)} />
                            </ConfigField>
                            <ConfigField label="Document Data (JSON)">
                                <textarea className="flowz-input font-mono text-[0.75rem]" placeholder='{"name": "{{trigger.name}}"}' rows={6} value={selectedNode.data.config?.document || ''} onChange={(e) => updateNodeConfig('document', e.target.value)} />
                            </ConfigField>
                        </>
                    )}

                    {selectedNode.data.type === 'app_event' && (
                        <>
                            <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Sparkles size={12} style={{ color: '#00d4ff' }} />
                                    <p className="text-[0.65rem] font-black uppercase m-0" style={{ color: '#00d4ff', fontFamily: 'var(--font-mono)' }}>Telegram Setup</p>
                                </div>
                                <p className="text-[0.75rem] m-0" style={{ color: 'var(--text-secondary)' }}>
                                    Enter your Bot Token from @BotFather. The bot will automatically register its webhook when you publish.
                                </p>
                            </div>
                            <ConfigField label="Telegram Bot Token">
                                <input 
                                    type="password" 
                                    className="flowz-input font-mono text-[0.75rem]" 
                                    placeholder="123456789:ABCDEF..." 
                                    value={selectedNode.data.config?.telegram_token || ''} 
                                    onChange={(e) => updateNodeConfig('telegram_token', e.target.value)} 
                                />
                            </ConfigField>
                            <ConfigField label="Target Chat ID" description="Optional: Bot will respond to sender by default.">
                                <input 
                                    type="text" 
                                    className="flowz-input" 
                                    placeholder="e.g. 987654321" 
                                    value={selectedNode.data.config?.chat_id || ''} 
                                    onChange={(e) => updateNodeConfig('chat_id', e.target.value)} 
                                />
                            </ConfigField>
                        </>
                    )}

                    {selectedNode.data.type === 'delay' && (
                        <ConfigField label="Wait Time (ms)">
                            <input type="number" className="flowz-input" placeholder="5000" value={selectedNode.data.config?.wait_time || ''} onChange={(e) => updateNodeConfig('wait_time', e.target.value)} />
                        </ConfigField>
                    )}

                    {selectedNode.data.type === 'ifElse' && (
                        <ConfigField label="Condition (JavaScript expression)">
                            <textarea
                                className="flowz-input font-mono text-[0.75rem]"
                                placeholder="env.trigger.data.amount > 100"
                                rows={4}
                                value={selectedNode.data.config?.condition || ''}
                                onChange={(e) => updateNodeConfig('condition', e.target.value)}
                            />
                        </ConfigField>
                    )}

                    {selectedNode.data.type === 'log' && (
                        <ConfigField label="Log Message">
                            <textarea
                                className="flowz-input"
                                placeholder="Processing completed for {{trigger.data.id}}"
                                rows={3}
                                value={selectedNode.data.config?.message || ''}
                                onChange={(e) => updateNodeConfig('message', e.target.value)}
                            />
                        </ConfigField>
                    )}

                    {/* Trigger Webhook Specific Settings */}
                    {selectedNode.data.type === 'webhook_trigger' && (
                        <>
                             <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Sparkles size={12} style={{ color: '#00d4ff' }} />
                                    <p className="text-[0.65rem] font-black uppercase m-0" style={{ color: '#00d4ff', fontFamily: 'var(--font-mono)' }}>Webhook Info</p>
                                </div>
                                <p className="text-[0.75rem] m-0" style={{ color: 'var(--text-secondary)' }}>
                                    When this workflow is published, a unique webhook URL will be generated for it. Sending a POST request to that URL will trigger this flow. Let's add authentication.
                                </p>
                            </div>
                            <ConfigField label="Webhook Authentication">
                                 <select
                                    className="flowz-input appearance-none"
                                    value={selectedNode.data.config?.auth_type || 'none'}
                                    onChange={(e) => updateNodeConfig('auth_type', e.target.value)}
                                >
                                    <option value="none">None (Public)</option>
                                    <option value="header">Custom Header</option>
                                    <option value="bearer">Bearer Token</option>
                                </select>
                            </ConfigField>

                            {selectedNode.data.config?.auth_type === 'header' && (
                                <>
                                    <ConfigField label="Expected Header Key">
                                        <input type="text" className="flowz-input" placeholder="x-api-key" value={selectedNode.data.config?.auth_header_key || ''} onChange={(e) => updateNodeConfig('auth_header_key', e.target.value)} />
                                    </ConfigField>
                                    <ConfigField label="Expected Header Value">
                                        <input type="text" className="flowz-input" placeholder="secret123" value={selectedNode.data.config?.auth_header_value || ''} onChange={(e) => updateNodeConfig('auth_header_value', e.target.value)} />
                                    </ConfigField>
                                </>
                            )}
                             {selectedNode.data.config?.auth_type === 'bearer' && (
                                 <ConfigField label="Expected Bearer Token">
                                    <input type="text" className="flowz-input" placeholder="jwt_or_token..." value={selectedNode.data.config?.auth_token || ''} onChange={(e) => updateNodeConfig('auth_token', e.target.value)} />
                                </ConfigField>
                            )}
                        </>
                    )}

                    {(!['http_request', 'send_email', 'ai_model', 'save_to_database', 'app_event', 'delay', 'ifElse', 'log', 'webhook_trigger'].includes(selectedNode.data.type)) && (
                         <div className="flex flex-col gap-3 py-4 text-center">
                            <Info size={24} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
                            <p className="text-[0.8rem] m-0" style={{ color: 'var(--text-secondary)' }}>
                                No specific configuration needed for <strong>{selectedNode.data.type}</strong>.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
