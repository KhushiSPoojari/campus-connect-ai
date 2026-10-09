'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Search, X, Users, BookOpen, DoorOpen, MapPin, Bell, ArrowRight, CornerDownLeft } from 'lucide-react';
import { searchCampus } from '@/lib/search/campus-search';
import type { SearchEntityKind } from '@/types/search';
import { Badge } from '@/components/ui/Badge';

const CATEGORY_FILTERS: { label: string; value: SearchEntityKind | 'All' }[] = [
  { label: 'All Results', value: 'All' },
  { label: 'Faculty', value: 'Faculty' },
  { label: 'Subjects', value: 'Course' },
  { label: 'Classrooms', value: 'Classroom' },
  { label: 'Locations & Offices', value: 'Location' },
  { label: 'Notices', value: 'Notice' },
];

const KIND_ICON_MAP: Record<SearchEntityKind, React.ComponentType<{ className?: string }>> = {
  Faculty: Users,
  Course: BookOpen,
  Classroom: DoorOpen,
  Location: MapPin,
  Notice: Bell,
};

const KIND_BADGE_VARIANT: Record<SearchEntityKind, 'primary' | 'info' | 'success' | 'warning' | 'neutral'> = {
  Faculty: 'primary',
  Course: 'info',
  Classroom: 'success',
  Location: 'warning',
  Notice: 'neutral',
};

interface OmniSearchProps {
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function OmniSearch({
  placeholder = 'Search faculty, subjects (e.g. CS301), classrooms (LH-101), offices, or notices...',
  autoFocus = false,
  className = '',
}: OmniSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedKind, setSelectedKind] = useState<SearchEntityKind | 'All'>('All');
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchCampus(query, {
      kindFilter: selectedKind === 'All' ? undefined : selectedKind,
      limit: 15,
    });
  }, [query, selectedKind]);

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <div className="absolute left-4 pointer-events-none text-zinc-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Smart campus search"
          className="w-full pl-12 pr-12 py-3.5 text-base bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            aria-label="Clear search query"
            className="absolute right-4 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1" role="tablist" aria-label="Search Categories">
        {CATEGORY_FILTERS.map(cat => {
          const isSelected = selectedKind === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedKind(cat.value)}
              role="tab"
              aria-selected={isSelected}
              className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Search Results Container */}
      {query.trim().length > 0 && (
        <div className="mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden animate-in fade-in duration-150">
          <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span>
              {results.length} result{results.length !== 1 ? 's' : ''} found
              {selectedKind !== 'All' ? ` in ${selectedKind}` : ''}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-400">
              <CornerDownLeft className="w-3 h-3" /> Select an item to navigate
            </span>
          </div>

          {results.length > 0 ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 max-h-[460px] overflow-y-auto">
              {results.map(item => {
                const IconComponent = KIND_ICON_MAP[item.kind] || Search;
                const variant = KIND_BADGE_VARIANT[item.kind] || 'neutral';

                return (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    href={item.href}
                    className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 pr-3">
                      <div className="mt-0.5 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {item.title}
                          </h4>
                          <Badge variant={variant}>{item.kind}</Badge>
                          {item.badge && item.badge !== item.kind && (
                            <span className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-700">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                          {item.subtitle}
                        </p>
                        {item.metadata.extra && (
                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                            {item.metadata.extra}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-zinc-300 group-hover:text-indigo-600 dark:text-zinc-600 dark:group-hover:text-indigo-400 shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                No matching results found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                Try searching for a course code like <span className="font-mono text-indigo-600">CS301</span>, professor name like <span className="font-mono text-indigo-600">Sarah</span>, room <span className="font-mono text-indigo-600">LH-101</span>, or switch category filters.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
