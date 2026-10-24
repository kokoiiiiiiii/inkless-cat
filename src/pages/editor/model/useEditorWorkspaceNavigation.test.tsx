import { act, renderHook } from '@testing-library/react';
import { type ReactNode, StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useEditorWorkspaceNavigation } from './useEditorWorkspaceNavigation';

afterEach(() => {
  vi.unstubAllGlobals();
});

const navigationCases = [
  { name: 'desktop editor reveal', isLargeScreen: true, action: 'navigateToEditor' },
  { name: 'mobile preview scroll', isLargeScreen: false, action: 'navigateToPreview' },
  { name: 'mobile editor scroll', isLargeScreen: false, action: 'returnToMobileEditor' },
] as const;

describe('useEditorWorkspaceNavigation animation-frame lifecycle', () => {
  it.each(navigationCases)('cancels a pending $name callback on unmount', (testCase) => {
    let nextFrameId = 0;
    const pendingFrames = new Map<number, FrameRequestCallback>();
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      nextFrameId += 1;
      pendingFrames.set(nextFrameId, callback);
      return nextFrameId;
    });
    const cancelFrame = vi.fn((frameId: number) => pendingFrames.delete(frameId));
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);

    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
    const { result, unmount } = renderHook(
      () =>
        useEditorWorkspaceNavigation({
          isLargeScreen: testCase.isLargeScreen,
          modulePanelOpen: false,
          templatePanelOpen: false,
          mobileView: 'editor',
          toggleWorkspacePanel: vi.fn(() => true),
          resetPanels: vi.fn(),
          setMobileView: vi.fn(),
          editorScrollContainerRef: { current: null },
          previewScrollContainerRef: { current: null },
        }),
      { wrapper },
    );

    act(() => {
      result.current[testCase.action]();
    });

    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(pendingFrames.size).toBe(1);
    unmount();
    expect(cancelFrame).toHaveBeenCalledTimes(1);
    expect(pendingFrames.size).toBe(0);
  });
});
