import { useState, useEffect } from 'react';
import { X, Play, Zap, Clock, Webhook, FileEdit, MessageSquare, Radio, ArrowRightToLine, Folder, MousePointer2, AlertCircle, Eye, EyeOff } from 'lucide-react';

const TRIGGER_CONFIGS = {
    manual_trigger: {
        icon: MousePointer2,
        color: 'emerald',
        label: 'Manual Trigger',
        description: 'Simulate a manual execution with a custom payload.',
        fields: [
            { key: 'event', label: 'Event Name', type: 'text', placeholder: 'user_action', default: 'manual_run' },
            { key: 'user', label: 'Simulated User', type: 'text', placeholder: 'admin', default: 'test_user' },
            { key: 'note', label: 'Test Note', type: 'text', placeholder: 'Testing manually...', default: '' },
        ]
    },
    webhook_trigger: {
        icon: Webhook,
        color: 'blue',
        label: 'Webhook Trigger',
        description: 'Simulate an incoming HTTP request payload.',
        fields: [
            { key: 'method', label: 'HTTP Method', type: 'select', options: ['POST', 'GET', 'PUT', 'PATCH'], default: 'POST' },
            { key: 'source', label: 'Source System', type: 'text', placeholder: 'e.g. stripe, github, custom', default: 'test_webhook' },
            { key: 'event', label: 'Event Type', type: 'text', placeholder: 'e.g. payment.completed', default: 'test.event' },
        ],
        jsonField: { key: 'body', label: 'Request Body (JSON)', placeholder: '{\n  "id": "evt_123",\n  "amount": 4999\n}', default: '{\n  "id": "test_event_001",\n  "status": "received"\n}' }
    },
    schedule_trigger: {
        icon: Clock,
        color: 'amber',
        label: 'Schedule Trigger',
        description: 'Simulate a scheduled execution at a specific time.',
        fields: [
            { key: 'scheduled_at', label: 'Simulated Time', type: 'datetime-local', default: '' },
            { key: 'interval_label', label: 'Interval Label', type: 'text', placeholder: 'e.g. every 1 hour', default: 'test_run' },
        ]
    },
    app_event: {
        icon: Radio,
        color: 'purple',
        label: 'App Event (Telegram)',
        description: 'Simulate a Telegram message or app event.',
        fields: [
            { key: 'text', label: 'Message Text', type: 'text', placeholder: 'Hello from test!', default: 'Hello, bot!' },
            { key: 'from_name', label: 'Sender Name', type: 'text', placeholder: 'John Doe', default: 'Test User' },
            { key: 'chat_id', label: 'Chat ID', type: 'text', placeholder: '-1001234567890', default: '123456' },
        ]
    },
    form_submission: {
        icon: FileEdit,
        color: 'cyan',
        label: 'Form Submission',
        description: 'Simulate a form submission with field values.',
        fields: [
            { key: 'name', label: 'Name Field', type: 'text', placeholder: 'Test User', default: 'Test User' },
            { key: 'email', label: 'Email Field', type: 'email', placeholder: 'test@example.com', default: 'test@example.com' },
            { key: 'message', label: 'Message Field', type: 'text', placeholder: 'Test message...', default: 'This is a test form submission.' },
        ]
    },
    sub_workflow_trigger: {
        icon: ArrowRightToLine,
        color: 'rose',
        label: 'Sub-Workflow Trigger',
        description: 'Simulate a call from a parent workflow.',
        fields: [
            { key: 'caller_workflow', label: 'Caller Workflow ID', type: 'text', placeholder: 'wf_parent_123', default: 'parent_wf_test' },
            { key: 'step', label: 'Calling Step', type: 'text', placeholder: 'http_request_node', default: 'test_step' },
        ],
        jsonField: { key: 'caller_payload', label: 'Caller Payload (JSON)', placeholder: '{\n  "data": "from parent"\n}', default: '{\n  "data": "test_data_from_caller"\n}' }
    },
    chat_message: {
        icon: MessageSquare,
        color: 'indigo',
        label: 'Chat Message',
        description: 'Simulate a user chat message.',
        fields: [
            { key: 'message', label: 'User Message', type: 'text', placeholder: 'Ask me anything...', default: 'Hello! Can you help me?' },
            { key: 'session_id', label: 'Session ID', type: 'text', placeholder: 'session_abc123', default: 'test_session_001' },
        ]
    },
    other_ways: {
        icon: Folder,
        color: 'orange',
        label: 'Other Ways',
        description: 'Simulate an error or custom event payload.',
        fields: [
            { key: 'error', label: 'Simulated Error', type: 'text', placeholder: 'Node X failed: timeout', default: 'Test error message' },
            { key: 'origin_workflow', label: 'Origin Workflow ID', type: 'text', placeholder: 'wf_abc123', default: 'test_workflow_origin' },
        ]
    },
};

