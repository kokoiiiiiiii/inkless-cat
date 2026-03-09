import { createId } from '@shared/lib';
import type { ReactNode } from 'react';
import { create } from 'zustand';

export type FeedbackTone = 'info' | 'success' | 'error';

export type FeedbackItem = {
  id: string;
  tone: FeedbackTone;
  title?: string;
  message: string;
};

type CreateFeedbackInput = Omit<FeedbackItem, 'id'> & {
  durationMs?: number;
};

type FeedbackStore = {
  items: FeedbackItem[];
  pushFeedback: (input: CreateFeedbackInput) => string;
  dismissFeedback: (id: string) => void;
  clearFeedback: () => void;
};

export const useFeedbackStore = create<FeedbackStore>()((set, get) => ({
  items: [],
  pushFeedback: ({ durationMs = 4000, ...input }) => {
    const id = createId('feedback');
    set((state) => ({
      items: [...state.items, { id, ...input }],
    }));
    if (durationMs > 0) {
      globalThis.setTimeout(() => {
        get().dismissFeedback(id);
      }, durationMs);
    }
    return id;
  },
  dismissFeedback: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  clearFeedback: () => set({ items: [] }),
}));

export const useFeedbackItems = () => useFeedbackStore((state) => state.items);

export const useFeedbackActions = () =>
  useFeedbackStore((state) => ({
    pushFeedback: state.pushFeedback,
    dismissFeedback: state.dismissFeedback,
    clearFeedback: state.clearFeedback,
  }));

type FeedbackProviderProps = {
  children: ReactNode;
};

export const FeedbackProvider = ({ children }: FeedbackProviderProps) => children;
