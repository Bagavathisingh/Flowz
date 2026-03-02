import { Save, History, Sparkles, Play, Loader2, LayoutTemplate, Github, Plus } from 'lucide-react';

export default function TopBar({ setShowSaveModal, setShowGithubModal, openHistoryModal, setShowAiModal, handleTestRun, isExecuting, onLayout, setIsSidebarOpen, isSidebarOpen, hasNodes }) {
    return (
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10 pointer-events-none">

            {/* Left: + Add Nodes — only shown when canvas has nodes */}
            <div className="flex gap-4 pointer-events-auto">
                {hasNodes && (
                    <button
                        className={`p-3 rounded-xl border border-white/10 transition-all active:scale-95 shadow-xl flex items-center gap-2 font-bold ${isSidebarOpen ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900/80 backdrop-blur-md text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        title="Add Nodes"
                    >
                        <Plus
                            size={22}
                            className={isSidebarOpen ? 'rotate-45' : ''}
                            style={{ transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        />
                        {!isSidebarOpen && <span className="pr-1 text-sm">Add Nodes</span>}
                    </button>
                )}
            </div>

            {/* Right: action buttons */}
            <div className="flex gap-3 pointer-events-auto">
                <button
                    className="bg-emerald-500 hover:bg-emerald-600 border-none text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setShowSaveModal(true)}
                    disabled={isExecuting}
                >
                    <Save size={17} /> Save
                </button>
                <button
                    className="bg-slate-800 hover:bg-slate-700 border-none text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_14px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setShowGithubModal(true)}
                    disabled={isExecuting}
                >
                    <Github size={17} /> Push to GitHub
                </button>
                <button
                    className="bg-blue-500 hover:bg-blue-600 border-none text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_14px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={openHistoryModal}
                    disabled={isExecuting}
                >
                    <History size={17} /> History
                </button>
                <button
                    className="bg-slate-700 hover:bg-slate-600 border-none text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_14px_rgba(51,65,85,0.3)] hover:shadow-[0_6px_20px_rgba(51,65,85,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onLayout}
                    disabled={isExecuting}
                    title="Automatically arrange nodes"
                >
                    <LayoutTemplate size={17} /> Auto Arrange
                </button>
                <button
                    className="bg-gradient-to-br from-purple-500 to-pink-500 border-none hover:brightness-110 text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_14px_rgba(236,72,153,0.3)] hover:shadow-[0_6px_20px_rgba(236,72,153,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setShowAiModal(true)}
                    disabled={isExecuting}
                >
                    <Sparkles size={17} /> Generate AI
                </button>
                <button
                    className="bg-indigo-600 hover:bg-indigo-700 border-none text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] hover:-translate-y-[1px] disabled:opacity-75 disabled:cursor-wait"
                    onClick={handleTestRun}
                    disabled={isExecuting}
                >
                    {isExecuting ? (
                        <><Loader2 size={17} className="animate-spin" /> Testing...</>
                    ) : (
                        <><Play size={17} /> Test Run</>
                    )}
                </button>
            </div>
        </div>
    );
}

