import { useState, useRef, useCallback, useEffect } from 'react';
import {
    CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
    X, Copy, Check, Timer, GripHorizontal, Maximize2, Minimize2,
    Rocket, Activity, AlertCircle
} from 'lucide-react';

const MIN_H = 100;
const MAX_H_RATIO = 0.85;
const DEFAULT_H = 300;
const SNAP_CLOSE = 70;

/* ── Node timeline row ──────────────────────────────────────────────────── */
const TimelineRow = ({ log, index, label, delay }) => {
    const [expanded, setExpanded] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(t);
    }, [delay]);

    const isSuccess = log.status === 'success';
    const isFailure = log.status === 'failure';
    const isRunning = log.status === 'loading';

    const accentColor = isSuccess ? '#10b981' : isFailure ? '#ef4444' : '#00d4ff';
    const bgColor     = isSuccess ? 'rgba(16,185,129,0.05)' : isFailure ? 'rgba(239,68,68,0.05)' : 'rgba(0,212,255,0.05)';
    const borderColor = isSuccess ? 'rgba(16,185,129,0.2)' : isFailure ? 'rgba(239,68,68,0.2)' : 'rgba(0,212,255,0.2)';

    const resultStr = log.result != null
        ? (typeof log.result === 'object' ? JSON.stringify(log.result, null, 2) : String(log.result))
        : '';

    return (
        <div
            className="timeline-node-enter flex flex-col rounded-xl overflow-hidden transition-all"
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-12px)',
                transition: `opacity 0.25s ease ${delay}ms, transform 0.25s ease ${delay}ms`,
                background: bgColor,
                border: `1px solid ${borderColor}`,
            }}
        >
            {/* Row header */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
                {/* Step number */}
                <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[0.65rem] font-black flex-shrink-0"
                    style={{ background: `${accentColor}22`, color: accentColor, fontFamily: 'var(--font-mono)' }}
                >
                    {index + 1}
                </span>

                {/* Node label */}
                <span className="flex-1 text-sm font-semibold truncate text-left"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)' }}>
                    {label || log.nodeId}
                </span>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Duration */}
                    {log.duration != null && (
                        <span className="flex items-center gap-1 text-[0.65rem]"
                              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            <Timer size={10} />{log.duration}ms
                        </span>
                    )}

                    {/* Status icon */}
                    {isSuccess && <CheckCircle2 size={15} style={{ color: '#10b981' }} />}
                    {isFailure && <XCircle      size={15} style={{ color: '#ef4444' }} />}
                    {isRunning && <Activity     size={15} style={{ color: '#00d4ff' }} className="animate-pulse" />}

                    {expanded ? <ChevronUp size={13} style={{ color: 'var(--text-muted)' }} />
                              : <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />}
                </div>
            </button>

            {/* Expanded detail */}
            {expanded && (
                <div className="px-4 pb-3 flex flex-col gap-2 border-t" style={{ borderColor: `${borderColor}` }}>
                    {log.error && (
                        <div className="mt-2 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <p className="text-[0.65rem] font-black uppercase tracking-widest mb-1" style={{ color: '#ef4444', fontFamily: 'var(--font-mono)' }}>Error</p>
                            <pre className="text-[0.75rem] m-0 whitespace-pre-wrap break-all" style={{ color: '#fca5a5', fontFamily: 'var(--font-mono)' }}>{String(log.error)}</pre>
                        </div>
                    )}
                    {resultStr && (
                        <div className="mt-2">
                            <p className="text-[0.65rem] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Output</p>
                            <pre className="text-[0.75rem] m-0 whitespace-pre-wrap break-all max-h-40 overflow-auto p-3 rounded-lg" style={{ color: '#6ee7b7', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(16,185,129,0.1)' }}>{resultStr}</pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ── Main panel ─────────────────────────────────────────────────────────── */
export default function ExecutionPanel({ isOpen, onClose, executionResult, nodes, onPublish }) {
    const [tab, setTab] = useState('nodes');
    const [panelH, setPanelH] = useState(DEFAULT_H);
    const [isMax, setIsMax] = useState(false);
    const dragging = useRef(false);
    const startY = useRef(0);
    const startH = useRef(DEFAULT_H);

    useEffect(() => {
        if (isOpen) { setPanelH(DEFAULT_H); setIsMax(false); setTab('nodes'); }
    }, [isOpen]);

    const onMouseDown = useCallback((e) => {
        dragging.current = true;
        startY.current = e.clientY;
        startH.current = panelH;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    }, [panelH]);

    useEffect(() => {
        const maxH = window.innerHeight * MAX_H_RATIO;
        const onMove = (e) => {
            if (!dragging.current) return;
            const next = Math.min(maxH, Math.max(MIN_H, startH.current + startY.current - e.clientY));
            setPanelH(next);
            setIsMax(false);
        };
        const onUp = (e) => {
            if (!dragging.current) return;
            dragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (startH.current + startY.current - e.clientY < SNAP_CLOSE) onClose();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [onClose]);

    if (!isOpen || !executionResult) return null;

    const { nodeLogs = [], status, error, duration } = executionResult;
    const successCount = nodeLogs.filter(l => l.status === 'success').length;
    const failCount    = nodeLogs.filter(l => l.status === 'failure').length;
    const totalOutput  = nodeLogs.at(-1)?.result;
    const getLabel     = (id) => nodes?.find(n => n.id === id)?.data?.label || id;

    const HEADER_H = 52;
    const bodyH    = (isMax ? window.innerHeight * MAX_H_RATIO : panelH) - HEADER_H;
    const isSuccess = status === 'success';

    const TABS = [['nodes', 'Timeline'], ['output', 'Output'], ['summary', 'Stats']];

    return (
        <div
            className="absolute bottom-0 left-0 right-0 z-40 flex flex-col"
            style={{
                height: isMax ? window.innerHeight * MAX_H_RATIO : panelH,
                transition: dragging.current ? 'none' : 'height 0.12s ease',
                animation: 'slideUp 0.25s ease',
            }}
        >
            {/* Drag handle */}
            <div
                className="flex flex-col items-center justify-center absolute left-0 right-0 group select-none"
                style={{ top: -20, cursor: 'ns-resize', paddingTop: 6, paddingBottom: 4 }}
                onMouseDown={onMouseDown}
            >
                <div className="w-10 h-1 rounded-full transition-colors group-hover:bg-white/20"
                     style={{ background: 'rgba(255,255,255,0.08)' }} />
                <GripHorizontal size={11} className="mt-0.5 group-hover:opacity-60 transition-opacity"
                                style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            </div>

            {/* Main surface */}
            <div
                className="flex flex-col flex-1 overflow-hidden"
                style={{
                    background: 'rgba(7,9,15,0.97)',
                    backdropFilter: 'blur(32px)',
                    borderTop: `1px solid ${isSuccess ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    borderLeft: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    borderRadius: '20px 20px 0 0',
                    boxShadow: `0 -16px 64px rgba(0,0,0,0.7), 0 -1px 0 ${isSuccess ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'} inset`,
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 flex-shrink-0"
                    style={{ height: HEADER_H, borderBottom: '1px solid var(--border)' }}
                >
                    {/* Status + counts */}
                    <div className="flex items-center gap-3">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{
                                background: isSuccess ? '#10b981' : '#ef4444',
                                boxShadow: `0 0 8px ${isSuccess ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)'}`,
                            }}
                        />
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)' }}>
                            {isSuccess ? 'Execution Complete' : 'Execution Failed'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[0.65rem] font-bold">
                            <span className="px-2 py-0.5 rounded-md" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontFamily: 'var(--font-mono)' }}>
                                {successCount} ok
                            </span>
                            {failCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontFamily: 'var(--font-mono)' }}>
                                    {failCount} failed
                                </span>
                            )}
                            {duration && (
                                <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                    <Timer size={9} />{duration}ms
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div
                        className="flex items-center gap-0.5 p-1 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                    >
                        {TABS.map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: 8,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    fontFamily: 'var(--font-body)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    background: tab === key ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    color: tab === key ? 'var(--text-primary)' : 'var(--text-muted)',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        {isSuccess && (
                            <button
                                onClick={onPublish}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[0.75rem] font-bold"
                                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-head)' }}
                            >
                                <Rocket size={12} /> Publish
                            </button>
                        )}
                        <button
                            onClick={() => setIsMax(m => !m)}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 0 }}
                        >
                            {isMax ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                        </button>
                        <button
                            onClick={onClose}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 0 }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1" style={{ height: bodyH }}>
                    {/* Timeline tab */}
                    {tab === 'nodes' && (
                        <div className="p-4 flex flex-col gap-2">
                            {nodeLogs.length === 0 && (
                                <p className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>No execution data.</p>
                            )}
                            {nodeLogs.map((log, i) => (
                                <TimelineRow key={log.nodeId} log={log} index={i} label={getLabel(log.nodeId)} delay={i * 60} />
                            ))}
                        </div>
                    )}

                    {/* Output tab */}
                    {tab === 'output' && (
                        <div className="p-5 flex flex-col gap-3">
                            <p className="text-[0.7rem] font-black uppercase tracking-widest m-0" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                Final Output
                            </p>
                            {totalOutput ? (
                                <pre className="m-0 p-4 rounded-xl text-[0.8rem] whitespace-pre-wrap break-all"
                                     style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(16,185,129,0.15)', color: '#6ee7b7', fontFamily: 'var(--font-mono)' }}>
                                    {typeof totalOutput === 'object' ? JSON.stringify(totalOutput, null, 2) : String(totalOutput)}
                                </pre>
                            ) : (
                                <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No output from final node.</p>
                            )}
                            {!isSuccess && error && (
                                <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle size={13} style={{ color: '#ef4444' }} />
                                        <p className="text-[0.7rem] font-black uppercase m-0" style={{ color: '#ef4444', fontFamily: 'var(--font-mono)' }}>Workflow Error</p>
                                    </div>
                                    <pre className="text-[0.8rem] m-0 whitespace-pre-wrap" style={{ color: '#fca5a5', fontFamily: 'var(--font-mono)' }}>{error}</pre>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stats tab */}
                    {tab === 'summary' && (
                        <div className="p-5 flex flex-col gap-4">
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { label: 'Nodes',   value: nodeLogs.length,                color: '#00d4ff', bg: 'rgba(0,212,255,0.08)',   border: 'rgba(0,212,255,0.2)' },
                                    { label: 'Passed',  value: successCount,                   color: '#10b981', bg: 'rgba(16,185,129,0.08)',   border: 'rgba(16,185,129,0.2)' },
                                    { label: 'Failed',  value: failCount,                      color: '#ef4444', bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.2)' },
                                    { label: 'Time',    value: duration ? `${duration}ms` : '—', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
                                ].map(({ label, value, color, bg, border }) => (
                                    <div key={label} className="p-4 rounded-2xl flex flex-col gap-1"
                                         style={{ background: bg, border: `1px solid ${border}` }}>
                                        <span className="text-xl font-black" style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</span>
                                        <span className="text-[0.6rem] uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>{label}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Timeline bar chart */}
                            <div className="flex flex-col gap-2">
                                <p className="text-[0.65rem] font-black uppercase tracking-widest m-0" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                    Node Duration Breakdown
                                </p>
                                {nodeLogs.map((log, i) => {
                                    const pct = Math.max(4, Math.min(100, ((log.duration || 50) / (duration || 1)) * 100));
                                    return (
                                        <div key={log.nodeId} className="flex items-center gap-3">
                                            <span className="text-[0.6rem] font-mono w-4 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                                            <div
                                                className="h-2 rounded-full flex-shrink-0"
                                                style={{
                                                    width: `${pct}%`,
                                                    background: log.status === 'success'
                                                        ? 'linear-gradient(90deg,#10b981,#059669)'
                                                        : 'linear-gradient(90deg,#ef4444,#dc2626)',
                                                    transition: 'width 0.6s ease',
                                                }}
                                            />
                                            <span className="text-[0.72rem] font-medium flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{getLabel(log.nodeId)}</span>
                                            <span className="text-[0.65rem] flex-shrink-0" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{log.duration ? `${log.duration}ms` : '—'}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
