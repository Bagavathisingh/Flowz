import { useState, useRef, useCallback, useEffect } from 'react';
import {
    CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
    X, AlertTriangle, Copy, Check, Timer, GripHorizontal,
    Maximize2, Minimize2, Rocket, Terminal, Trash2
} from 'lucide-react';

const MIN_HEIGHT = 120;
const MAX_HEIGHT_RATIO = 0.88;
const DEFAULT_HEIGHT = 320;
const SNAP_CLOSE_THRESHOLD = 80;

const StatusBadge = ({ status }) => {
    const map = {
        success: { icon: CheckCircle2, label: 'Success', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
        failure: { icon: XCircle, label: 'Failed', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
        loading: { icon: Clock, label: 'Running...', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
    };
    const { icon: Icon, label, cls } = map[status] || { icon: AlertTriangle, label: 'Unknown', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/20' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.7rem] font-bold uppercase tracking-wider border ${cls}`}>
            <Icon size={12} /> {label}
        </span>
    );
};

const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', padding: '5px', borderRadius: '8px', color: copied ? '#34d399' : '#94a3b8', display: 'flex', alignItems: 'center' }}
        >
            {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
    );
};

const NodeResultCard = ({ log, index, nodeLabel }) => {
    const [expanded, setExpanded] = useState(index === 0);
    const resultStr = typeof log.result === 'object' ? JSON.stringify(log.result, null, 2) : String(log.result || '');
    const inputStr = typeof log.input === 'object' ? JSON.stringify(log.input, null, 2) : String(log.input || '');
    const borderCls = log.status === 'success' ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : log.status === 'failure' ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-white/8 bg-white/[0.02]';

    return (
        <div className={`rounded-2xl border transition-all ${borderCls}`}>
            <button className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors rounded-t-2xl"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                onClick={() => setExpanded(!expanded)}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[0.7rem] font-black flex-shrink-0 ${log.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : log.status === 'failure' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                    {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[0.9rem] font-bold text-white m-0 truncate">{nodeLabel || log.nodeId}</p>
                    <p className="text-[0.72rem] text-slate-500 m-0 font-mono truncate">{log.nodeId}</p>
                </div>
                <div className="flex items-center gap-3">
                    {log.duration != null && (
                        <span className="flex items-center gap-1 text-[0.7rem] text-slate-500 font-mono">
                            <Timer size={11} />{log.duration}ms
                        </span>
                    )}
                    <StatusBadge status={log.status} />
                    {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </div>
            </button>

            {expanded && (
                <div className="px-5 pb-5 flex flex-col gap-4 border-t border-white/5 pt-4">
                    {log.status === 'failure' && log.error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-[0.75rem] font-bold text-red-400 uppercase tracking-widest mb-1">Error</p>
                            <pre className="text-[0.8rem] text-red-300 m-0 font-mono whitespace-pre-wrap break-all">{String(log.error)}</pre>
                        </div>
                    )}
                    {log.input != null && (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <p className="text-[0.7rem] uppercase tracking-widest text-slate-500 font-bold m-0">Input</p>
                                <CopyButton text={inputStr} />
                            </div>
                            <pre className="bg-black/40 border border-white/5 rounded-xl p-3 text-[0.78rem] text-slate-300 m-0 font-mono whitespace-pre-wrap break-all max-h-[180px] overflow-auto">{inputStr}</pre>
                        </div>
                    )}
                    {log.result != null && (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <p className="text-[0.7rem] uppercase tracking-widest text-emerald-500/70 font-bold m-0">Output</p>
                                <CopyButton text={resultStr} />
                            </div>
                            <pre className="bg-black/40 border border-emerald-500/10 rounded-xl p-3 text-[0.78rem] text-emerald-200 m-0 font-mono whitespace-pre-wrap break-all max-h-[240px] overflow-auto">{resultStr}</pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function ExecutionPanel({ isOpen, onClose, executionResult, nodes, onPublish }) {
    const [activeTab, setActiveTab] = useState('nodes');
    const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT);
    const [isMaximized, setIsMaximized] = useState(false);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(DEFAULT_HEIGHT);

    useEffect(() => {
        if (isOpen) { setPanelHeight(DEFAULT_HEIGHT); setIsMaximized(false); }
    }, [isOpen]);

    const onMouseDown = useCallback((e) => {
        isDragging.current = true;
        startY.current = e.clientY;
        startHeight.current = panelHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    }, [panelHeight]);

    const onTouchStart = useCallback((e) => {
        isDragging.current = true;
        startY.current = e.touches[0].clientY;
        startHeight.current = panelHeight;
    }, [panelHeight]);

    useEffect(() => {
        const maxH = window.innerHeight * MAX_HEIGHT_RATIO;

        const onMouseMove = (e) => {
            if (!isDragging.current) return;
            const delta = startY.current - e.clientY;
            setPanelHeight(Math.min(maxH, Math.max(MIN_HEIGHT, startHeight.current + delta)));
            setIsMaximized(false);
        };

        const onTouchMove = (e) => {
            if (!isDragging.current) return;
            const delta = startY.current - e.touches[0].clientY;
            setPanelHeight(Math.min(maxH, Math.max(MIN_HEIGHT, startHeight.current + delta)));
            setIsMaximized(false);
        };

        const onEnd = (clientY) => {
            if (!isDragging.current) return;
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            const delta = startY.current - clientY;
            if (startHeight.current + delta < SNAP_CLOSE_THRESHOLD) onClose();
        };

        const onMouseUp = (e) => onEnd(e.clientY);
        const onTouchEnd = (e) => {
            isDragging.current = false;
            const delta = startY.current - (e.changedTouches[0]?.clientY ?? startY.current);
            if (startHeight.current + delta < SNAP_CLOSE_THRESHOLD) onClose();
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('touchmove', onTouchMove);
        window.addEventListener('touchend', onTouchEnd);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, [onClose]);

    const toggleMaximize = () => {
        if (isMaximized) {
            setPanelHeight(DEFAULT_HEIGHT);
            setIsMaximized(false);
        } else {
            setPanelHeight(Math.floor(window.innerHeight * MAX_HEIGHT_RATIO));
            setIsMaximized(true);
        }
    };

    if (!isOpen || !executionResult) return null;

    const { nodeLogs = [], status, error, duration } = executionResult;
    const successCount = nodeLogs.filter(l => l.status === 'success').length;
    const failCount = nodeLogs.filter(l => l.status === 'failure').length;
    const totalOutput = nodeLogs.at(-1)?.result;
    const getNodeLabel = (nodeId) => nodes?.find(n => n.id === nodeId)?.data?.label || nodeId;

    const HEADER_H = 56;
    const bodyH = panelHeight - HEADER_H;

    return (
        <div className="absolute bottom-0 left-0 right-0 z-40 flex flex-col"
            style={{ height: panelHeight, transition: isDragging.current ? 'none' : 'height 0.12s ease' }}>

            {/* ─── Drag Handle ─── */}
            <div
                className="flex flex-col items-center justify-center pb-1 group select-none absolute left-0 right-0"
                style={{ top: -24, cursor: 'ns-resize', paddingTop: 6 }}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
            >
                <div className="w-14 h-1.5 rounded-full bg-slate-700 group-hover:bg-slate-500 transition-colors" />
                <GripHorizontal size={13} className="text-slate-700 group-hover:text-slate-500 transition-colors mt-0.5" />
                <p className="text-[0.62rem] text-slate-700 group-hover:text-slate-500 transition-colors m-0 font-medium leading-none mt-0.5">drag to resize</p>
            </div>

            {/* ─── Header Bar ─── */}
            <div className={`flex items-center justify-between px-5 py-0 border-t border-l border-r rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl flex-shrink-0 ${status === 'success' ? 'bg-slate-900/97 border-emerald-500/25' : 'bg-slate-900/97 border-red-500/25'}`}
                style={{ height: HEADER_H }}>

                {/* Left: Status */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse ${status === 'success' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]'}`} />
                    <span className="text-white font-bold text-[0.88rem] whitespace-nowrap">
                        {status === 'success' ? 'Execution Successful' : 'Execution Failed'}
                    </span>
                    <div className="hidden md:flex items-center gap-2 text-[0.7rem]">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/20">{successCount} passed</span>
                        {failCount > 0 && <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 font-bold border border-red-500/20">{failCount} failed</span>}
                        {duration && <span className="flex items-center gap-1 text-slate-500"><Timer size={10} />{duration}ms</span>}
                    </div>
                </div>

                {/* Centre: Tabs */}
                <div className="flex items-center gap-0.5 bg-black/30 p-1 rounded-xl border border-white/5">
                    {[['nodes', 'Node Results'], ['logs', 'Logs'], ['output', 'Output'], ['summary', 'Summary']].map(([key, label]) => (
                        <button key={key} onClick={() => setActiveTab(key)}
                            className={`px-3 py-1.5 rounded-lg text-[0.72rem] font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === key ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-white'}`}
                            style={{ border: 'none', background: activeTab === key ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-2">
                    {/* Publish button — only on success */}
                    {status === 'success' && (
                        <button
                            onClick={onPublish}
                            style={{ border: 'none', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', cursor: 'pointer', padding: '7px 14px', borderRadius: '10px', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, boxShadow: '0 4px 14px rgba(124,58,237,0.45)', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
                            onMouseLeave={e => e.currentTarget.style.filter = ''}
                        >
                            <Rocket size={14} /> Publish
                        </button>
                    )}
                    <button onClick={toggleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}
                        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', padding: '6px', borderRadius: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                        {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button onClick={onClose}
                        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', padding: '6px', borderRadius: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* ─── Scrollable Body ─── */}
            <div className="overflow-y-auto bg-slate-950/98 backdrop-blur-2xl border-l border-r border-b border-white/5"
                style={{ height: bodyH, minHeight: 0 }}>

                {/* Nodes Tab */}
                {activeTab === 'nodes' && (
                    <div className="p-4 flex flex-col gap-3">
                        {nodeLogs.length === 0 && <p className="text-slate-500 text-center py-10 text-sm">No node execution data.</p>}
                        {nodeLogs.map((log, i) => (
                            <NodeResultCard key={log.nodeId} log={log} index={i} nodeLabel={getNodeLabel(log.nodeId)} />
                        ))}
                    </div>
                )}

                {/* Logs Tab (The "Terminal" console view) */}
                {activeTab === 'logs' && (
                    <div className="p-4 flex flex-col gap-1 font-mono text-[0.78rem]">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                            <span className="text-slate-500 font-bold uppercase tracking-widest text-[0.65rem] flex items-center gap-1.5">
                                <Terminal size={12} /> Execution Logs
                            </span>
                            <span className="text-[0.65rem] text-slate-600 italic">showing logs for current run only</span>
                        </div>

                        {nodeLogs.length === 0 && (
                            <div className="py-20 text-center text-slate-700">
                                <Terminal size={32} className="mx-auto mb-3 opacity-10" />
                                <p>No logs recorded for this run.</p>
                            </div>
                        )}

                        {nodeLogs.map((log, i) => {
                            const timeStr = log.timestamp
                                ? new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                : '00:00:00';
                            const nodeLabel = getNodeLabel(log.nodeId);

                            return (
                                <div key={log.nodeId + '_log_' + i} className="flex flex-col gap-0.5 group">

                                    <div className="flex items-start gap-3 py-0.5 group-hover:bg-white/[0.03] transition-colors rounded px-1">
                                        <span className="text-slate-600 flex-shrink-0">[{timeStr}]</span>
                                        <span className="text-blue-500 font-bold whitespace-nowrap min-w-[50px]">INFO</span>
                                        <span className="text-slate-300">
                                            Executing node <span className="text-white font-bold">{nodeLabel}</span>
                                            <span className="text-slate-500 ml-2">({log.nodeId})</span>
                                        </span>
                                    </div>

                                    <div className="flex items-start gap-3 py-0.5 group-hover:bg-white/[0.03] transition-colors rounded px-1">
                                        <span className="text-slate-600 flex-shrink-0 opacity-0">[{timeStr}]</span> {/* align with above */}
                                        {log.status === 'success' ? (
                                            <>
                                                <span className="text-emerald-500 font-bold whitespace-nowrap min-w-[50px]">SUCCESS</span>
                                                <span className="text-emerald-400 opacity-80">
                                                    Node completed in <span className="font-bold underline">{log.duration || 0}ms</span>.
                                                    Output: <span className="italic">{typeof log.result === 'object' ? 'Object(JSON)' : String(log.result).substring(0, 50) + (String(log.result).length > 50 ? '...' : '')}</span>
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-red-500 font-bold whitespace-nowrap min-w-[50px]">ERROR</span>
                                                <span className="text-red-400 opacity-80">
                                                    Execution failed! {log.error || 'Unknown error'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <div className="h-2" />
                                </div>
                            );
                        })}

                        {status && (
                            <div className={`mt-2 p-3 rounded-lg border font-bold flex items-center gap-3 ${status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                {status === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                Final workflow status: {status.toUpperCase()}
                            </div>
                        )}
                    </div>
                )}

                {/* Output Tab */}
                {activeTab === 'output' && (
                    <div className="p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[0.78rem] text-slate-400 font-bold uppercase tracking-widest m-0">Last Node Output</p>
                            {totalOutput && <CopyButton text={typeof totalOutput === 'object' ? JSON.stringify(totalOutput, null, 2) : String(totalOutput)} />}
                        </div>
                        {totalOutput ? (
                            <pre className="bg-black/50 border border-emerald-500/15 rounded-2xl p-5 text-[0.82rem] text-emerald-200 font-mono whitespace-pre-wrap break-all m-0">
                                {typeof totalOutput === 'object' ? JSON.stringify(totalOutput, null, 2) : String(totalOutput)}
                            </pre>
                        ) : (
                            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-slate-500">No output from final node.</div>
                        )}
                        {status === 'failure' && error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                                <p className="text-[0.75rem] font-bold text-red-400 uppercase tracking-widest mb-2">Workflow Error</p>
                                <pre className="text-[0.82rem] text-red-300 font-mono m-0 whitespace-pre-wrap">{error}</pre>
                            </div>
                        )}
                    </div>
                )}

                {/* Summary Tab */}
                {activeTab === 'summary' && (
                    <div className="p-5 flex flex-col gap-4">
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: 'Total Nodes', value: nodeLogs.length, cls: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                                { label: 'Successful', value: successCount, cls: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                                { label: 'Failed', value: failCount, cls: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                                { label: 'Total Time', value: duration ? `${duration}ms` : 'N/A', cls: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                            ].map(({ label, value, cls, bg }) => (
                                <div key={label} className={`p-4 rounded-2xl border ${bg} flex flex-col gap-1`}>
                                    <span className={`text-2xl font-black ${cls}`}>{value}</span>
                                    <span className="text-[0.65rem] text-slate-500 uppercase tracking-widest font-bold">{label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-[0.7rem] uppercase tracking-widest text-slate-500 font-bold m-0">Execution Timeline</p>
                            <div className="flex flex-col gap-1.5">
                                {nodeLogs.map((log, i) => (
                                    <div key={log.nodeId} className="flex items-center gap-3">
                                        <span className="text-[0.7rem] text-slate-600 font-mono w-5 text-right flex-shrink-0">{i + 1}</span>
                                        <div className={`h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.max(10, Math.min(100, ((log.duration || 50) / (duration || 1)) * 100))}%` }} />
                                        <span className="text-[0.78rem] text-slate-300 font-medium flex-1 min-w-0 truncate">{getNodeLabel(log.nodeId)}</span>
                                        <span className="text-[0.7rem] text-slate-500 font-mono whitespace-nowrap flex-shrink-0">{log.duration ? `${log.duration}ms` : '--'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
