import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useScrollSync } from './useScrollSync';

const ScrollSyncProbe = () => {
  const { editorScrollContainerRef, previewScrollContainerRef } = useScrollSync({
    activeSections: ['experience'],
  });

  return (
    <>
      <div ref={editorScrollContainerRef} data-testid="editor-scroll" />
      <div ref={previewScrollContainerRef} data-testid="preview-scroll" />
    </>
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useScrollSync', () => {
  it('removes the scroll listener and cancels its pending animation frame on unmount', () => {
    const requestAnimationFrame = vi.fn(() => 42);
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);

    const { unmount } = render(<ScrollSyncProbe />);
    const editor = screen.getByTestId('editor-scroll');
    const removeEventListener = vi.spyOn(editor, 'removeEventListener');

    fireEvent.scroll(editor);

    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });
});
