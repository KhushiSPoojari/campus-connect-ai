import React from 'react';
import Link from 'next/link';
import { GraduationCap, ShieldCheck, CheckCircle2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-zinc-900 text-zinc-300 border-t border-zinc-800 mt-auto text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Overview */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-bold text-white text-base tracking-tight">
                Campus Connect AI
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Smart campus platform solving information access bottlenecks and classroom utilization inefficiencies through deterministic scheduling and AI document intelligence.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 pt-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Production-Quality Prototype</span>
            </div>
          </div>

          {/* Col 2: Student Services */}
          <div>
            <h3 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
              Student Modules
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/faculty" className="hover:text-white transition-colors">
                  Faculty Directory & Cabins
                </Link>
              </li>
              <li>
                <Link href="/classrooms" className="hover:text-white transition-colors">
                  Classroom Vacancy Matrix
                </Link>
              </li>
              <li>
                <Link href="/navigation" className="hover:text-white transition-colors">
                  Campus Navigation & Map
                </Link>
              </li>
              <li>
                <Link href="/notices" className="hover:text-white transition-colors">
                  Campus Notices & Events
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Space Optimization & Problem Statement */}
          <div>
            <h3 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
              Solved Problem Areas
            </h3>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex items-start gap-1.5">
                <span className="text-indigo-400 font-bold">1.</span>
                <span>Instant faculty office & live timetable availability check</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-indigo-400 font-bold">2.</span>
                <span>Real-time lecture hall vacancy to curb classroom under-utilization</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-indigo-400 font-bold">3.</span>
                <span>Turn-by-turn landmark navigation without external tracking</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Compliance & Prototype Notice */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
              Compliance & Safety
            </h3>
            <div className="bg-zinc-800/80 p-3 rounded-lg border border-zinc-700/60 text-xs text-zinc-400 space-y-1.5">
              <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Zero Privacy Leakage</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Uses 100% fictional demo faculty and classroom data. No real personal records are stored or exposed.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© 2026 Campus Connect AI. Built with Next.js, TypeScript & Tailwind CSS.</p>
          <div className="flex items-center gap-4">
            <span>WCAG 2.1 AA Compliant</span>
            <span>Deterministic Timetable Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
