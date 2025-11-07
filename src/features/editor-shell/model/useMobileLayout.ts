import type { RefObject } from 'react';
import { useEffect } from 'react';

import { isBrowser } from '../lib/storage';

type MobileView = 'editor' | 'preview';

type UseMobileLayoutParams = {
  isLargeScreen: boolean;
  mobileView: MobileView;
  setMobileView: (view: MobileView) => void;
  editorScrollContainerRef: RefObject<HTMLDivElement | null>;
  previewScrollContainerRef: RefObject<HTMLDivElement | null>;
};

export const useMobileLayout = ({
  isLargeScreen,
  mobileView,
  setMobileView,
  editorScrollContainerRef,
  previewScrollContainerRef,
}: UseMobileLayoutParams) => {
  useEffect(() => {
    if (isLargeScreen) {
      setMobileView('editor');
    }
  }, [isLargeScreen, setMobileView]);

  useEffect(() => {
    if (isLargeScreen) return;
    const target =
      mobileView === 'editor'
        ? editorScrollContainerRef.current
        : previewScrollContainerRef.current;
    target?.scrollTo({ top: 0, behavior: 'smooth' });
    if (isBrowser) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editorScrollContainerRef, previewScrollContainerRef, mobileView, isLargeScreen]);

  return {
    showEditor: isLargeScreen || mobileView === 'editor',
    showPreview: isLargeScreen || mobileView === 'preview',
  };
};
