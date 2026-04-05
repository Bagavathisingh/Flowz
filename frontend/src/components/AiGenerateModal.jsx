import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Sparkles, Send, Loader2, Wand2, CornerDownLeft, ChevronRight } from 'lucide-react';

const EXAMPLE_PROMPTS = [
    'Send a Slack alert when a Stripe payment fails',
    'Every day at 9am, fetch weather and email a summary',
    'When a new form is submitted, save to MongoDB and reply via email',
    'Classify incoming webhook data with AI and route to different handlers',
];

/* ── Typewriter hook ─────────────────────────────────────────────────────── */
const useTypewriter = (text, speed = 18) => {
    const [displayed, setDisplayed] = useState('');
    useEffect(() => {
        if (!text) { setDisplayed(''); return; }
        let i = 0;
        setDisplayed('');
        const t = setInterval(() => {
            setDisplayed(text.slice(0, ++i));
            if (i >= text.length) clearInterval(t);
        }, speed);
        return () => clearInterval(t);
    }, [text, speed]);
    return displayed;
};

export default function AiGenerateModal({ isOpen, onClose, onApply, isLoading, aiResponse, onGenerate }) {
    const [prompt, setPrompt] = useState('');
    const textRef = useRef(null);
    const typewriter = useTypewriter(aiResponse ? 'Workflow generated successfully! Applying to canvas…' : '', 18);

    useEffect(() => {
        if (isOpen) { setPrompt(''); textRef.current?.focus(); }
    }, [isOpen]);

    const handleSubmit = useCallback(() => {
        if (!prompt.trim() || isLoading) return;
        onGenerate(prompt.trim());
    }, [prompt, isLoading, onGenerate]);

    const handleKey = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[99] flex items-center justify-center"
            style={{ background: 'rgba(5,7,11,0.88)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* Centered card */}
            <div
                className="gradient-border active relative flex flex-col w-full max-w-2xl"
                style={{
                    background: 'linear-gradient(145deg, rgba(10,13,20,0.98), rgba(7,9,15,0.99))',
                    borderRadius: 28,
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 80px rgba(124,58,237,0.15)',
                    animation: 'scaleIn 0.22s ease',
                    overflow: 'hidden',
                    maxHeight: '90vh',
                }}
            >
                {/* Header glow strip */}
                <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.5), rgba(124,58,237,0.5), transparent)' }} />

                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.15))', border: '1px solid rgba(124,58,237,0.3)' }}
                        >
                            <Wand2 size={18} style={{ color: 'var(--violet)', filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.7))' }} />
                        </div>
                        <div>
                            <h2 className="m-0 text-lg font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)' }}>
                                AI Workflow Builder
                            </h2>
                            <p className="m-0 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                Describe your automation in plain English
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 10, padding: 8, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 0, transition: 'all 0.15s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-col gap-5 px-7 pb-7">
                    {/* Prompt examples */}
                    {!aiResponse && !isLoading && (
                        <div className="flex flex-col gap-2">
                            <p className="m-0 text-[0.65rem] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                Try an example
                            </p>
                            <div className="flex flex-col gap-1.5">
                                {EXAMPLE_PROMPTS.map((ex) => (
                                    <button
                                        key={ex}
                                        type="button"
                                        onClick={() => setPrompt(ex)}
                                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left group"
                                        style={{
                                            background: 'rgba(255,255,255,0.025)',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.25)'; e.currentTarget.style.background = 'rgba(0,212,255,0.04)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                                    >
                                        <Sparkles size={11} style={{ color: 'var(--violet)', flexShrink: 0 }} />
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{ex}</span>
                                        <ChevronRight size={11} className="ml-auto opacity-0 group-hover:opacity-60" style={{ color: 'var(--cyan)', flexShrink: 0 }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI response typewriter */}
                    {(isLoading || aiResponse) && (
                        <div
                            className="rounded-2xl p-5 flex flex-col gap-3"
                            style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}
                        >
                            <div className="flex items-center gap-2">
                                <Sparkles size={13} style={{ color: 'var(--violet)' }} />
                                <span className="text-[0.7rem] font-black uppercase tracking-widest" style={{ color: 'var(--violet)', fontFamily: 'var(--font-mono)' }}>
                                    Flowz AI
                                </span>
                                {isLoading && <Loader2 size={12} className="animate-spin ml-auto" style={{ color: 'var(--cyan)' }} />}
                            </div>
                            {isLoading && !aiResponse && (
                                <div className="flex flex-col gap-1.5">
                                    {[80, 65, 40].map((w, i) => (
                                        <div key={i} className="h-2.5 rounded-full"
                                             style={{ width: `${w}%`, background: 'rgba(255,255,255,0.06)', animation: `shimmer 1.5s ease ${i * 0.2}s infinite` }} />
                                    ))}
                                </div>
                            )}
                            {aiResponse && (
                                <p className="m-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                                    {typewriter}
                                    <span className="inline-block w-0.5 h-4 bg-[var(--cyan)] ml-0.5 align-text-bottom" style={{ animation: 'blink-caret 0.8s step-end infinite' }} />
                                </p>
                            )}
                        </div>
                    )}

                    {/* Prompt textarea */}
                    <div className="flex flex-col gap-2">
                        <div
                            className="relative rounded-2xl overflow-hidden"
                            style={{
                                border: '1px solid var(--border)',
                                background: 'rgba(0,0,0,0.35)',
                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                            }}
                            onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.35)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.06)'; }}
                            onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <textarea
                                ref={textRef}
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                onKeyDown={handleKey}
                                placeholder="e.g. When a new user signs up, save to database and send a welcome email via Gmail…"
                                rows={4}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '0.9rem',
                                    lineHeight: 1.6,
                                    resize: 'none',
                                    padding: '16px',
                                    paddingBottom: 48,
                                }}
                            />
                            <div
                                className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2.5"
                                style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', borderTop: '1px solid var(--border)' }}
                            >
                                <span className="text-[0.65rem] flex items-center gap-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                    <CornerDownLeft size={9} /> Ctrl+Enter to generate
                                </span>
                                <span className="text-[0.65rem]" style={{ color: prompt.length > 900 ? '#ef4444' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                    {prompt.length}/1000
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {aiResponse && (
                            <button
                                type="button"
                                onClick={onApply}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm flex-1 justify-center"
                                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', color: 'white', cursor: 'pointer', fontFamily: 'var(--font-head)' }}
                            >
                                <Wand2 size={15} /> Apply to Canvas
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!prompt.trim() || isLoading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
                            style={{
                                background: (!prompt.trim() || isLoading) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,rgba(0,212,255,0.15),rgba(124,58,237,0.2))',
                                border: `1px solid ${(!prompt.trim() || isLoading) ? 'var(--border)' : 'rgba(0,212,255,0.35)'}`,
                                color: (!prompt.trim() || isLoading) ? 'var(--text-muted)' : 'var(--cyan)',
                                cursor: (!prompt.trim() || isLoading) ? 'not-allowed' : 'pointer',
                                fontFamily: 'var(--font-head)',
                                flex: aiResponse ? 'none' : 1,
                                justifyContent: 'center',
                                display: 'flex',
                                boxShadow: (!prompt.trim() || isLoading) ? 'none' : '0 0 16px rgba(0,212,255,0.12)',
                            }}
                        >
                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            {isLoading ? 'Generating…' : aiResponse ? 'Regenerate' : 'Generate Workflow'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
