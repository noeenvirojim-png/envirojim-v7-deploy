import React from 'react';

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    strokeWidth?: number;
}

export function Sparkline({
    data,
    width = 100,
    height = 40,
    color = "currentColor",
    strokeWidth = 2
}: SparklineProps) {
    if (data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Calculate points
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const normalizedVal = (val - min) / range;
        // SVG coordinates: y=0 is top, so we invert (1 - val)
        const y = (1 - normalizedVal) * (height - strokeWidth * 2) + strokeWidth;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