const COLOR_MAP = {
    emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', icon: 'bg-emerald-500/20 text-emerald-400', btn: 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_14px_rgba(52,211,153,0.3)]', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'text-emerald-400' },
    blue: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', icon: 'bg-blue-500/20 text-blue-400', btn: 'bg-blue-500 hover:bg-blue-600 shadow-[0_4px_14px_rgba(59,130,246,0.3)]', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'text-blue-400' },
    amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', icon: 'bg-amber-500/20 text-amber-400', btn: 'bg-amber-500 hover:bg-amber-600 shadow-[0_4px_14px_rgba(245,158,11,0.3)]', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'text-amber-400' },
    purple: { border: 'border-purple-500/30', bg: 'bg-purple-500/10', icon: 'bg-purple-500/20 text-purple-400', btn: 'bg-purple-500 hover:bg-purple-600 shadow-[0_4px_14px_rgba(168,85,247,0.3)]', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20', label: 'text-purple-400' },
    cyan: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', icon: 'bg-cyan-500/20 text-cyan-400', btn: 'bg-cyan-500 hover:bg-cyan-600 shadow-[0_4px_14px_rgba(34,211,238,0.3)]', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', label: 'text-cyan-400' },
    rose: { border: 'border-rose-500/30', bg: 'bg-rose-500/10', icon: 'bg-rose-500/20 text-rose-400', btn: 'bg-rose-500 hover:bg-rose-600 shadow-[0_4px_14px_rgba(244,63,94,0.3)]', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', label: 'text-rose-400' },
    indigo: { border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', icon: 'bg-indigo-500/20 text-indigo-400', btn: 'bg-indigo-500 hover:bg-indigo-600 shadow-[0_4px_14px_rgba(99,102,241,0.3)]', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', label: 'text-indigo-400' },
    orange: { border: 'border-orange-500/30', bg: 'bg-orange-500/10', icon: 'bg-orange-500/20 text-orange-400', btn: 'bg-orange-500 hover:bg-orange-600 shadow-[0_4px_14px_rgba(249,115,22,0.3)]', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'text-orange-400' },
};

