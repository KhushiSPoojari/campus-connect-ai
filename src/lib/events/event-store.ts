import { INITIAL_EVENTS } from '@/data';
import type { CampusEvent } from '@/types/event';

export const EVENTS_STORAGE_KEY = 'campus-connect-published-events';
export const EVENTS_UPDATED_EVENT = 'campus-events-updated';

/**
 * Retrieves all campus events.
 * Combines default seeded events with any user-published events stored in the browser.
 */
export function getAllEvents(): CampusEvent[] {
  if (typeof window === 'undefined') {
    return INITIAL_EVENTS;
  }

  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) {
      return INITIAL_EVENTS;
    }

    const customEvents: CampusEvent[] = JSON.parse(raw);
    if (!Array.isArray(customEvents)) {
      return INITIAL_EVENTS;
    }

    // Merge custom events at the top, then seeded events (deduplicating by ID)
    const seenIds = new Set<string>();
    const combined: CampusEvent[] = [];

    for (const evt of customEvents) {
      if (evt && evt.id && !seenIds.has(evt.id)) {
        seenIds.add(evt.id);
        combined.push(evt);
      }
    }

    for (const evt of INITIAL_EVENTS) {
      if (evt && evt.id && !seenIds.has(evt.id)) {
        seenIds.add(evt.id);
        combined.push(evt);
      }
    }

    return combined;
  } catch (err) {
    console.warn('Failed to load published events from browser storage:', err);
    return INITIAL_EVENTS;
  }
}

/**
 * Saves a new published campus event to browser storage.
 */
export function saveEvent(
  eventData: Omit<CampusEvent, 'id' | 'createdAt' | 'status'> & {
    id?: string;
    status?: 'Published' | 'Draft' | 'Archived';
  }
): CampusEvent {
  const newEvent: CampusEvent = {
    ...eventData,
    id: eventData.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    status: eventData.status || 'Published',
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
      const existing: CampusEvent[] = raw ? JSON.parse(raw) : [];
      const updated = [newEvent, ...existing];
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));

      // Dispatch custom notification event for instant reactive UI updates
      window.dispatchEvent(new CustomEvent(EVENTS_UPDATED_EVENT, { detail: newEvent }));
    } catch (err) {
      console.error('Failed to save event to browser storage:', err);
    }
  }

  return newEvent;
}

/**
 * Removes a user-created event from browser storage.
 */
export function deleteEvent(id: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) return false;

    const existing: CampusEvent[] = JSON.parse(raw);
    const updated = existing.filter((e) => e.id !== id);
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent(EVENTS_UPDATED_EVENT, { detail: { deletedId: id } }));
    return true;
  } catch (err) {
    console.error('Failed to delete event from browser storage:', err);
    return false;
  }
}

/**
 * Synchronizes centrally persisted server events into local browser storage.
 */
export function syncServerEvents(serverEvents: CampusEvent[]): void {
  if (typeof window === 'undefined' || !Array.isArray(serverEvents)) return;

  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    const existing: CampusEvent[] = raw ? JSON.parse(raw) : [];
    const seenIds = new Set<string>();
    const merged: CampusEvent[] = [];

    // Prioritize central server events
    for (const evt of serverEvents) {
      if (evt && evt.id && !seenIds.has(evt.id)) {
        seenIds.add(evt.id);
        merged.push(evt);
      }
    }

    // Preserve any existing locally published events
    for (const evt of existing) {
      if (evt && evt.id && !seenIds.has(evt.id)) {
        seenIds.add(evt.id);
        merged.push(evt);
      }
    }

    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent(EVENTS_UPDATED_EVENT));
  } catch (err) {
    console.warn('Failed to sync server events to local storage:', err);
  }
}

/**
 * Safely migrates un-persisted local browser events to the central SQLite server database.
 * Deduplicates by title and date to prevent duplicate creation.
 */
export async function migrateLocalEventsToServer(): Promise<{
  migrated: number;
  skipped: number;
  errors: number;
}> {
  if (typeof window === 'undefined') {
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) return { migrated: 0, skipped: 0, errors: 0 };

    const localEvents: CampusEvent[] = JSON.parse(raw);
    if (!Array.isArray(localEvents) || localEvents.length === 0) {
      return { migrated: 0, skipped: 0, errors: 0 };
    }

    const res = await fetch('/api/events');
    if (!res.ok) return { migrated: 0, skipped: 0, errors: 0 };

    const { events: serverEvents } = await res.json();
    const serverKeys = new Set(
      serverEvents.map(
        (e: CampusEvent) => `${e.title.toLowerCase().trim()}|${e.date.toLowerCase().trim()}`
      )
    );

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const evt of localEvents) {
      const key = `${evt.title.toLowerCase().trim()}|${evt.date.toLowerCase().trim()}`;
      if (serverKeys.has(key)) {
        skipped++;
        continue;
      }

      try {
        const postRes = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventTitle: evt.title,
            date: evt.date,
            time: evt.time,
            venue: evt.venue,
            coordinator: evt.coordinator,
            category: evt.category,
            summary: evt.summary,
            targetAudience: evt.targetAudience,
            source: evt.source,
            rawDocumentName: evt.rawDocumentName,
          }),
        });

        if (postRes.ok) {
          migrated++;
          serverKeys.add(key);
        } else if (postRes.status === 409) {
          skipped++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    return { migrated, skipped, errors };
  } catch {
    return { migrated: 0, skipped: 0, errors: 0 };
  }
}
