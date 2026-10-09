'use client';

import React from 'react';
import type { CampusNavigationGraph, NavigationRouteResult } from '@/types/navigation';
import { ArrowUpDown, Footprints, Clock, MapPin, Navigation, Info, AlertTriangle } from 'lucide-react';

interface NavigationRoutePanelProps {
  graph: CampusNavigationGraph;
  startNodeId: string;
  endNodeId: string;
  routeResult: NavigationRouteResult | null;
  onStartChange: (id: string) => void;
  onEndChange: (id: string) => void;
  onSwap: () => void;
}

export function NavigationRoutePanel({
  graph,
  startNodeId,
  endNodeId,
  routeResult,
  onStartChange,
  onEndChange,
  onSwap,
}: NavigationRoutePanelProps) {
  const isSameNode = startNodeId && endNodeId && startNodeId === endNodeId;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Campus Wayfinder
          </h2>
        </div>
        <span className="text-xs text-zinc-400">Offline Walking Graph</span>
      </div>

      {/* Selectors */}
      <div className="space-y-3">
        {/* Origin */}
        <div>
          <label htmlFor="select-start-node" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Starting Location:
          </label>
          <div className="relative">
            <div className="absolute left-3 top-3 text-emerald-500">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              id="select-start-node"
              value={startNodeId}
              onChange={e => onStartChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose start point --</option>
              {graph.nodes.map(node => (
                <option key={`start-${node.id}`} value={node.id}>
                  {node.name} ({node.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center -my-1">
          <button
            type="button"
            onClick={onSwap}
            disabled={!startNodeId || !endNodeId}
            aria-label="Swap starting location and destination"
            className="p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* Destination */}
        <div>
          <label htmlFor="select-end-node" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Destination:
          </label>
          <div className="relative">
            <div className="absolute left-3 top-3 text-rose-500">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              id="select-end-node"
              value={endNodeId}
              onChange={e => onEndChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose destination --</option>
              {graph.nodes.map(node => (
                <option key={`end-${node.id}`} value={node.id}>
                  {node.name} ({node.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Route Breakdown & Steps */}
      {routeResult ? (
        <div className="space-y-4 pt-2">
          {/* Summary Metric Pills */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-600 text-white">
                <Footprints className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 uppercase font-semibold">
                  Distance
                </span>
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {routeResult.totalDistanceMeters} meters
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-600 text-white">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 uppercase font-semibold">
                  Est. Walk Time
                </span>
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {routeResult.estimatedMinutes} min walk
                </p>
              </div>
            </div>
          </div>

          {/* Turn-by-Turn Directions */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
              Turn-by-Turn Walking Directions:
            </h3>

            {isSameNode ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-600" />
                <span>You have selected the same building for both start and destination.</span>
              </div>
            ) : (
              <ol className="space-y-2 relative border-l-2 border-indigo-200 dark:border-indigo-900 ml-3 pl-4">
                {routeResult.steps.map((step, idx) => (
                  <li key={idx} className="relative text-xs">
                    <span className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white dark:border-zinc-900"></span>
                    <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between text-zinc-400 text-[11px] mb-1">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          Step {idx + 1}: {step.fromNode.name} → {step.toNode.name}
                        </span>
                        <span className="font-mono">{step.distanceMeters}m</span>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-200">{step.instruction}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : startNodeId && endNodeId ? (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>No walkable pathway found between the selected locations.</span>
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
          <MapPin className="w-6 h-6 mx-auto mb-2 text-zinc-300" />
          <p>Select both a starting point and destination above to compute shortest walking route.</p>
        </div>
      )}
    </div>
  );
}