export default function TestInputModal({ isOpen, onClose, onRun, triggerNode, nodes = [] }) {
    const [values, setValues] = useState({});
    const [jsonValues, setJsonValues] = useState({});
    const [jsonError, setJsonError] = useState(null);
    const [activeTab, setActiveTab] = useState('fields');
    const [showPasswords, setShowPasswords] = useState({});

    const triggerType = triggerNode?.data?.type || 'manual_trigger';
    const config = TRIGGER_CONFIGS[triggerType] || TRIGGER_CONFIGS['manual_trigger'];
    const colors = COLOR_MAP[config.color];
    const Icon = config.icon;

    // ── Dynamic Field Generation ─────────────────────────────────────────────
    const getWorkflowRequiredFields = () => {
        const dynamicFields = [...config.fields];
        const fieldKeys = new Set(dynamicFields.map(f => f.key));

        nodes.forEach(node => {
            const type = node.data?.type;
            const config = node.data?.config || {};

            // 1. Auto-detect Auth fields
            if (type === 'user_registration' || type === 'user_login') {
                if (!fieldKeys.has('email')) {
                    dynamicFields.push({ key: 'email', label: 'Email Address', type: 'email', placeholder: 'user@example.com', default: 'test@example.com' });
                    fieldKeys.add('email');
                }
                if (!fieldKeys.has('password')) {
                    dynamicFields.push({ key: 'password', label: 'Password', type: 'password', placeholder: '••••••••', default: 'password123' });
                    fieldKeys.add('password');
                }
            }

            // 2. Scan for custom parameters in registration
            if (type === 'user_registration' && config.parameters) {
                config.parameters.forEach(p => {
                    if (p.name && !fieldKeys.has(p.name)) {
                        dynamicFields.push({ 
                            key: p.name, 
                            label: p.name.charAt(0).toUpperCase() + p.name.slice(1), 
                            type: p.type === 'date' ? 'date' : p.type === 'time' ? 'time' : p.type === 'number' ? 'number' : 'text', 
                            placeholder: `Enter ${p.name}...`,
                            default: '' 
                        });
                        fieldKeys.add(p.name);
                    }
                });
            }

            // 3. Scan for {{payload.VAR}} templates in any string field
            const scan = (val) => {
                if (typeof val !== 'string') return;
                const matches = val.matchAll(/\{\{\s*(?:payload|input)\.([\w\d\_ ]+?)\s*\}\}/g);
                for (const m of matches) {
                    const key = m[1].trim();
                    if (!fieldKeys.has(key)) {
                        dynamicFields.push({ key, label: `Variable: ${key}`, type: 'text', placeholder: `Data for {{payload.${key}}}`, default: '' });
                        fieldKeys.add(key);
                    }
                }
            };

            Object.values(config).forEach(v => {
                if (typeof v === 'string') scan(v);
                else if (Array.isArray(v)) v.forEach(item => typeof item === 'object' && Object.values(item).forEach(scan));
            });
        });

        return dynamicFields;
    };

    const workflowFields = getWorkflowRequiredFields();

    // Initialize defaults when trigger or nodes changes
    useEffect(() => {
        const defaults = {};
        workflowFields.forEach(f => {
            defaults[f.key] = f.type === 'datetime-local'
                ? new Date().toISOString().slice(0, 16)
                : f.default || '';
        });
        setValues(defaults);

        if (config.jsonField) {
            setJsonValues({ [config.jsonField.key]: config.jsonField.default || '{}' });
        }
        setJsonError(null);
    }, [triggerType, isOpen, nodes.length]);

    const handleRun = () => {
        let payload = { source: 'test', trigger_type: triggerType, ...values };

        // Parse JSON fields
        if (config.jsonField) {
            const raw = jsonValues[config.jsonField.key] || '{}';
            try {
                payload[config.jsonField.key] = JSON.parse(raw);
                setJsonError(null);
            } catch (e) {
                setJsonError(`Invalid JSON: ${e.message}`);
                return;
            }
        }

        onRun(payload);
        onClose();
    };

    const buildJsonPreview = () => {
        const preview = { source: 'test', trigger_type: triggerType, ...values };
        if (config.jsonField) {
            try { preview[config.jsonField.key] = JSON.parse(jsonValues[config.jsonField.key] || '{}'); } catch (e) { /* ignore */ }
        }
        return JSON.stringify(preview, null, 2);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease]">
            <div className={`w-[580px] max-h-[85vh] bg-slate-950 border rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden ${colors.border}`}>

                {/* Header */}
                <div className={`px-7 py-5 border-b border-white/5 flex items-center gap-4 ${colors.bg}`}>
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${colors.icon} flex-shrink-0`}>
                        <Icon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-[1.05rem] m-0 leading-tight">Test Your Workflow</p>
                        <p className={`text-[0.78rem] m-0 mt-0.5 font-medium ${colors.label}`}>{config.label}</p>
                    </div>
                    <span className={`text-[0.65rem] uppercase tracking-widest font-bold px-2.5 py-1 rounded-lg border ${colors.badge}`}>
                        {triggerType.replace(/_/g, ' ')}
                    </span>
                    <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border-none cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                {/* Description */}
                <div className="px-7 pt-5">
                    <p className="text-[0.83rem] text-slate-400 m-0 leading-relaxed">{config.description}</p>
                </div>

                {/* Tabs */}
                <div className="px-7 pt-4 flex gap-1 border-b border-white/5 pb-0">
                    {[['fields', 'Input Fields'], ['json', 'JSON Preview']].map(([key, label]) => (
                        <button key={key} onClick={() => setActiveTab(key)}
                            className={`px-4 py-2 text-[0.78rem] font-bold rounded-t-xl border-b-2 transition-all cursor-pointer border-none ${activeTab === key ? `${colors.label} border-current bg-white/[0.04]` : 'text-slate-500 border-transparent hover:text-slate-300 bg-transparent'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-7 py-6">

                    {activeTab === 'fields' && (
                        <div className="flex flex-col gap-4">
                            {workflowFields.map((field) => (
                                <div key={field.key} className="flex flex-col gap-2">
                                    <label className="text-[0.8rem] text-slate-400 font-medium">{field.label}</label>
                                    {field.type === 'select' ? (
                                        <select
                                            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-[0.9rem] outline-none focus:border-blue-500/50 transition-all"
                                            value={values[field.key] || field.default}
                                            onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                                        >
                                            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type={field.type === 'password' ? (showPasswords[field.key] ? 'text' : 'password') : field.type}
                                                className={`w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-[0.9rem] outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 ${field.type === 'password' ? 'pr-12' : ''}`}
                                                placeholder={field.placeholder}
                                                value={values[field.key] ?? field.default}
                                                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                                            />
                                            {field.type === 'password' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
                                                >
                                                    {showPasswords[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {config.jsonField && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[0.8rem] text-slate-400 font-medium">{config.jsonField.label}</label>
                                    <textarea
                                        className={`bg-slate-900 border rounded-xl px-4 py-3 text-white text-[0.82rem] font-mono h-[130px] resize-none outline-none transition-all ${jsonError ? 'border-red-500/50' : 'border-white/10 focus:border-blue-500/50'}`}
                                        placeholder={config.jsonField.placeholder}
                                        value={jsonValues[config.jsonField.key] || ''}
                                        onChange={e => { setJsonValues({ [config.jsonField.key]: e.target.value }); setJsonError(null); }}
                                        spellCheck={false}
                                    />
                                    {jsonError && (
                                        <div className="flex items-center gap-2 text-red-400 text-[0.75rem]">
                                            <AlertCircle size={13} /> {jsonError}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'json' && (
                        <div className="flex flex-col gap-3">
                            <p className="text-[0.78rem] text-slate-500 m-0">This is the exact payload that will be sent to your workflow:</p>
                            <pre className="bg-black/50 border border-white/5 rounded-2xl p-5 text-[0.8rem] text-emerald-200 font-mono whitespace-pre-wrap break-all m-0 max-h-[350px] overflow-auto">
                                {buildJsonPreview()}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-7 py-5 border-t border-white/5 flex items-center justify-between gap-4">
                    <p className="text-[0.72rem] text-slate-600 m-0">All fields are optional — defaults will be used if left empty.</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all font-medium text-[0.85rem] border border-white/10 cursor-pointer border-none">
                            Cancel
                        </button>
                        <button
                            onClick={handleRun}
                            className={`px-6 py-2.5 rounded-xl text-white font-bold text-[0.85rem] flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 ${colors.btn} border-none cursor-pointer`}
                        >
                            <Play size={16} />
                            Run Test
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
