export interface Tutorial {
  id: string;
  name: string;
  videoFilename: string;
  hasSubtitle: boolean;
  hasTablature: boolean;
}

export interface Comment {
  id: number;
  tutorialId: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Annotation {
  id: number;
  tutorialId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  type: 'text' | 'underline' | 'highlight' | 'drawing';
  strokeData: string | null;
  color: string | null;
  createdAt: string;
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface Preference {
  tutorialId: string;
  difficultyLevel: string;
  favorite: boolean;
}

export interface Playlist {
  id: number;
  name: string;
  createdAt: string;
  tutorials: PlaylistTutorial[];
}

export interface PlaylistTutorial {
  tutorialId: string;
  tutorialName: string;
  ordinalPosition: number;
}
