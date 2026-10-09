'use client';

import { useSyncExternalStore, useCallback, useEffect } from 'react';
import {
  getAllEvents,
  saveEvent,
  deleteEvent,
  syncServerEvents,
  EVENTS_UPDATED_EVENT,
} from './event-store';
import type { CampusEvent } from '@/types/event';
import { INITIAL_EVENTS } from '@/data';

let cachedSnapshot: CampusEvent[] = INITIAL_EVENTS;
let hasInitialized = false;

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleUpdate = () => {
    cachedSnapshot = getAllEvents();
    callback();
  };

  if (!hasInitialized) {
    cachedSnapshot = getAllEvents();
    hasInitialized = true;
  }

  window.addEventListener(EVENTS_UPDATED_EVENT, handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    window.removeEventListener(EVENTS_UPDATED_EVENT, handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
}

function getSnapshot(): CampusEvent[] {
  if (typeof window === 'undefined') {
    return INITIAL_EVENTS;
  }
  if (!hasInitialized) {
    cachedSnapshot = getAllEvents();
    hasInitialized = true;
  }
  return cachedSnapshot;
}

function getServerSnapshot(): CampusEvent[] {
  return INITIAL_EVENTS;
}

export function useEvents() {
  const events = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Sync with central SQLite database on mount
  useEffect(() => {
    let active = true;

    fetch('/api/events')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.success && Array.isArray(data.events)) {
          syncServerEvents(data.events);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const refreshEvents = useCallback(() => {
    cachedSnapshot = getAllEvents();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENTS_UPDATED_EVENT));
    }
  }, []);

  const addEvent = useCallback((data: Parameters<typeof saveEvent>[0]) => {
    const saved = saveEvent(data);
    cachedSnapshot = getAllEvents();
    return saved;
  }, []);

  const removeEvent = useCallback((id: string) => {
    const result = deleteEvent(id);
    cachedSnapshot = getAllEvents();
    return result;
  }, []);

  return {
    events,
    isLoaded: true,
    refreshEvents,
    addEvent,
    removeEvent,
  };
}
