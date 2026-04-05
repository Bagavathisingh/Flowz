import { Save, History, Sparkles, Play, Loader2, LayoutTemplate, Plus } from 'lucide-react';
import WorkspaceSwitcher from './WorkspaceSwitcher';

export default function TopBar({ setShowSaveModal, openHistoryModal, setShowAiModal, handleTestRun, isExecuting, onLayout, setIsSidebarOpen, isSidebarOpen, hasNodes, isPropertiesOpen }) {
    return (
        <>
            {/* ── Workspace Switcher — top-left floating pill ── */}
            <div className="absolute top-6 left-6 z-[40] pointer-events-auto">
                <WorkspaceSwitcher />
            </div>

            {/* Action Buttons — right side floating column */}
            <div className={`absolute top-6 right-6 flex flex-col gap-3 pointer-events-auto z-[40] transition-all duration-300 ${isPropertiesOpen ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
            {/* Save button */}
            <button
                className="group relative p-3.5 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl text-slate-400 hover:text-white transition-all active:scale-90 cursor-pointer border-none"
                onClick={() => setShowSaveModal(true)}
                disabled={isExecuting}
            >
                <Save size={20} />
                <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-950 text-white text-[0.7rem] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-2xl border border-white/10 whitespace-nowrap">
                    Save
                </span>
            </button>

            <button
                className="group relative p-3.5 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl text-slate-400 hover:text-white transition-all active:scale-90 cursor-pointer border-none"
                onClick={openHistoryModal}
                disabled={isExecuting}
            >
                <History size={20} />
                <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-950 text-white text-[0.7rem] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-2xl border border-white/10 whitespace-nowrap">
                    History
                </span>
            </button>

            <button
                className="group relative p-3.5 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl text-pink-400 hover:text-pink-300 transition-all active:scale-90 cursor-pointer border-none"
                onClick={() => setShowAiModal(true)}
                disabled={isExecuting}
            >
                <Sparkles size={20} />
                <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-950 text-white text-[0.7rem] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-2xl border border-white/10 whitespace-nowrap">
                    AI Architect
                </span>
            </button>

            <button
                className="group relative p-3.5 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl text-blue-400 hover:text-blue-300 transition-all active:scale-90 cursor-pointer border-none"
                onClick={onLayout}
                disabled={isExecuting}
            >
                <LayoutTemplate size={20} />
                <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-950 text-white text-[0.7rem] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-2xl border border-white/10 whitespace-nowrap">
                    Auto Layout
                </span>
            </button>

            {/* Main Primary Execution Button */}
            <button
                className={`group relative w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all active:scale-90 shadow-[0_12px_48px_-8px_rgba(79,70,229,0.5)] border-none cursor-pointer flex items-center justify-center ${isExecuting ? 'opacity-80 scale-95 cursor-wait' : ''
                    }`}
                onClick={handleTestRun}
                disabled={isExecuting}
            >
                {isExecuting ? (
                    <Loader2 size={24} className="animate-spin" />
                ) : (
                    <Play size={24} fill="currentColor" strokeWidth={0} />
                )}
                <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-950 text-white text-[0.7rem] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-2xl border border-white/10 whitespace-nowrap">
                    Run Workflow
                </span>
            </button>

            {/* The Plus Button: Redesigned based on screenshot */}
            <button
                className={`group absolute bottom-[-45vh] right-0 w-14 h-14 rounded-2xl border transition-all active:scale-90 cursor-pointer flex items-center justify-center shadow-2xl ${isSidebarOpen
                    ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/20'
                    : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
                <Plus size={26} strokeWidth={2.5} className={isSidebarOpen ? 'rotate-45' : ''} style={{ transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
                <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-950 text-white text-[0.7rem] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-2xl border border-white/10 whitespace-nowrap">
                    Add Step
                </span>
            </button>
            </div>  {/* end right-side column */}
        </>
    );
}
