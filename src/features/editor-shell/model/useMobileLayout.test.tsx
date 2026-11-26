import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMobileLayout } from './useMobileLayout';

const MobileLayoutProbe = ({
  mobileView,
  setMobileView,
}: {
  mobileView: 'editor' | 'preview';
  setMobileView: (view: 'editor' | 'preview') => void;
}) => {
  useMobileLayout({
    isLargeScreen: true,
    mobileView,
    setMobileView,
    editorScrollContainerRef: { current: null },
    previewScrollContainerRef: { current: null },
  });

  return null;
};

describe('useMobileLayout', () => {
  it('does not reset an already selected editor view on desktop', () => {
    const setMobileView = vi.fn();

    render(<MobileLayoutProbe mobileView="editor" setMobileView={setMobileView} />);

    expect(setMobileView).not.toHaveBeenCalled();
  });
});
