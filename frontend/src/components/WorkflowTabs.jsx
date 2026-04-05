import { X, FileCode2, Plus } from 'lucide-react';

export default function WorkflowTabs({ openWorkflows, activeWorkflowId, onSwitch, onClose, onNew }) {
    if (openWorkflows.length === 0) return null;

    return (
        <div
            className="absolute top-[72px] left-1/2 -translate-x-1/2 z-[35] flex items-center pointer-events-auto"
            style={{ maxWidth: 640, gap: 2 }}
        >
            {/* Scrollable tab strip */}
            <div
                className="flex items-end gap-0.5 no-scrollbar"
                style={{ overflowX: 'auto', paddingBottom: 0 }}
            >
                {openWorkflows.map((wf) => {
                    const id = wf._id || wf.id;
                    const isActive = activeWorkflowId === id;
                    const isUnsaved = id?.startsWith('unsaved_');

                    return (
                        <div
                            key={id}
                            onClick={() => onSwitch(id)}
                            className="group relative flex items-center gap-2 px-4 py-2 cursor-pointer select-none"
                            style={{
                                background: isActive
                                    ? 'rgba(10,13,20,0.88)'
                                    : 'rgba(10,13,20,0.45)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid var(--border)',
                                borderBottom: isActive ? '1px solid transparent' : '1px solid var(--border)',
                                borderRadius: `var(--radius-md) var(--radius-md) 0 0`,
                                borderTopColor: isActive ? 'rgba(0,212,255,0.25)' : 'var(--border)',
                                minWidth: 120,
                                maxWidth: 180,
                                transition: 'all 0.18s ease',
                                animation: 'tab-appear 0.2s ease',
                            }}
                        >
                            {/* Active underline bar */}
                            {isActive && <div className="tab-active-bar" />}

                            <FileCode2
                                size={13}
                                style={{ color: isActive ? 'var(--cyan)' : 'var(--text-muted)', flexShrink: 0 }}
                            />

                            <span
                                className="text-xs font-semibold truncate flex-1"
                                style={{
                                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    fontFamily: 'var(--font-head)',
                                }}
                            >
                                {wf.name || 'Untitled'}
                            </span>

                            {/* Unsaved dot */}
                            {isUnsaved && (
                                <span
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ background: 'var(--amber)' }}
                                    title="Unsaved"
                                />
                            )}

                            {/* Close button */}
                            {openWorkflows.length > 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onClose(id); }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 rounded p-0.5 hover:bg-white/10"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 0 }}
                                >
                                    <X size={11} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* New tab button */}
            <button
                onClick={onNew}
                title="New Workflow"
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(10,13,20,0.45)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    marginLeft: 4,
                    flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
                <Plus size={14} />
            </button>
        </div>
    );
}
