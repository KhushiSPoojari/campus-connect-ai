'use client';

import React from 'react';
import type { CampusNavigationGraph } from '@/types/navigation';

interface CampusMapViewerProps {
  graph: CampusNavigationGraph;
  selectedStartId?: string;
  selectedEndId?: string;
  pathNodeIds?: string[];
  onSelectNode?: (nodeId: string) => void;
}

export function CampusMapViewer({
  graph,
  selectedStartId,
  selectedEndId,
  pathNodeIds = [],
  onSelectNode,
}: CampusMapViewerProps) {
  const pathSet = new Set(pathNodeIds);

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 overflow-hidden relative shadow-inner">
      <div className="flex items-center justify-between mb-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-zinc-200">Interactive Vector Campus Map</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span> Start
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"></span> Destination
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span> Walkway
          </span>
        </div>
      </div>

      <div className="relative aspect-[16/11] w-full bg-zinc-900/90 rounded-xl overflow-hidden border border-zinc-800/80">
        <svg
          viewBox="0 0 950 780"
          className="w-full h-full select-none"
          role="img"
          aria-label="Campus map showing buildings, pathways, and active navigation route"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="campus-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" strokeWidth="0.8" opacity="0.4" />
            </pattern>
            {/* Pulse gradient */}
            <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Grid */}
          <rect width="950" height="780" fill="url(#campus-grid)" />

          {/* Walkway Edges */}
          {graph.edges.map(edge => {
            const nodeA = graph.nodes.find(n => n.id === edge.from);
            const nodeB = graph.nodes.find(n => n.id === edge.to);
            if (!nodeA || !nodeB) return null;

            // Check if this edge is along the active calculated path
            const isEdgeInPath =
              pathNodeIds.length > 1 &&
              pathNodeIds.some((id, idx) => {
                if (idx === pathNodeIds.length - 1) return false;
                const nextId = pathNodeIds[idx + 1];
                return (
                  (id === edge.from && nextId === edge.to) ||
                  (id === edge.to && nextId === edge.from)
                );
              });

            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={nodeA.x}
                y1={nodeA.y}
                x2={nodeB.x}
                y2={nodeB.y}
                stroke={isEdgeInPath ? '#6366f1' : '#3f3f46'}
                strokeWidth={isEdgeInPath ? 5 : 2}
                strokeDasharray={isEdgeInPath ? '6 4' : undefined}
                strokeLinecap="round"
                opacity={isEdgeInPath ? 1 : 0.6}
              />
            );
          })}

          {/* Campus Nodes */}
          {graph.nodes.map(node => {
            const isStart = node.id === selectedStartId;
            const isEnd = node.id === selectedEndId;
            const isInPath = pathSet.has(node.id);

            let nodeColor = '#71717a';
            let circleRadius = 14;

            if (isStart) {
              nodeColor = '#10b981'; // emerald
              circleRadius = 18;
            } else if (isEnd) {
              nodeColor = '#f43f5e'; // rose
              circleRadius = 18;
            } else if (isInPath) {
              nodeColor = '#818cf8'; // indigo light
              circleRadius = 15;
            } else if (node.type === 'gate') {
              nodeColor = '#f59e0b';
            } else if (node.type === 'building') {
              nodeColor = '#3b82f6';
            }

            return (
              <g
                key={node.id}
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => onSelectNode?.(node.id)}
                role="button"
                tabIndex={0}
                aria-label={`${node.name} (${node.code})`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectNode?.(node.id);
                  }
                }}
              >
                {/* Glow ring for start/end */}
                {(isStart || isEnd) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={circleRadius + 10}
                    fill="none"
                    stroke={isStart ? '#10b981' : '#f43f5e'}
                    strokeWidth="2"
                    opacity="0.6"
                    className="animate-ping"
                  />
                )}

                {/* Base Node Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={circleRadius}
                  fill={nodeColor}
                  stroke="#18181b"
                  strokeWidth="3"
                />

                {/* Node Code Inside Circle */}
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {node.code.split('-')[0]}
                </text>

                {/* Name Label with backdrop pill */}
                <g pointerEvents="none">
                  <rect
                    x={node.x - 70}
                    y={node.y + (node.y > 650 ? -38 : 22)}
                    width="140"
                    height="20"
                    rx="4"
                    fill="#18181b"
                    fillOpacity="0.85"
                    stroke="#27272a"
                    strokeWidth="0.8"
                  />
                  <text
                    x={node.x}
                    y={node.y + (node.y > 650 ? -24 : 36)}
                    textAnchor="middle"
                    fill="#f4f4f5"
                    fontSize="10"
                    fontWeight="500"
                  >
                    {node.name.length > 20 ? `${node.name.slice(0, 18)}...` : node.name}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-[11px] text-zinc-500 mt-2 text-center">
        Tip: Click on any campus building above to quickly select it as your starting point or destination.
      </p>
    </div>
  );
}
