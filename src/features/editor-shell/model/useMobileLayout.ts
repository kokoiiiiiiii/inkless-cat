import { useEffect } from 'react';

type MobileView = 'editor' | 'preview';

type UseMobileLayoutParams = {
  isLargeScreen: boolean;
  mobileView: MobileView;
  setMobileView: (view: MobileView) => void;
};

export const useMobileLayout = ({
  isLargeScreen,
  mobileView,
  setMobileView,
}: UseMobileLayoutParams) => {
  useEffect(() => {
    if (isLargeScreen) {
      setMobileView('editor');
    }
  }, [isLargeScreen, setMobileView]);

  return {
    showEditor: isLargeScreen || mobileView === 'editor',
    showPreview: isLargeScreen || mobileView === 'preview',
  };
};
