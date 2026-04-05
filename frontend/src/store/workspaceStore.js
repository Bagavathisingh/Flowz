import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useWorkspaceStore = create(
    persist(
        (set, get) => ({
            workspaces: [],
            activeWorkspaceId: null,
            members: [],
            isLoading: false,
            error: null,

            get activeWorkspace() {
                const { workspaces, activeWorkspaceId } = get();
                return workspaces.find(w => (w._id || w.id) === activeWorkspaceId) || null;
            },

            fetchWorkspaces: async () => {
                set({ isLoading: true, error: null });
                try {
                    const { data } = await axios.get(`${API_URL}/workspaces`);
                    set({ workspaces: data });

                    // Auto-select the first workspace if none selected
                    const { activeWorkspaceId } = get();
                    if (!activeWorkspaceId && data.length > 0) {
                        set({ activeWorkspaceId: data[0]._id });
                    }
                    return data;
                } catch (err) {
                    set({ error: err.response?.data?.error || err.message });
                    return [];
                } finally {
                    set({ isLoading: false });
                }
            },

            createWorkspace: async (name) => {
                set({ isLoading: true, error: null });
                try {
                    const { data } = await axios.post(`${API_URL}/workspaces`, { name });
                    set(state => ({
                        workspaces: [...state.workspaces, { ...data, role: 'owner' }],
                        activeWorkspaceId: data._id
                    }));
                    return data;
                } catch (err) {
                    set({ error: err.response?.data?.error || err.message });
                    throw err;
                } finally {
                    set({ isLoading: false });
                }
            },

            switchWorkspace: (workspaceId) => {
                set({ activeWorkspaceId: workspaceId, members: [] });
            },

            fetchMembers: async (workspaceId) => {
                try {
                    const id = workspaceId || get().activeWorkspaceId;
                    if (!id) return;
                    const { data } = await axios.get(`${API_URL}/workspaces/${id}/members`);
                    set({ members: data });
                    return data;
                } catch (err) {
                    console.error('[WORKSPACE] Failed to fetch members:', err.message);
                }
            },

            inviteMember: async (email, role = 'editor') => {
                const { activeWorkspaceId } = get();
                if (!activeWorkspaceId) throw new Error('No active workspace');
                const { data } = await axios.post(`${API_URL}/workspaces/${activeWorkspaceId}/invite`, { email, role });
                return data;
            },

            removeMember: async (memberId) => {
                const { activeWorkspaceId } = get();
                await axios.delete(`${API_URL}/workspaces/${activeWorkspaceId}/members/${memberId}`);
                set(state => ({ members: state.members.filter(m => m._id !== memberId) }));
            },

            acceptInvite: async (token) => {
                const { data } = await axios.post(`${API_URL}/workspaces/invite/accept`, { token });
                await get().fetchWorkspaces();
                return data;
            },

            deleteWorkspace: async (workspaceId) => {
                await axios.delete(`${API_URL}/workspaces/${workspaceId}`);
                set(state => {
                    const remaining = state.workspaces.filter(w => w._id !== workspaceId);
                    return {
                        workspaces: remaining,
                        activeWorkspaceId: remaining[0]?._id || null
                    };
                });
            },
        }),
        {
            name: 'flowz-workspace',
            partialize: (state) => ({ activeWorkspaceId: state.activeWorkspaceId })
        }
    )
);
