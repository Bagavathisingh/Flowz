import { Handle, Position } from '@xyflow/react';
import { Globe, Mail, Database, Clock, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const getNodeIcon = (type) => {
    switch (type) {
        case 'webhook_trigger': return <Globe size={18} />;
        case 'http_request': return <Globe size={18} />;
        case 'send_email': return <Mail size={18} />;
        case 'save_to_database': return <Database size={18} />;
        case 'delay': return <Clock size={18} />;
        default: return <Globe size={18} />;
    }
};

export default function CustomNode({ data, selected }) {
    const isIfElse = data.type === 'ifElse';

    return (
        <div className={`bg-slate-900/95 border ${selected ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.6)]' : 'border-white/10'} rounded-2xl p-5 min-w-[260px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-slate-50 text-[0.95rem] backdrop-blur-md transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:border-white/20 group`}>

            <div className="flex items-center gap-2.5 mb-4 font-semibold text-lg pb-3 border-b border-white/10 text-slate-200">
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${data.isTrigger ? 'text-emerald-500 bg-emerald-500/10' : 'text-blue-500 bg-blue-500/10'}`}>
                    {getNodeIcon(data.type)}
                </div>
                <span className="flex-1 truncate">{data.label}</span>
                <button
                    className="opacity-0 group-hover:opacity-100 bg-transparent border-none text-red-500 hover:bg-red-500/10 p-1.5 rounded-md transition-all active:scale-95"
                    onClick={(e) => {
                        e.stopPropagation();
                        // This would need a prop to handle deletion if we want it here
                    }}
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="flex flex-col gap-2">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Config</div>
                <div className="text-[0.85rem] text-slate-400 bg-black/20 rounded-lg p-2 border border-white/5 break-words">
                    {Object.keys(data.config || {}).length > 0 ? (
                        JSON.stringify(data.config)
                    ) : (
                        <span className="italic">No configuration</span>
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
    );
}
