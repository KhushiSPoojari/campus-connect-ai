'use client';

import React, { useState, useMemo } from 'react';
import { useEvents } from '@/lib/events/use-events';
import { NoticeCard } from '@/components/student/NoticeCard';
import type { EventCategory } from '@/types/event';
import { Bell, Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const CATEGORIES: { label: string; value: EventCategory | 'All' }[] = [
  { label: 'All Notices', value: 'All' },
  { label: 'Academic', value: 'Academic' },
  { label: 'Workshops & Hackathons', value: 'Workshop' },
  { label: 'Cultural', value: 'Cultural' },
  { label: 'Sports', value: 'Sports' },
  { label: 'Placement Drives', value: 'Placement' },
];

export default function NoticesPage() {
  const { events } = useEvents();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'All'>('All');

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Category filter
      if (selectedCategory !== 'All' && event.category !== selectedCategory) {
        return false;
      }

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(q);
        const matchesVenue = event.venue.toLowerCase().includes(q);
        const matchesCoordinator = event.coordinator.toLowerCase().includes(q);
        const matchesSummary = event.summary.toLowerCase().includes(q);
        if (!matchesTitle && !matchesVenue && !matchesCoordinator && !matchesSummary) {
          return false;
        }
      }

      return true;
    });
  }, [events, searchQuery, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Official Campus Notices & Events
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Verified campus announcements and bulletins. Extracted from official circulars and published for student access.
          </p>
        </div>

        <div className="text-xs bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 px-3 py-1.5 rounded-xl font-medium self-start md:self-auto">
          {events.length} Verified Notices Active
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notices by keyword, coordinator, or venue..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Notice Categories">
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                role="tab"
                aria-selected={isSelected}
                className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
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

        {/* Footer Summary */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <span>
            Showing <strong>{filteredEvents.length}</strong> of {events.length} notices
          </span>
          {(searchQuery || selectedCategory !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Notices Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => (
            <NoticeCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <Bell className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
          <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
            No notices match your criteria
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords or switching category filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
