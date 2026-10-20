import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSectionOrderHistory } from './useSectionOrderHistory';

const initialOrder = ['socials', 'experience', 'education'];

describe('useSectionOrderHistory', () => {
  it('consumes Undo so repeating it cannot replay the same sort', () => {
    const onReorderSections = vi.fn();
    const { result, rerender } = renderHook(
      ({ activeSections }) => useSectionOrderHistory({ activeSections, onReorderSections }),
      { initialProps: { activeSections: initialOrder } },
    );

    const sortedOrder = ['experience', 'socials', 'education'];
    act(() => {
      result.current.handleReorder(sortedOrder);
    });
    rerender({ activeSections: sortedOrder });

    expect(result.current.canUndo).toBe(true);
    let undoApplied = false;
    act(() => {
      undoApplied = result.current.handleUndo();
    });
    expect(undoApplied).toBe(true);
    rerender({ activeSections: initialOrder });

    expect(onReorderSections).toHaveBeenNthCalledWith(1, sortedOrder);
    expect(onReorderSections).toHaveBeenNthCalledWith(2, initialOrder);
    expect(result.current.canUndo).toBe(false);

    let repeatedUndoApplied = true;
    act(() => {
      repeatedUndoApplied = result.current.handleUndo();
    });
    expect(repeatedUndoApplied).toBe(false);
    expect(onReorderSections).toHaveBeenCalledTimes(2);
  });

  it('tracks a new one-step Undo after another reorder', () => {
    const onReorderSections = vi.fn();
    const { result, rerender } = renderHook(
      ({ activeSections }) => useSectionOrderHistory({ activeSections, onReorderSections }),
      { initialProps: { activeSections: initialOrder } },
    );

    const firstOrder = ['experience', 'socials', 'education'];
    const secondOrder = ['experience', 'education', 'socials'];
    act(() => {
      result.current.handleReorder(firstOrder);
    });
    rerender({ activeSections: firstOrder });
    act(() => {
      result.current.handleUndo();
    });
    rerender({ activeSections: initialOrder });

    act(() => {
      result.current.handleReorder(secondOrder);
    });
    rerender({ activeSections: secondOrder });
    act(() => {
      result.current.handleUndo();
    });
    rerender({ activeSections: initialOrder });

    expect(onReorderSections).toHaveBeenLastCalledWith(initialOrder);
    expect(result.current.canUndo).toBe(false);
  });

  it('makes Restore undoable and keeps the original order as the reset target', () => {
    const onReorderSections = vi.fn();
    const { result, rerender } = renderHook(
      ({ activeSections }) => useSectionOrderHistory({ activeSections, onReorderSections }),
      { initialProps: { activeSections: initialOrder } },
    );

    const sortedOrder = ['education', 'socials', 'experience'];
    act(() => {
      result.current.handleReorder(sortedOrder);
    });
    rerender({ activeSections: sortedOrder });

    expect(result.current.canRestore).toBe(true);
    let restoreApplied = false;
    act(() => {
      restoreApplied = result.current.handleRestore();
    });
    expect(restoreApplied).toBe(true);
    rerender({ activeSections: initialOrder });

    expect(onReorderSections).toHaveBeenLastCalledWith(initialOrder);
    expect(result.current.canUndo).toBe(true);
    act(() => {
      result.current.handleUndo();
    });
    rerender({ activeSections: sortedOrder });
    expect(result.current.canRestore).toBe(true);
  });

  it('clears Undo when membership changes and rejects duplicate section keys', () => {
    const onReorderSections = vi.fn();
    const { result, rerender } = renderHook(
      ({ activeSections }) => useSectionOrderHistory({ activeSections, onReorderSections }),
      { initialProps: { activeSections: initialOrder } },
    );

    act(() => {
      result.current.handleReorder(['experience', 'socials', 'education']);
    });
    expect(result.current.canUndo).toBe(true);
    act(() => {
      result.current.handleReorder(['socials', 'socials', 'education']);
    });
    expect(onReorderSections).toHaveBeenCalledTimes(1);

    rerender({ activeSections: ['experience', 'education'] });
    expect(result.current.canUndo).toBe(false);
  });
});
