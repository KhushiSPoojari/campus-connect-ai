export type EventCategory = 'Academic' | 'Workshop' | 'Cultural' | 'Sports' | 'Placement' | 'Administrative';

export interface CampusEvent {
  id: string;
  title: string;
  date: string;          // e.g. "2026-10-15" or "Oct 15, 2026"
  time?: string;          // e.g. "10:00 AM - 01:00 PM"
  venue: string;         // e.g. "Auditorium A-1, Ramanujan Block"
  coordinator: string;   // e.g. "Prof. Anita Sen (Dept of CSE)"
  category: EventCategory;
  summary: string;
  source: 'Official Circular' | 'Gemini Extracted' | 'Manual';
  rawDocumentName?: string;
  targetAudience?: string; // e.g. "All B.Tech & M.Tech Students"
  status: 'Published' | 'Draft' | 'Archived';
  createdAt: string;
}

export interface ExtractedCircularData {
  eventTitle: string;
  date: string;
  time?: string;
  venue: string;
  coordinator: string;
  category: EventCategory;
  summary: string;
  targetAudience?: string;
}
