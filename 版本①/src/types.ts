export interface Note {
  id: string;
  title: string;
  tags: string[];
  isRead: boolean;
  url: string;
  content?: string;
}

export interface Folder {
  id: string;
  name: string;
  notes: Note[];
  isExpanded?: boolean;
}

export type ViewMode = 'mindmap' | 'list';
export type AppScreen = 'splash' | 'canvas' | 'detail';
export type AuthScreen = 'login' | 'signup';
