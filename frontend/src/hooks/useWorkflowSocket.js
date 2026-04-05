import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let globalSocket = null;

const getSocket = () => {
    if (!globalSocket || globalSocket.disconnected) {
        globalSocket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            autoConnect: true,
        });
    }
    return globalSocket;
};

/**
 * useWorkflowSocket — subscribes to real-time execution events for a given workflowId.
 *
 * @param {string|null} workflowId - The MongoDB ID of the workflow to watch.
 * @param {object}      callbacks  - { onNodeStart, onNodeComplete, onNodeError, onWorkflowDone, onWorkflowStart }
 */
export const useWorkflowSocket = (workflowId, callbacks = {}) => {
    const socketRef = useRef(null);
    const callbacksRef = useRef(callbacks);

    // Keep callbacks ref fresh without re-subscribing
    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);

    useEffect(() => {
        if (!workflowId) return;

        const socket = getSocket();
        socketRef.current = socket;

        const join = () => {
            socket.emit('join_workflow', workflowId);
            console.log(`[SOCKET] Joined workflow room: ${workflowId}`);
        };

        if (socket.connected) {
            join();
        } else {
            socket.once('connect', join);
        }

        const onNodeStart    = (data) => callbacksRef.current.onNodeStart?.(data);
        const onNodeComplete = (data) => callbacksRef.current.onNodeComplete?.(data);
        const onNodeError    = (data) => callbacksRef.current.onNodeError?.(data);
        const onWorkflowDone = (data) => callbacksRef.current.onWorkflowDone?.(data);
        const onWorkflowStart = (data) => callbacksRef.current.onWorkflowStart?.(data);

        socket.on('node:start',       onNodeStart);
        socket.on('node:complete',    onNodeComplete);
        socket.on('node:error',       onNodeError);
        socket.on('workflow:done',    onWorkflowDone);
        socket.on('workflow:start',   onWorkflowStart);

        return () => {
            socket.off('node:start',      onNodeStart);
            socket.off('node:complete',   onNodeComplete);
            socket.off('node:error',      onNodeError);
            socket.off('workflow:done',   onWorkflowDone);
            socket.off('workflow:start',  onWorkflowStart);
        };
    }, [workflowId]);

    const emit = useCallback((event, data) => {
        socketRef.current?.emit(event, data);
    }, []);

    return { emit };
};
