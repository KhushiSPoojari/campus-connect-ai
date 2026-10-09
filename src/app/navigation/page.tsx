'use client';

import React, { useState, useMemo } from 'react';
import { CAMPUS_MAP_GRAPH } from '@/data';
import { findCampusRoute } from '@/lib/navigation/campus-navigation';
import { CampusMapViewer } from '@/components/student/CampusMapViewer';
import { NavigationRoutePanel } from '@/components/student/NavigationRoutePanel';
import { Compass } from 'lucide-react';

const POPULAR_ROUTES = [
  { label: 'Main Gate → Turing Tower', from: 'node-main-gate', to: 'node-turing' },
  { label: 'Library → Ramanujan Complex', from: 'node-library', to: 'node-ramanujan' },
  { label: 'Admin Block → Sports Arena', from: 'node-admin', to: 'node-sports' },
  { label: 'Turing Tower → Tesla Wing', from: 'node-turing', to: 'node-tesla' },
];

export default function NavigationPage() {
  const [startNodeId, setStartNodeId] = useState<string>('node-main-gate');
  const [endNodeId, setEndNodeId] = useState<string>('node-turing');

  // Compute route
  const routeResult = useMemo(() => {
    if (!startNodeId || !endNodeId) return null;
    return findCampusRoute(startNodeId, endNodeId, CAMPUS_MAP_GRAPH);
  }, [startNodeId, endNodeId]);

  const pathNodeIds = useMemo(() => {
    if (!routeResult) return [];
    return routeResult.pathNodes.map(n => n.id);
  }, [routeResult]);

  const handleSwap = () => {
    const temp = startNodeId;
    setStartNodeId(endNodeId);
    setEndNodeId(temp);
  };

  const handleNodeClick = (nodeId: string) => {
    // If start is empty, set start. Otherwise if destination is empty or different, set destination.
    if (!startNodeId) {
      setStartNodeId(nodeId);
    } else if (!endNodeId || endNodeId === startNodeId) {
      setEndNodeId(nodeId);
    } else {
      // Toggle destination
      setEndNodeId(nodeId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Compass className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Campus Wayfinder & Interactive Map
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Deterministic shortest-path route calculation across campus pathways without requiring external GPS or tracking.
          </p>
        </div>

        {/* Quick Route Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-400 hidden lg:inline">Popular Routes:</span>
          {POPULAR_ROUTES.map(preset => (
            <button
              key={preset.label}
              onClick={() => {
                setStartNodeId(preset.from);
                setEndNodeId(preset.to);
              }}
              className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Interactive Map (Left) & Route Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: SVG Campus Map (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <CampusMapViewer
            graph={CAMPUS_MAP_GRAPH}
            selectedStartId={startNodeId}
            selectedEndId={endNodeId}
            pathNodeIds={pathNodeIds}
            onSelectNode={handleNodeClick}
          />

          {/* Building Directory Guide */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              Campus Landmark Directory ({CAMPUS_MAP_GRAPH.nodes.length} Key Hubs)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {CAMPUS_MAP_GRAPH.nodes.map(node => (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node.id)}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    startNodeId === node.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold'
                      : endNodeId === node.id
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-semibold'
                      : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-zinc-400">{node.code}</span>
                    {startNodeId === node.id && <span className="text-[10px] text-emerald-600 font-bold">Start</span>}
                    {endNodeId === node.id && <span className="text-[10px] text-rose-600 font-bold">End</span>}
                  </div>
                  <p className="truncate font-medium mt-0.5">{node.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Route Directions Panel (5 cols) */}
        <div className="lg:col-span-5">
          <NavigationRoutePanel
            graph={CAMPUS_MAP_GRAPH}
            startNodeId={startNodeId}
            endNodeId={endNodeId}
            routeResult={routeResult}
            onStartChange={setStartNodeId}
            onEndChange={setEndNodeId}
            onSwap={handleSwap}
          />
        </div>
      </div>
    </div>
  );
}
