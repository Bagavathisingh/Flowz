import { Handle, Position } from '@xyflow/react';
import {
    Globe, Mail, Database, Clock, Sparkles, MousePointer2, Radio,
    FileEdit, ArrowRightToLine, MessageSquare, Folder, Zap, Activity,
    CheckCircle2, XCircle, Loader2, GitBranch, UserPlus, LogIn
} from 'lucide-react';

// ── Category system → border color + glow ─────────────────────────────────────
const NODE_CAT = {
    trigger: { accent: '#00d4ff', glow: 'rgba(0,212,255,0.25)',  label: 'Trigger', labelColor: '#00d4ff' },
    action:  { accent: '#7c3aed', glow: 'rgba(124,58,237,0.25)', label: 'Action',  labelColor: '#a78bfa' },
    ai:      { accent: '#f59e0b', glow: 'rgba(245,158,11,0.25)', label: 'AI',      labelColor: '#fbbf24' },
    logic:   { accent: '#10b981', glow: 'rgba(16,185,129,0.25)', label: 'Logic',   labelColor: '#34d399' },
    data:    { accent: '#6366f1', glow: 'rgba(99,102,241,0.25)', label: 'Data',    labelColor: '#818cf8' },
};

const NODE_META = {
    webhook_trigger:    { cat: 'trigger', icon: Globe,              label: 'Webhook',       color: '#00d4ff' },
    manual_trigger:     { cat: 'trigger', icon: MousePointer2,      label: 'Manual',        color: '#00d4ff' },
    schedule_trigger:   { cat: 'trigger', icon: Clock,              label: 'Schedule',      color: '#00d4ff' },
    app_event:          { cat: 'trigger', icon: Radio,              label: 'App Event',     color: '#00d4ff' },
    form_submission:    { cat: 'trigger', icon: FileEdit,           label: 'Form',          color: '#00d4ff' },
    sub_workflow_trigger:{ cat: 'trigger',icon: ArrowRightToLine,   label: 'Sub-Workflow',  color: '#00d4ff' },
    chat_message:       { cat: 'trigger', icon: MessageSquare,      label: 'Chat',          color: '#00d4ff' },
    other_ways:         { cat: 'trigger', icon: Folder,             label: 'Other',         color: '#00d4ff' },
    http_request:       { cat: 'action',  icon: Globe,              label: 'HTTP',          color: '#a78bfa' },
    send_email:         { cat: 'action',  icon: Mail,               label: 'Email',         color: '#a78bfa' },
    ai_model:           { cat: 'ai',      icon: Sparkles,           label: 'AI Model',      color: '#fbbf24' },
    save_to_database:   { cat: 'data',    icon: Database,           label: 'Database',      color: '#818cf8' },
    mongodb:            { cat: 'data',    icon: Database,           label: 'MongoDB',       color: '#818cf8' },
    postgresql:         { cat: 'data',    icon: Database,           label: 'PostgreSQL',    color: '#336791' },
    mysql:              { cat: 'data',    icon: Database,           label: 'MySQL',         color: '#00758f' },
    delay:              { cat: 'logic',   icon: Clock,              label: 'Delay',         color: '#34d399' },
    ifElse:             { cat: 'logic',   icon: GitBranch,          label: 'Condition',     color: '#34d399' },
    user_registration:  { cat: 'action',  icon: UserPlus,          label: 'Register',      color: '#a78bfa' },
    user_login:         { cat: 'action',  icon: LogIn,             label: 'Login',         color: '#a78bfa' },
    log:                { cat: 'data',    icon: FileEdit,           label: 'Log',           color: '#818cf8' },
};

const DEFAULT_META = { cat: 'action', icon: Zap, label: 'Node', color: '#a78bfa' };

// ── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    if (!status) return null;
    const map = {
        loading: { icon: Loader2, cls: 'text-[#00d4ff] border-[rgba(0,212,255,0.3)] bg-[rgba(0,212,255,0.08)]', spin: true,  label: 'Running' },
        success: { icon: CheckCircle2, cls: 'text-[#10b981] border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.08)]', spin: false, label: 'Done' },
        failure: { icon: XCircle,    cls: 'text-[#ef4444] border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)]',    spin: false, label: 'Error' },
    };
    const { icon: Icon, cls, spin, label } = map[status] || map.loading;
    return (
        <span className={`absolute -top-2.5 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold uppercase tracking-[0.1em] border ${cls}`}
              style={{ fontFamily: 'var(--font-mono)' }}>
            <Icon size={9} className={spin ? 'animate-spin' : ''} /> {label}
        </span>
    );
};

