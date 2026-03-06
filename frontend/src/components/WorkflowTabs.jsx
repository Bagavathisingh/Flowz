import React from 'react';
import { X, FileCode, Plus } from 'lucide-react';

export default function WorkflowTabs({
    openWorkflows,
    activeWorkflowId,
    onSwitch,
    onClose,
    onNew
}) {
    return (
        <div className="absolute top-6 left-6 flex items-center gap-3 z-30 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
                {openWorkflows.map((wf) => (
                    <div
                        key={wf.id || wf._id}
                        className={`group flex items-center gap-3 px-5 py-2.5 rounded-xl border transition-all cursor-pointer backdrop-blur-md shadow-lg ${activeWorkflowId === (wf.id || wf._id)
                                ? 'bg-blue-600/30 border-blue-500/50 text-white shadow-blue-500/10'
                                : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                            }`}
                        onClick={() => onSwitch(wf.id || wf._id)}
                    >
                        <FileCode size={16} className={activeWorkflowId === (wf.id || wf._id) ? 'text-blue-400' : 'text-slate-500'} />
                        <span className="text-sm font-bold tracking-tight truncate max-w-[180px]">
                            {wf.name || 'Untitled Workflow'}
                        </span>
                        {openWorkflows.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose(wf.id || wf._id);
                                }}
                                className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all border-none bg-transparent text-slate-400 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                ))}

                <button
                    onClick={onNew}
                    className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all shadow-lg border-none cursor-pointer flex items-center justify-center"
                    title="New Workflow"
                >
                    <Plus size={18} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}
