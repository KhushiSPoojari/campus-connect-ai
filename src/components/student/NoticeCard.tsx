import React from 'react';
import type { CampusEvent, EventCategory } from '@/types/event';
import { Badge } from '@/components/ui/Badge';
import { Calendar, MapPin, User, FileText, Users, Tag } from 'lucide-react';

interface NoticeCardProps {
  event: CampusEvent;
}

const CATEGORY_VARIANT_MAP: Record<EventCategory, 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  Academic: 'primary',
  Workshop: 'info',
  Cultural: 'warning',
  Sports: 'success',
  Placement: 'danger',
  Administrative: 'neutral',
};

export function NoticeCard({ event }: NoticeCardProps) {
  const variant = CATEGORY_VARIANT_MAP[event.category] || 'neutral';

  return (
    <article className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <Badge variant={variant}>
            <Tag className="w-3 h-3" />
            <span>{event.category}</span>
          </Badge>
          <span className="text-[11px] text-zinc-400 font-mono">
            {event.source}
          </span>
        </div>

        <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 mb-2 leading-snug">
          {event.title}
        </h3>

        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
          {event.summary}
        </p>

        <div className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{event.date}</span>
            {event.time && <span className="text-zinc-400">({event.time})</span>}
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">Coordinator: {event.coordinator}</span>
          </div>

          {event.targetAudience && (
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="text-[11px] text-zinc-400 truncate">
                Audience: {event.targetAudience}
              </span>
            </div>
          )}
        </div>
      </div>

      {event.rawDocumentName && (
        <div className="mt-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-zinc-400" />
          <span className="truncate font-mono">{event.rawDocumentName}</span>
        </div>
      )}
    </article>
  );
}
