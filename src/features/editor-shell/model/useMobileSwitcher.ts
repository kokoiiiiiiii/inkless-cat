import type { RefObject } from 'react';

import { useMobileLayout } from './useMobileLayout';

type UseMobileSwitcherOptions = {
  isLargeScreen: boolean;
  mobileView: 'editor' | 'preview';
  setMobileView: (view: 'editor' | 'preview') => void;
  editorScrollContainerRef: RefObject<HTMLDivElement | null>;
  previewScrollContainerRef: RefObject<HTMLDivElement | null>;
};

export const useMobileSwitcher = ({
  isLargeScreen,
  mobileView,
  setMobileView,
  editorScrollContainerRef,
  previewScrollContainerRef,
}: UseMobileSwitcherOptions) => {
  const { showEditor, showPreview } = useMobileLayout({
    isLargeScreen,
    mobileView,
    setMobileView,
    editorScrollContainerRef,
    previewScrollContainerRef,
  });

  return {
    showEditor,
    showPreview,
  };
};

export type UseMobileSwitcherResult = ReturnType<typeof useMobileSwitcher>;
