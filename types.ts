export enum ElementType {
  TEXT = 'TEXT',
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
  LINE = 'LINE',
  XY_GRAPH = 'XY_GRAPH',
  XY_GRAPH_1Q = 'XY_GRAPH_1Q',
  IMAGE = 'IMAGE',
}

export interface CanvasElement {
  id: string;
  pageId: string; // Links element to a specific page
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // Degrees
  content?: string; // For text
  src?: string; // For images (Data URL)
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string; // For text weight
  color?: string; // For text color
  textAlign?: 'left' | 'center' | 'right';
  opacity?: number;
  padding?: number; // Internal text margin
}

export interface DragHandle {
  x: number;
  y: number;
  type: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | 'move';
}

export type SelectionState = {
  id: string | null;
  isEditingText: boolean;
};

export interface Page {
  id: string;
}

export interface ProjectMetadata {
  fileName: string;
  createdAt: number;
  lastModified: number;
}

export interface ProjectFile {
  version: string;
  metadata: ProjectMetadata;
  pages: Page[];
  elements: CanvasElement[];
  markupData: Record<string, string>;
  snapToGrid: boolean;
  scale?: number; // Optional, usually reset on load
}