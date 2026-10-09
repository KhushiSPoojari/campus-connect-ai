'use client';

import React, { useState } from 'react';
import { useCampusTime } from '@/lib/context/campus-time-context';
import { Clock, RotateCcw, Sparkles } from 'lucide-react';

const PRESET_SLOTS = [
  { label: 'Mon 09:30 (Morning Classes)', day: 'Monday', time: '09:30' },
  { label: 'Mon 11:15 (Office Hours & Free Rooms)', day: 'Monday', time: '11:15' },
  { label: 'Tue 14:15 (Afternoon Labs)', day: 'Tuesday', time: '14:15' },
  { label: 'Fri 16:15 (After-Class / Vacant)', day: 'Friday', time: '16:15' },
  { label: 'Sunday (Off-Duty Weekend)', day: 'Sunday', time: '11:00' },
];

export function CampusClockSelector() {
  const { day, timeStr, isSimulated, setDay, setTimeStr, resetToCurrentTime, setToDemoClassTime } = useCampusTime();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-indigo-900 text-indigo-50 border-b border-indigo-800 text-xs py-2 px-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Active clock readout */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-300" />
          <span className="font-semibold text-white">Campus Timetable Clock:</span>
          <span className="bg-indigo-800/80 px-2.5 py-0.5 rounded-md font-mono text-indigo-200 border border-indigo-700">
            {day}, {timeStr}
          </span>
          {isSimulated ? (
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">
              Simulated Demo Mode
            </span>
          ) : (
            <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">
              System Clock
            </span>
          )}
        </div>

        {/* Right: Quick simulation presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-indigo-300 hidden sm:inline">Test Scenarios:</span>
          {PRESET_SLOTS.slice(0, 3).map(preset => {
            const isActive = day === preset.day && timeStr === preset.time;
            return (
              <button
                key={preset.label}
                onClick={() => {
                  setDay(preset.day);
                  setTimeStr(preset.time);
                }}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-950 font-semibold shadow-xs'
                    : 'bg-indigo-800/60 hover:bg-indigo-800 text-indigo-200'
                }`}
              >
                {preset.label.split(' ')[0]} {preset.label.split(' ')[1]}
              </button>
            );
          })}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-indigo-200 hover:text-white underline ml-1 cursor-pointer"
          >
            {isOpen ? 'Close Custom' : 'Custom Time...'}
          </button>

          <button
            onClick={resetToCurrentTime}
            title="Reset to current local time"
            className="flex items-center gap-1 bg-indigo-800/60 hover:bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded cursor-pointer ml-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden md:inline">Real Clock</span>
          </button>
        </div>
      </div>

      {/* Expandable Custom Selector */}
      {isOpen && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-indigo-800/80 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="select-day" className="text-indigo-200">Day:</label>
            <select
              id="select-day"
              value={day}
              onChange={e => setDay(e.target.value)}
              className="bg-indigo-950 text-white border border-indigo-700 rounded px-2 py-1 text-xs"
            >
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="input-time" className="text-indigo-200">Time (24h):</label>
            <input
              id="input-time"
              type="time"
              value={timeStr}
              onChange={e => setTimeStr(e.target.value)}
              className="bg-indigo-950 text-white border border-indigo-700 rounded px-2 py-0.5 text-xs font-mono"
            />
          </div>

          <button
            onClick={setToDemoClassTime}
            className="flex items-center gap-1 text-indigo-200 hover:text-white cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            Reset to Mon 10:15 Class Rush
          </button>
        </div>
      )}
    </div>
  );
}
