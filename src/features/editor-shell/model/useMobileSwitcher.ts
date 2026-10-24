import { useMobileLayout } from './useMobileLayout';

type UseMobileSwitcherOptions = {
  isLargeScreen: boolean;
  mobileView: 'editor' | 'preview';
  setMobileView: (view: 'editor' | 'preview') => void;
};

export const useMobileSwitcher = ({
  isLargeScreen,
  mobileView,
  setMobileView,
}: UseMobileSwitcherOptions) => {
  const { showEditor, showPreview } = useMobileLayout({
    isLargeScreen,
    mobileView,
    setMobileView,
  });

  return {
    showEditor,
    showPreview,
  };
};

export type UseMobileSwitcherResult = ReturnType<typeof useMobileSwitcher>;
