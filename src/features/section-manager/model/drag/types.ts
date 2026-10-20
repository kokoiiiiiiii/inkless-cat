export type DragPosition = 'before' | 'after' | null;

export type DragState = {
  active: string | null;
  over: string | null;
  position: DragPosition;
};

export type DragCompletion = {
  sectionKey: string;
  position: number;
  total: number;
};
