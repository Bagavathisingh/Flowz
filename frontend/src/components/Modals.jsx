import { Sparkles, Save, History, X, Code, Check, Trash2, Copy, Github, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function Modals({
    showAiModal, setShowAiModal, aiPrompt, setAiPrompt, isGenerating, generateWorkflow, modifyWorkflow,
    generatedJsonResult, applyGeneratedWorkflow, setGeneratedJsonResult,
    showSaveModal, setShowSaveModal, workflowName, setWorkflowName, isSaving, saveWorkflow,
    showHistoryModal, setShowHistoryModal, isLoadingHistory, workflowHistory, loadWorkflow, deleteWorkflow,
    showGithubModal, setShowGithubModal, githubConfig, setGithubConfig, pushWorkflowToGithub
}) {
    const [copyStatus, setCopyStatus] = useState(null);
    const [aiMode, setAiMode] = useState('create'); // 'create' or 'modify'
    const [showGithubToken, setShowGithubToken] = useState(false);

    const handleCopyJson = (wf) => {
        navigator.clipboard.writeText(JSON.stringify(wf, null, 2));
        setCopyStatus(wf._id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

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
                                <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-white/5">
                                    <button
                                        onClick={() => setAiMode('create')}
                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all border-none cursor-pointer ${aiMode === 'create' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 bg-transparent'}`}
                                    >
                                        Create New
                                    </button>
                                    <button
                                        onClick={() => setAiMode('modify')}
                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all border-none cursor-pointer ${aiMode === 'modify' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 bg-transparent'}`}
                                    >
                                        Modify Current
                                    </button>
                                </div>

                                <textarea
                                    className="w-full h-36 bg-black/20 border border-white/10 rounded-xl p-4 text-slate-50 text-base resize-none mb-6 transition-all focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none"
                                    placeholder={aiMode === 'create'
                                        ? "e.g. When a webhook is received, delay for 5 minutes and then send an email..."
                                        : "e.g. Add an AI node after the webhook to summarize the body text..."
                                    }
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
                                        onClick={aiMode === 'create' ? generateWorkflow : modifyWorkflow} disabled={isGenerating || !aiPrompt.trim()}>
                                        {isGenerating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                {aiMode === 'create' ? 'Generating Architecture...' : 'Analyzing Workflow...'}
                                            </>
                                        ) : (aiMode === 'create' ? 'Generate Workflow' : 'Apply Modifications')}
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
            {/* Push to GitHub Modal */}
            {showGithubModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease]">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-[560px] max-w-[90vw] shadow-[0_24px_64px_rgba(0,0,0,0.6)] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="flex items-center gap-3 text-2xl font-semibold text-white m-0">
                                <Github size={24} className="text-slate-200" /> Push Workflow to GitHub
                            </h3>
                            <button className="bg-transparent border-none text-slate-400 hover:text-white p-1 rounded" onClick={() => setShowGithubModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-400">Repository Owner</label>
                                <input
                                    type="text"
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    placeholder="e.g. Bagavathisingh"
                                    value={githubConfig.owner}
                                    onChange={(e) => setGithubConfig({ ...githubConfig, owner: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-400">Repository Name</label>
                                <input
                                    type="text"
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    placeholder="e.g. Flowz"
                                    value={githubConfig.repo}
                                    onChange={(e) => setGithubConfig({ ...githubConfig, repo: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-400">Personal Access Token</label>
                                <div className="relative">
                                    <input
                                        type={showGithubToken ? "text" : "password"}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-white transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        placeholder="ghp_..."
                                        value={githubConfig.token}
                                        onChange={(e) => setGithubConfig({ ...githubConfig, token: e.target.value })}
                                    />
                                    <button
                                        onClick={() => setShowGithubToken(!showGithubToken)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-slate-500 hover:text-white cursor-pointer transition-colors"
                                    >
                                        {showGithubToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-400">File Path</label>
                                <input
                                    type="text"
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    placeholder="e.g. workflows/main.json"
                                    value={githubConfig.path}
                                    onChange={(e) => setGithubConfig({ ...githubConfig, path: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-400">Commit Message</label>
                                <input
                                    type="text"
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    placeholder="Update workflow"
                                    value={githubConfig.message}
                                    onChange={(e) => setGithubConfig({ ...githubConfig, message: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-8">
                            <button
                                className="bg-transparent border border-white/10 text-slate-400 px-6 py-3 rounded-lg hover:border-white/30 hover:text-white hover:bg-white/5 disabled:opacity-50 transition-all font-medium"
                                onClick={() => setShowGithubModal(false)} disabled={isSaving}>Cancel</button>
                            <button
                                className="bg-slate-200 hover:bg-white border-none text-slate-900 px-6 py-3 rounded-lg font-bold shadow-[0_4px_14px_rgba(255,255,255,0.1)] disabled:opacity-50 hover:shadow-[0_6px_20px_rgba(255,255,255,0.2)] hover:-translate-y-[1px] transition-all disabled:cursor-not-allowed flex items-center gap-2"
                                onClick={pushWorkflowToGithub} disabled={isSaving || !githubConfig.owner || !githubConfig.repo || !githubConfig.token}>
                                {isSaving ? 'Pushing...' : 'Push to GitHub'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
