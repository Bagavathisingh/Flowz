import { Handle, Position } from '@xyflow/react';
import { Globe, Mail, Database, Clock, Trash2, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';

const NODE_THEMES = {
    webhook_trigger: {
        color: 'emerald',
        icon: <Globe size={18} />,
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-500',
        border: 'border-emerald-500/20'
    },
    http_request: {
        color: 'sky',
        icon: <Globe size={18} />,
        bg: 'bg-sky-500/10',
        text: 'text-sky-500',
        border: 'border-sky-500/20'
    },
    send_email: {
        color: 'orange',
        icon: <Mail size={18} />,
        bg: 'bg-orange-500/10',
        text: 'text-orange-500',
        border: 'border-orange-500/20'
    },
    save_to_database: {
        color: 'amber',
        icon: <Database size={18} />,
        bg: 'bg-amber-500/10',
        text: 'text-amber-500',
        border: 'border-amber-500/20'
    },
    ai_model: {
        color: 'fuchsia',
        icon: <Sparkles size={18} />,
        bg: 'bg-fuchsia-500/10',
        text: 'text-fuchsia-500',
        border: 'border-fuchsia-500/20'
    },
    delay: {
        color: 'cyan',
        icon: <Clock size={18} />,
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-500',
        border: 'border-cyan-500/20'
    }
};

export default function CustomNode({ data, selected }) {
    const theme = NODE_THEMES[data.type] || NODE_THEMES.webhook_trigger;
    const isIfElse = data.type === 'ifElse';
    const configKeys = Object.keys(data.config || {});

    return (
        <div className={`bg-slate-900/95 border ${selected ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.6)]' : 'border-white/10'} rounded-2xl p-0 min-w-[280px] max-w-[320px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-slate-50 text-[0.95rem] backdrop-blur-md transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:border-white/20 group`}>

            {/* Type Header Tag (n8n style) */}
            <div className={`h-1 w-full rounded-t-2xl ${theme.bg.replace('/10', '')}`} />

            <div className="p-5">
                <div className="flex items-center gap-3 mb-4 font-semibold text-lg">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl shadow-inner ${theme.bg} ${theme.text}`}>
                        {theme.icon}
                    </div>
                    <div className="flex flex-col flex-1 truncate">
                        <span className="text-slate-200 text-sm opacity-50 font-normal leading-none mb-1 uppercase tracking-tighter">
                            {data.type.replace('_', ' ')}
                        </span>
                        <span className="truncate leading-none">{data.label}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-bold flex justify-between">
                        <span>Config</span>
                        <span className="text-[10px] lowercase font-normal opacity-50">{data.type}</span>
                    </div>
                    <div className="text-[0.75rem] text-slate-400 bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                        {configKeys.length > 0 ? (
                            configKeys.map(key => {
                                const val = data.config[key];
                                const displayVal = typeof val === 'object' ? '{...}' : String(val);
                                if (key.includes('pass') || key.includes('key')) return (
                                    <div key={key} className="flex justify-between items-center bg-white/5 px-2 py-1 rounded">
                                        <span className="opacity-60">{key}:</span>
                                        <span className="text-blue-400 font-mono">••••••••</span>
                                    </div>
                                );
                                return (
                                    <div key={key} className="flex justify-between items-center gap-4 bg-white/5 px-2 py-1 rounded">
                                        <span className="opacity-60 shrink-0">{key}:</span>
                                        <span className="text-slate-200 truncate font-medium">{displayVal || '—'}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <span className="italic opacity-40 text-center py-1">Ready to configure</span>
                        )}
                    </div>
                </div>

                {/* Execution Status Indicator */}
                {data.executionStatus && (
                    <div className="absolute -top-3 -right-3 animate-[slideUp_0.2s_ease]">
                        {data.executionStatus === 'loading' && (
                            <div className="bg-blue-500 p-1.5 rounded-full shadow-lg ring-4 ring-slate-950">
                                <Loader2 size={16} className="text-white animate-spin" />
                            </div>
                        )}
                        {data.executionStatus === 'success' && (
                            <div className="bg-emerald-500 p-1.5 rounded-full shadow-lg ring-4 ring-slate-950">
                                <CheckCircle2 size={16} className="text-white" />
                            </div>
                        )}
                        {data.executionStatus === 'failure' && (
                            <div className="bg-red-500 p-1.5 rounded-full shadow-lg ring-4 ring-slate-950">
                                <XCircle size={16} className="text-white" />
                            </div>
                        )}
                    </div>
                )}

                <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500 border-2 border-slate-900" />

                {isIfElse ? (
                    <>
                        <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%', background: '#10b981' }} />
                        <div className="absolute -bottom-5 left-[20%] text-[10px] text-emerald-500">True</div>

                        <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%', background: '#ef4444' }} />
                        <div className="absolute -bottom-5 left-[60%] text-[10px] text-red-500">False</div>
                    </>
                ) : (
                    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-2 border-slate-900" />
                )}
            </div>
        </div>
    );
}