// ── Config preview rows ──────────────────────────────────────────────────────
const ConfigRow = ({ k, v }) => {
    const isSensitive = /pass|key|token|secret/i.test(k);
    return (
        <div className="flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-md"
             style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-[0.65rem] uppercase tracking-wider font-semibold"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {k}
            </span>
            <span className="text-[0.72rem] truncate font-medium text-right max-w-[140px]"
                  style={{ color: isSensitive ? 'rgba(0,212,255,0.6)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {isSensitive ? '••••••••' : (typeof v === 'object' ? '{…}' : String(v))}
            </span>
        </div>
    );
};

// ── Handle + connector dot ────────────────────────────────────────────────────
const FlowHandle = ({ type, position, id, style = {} }) => (
    <Handle
        type={type}
        position={position}
        id={id}
        className="!w-3 !h-3 !rounded-full !border-2"
        style={{
            background: '#0a0d14',
            borderColor: id === 'false' ? '#ef4444' : (type === 'target' ? 'var(--text-muted)' : 'var(--cyan)'),
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            ...style
        }}
    />
);

// ── Main Node ────────────────────────────────────────────────────────────────
export default function CustomNode({ data, selected }) {
    const meta    = NODE_META[data.type] || DEFAULT_META;
    const cat     = NODE_CAT[meta.cat] || NODE_CAT.action;
    const Icon    = meta.icon;
    const isIfElse = data.type === 'ifElse';
    const configKeys = Object.keys(data.config || {}).filter(k => data.config[k] !== '' && data.config[k] !== null);

    const statusCls = data.executionStatus === 'loading'
        ? 'node-running'
        : data.executionStatus === 'success'
        ? 'node-success'
        : data.executionStatus === 'failure'
        ? 'node-error'
        : '';

    return (
        <div
            className={`relative group ${statusCls}`}
            style={{
                minWidth: 260,
                maxWidth: 300,
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(145deg, rgba(13,17,27,0.95), rgba(10,13,20,0.98))',
                border: selected
                    ? `1.5px solid ${cat.accent}`
                    : '1.5px solid var(--border)',
                boxShadow: selected
                    ? `var(--shadow-card), 0 0 0 3px ${cat.glow}, 0 0 32px ${cat.glow}`
                    : 'var(--shadow-card)',
                backdropFilter: 'blur(24px)',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
        >
            {/* Hover glow overlay */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[inherit]"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${cat.glow} 0%, transparent 70%)` }}
            />

            {/* Status pill */}
            <StatusBadge status={data.executionStatus} />

            {/* Left accent border */}
            <div
                className="absolute top-4 bottom-4 left-0 w-[3px] rounded-r-full"
                style={{ background: `linear-gradient(180deg, ${cat.accent}, transparent)` }}
            />

            {/* ── Header ── */}
            <div className="px-5 pt-4 pb-3 flex items-start gap-3">
                {/* Icon */}
                <div
                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                        background: `rgba(${cat.accent === '#00d4ff' ? '0,212,255' : cat.accent === '#7c3aed' ? '124,58,237' : cat.accent === '#f59e0b' ? '245,158,11' : cat.accent === '#10b981' ? '16,185,129' : '99,102,241'}, 0.12)`,
                        border: `1px solid ${cat.glow}`,
                        color: cat.accent,
                    }}
                >
                    <Icon size={16} />
                </div>

                {/* Labels */}
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span
                            className="text-[0.55rem] font-black uppercase tracking-[0.18em] px-1.5 py-0.5 rounded"
                            style={{ color: cat.labelColor, background: `${cat.glow}`, fontFamily: 'var(--font-mono)', border: `1px solid ${cat.glow}` }}
                        >
                            {cat.label}
                        </span>
                    </div>
                    <p className="truncate m-0 text-sm font-semibold leading-tight"
                       style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)' }}>
                        {data.label}
                    </p>
                    <p className="truncate m-0 text-[0.65rem]"
                       style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {data.type}
                    </p>
                </div>
            </div>

            {/* ── Config Preview ── */}
            {configKeys.length > 0 && (
                <div className="px-4 pb-4">
                    <div
                        className="rounded-xl p-2 flex flex-col gap-1 max-h-[88px] overflow-y-auto no-scrollbar"
                        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)' }}
                    >
                        {configKeys.slice(0, 4).map(k => (
                            <ConfigRow key={k} k={k} v={data.config[k]} />
                        ))}
                        {configKeys.length > 4 && (
                            <p className="text-center text-[0.6rem] m-0"
                               style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                +{configKeys.length - 4} more…
                            </p>
                        )}
                    </div>
                </div>
            )}

            {configKeys.length === 0 && (
                <div className="px-4 pb-4">
                    <p className="text-center text-[0.7rem] py-2"
                       style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        ◦ click to configure
                    </p>
                </div>
            )}

            {/* ── Handles ── */}
            <FlowHandle type="target" position={Position.Left} style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }} />

            {isIfElse ? (
                <>
                    <div className="absolute right-4 top-1/3 -translate-y-1/2 text-[0.6rem] font-black uppercase tracking-widest"
                         style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>True</div>
                    <FlowHandle type="source" position={Position.Right} id="true"
                        style={{ right: -6, top: '33%', transform: 'translateY(-50%)', borderColor: '#10b981' }} />

                    <div className="absolute right-4 top-2/3 -translate-y-1/2 text-[0.6rem] font-black uppercase tracking-widest"
                         style={{ color: '#ef4444', fontFamily: 'var(--font-mono)' }}>False</div>
                    <FlowHandle type="source" position={Position.Right} id="false"
                        style={{ right: -6, top: '67%', transform: 'translateY(-50%)', borderColor: '#ef4444' }} />
                </>
            ) : (
                <FlowHandle type="source" position={Position.Right}
                    style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }} />
            )}
        </div>
    );
}
