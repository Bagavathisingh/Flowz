import React, { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Trash2, Settings2, Copy, Play } from 'lucide-react';

export default function ContextMenu({
    id,
    type,
    top,
    left,
    right,
    bottom,
    node,
    edge,
    deleteNode,
    deleteEdge,
    setSelectedNode,
    ...props
}) {
    const { setNodes, setEdges } = useReactFlow();

    const isNode = type === 'node';
    const isEdge = type === 'edge';

    const duplicateNode = useCallback(() => {
        if (!node) return;
        const newNode = {
            ...node,
            id: `${node.id}-copy-${Math.random().toString(36).substr(2, 5)}`,
            position: {
                x: node.position.x + 20,
                y: node.position.y + 20,
            },
            selected: false,
        };
        setNodes((nds) => nds.concat(newNode));
    }, [node, setNodes]);

    return (
        <div
            style={{ top, left, right, bottom }}
            className="absolute z-50 min-w-[180px] bg-slate-900/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl p-1.5 animate-in fade-in zoom-in duration-100"
            {...props}
        >
            <div className="px-3 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-white/5 mb-1.5">
                {isNode ? 'Node Actions' : 'Edge Actions'}
            </div>

            {isNode && (
                <>
                    <button
                        onClick={() => {
                            setSelectedNode(node);
                            props.onClick();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-colors text-left border-none bg-transparent cursor-pointer"
                    >
                        <Settings2 size={16} />
                        Properties
                    </button>

                    <button
                        onClick={() => {
                            duplicateNode();
                            props.onClick();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-indigo-500/10 hover:text-indigo-400 rounded-lg transition-colors text-left border-none bg-transparent cursor-pointer"
                    >
                        <Copy size={16} />
                        Duplicate
                    </button>
                    <div className="h-px bg-white/5 my-1.5" />
                    <button
                        onClick={() => {
                            deleteNode(id);
                            props.onClick();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left border-none bg-transparent cursor-pointer"
                    >
                        <Trash2 size={16} />
                        Delete Node
                    </button>
                </>
            )}

            {isEdge && (
                <button
                    onClick={() => {
                        deleteEdge(id);
                        props.onClick();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left border-none bg-transparent cursor-pointer"
                >
                    <Trash2 size={16} />
                    Delete Connection
                </button>
            )}
        </div>
    );
}
