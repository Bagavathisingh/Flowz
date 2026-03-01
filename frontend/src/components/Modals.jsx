import { Sparkles, Save, History, X, Code, Check } from 'lucide-react';

export default function Modals({
    showAiModal, setShowAiModal, aiPrompt, setAiPrompt, isGenerating, generateWorkflow,
    generatedJsonResult, applyGeneratedWorkflow, setGeneratedJsonResult,
    showSaveModal, setShowSaveModal, workflowName, setWorkflowName, isSaving, saveWorkflow,
    showHistoryModal, setShowHistoryModal, isLoadingHistory, workflowHistory, loadWorkflow
}) {
    return (
        <>
            {/* AI Prompt Modal */}
            {showAiModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease]">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-[640px] max-w-[95vw] shadow-[0_24px_64px_rgba(0,0,0,0.6)] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="flex items-center gap-3 text-2xl font-semibold bg-gradient-to-br from-purple-400 to-pink-400 bg-clip-text text-transparent m-0">
                                <Sparkles size={24} className="text-pink-400" /> AI Workflow Assistant
                            </h3>
                            <button className="bg-transparent border-none text-slate-400 hover:text-white p-1 rounded" onClick={() => { setShowAiModal(false); setGeneratedJsonResult(null); }}>
                                <X size={20} />
                            </button>
                        </div>

                        {!generatedJsonResult ? (
                            <>
                                <textarea
                                    className="w-full h-36 bg-black/20 border border-white/10 rounded-xl p-4 text-slate-50 text-base resize-none mb-6 transition-all focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none"
                                    placeholder="e.g. When a webhook is received, delay for 5 minutes and then send an email..."
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    disabled={isGenerating}
                                />
                                <div className="flex justify-end gap-4">
                                    <button
                                        className="bg-transparent border border-white/10 text-slate-400 px-6 py-3 rounded-lg hover:border-white/30 hover:text-white hover:bg-white/5 disabled:opacity-50 transition-all font-medium"
                                        onClick={() => setShowAiModal(false)} disabled={isGenerating}>Cancel</button>
                                    <button
                                        className="bg-gradient-to-br border-none from-purple-500 to-pink-500 hover:brightness-110 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:grayscale transition-all disabled:cursor-not-allowed flex items-center gap-2"
                                        onClick={generateWorkflow} disabled={isGenerating || !aiPrompt.trim()}>
                                        {isGenerating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Analyzing...
                                            </>
                                        ) : 'Generate Architecture'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="animate-[slideUp_0.3s_ease]">
                                <div className="flex items-center gap-2 text-emerald-400 text-sm mb-3 font-medium">
                                    <Check size={16} /> JSON Architecture Generated Successfully
                                </div>
                                <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center gap-2 text-slate-500 mb-2 text-xs font-mono uppercase tracking-widest">
                                        <Code size={12} /> Source JSON
                                    </div>
                                    <pre className="text-xs text-blue-300 font-mono">
                                        {JSON.stringify(generatedJsonResult, null, 2)}
                                    </pre>
                                </div>
                                <div className="flex justify-between items-center gap-4 border-t border-white/5 pt-6">
                                    <button
                                        className="text-slate-400 text-sm hover:text-white transition-colors"
                                        onClick={() => setGeneratedJsonResult(null)}
                                    >
                                        ← Back to Prompt
                                    </button>
                                    <div className="flex gap-4">
                                        <button
                                            className="bg-transparent border border-white/10 text-slate-400 px-6 py-3 rounded-lg hover:border-white/30 hover:text-white hover:bg-white/5 transition-all font-medium"
                                            onClick={() => { setShowAiModal(false); setGeneratedJsonResult(null); }}>Discard</button>
                                        <button
                                            className="bg-emerald-500 hover:bg-emerald-600 border-none text-white px-8 py-3 rounded-lg font-medium shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2"
                                            onClick={applyGeneratedWorkflow}
                                        >
                                            <Check size={18} /> Build on Canvas
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
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-[90%] max-w-[600px] shadow-[0_24px_64px_rgba(0,0,0,0.6)] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="m-0 flex items-center gap-2 text-2xl font-semibold text-white">
                                <History size={24} className="text-blue-500" /> Workflow History
                            </h3>
                            <button className="bg-transparent border-none text-slate-400 hover:bg-white/5 hover:text-white p-1 rounded transition-colors" onClick={() => setShowHistoryModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto pr-2 flex flex-col gap-3 custom-scrollbar">
                            {isLoadingHistory ? (
                                <p className="text-slate-400">Loading history...</p>
                            ) : workflowHistory.length === 0 ? (
                                <p className="text-slate-400">No workflows saved yet.</p>
                            ) : (
                                workflowHistory.map((wf) => (
                                    <div key={wf._id} className="p-4 bg-slate-800/40 rounded-xl border border-white/5 flex justify-between items-center hover:bg-slate-800/60 transition-colors">
                                        <div>
                                            <h4 className="m-0 mb-2 text-base text-slate-100 font-semibold">{wf.name}</h4>
                                            <small className="text-slate-500">
                                                {new Date(wf.createdAt).toLocaleString()} • {wf.nodes?.length || 0} nodes
                                            </small>
                                        </div>
                                        <button className="bg-blue-500 hover:bg-blue-600 border-none text-white px-4 py-2 rounded shadow transition-all hover:shadow-md hover:-translate-y-[1px]" onClick={() => loadWorkflow(wf)}>
                                            Load
                                        </button>
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
