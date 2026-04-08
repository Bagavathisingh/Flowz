import React from 'react';
import { getSmoothStepPath, BaseEdge } from '@xyflow/react';

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
    const [edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 20,
    });

    const edgeStyle = {
        ...style,
        strokeWidth: selected ? 3 : 2,
        stroke: selected ? '#60a5fa' : '#334155',
        transition: 'all 0.3s ease',
        filter: selected ? 'drop-shadow(0 0 12px rgba(96, 165, 250, 0.4))' : 'none',
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
