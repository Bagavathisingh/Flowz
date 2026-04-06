import { useState, useRef, useEffect } from 'react';
import { Play, Square, Save, Sparkles, Loader2, Check, Edit3 } from 'lucide-react';

export default function CommandBar({
    workflowName, setWorkflowName,
    handleTestRun, isExecuting, onStop,
    setShowSaveModal, setShowAiModal,
    isSaved
}) {
    const [editingName, setEditingName] = useState(false);
    const [localName, setLocalName] = useState(workflowName || 'Untitled Workflow');
    const [justSaved, setJustSaved] = useState(false);
    const nameRef = useRef(null);

    useEffect(() => {
        setLocalName(workflowName || 'Untitled Workflow');
    }, [workflowName]);

    useEffect(() => {
        if (editingName) nameRef.current?.focus();
    }, [editingName]);

    const commitName = () => {
        setEditingName(false);
        if (localName.trim()) setWorkflowName(localName.trim());
        else setLocalName(workflowName || 'Untitled Workflow');
    };

    const handleSave = () => {
        setShowSaveModal(true);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
    };

    return (
        <div
            className="absolute top-5 left-1/2 -translate-x-1/2 z-[45] flex items-center gap-1.5 pointer-events-auto"
            style={{
                background: 'rgba(10,13,20,0.90)',
                backdropFilter: 'blur(28px)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius-xl)',
                padding: '6px 8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset',
                minWidth: 520,
            }}
        >
            <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer group flex-1"
                style={{ background: editingName ? 'rgba(0,212,255,0.06)' : 'transparent', transition: 'background 0.2s' }}
                onClick={() => !editingName && setEditingName(true)}
            >
                {editingName ? (
                    <input
                        ref={nameRef}
                        value={localName}
                        onChange={e => setLocalName(e.target.value)}
                        onBlur={commitName}
                        onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setEditingName(false); setLocalName(workflowName); } }}
                        className="bg-transparent outline-none text-sm font-semibold flex-1 min-w-0"
                        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)', borderBottom: '1px solid var(--cyan)', paddingBottom: 1 }}
                    />
                ) : (
                    <>
                        <span
                            className="text-sm font-semibold truncate max-w-[180px]"
                            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)' }}
                        >
                            {localName}
                        </span>
                        <Edit3 size={11} className="opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0"
                               style={{ color: 'var(--text-secondary)' }} />
                        {!isSaved && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                                  title="Unsaved changes" />
                        )}
                    </>
                )}
            </div>

            {/* ── Divider ── */}
            <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />

            {/* ── AI Generate button ── */}
            <button
                onClick={() => setShowAiModal(true)}
                disabled={isExecuting}
                title="AI Generate Workflow"
                className="btn-shimmer flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-[0.78rem] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                style={{
                    fontFamily: 'var(--font-head)',
                    border: 'none',
                    cursor: isExecuting ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.02em',
                    flexShrink: 0,
                }}
            >
                <Sparkles size={13} />
                AI Build
            </button>

            {/* ── Divider ── */}
            <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />

            {/* ── Save button ── */}
            <button
                onClick={handleSave}
                disabled={isExecuting}
                title="Save (Ctrl+S)"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[0.78rem] font-semibold transition-all hover:bg-white/5 active:scale-95 disabled:opacity-40"
                style={{
                    color: justSaved ? 'var(--green)' : 'var(--text-secondary)',
                    border: 'none',
                    background: 'transparent',
                    cursor: isExecuting ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-body)',
                    flexShrink: 0,
                }}
            >
                {justSaved ? <Check size={14} /> : <Save size={14} />}
                {justSaved ? 'Saved' : 'Save'}
            </button>

            {/* ── Run / Stop button ── */}
            {isExecuting ? (
                <button
                    onClick={onStop}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[0.82rem] transition-all active:scale-95"
                    style={{
                        background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#f87171',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-head)',
                        flexShrink: 0,
                    }}
                >
                    <Loader2 size={14} className="animate-spin" />
                    Running…
                </button>
            ) : (
                <button
                    onClick={handleTestRun}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[0.82rem] transition-all hover:brightness-115 active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #00d4ff22, #7c3aed33)',
                        border: '1px solid rgba(0,212,255,0.35)',
                        color: 'var(--cyan)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-head)',
                        flexShrink: 0,
                        boxShadow: '0 0 16px rgba(0,212,255,0.15)',
                    }}
                >
                    <Play size={13} fill="currentColor" strokeWidth={0} />
                    Run
                </button>
            )}
        </div>
    );
}
