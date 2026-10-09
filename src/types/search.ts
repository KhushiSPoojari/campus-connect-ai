export type SearchEntityKind = 'Faculty' | 'Course' | 'Classroom' | 'Location' | 'Notice';

export interface SearchResultItem {
  id: string;
  kind: SearchEntityKind;
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  score: number;
  metadata: {
    roomOrLocation?: string;
    department?: string;
    code?: string;
    extra?: string;
  };
}
