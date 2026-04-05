import React from 'react';
import { getBezierPath, BaseEdge, EdgeLabelRenderer } from '@xyflow/react';

export default function N8NEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    selected,
    animated,
    data
}) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const edgeStyle = {
        ...style,
        strokeWidth: selected ? 4 : 3,
        stroke: selected ? '#3b82f6' : '#475569',
        transition: 'stroke 0.2s, stroke-width 0.2s',
        filter: selected ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : 'none',
    };

    return (
        <BaseEdge
            path={edgePath}
            markerEnd={markerEnd}
            style={edgeStyle}
            interactionWidth={20}
        />
    );
}
