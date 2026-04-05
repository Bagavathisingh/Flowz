import { useState, useEffect, useRef } from 'react';
import {
    Building2, ChevronDown, Plus, Check, Users,
    Mail, Trash2, X, Crown, Shield, Eye, Pencil, Loader2
} from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

const ROLE_META = {
    owner:  { icon: Crown,  color: 'text-amber-400',  label: 'Owner'  },
    admin:  { icon: Shield, color: 'text-blue-400',   label: 'Admin'  },
    editor: { icon: Pencil, color: 'text-emerald-400',label: 'Editor' },
    viewer: { icon: Eye,    color: 'text-slate-400',  label: 'Viewer' },
};

// ── Invite Modal ──────────────────────────────────────────────────────────────
function InviteModal({ onClose, workspaceId }) {
    const { inviteMember } = useWorkspaceStore();
    const [email, setEmail] = useState('');
    const [role, setRole]   = useState('editor');
    const [status, setStatus] = useState(null); // null | 'loading' | { ok, msg }

    const handleInvite = async () => {
        if (!email.trim()) return;
        setStatus('loading');
        try {
            const res = await inviteMember(email.trim(), role);
            setStatus({ ok: true, msg: res.previewUrl
                ? `Invite sent! Preview: ${res.previewUrl}`
                : 'Invite sent successfully.' });
            setEmail('');
        } catch (err) {
            setStatus({ ok: false, msg: err.response?.data?.error || err.message });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="w-[480px] bg-slate-900 border border-white/10 rounded-3xl p-7 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Mail size={18} className="text-indigo-400" /> Invite Member
                    </h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8' }}>
                        <X size={18} />
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    <input
                        type="email"
                        placeholder="colleague@company.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleInvite()}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                        style={{ fontFamily: 'inherit' }}
                    />
                    <select
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                        style={{ fontFamily: 'inherit' }}
                    >
                        <option value="editor">Editor — can create & edit workflows</option>
                        <option value="admin">Admin — can invite & manage members</option>
                        <option value="viewer">Viewer — read-only access</option>
                    </select>

                    {status && status !== 'loading' && (
                        <p className={`text-xs rounded-xl px-3 py-2 border ${status.ok
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                            {status.msg}
                        </p>
                    )}

                    <button
                        onClick={handleInvite}
                        disabled={status === 'loading'}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', cursor: 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}
                    >
                        {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                        Send Invitation
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Create Workspace Modal ────────────────────────────────────────────────────
function CreateWorkspaceModal({ onClose }) {
    const { createWorkspace } = useWorkspaceStore();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        setError('');
        try {
            await createWorkspace(name.trim());
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="w-[420px] bg-slate-900 border border-white/10 rounded-3xl p-7 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Building2 size={18} className="text-indigo-400" /> New Workspace
                    </h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8' }}>
                        <X size={18} />
                    </button>
                </div>
                <div className="flex flex-col gap-3">
                    <input
                        autoFocus
                        type="text"
                        placeholder="e.g. Acme Corp"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 outline-none focus:border-indigo-500"
                        style={{ fontFamily: 'inherit' }}
                    />
                    {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', cursor: 'pointer' }}
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Create Workspace
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main WorkspaceSwitcher ────────────────────────────────────────────────────
export default function WorkspaceSwitcher() {
    const {
        workspaces, activeWorkspaceId,
        fetchWorkspaces, switchWorkspace,
        fetchMembers, members, removeMember,
        isLoading
    } = useWorkspaceStore();

    const [open, setOpen]           = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const dropRef = useRef(null);

    const active = workspaces.find(w => w._id === activeWorkspaceId);

    useEffect(() => { fetchWorkspaces(); }, []);

    useEffect(() => {
        if (open && activeWorkspaceId) fetchMembers(activeWorkspaceId);
    }, [open, activeWorkspaceId]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <>
            <div ref={dropRef} className="relative">
                {/* Trigger button */}
                <button
                    onClick={() => setOpen(o => !o)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-white/5 text-slate-300 hover:text-white hover:border-white/15 transition-all text-sm font-semibold"
                    style={{ cursor: 'pointer', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    <Building2 size={15} className="text-indigo-400 flex-shrink-0" />
                    <span className="max-w-[120px] truncate">{active?.name || 'Personal'}</span>
                    {active?.role && (
                        <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-white/8 text-slate-400 uppercase tracking-widest font-bold border border-white/5">
                            {active.role}
                        </span>
                    )}
                    <ChevronDown size={13} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {open && (
                    <div className="absolute top-full mt-2 left-0 w-72 bg-slate-950/98 border border-white/8 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden z-50">
                        {/* Workspace list */}
                        <div className="p-2 border-b border-white/5">
                            <p className="text-[0.62rem] font-black uppercase tracking-widest text-slate-600 px-2 py-1">
                                Workspaces
                            </p>
                            {isLoading && <p className="text-slate-500 text-xs text-center py-3">Loading...</p>}
                            {workspaces.map(ws => (
                                <button
                                    key={ws._id}
                                    onClick={() => { switchWorkspace(ws._id); setOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-left transition-colors"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                    <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-black text-indigo-300">
                                            {ws.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">{ws.name}</p>
                                        <p className="text-[0.65rem] text-slate-500 capitalize">{ws.role}</p>
                                    </div>
                                    {ws._id === activeWorkspaceId && (
                                        <Check size={14} className="text-indigo-400 flex-shrink-0" />
                                    )}
                                </button>
                            ))}

                            {workspaces.length === 0 && !isLoading && (
                                <p className="text-slate-600 text-xs text-center py-3">No workspaces yet</p>
                            )}
                        </div>

                        {/* Members section */}
                        {activeWorkspaceId && (
                            <div className="p-2 border-b border-white/5">
                                <button
                                    onClick={() => setShowMembers(m => !m)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors text-xs font-bold"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                    <Users size={13} /> Members ({members.length})
                                    <ChevronDown size={11} className={`ml-auto transition-transform ${showMembers ? 'rotate-180' : ''}`} />
                                </button>
                                {showMembers && (
                                    <div className="mt-1 flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                                        {members.map(m => {
                                            const RoleMeta = ROLE_META[m.role] || ROLE_META.viewer;
                                            const RoleIcon = RoleMeta.icon;
                                            return (
                                                <div key={m._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg group">
                                                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-[0.6rem] font-black text-white">
                                                            {(m.email || '?').charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[0.75rem] text-white truncate">{m.email}</p>
                                                        <div className="flex items-center gap-1">
                                                            <RoleIcon size={9} className={RoleMeta.color} />
                                                            <span className={`text-[0.6rem] ${RoleMeta.color}`}>{RoleMeta.label}</span>
                                                            {m.status === 'pending' && (
                                                                <span className="text-[0.55rem] text-amber-400 bg-amber-500/10 px-1 rounded">pending</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {m.role !== 'owner' && (
                                                        <button
                                                            onClick={() => removeMember(m._id)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#f87171', padding: 2 }}
                                                        >
                                                            <Trash2 size={11} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="p-2 flex flex-col gap-0.5">
                            {activeWorkspaceId && ['owner', 'admin'].includes(active?.role) && (
                                <button
                                    onClick={() => { setShowInvite(true); setOpen(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-indigo-400 hover:bg-indigo-500/10 text-xs font-bold transition-colors"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                    <Mail size={13} /> Invite Member
                                </button>
                            )}
                            <button
                                onClick={() => { setShowCreate(true); setOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-xs font-bold transition-colors"
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                                <Plus size={13} /> New Workspace
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showInvite && <InviteModal onClose={() => setShowInvite(false)} workspaceId={activeWorkspaceId} />}
            {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} />}
        </>
    );
}
