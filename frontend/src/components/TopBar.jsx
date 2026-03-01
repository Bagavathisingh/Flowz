import { Save, History, Sparkles, Play, Loader2, LayoutTemplate } from 'lucide-react';

export default function TopBar({ setShowSaveModal, openHistoryModal, setShowAiModal, handleTestRun, isExecuting, onLayout }) {
    return (
        <div className="absolute top-6 right-6 flex gap-4 z-10">
            <button
                className="bg-emerald-500 hover:bg-emerald-600 border-none text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowSaveModal(true)}
                disabled={isExecuting}
            >
                <Save size={18} /> Save
            </button>
            <button
                className="bg-blue-500 hover:bg-blue-600 border-none text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_14px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={openHistoryModal}
                disabled={isExecuting}
            >
                <History size={18} /> History
            </button>
            <button
                className="bg-slate-700 hover:bg-slate-600 border-none text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_14px_rgba(51,65,85,0.3)] hover:shadow-[0_6px_20px_rgba(51,65,85,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onLayout}
                disabled={isExecuting}
                title="Automatically arrange nodes"
            >
                <LayoutTemplate size={18} /> Auto Arrange
            </button>
            <button
                className="bg-gradient-to-br from-purple-500 to-pink-500 border-none hover:brightness-110 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_14px_rgba(236,72,153,0.3)] hover:shadow-[0_6px_20px_rgba(236,72,153,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowAiModal(true)}
                disabled={isExecuting}
            >
                <Sparkles size={18} /> Generate AI
            </button>
            <button
                className="bg-indigo-600 hover:bg-indigo-700 border-none text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] hover:-translate-y-[1px] disabled:opacity-75 disabled:cursor-wait"
                onClick={handleTestRun}
                disabled={isExecuting}
            >
                {isExecuting ? (
                    <>
                        <Loader2 size={18} className="animate-spin" /> Testing...
                    </>
                ) : (
                    <>
                        <Play size={18} /> Test Run
                    </>
                )}
            </button>
        </div>
    );
}
