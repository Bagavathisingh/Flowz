import { Sparkles, Save, History, X, Code, Check, Trash2, Copy, Info, ArrowRightToLine } from 'lucide-react';
import { useState } from 'react';

export default function Modals({
    showAiModal, setShowAiModal, aiPrompt, setAiPrompt, isGenerating, generateWorkflow, modifyWorkflow,
    generatedJsonResult, applyGeneratedWorkflow, setGeneratedJsonResult,
    showSaveModal, setShowSaveModal, workflowName, setWorkflowName, isSaving, saveWorkflow,
    showHistoryModal, setShowHistoryModal, isLoadingHistory, workflowHistory, loadWorkflow, deleteWorkflow
}) {
    const [copyStatus, setCopyStatus] = useState(null);
    const [aiMode, setAiMode] = useState('create'); // 'create' or 'modify'

    const handleCopyJson = (wf) => {
        navigator.clipboard.writeText(JSON.stringify(wf, null, 2));
        setCopyStatus(wf._id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    return (
        <>
            {/* AI Prompt Modal - Premium Redesign */}
            {showAiModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 animate-[fadeIn_0.3s_ease]">
                    <div className="bg-[#0b0f1a] border border-white/10 rounded-[2.5rem] p-10 w-[720px] max-w-[95vw] shadow-[0_32px_128px_rgba(0,0,0,0.8)] animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden relative group">
                        {/* Glow effect background */}
                        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>

                        <div className="flex justify-between items-start mb-8">
                            <div className="flex flex-col gap-1">
                                <h3 className="flex items-center gap-3 text-3xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent m-0">
                                    <Sparkles size={28} className="text-purple-400" /> AI Flow Assistant
                                </h3>
                                <p className="text-slate-500 text-sm font-medium ml-10">Describe your automation and let the AI build the architecture.</p>
                            </div>
                            <button className="bg-white/5 border-none text-slate-400 hover:text-white p-2 rounded-xl transition-all hover:bg-white/10 cursor-pointer" onClick={() => { setShowAiModal(false); setGeneratedJsonResult(null); }}>
                                <X size={20} />
                            </button>
                        </div>

                        {!generatedJsonResult ? (
                            <div className="flex flex-col gap-6">
                                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 w-fit">
                                    <button
                                        onClick={() => setAiMode('create')}
                                        className={`py-2 px-6 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border-none cursor-pointer ${aiMode === 'create' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 bg-transparent'}`}
                                    >
                                        New Flow
                                    </button>
                                    <button
                                        onClick={() => setAiMode('modify')}
                                        className={`py-2 px-6 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border-none cursor-pointer ${aiMode === 'modify' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 bg-transparent'}`}
                                    >
                                        Modify Current
                                    </button>
                                </div>

                                <div className="relative group/prompt">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-3xl blur opacity-0 group-focus-within/prompt:opacity-100 transition duration-500"></div>
                                    <textarea
                                        className="relative w-full h-48 bg-black/40 border border-white/10 rounded-3xl p-6 text-slate-100 text-lg leading-relaxed resize-none transition-all focus:border-purple-500/50 outline-none placeholder:text-slate-700"
                                        placeholder={aiMode === 'create'
                                            ? "e.g. When a webhook is received, summarize the payload and send an email if it's urgent..."
                                            : "e.g. Add a delay node between the trigger and the email..."
                                        }
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        disabled={isGenerating}
                                    />
                                    <div className="absolute bottom-4 right-6 text-[0.7rem] text-slate-500 font-bold uppercase tracking-tighter opacity-50 group-focus-within/prompt:opacity-100 transition-opacity">
                                        Shift + Enter to send
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
                                        <Info size={14} />
                                        <span>AI will generate a JSON structure based on your request.</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <button
                                            className="bg-transparent border border-white/5 text-slate-500 px-6 py-3 rounded-2xl hover:bg-white/5 hover:text-white transition-all font-bold text-sm"
                                            onClick={() => setShowAiModal(false)} disabled={isGenerating}>Cancel</button>
                                        <button
                                            className="bg-white text-slate-950 px-8 py-3 rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center gap-3 shadow-[0_10px_30px_rgba(255,255,255,0.1)] border-none"
                                            onClick={aiMode === 'create' ? generateWorkflow : modifyWorkflow}
                                            disabled={isGenerating || !aiPrompt.trim()}
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <div className="w-4 h-4 border-3 border-slate-900/30 border-t-slate-950 rounded-full animate-spin"></div>
                                                    <span>BUILDING...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>{aiMode === 'create' ? 'GENERATE ARCHITECTURE' : 'MODIFY WORKFLOW'}</span>
                                                    <ArrowRightToLine size={18} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-[slideUp_0.3s_ease]">
                                <div className="flex items-center gap-3 text-emerald-400 text-sm mb-5 font-bold uppercase tracking-widest bg-emerald-500/5 w-fit px-4 py-2 rounded-full border border-emerald-500/20">
                                    <Check size={16} /> Architecture Defined Successfully
                                </div>
                                <div className="bg-black/40 border border-white/10 rounded-3xl p-6 mb-8 max-h-[350px] overflow-y-auto custom-scrollbar group/preview relative">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2 text-slate-600 text-[0.6rem] font-black uppercase tracking-[0.2em]">
                                            <Code size={12} /> Blueprint JSON
                                        </div>
                                        <button
                                            className="text-slate-500 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
                                            onClick={() => {
                                                navigator.clipboard.writeText(JSON.stringify(generatedJsonResult, null, 2));
                                                // Could add a toast here
                                            }}
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                    <pre className="text-sm text-blue-300/80 font-mono leading-relaxed m-0">
                                        {JSON.stringify(generatedJsonResult, null, 2)}
                                    </pre>
                                </div>
                                <div className="flex justify-between items-center gap-4 border-t border-white/5 pt-8">
                                    <button
                                        className="text-slate-500 text-xs font-black uppercase tracking-widest hover:text-white transition-colors border-none bg-transparent cursor-pointer"
                                        onClick={() => setGeneratedJsonResult(null)}
                                    >
                                        ← RE-EDIT PROMPT
                                    </button>
                                    <div className="flex gap-4">
                                        <button
                                            className="bg-transparent border border-white/5 text-slate-500 px-6 py-3 rounded-2xl hover:bg-white/5 hover:text-white transition-all font-bold text-sm"
                                            onClick={() => { setShowAiModal(false); setGeneratedJsonResult(null); }}>DISCARD</button>
                                        <button
                                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-3 rounded-2xl font-black text-sm shadow-[0_10px_40px_rgba(16,185,129,0.2)] hover:scale-[1.02] transition-all flex items-center gap-3 border-none"
                                            onClick={applyGeneratedWorkflow}
                                        >
                                            <Check size={20} /> DEPLOY TO CANVAS
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease]">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-[560px] max-w-[90vw] shadow-[0_24px_64px_rgba(0,0,0,0.6)] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
                        <h3 className="flex items-center gap-3 mb-6 text-2xl font-semibold text-white m-0">
                            <Save size={24} className="text-emerald-500" /> Save Workflow
                        </h3>
                        <div className="flex flex-col gap-2 mt-4 mb-6">
                            <label className="text-sm font-medium text-slate-400">Workflow Name</label>
                            <input
                                type="text"
                                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 outline-none"
                                placeholder="e.g. My First Workflow"
                                value={workflowName}
                                onChange={(e) => setWorkflowName(e.target.value)}
                                disabled={isSaving}
                            />
                        </div>
                        <div className="flex justify-end gap-4">
                            <button
                                className="bg-transparent border border-white/10 text-slate-400 px-6 py-3 rounded-lg hover:border-white/30 hover:text-white hover:bg-white/5 disabled:opacity-50 transition-all font-medium"
                                onClick={() => setShowSaveModal(false)} disabled={isSaving}>Cancel</button>
                            <button
                                className="bg-emerald-500 hover:bg-emerald-600 border-none text-white px-6 py-3 rounded-lg font-medium shadow-[0_4px_14px_rgba(16,185,129,0.3)] disabled:opacity-50 hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] hover:-translate-y-[1px] transition-all disabled:cursor-not-allowed"
                                onClick={saveWorkflow} disabled={isSaving || !workflowName.trim()}>
                                {isSaving ? 'Saving...' : 'Save Workflow'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease]">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-[95%] max-w-[700px] shadow-[0_24px_64px_rgba(0,0,0,0.6)] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="m-0 flex items-center gap-2 text-2xl font-semibold text-white">
                                <History size={24} className="text-blue-500" /> Workflow History
                            </h3>
                            <button className="bg-transparent border-none text-slate-400 hover:bg-white/5 hover:text-white p-1 rounded transition-colors" onClick={() => setShowHistoryModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="max-h-[450px] overflow-y-auto pr-2 flex flex-col gap-3 custom-scrollbar">
                            {isLoadingHistory ? (
                                <div className="flex flex-col items-center py-10 gap-3">
                                    <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                    <p className="text-slate-400">Retrieving your workflows...</p>
                                </div>
                            ) : workflowHistory.length === 0 ? (
                                <div className="text-center py-10">
                                    <History size={48} className="text-slate-700 mx-auto mb-3" />
                                    <p className="text-slate-400">No workflows saved yet.</p>
                                </div>
                            ) : (
                                workflowHistory.map((wf) => (
                                    <div key={wf._id} className="p-4 bg-slate-800/40 rounded-xl border border-white/5 flex justify-between items-center hover:bg-slate-800/60 transition-all group">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h4 className="m-0 mb-1 text-base text-slate-100 font-semibold truncate">{wf.name}</h4>
                                            <div className="flex items-center gap-2 text-slate-500 text-xs">
                                                <span>{new Date(wf.createdAt).toLocaleDateString()}</span>
                                                <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                                <span className="bg-slate-900/50 px-2 py-0.5 rounded border border-white/5">{wf.nodes?.length || 0} nodes</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                className={`p-2 rounded-lg border border-white/10 transition-all flex items-center justify-center relative ${copyStatus === wf._id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-transparent text-slate-400 hover:text-blue-400 hover:border-blue-400/30'}`}
                                                title="Copy JSON"
                                                onClick={() => handleCopyJson(wf)}
                                            >
                                                {copyStatus === wf._id ? <Check size={16} /> : <Copy size={16} />}
                                                {copyStatus === wf._id && (
                                                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] px-2 py-1 rounded shadow-lg animate-bounce">Copied!</span>
                                                )}
                                            </button>
                                            <button
                                                className="p-2 rounded-lg border border-white/10 bg-transparent text-slate-400 hover:text-red-400 hover:border-red-400/30 transition-all flex items-center justify-center"
                                                title="Delete Workflow"
                                                onClick={() => {
                                                    if (window.confirm(`Are you sure you want to delete "${wf.name}"?`)) {
                                                        deleteWorkflow(wf._id);
                                                    }
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <button
                                                className="bg-blue-500 hover:bg-blue-600 border-none text-white px-5 py-2 rounded-lg font-medium shadow-lg hover:shadow-blue-500/20 transition-all hover:-translate-y-[1px] active:translate-y-0"
                                                onClick={() => loadWorkflow(wf)}
                                            >
                                                Load
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
