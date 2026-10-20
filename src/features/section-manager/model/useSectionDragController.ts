import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { DragCompletion, DragState } from './drag/types';
import { useDragOrderSync } from './drag/useDragOrderSync';
import { usePointerController } from './drag/usePointerController';
import { useScrollLock } from './drag/useScrollLock';
import { arraysShallowEqual } from './drag/utils';
import type { SectionReorderHandler } from './useSectionManager';

type DragOverRect = { top: number; bottom: number; height: number };
type DragOverInfo = { y: number } | null;
type PendingDrag = {
  sectionKey: string;
  startX: number;
  startY: number;
  listNode: HTMLUListElement;
  activeSections: string[];
};

const DRAG_START_DISTANCE = 6;

type UseSectionDragControllerParams = {
  resolvedActiveSections: string[];
  onReorderSections?: SectionReorderHandler;
};

export const useSectionDragController = ({
  resolvedActiveSections,
  onReorderSections,
}: UseSectionDragControllerParams) => {
  const [dragState, setDragState] = useState<DragState>({
    active: null,
    over: null,
    position: null,
  });
  const [dragCompletion, setDragCompletion] = useState<DragCompletion | null>(null);

  const dragStateRef = useRef<DragState>(dragState);
  const dragOverFrameRef = useRef<number | null>(null);
  const dragOverInfoRef = useRef<DragOverInfo>(null);
  const dragListRef = useRef<HTMLUListElement | null>(null);
  const lastProcessYRef = useRef<number | null>(null);
  const pendingDragRef = useRef<PendingDrag | null>(null);
  const resolvedActiveSectionsRef = useRef(resolvedActiveSections);
  resolvedActiveSectionsRef.current = resolvedActiveSections;
  const dragStartedRef = useRef(false);

  const { lockScroll, unlockScroll } = useScrollLock();
  const { capturePointer, releasePointer, activePointerRef } = usePointerController();

  const updateDragState = useCallback(
    (valueOrUpdater: DragState | ((prev: DragState) => DragState)) => {
      const prev = dragStateRef.current;
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      dragStateRef.current = next;
      setDragState(next);
    },
    [],
  );

  const resetDragState = useCallback(() => {
    pendingDragRef.current = null;
    dragStartedRef.current = false;
    dragOverInfoRef.current = null;
    dragListRef.current = null;
    lastProcessYRef.current = null;
    if (dragOverFrameRef.current !== null && typeof globalThis !== 'undefined') {
      globalThis.cancelAnimationFrame(dragOverFrameRef.current);
    }
    dragOverFrameRef.current = null;
    releasePointer();
    unlockScroll();
    updateDragState({ active: null, over: null, position: null });
  }, [releasePointer, unlockScroll, updateDragState]);

  const { displayOrder, displayOrderRef, commitDragHover, finalizeOrder } = useDragOrderSync({
    resolvedActiveSections,
    dragState,
    dragStateRef,
    updateDragState,
    onReorderSections,
  });

  const processDragOver = useCallback(() => {
    dragOverFrameRef.current = null;
    const info = dragOverInfoRef.current;
    const listNode = dragListRef.current;
    if (!info || !listNode) {
      return;
    }

    const activeKey = dragStateRef.current.active;
    if (!activeKey) {
      return;
    }

    const { y } = info;
    const lastY = lastProcessYRef.current;
    if (lastY !== null && Math.abs(lastY - y) < 4) {
      return;
    }
    lastProcessYRef.current = y;
    const childNodes = [...listNode.querySelectorAll('li[data-section-key]')] as HTMLElement[];
    const rectMap = new Map<string, DragOverRect>();

    for (const node of childNodes) {
      const keyAttr = node.dataset.sectionKey;
      if (!keyAttr) {
        continue;
      }
      const rect = node.getBoundingClientRect();
      rectMap.set(keyAttr, { top: rect.top, bottom: rect.bottom, height: rect.height });
    }

    const orderedKeys = displayOrderRef.current.filter((key) => key !== activeKey);
    if (orderedKeys.length === 0) {
      commitDragHover(null, 'after');
      return;
    }

    const previousState = dragStateRef.current;

    for (const key of orderedKeys) {
      const rect = rectMap.get(key);
      if (!rect) {
        continue;
      }

      const upperThreshold = rect.top + Math.min(rect.height / 4, 24);
      const lowerThreshold = rect.bottom - Math.min(rect.height / 4, 24);

      if (y <= upperThreshold) {
        commitDragHover(key, 'before');
        return;
      }

      if (y < lowerThreshold) {
        const previousPosition = previousState.over === key ? previousState.position : null;
        const midpoint = rect.top + rect.height / 2;
        const nextPosition = previousPosition ?? (y < midpoint ? 'before' : 'after');
        commitDragHover(key, nextPosition === 'before' ? 'before' : 'after');
        return;
      }

      if (y < rect.bottom) {
        commitDragHover(key, 'after');
        return;
      }
    }

    const lastKey = orderedKeys.at(-1);
    commitDragHover(lastKey ?? null, 'after');
  }, [commitDragHover, displayOrderRef]);

  const requestHoverFrame = useCallback(() => {
    if (dragOverFrameRef.current !== null || typeof globalThis === 'undefined') {
      return;
    }
    dragOverFrameRef.current = globalThis.requestAnimationFrame(() => {
      processDragOver();
    });
  }, [processDragOver]);

  const finalizePointerReorder = useCallback(() => {
    if (dragOverFrameRef.current !== null && typeof globalThis !== 'undefined') {
      globalThis.cancelAnimationFrame(dragOverFrameRef.current);
      dragOverFrameRef.current = null;
      processDragOver();
    }
    const sectionKey = dragStateRef.current.active;
    const finalOrder = finalizeOrder();
    if (sectionKey && finalOrder) {
      const startIndex = resolvedActiveSections.indexOf(sectionKey);
      const nextIndex = finalOrder.indexOf(sectionKey);
      if (startIndex !== nextIndex && nextIndex !== -1) {
        setDragCompletion({ sectionKey, position: nextIndex + 1, total: finalOrder.length });
      }
    }
    resetDragState();
  }, [finalizeOrder, processDragOver, resetDragState, resolvedActiveSections]);

  useEffect(() => {
    const pendingDrag = pendingDragRef.current;
    if (pendingDrag && !arraysShallowEqual(pendingDrag.activeSections, resolvedActiveSections)) {
      resetDragState();
    }
  }, [resetDragState, resolvedActiveSections]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>, sectionKey: string) => {
      if (event.button !== 0 || event.isPrimary === false || activePointerRef.current.id !== null) {
        return;
      }
      const target = event.currentTarget;
      if (!target) {
        return;
      }

      const dragListNode = target.closest('ul');
      if (!dragListNode) return;

      const pendingDrag: PendingDrag = {
        sectionKey,
        startX: event.clientX,
        startY: event.clientY,
        listNode: dragListNode,
        activeSections: [...resolvedActiveSections],
      };

      const handleMove = (nativeEvent: PointerEvent) => {
        if (nativeEvent.pointerId !== activePointerRef.current.id) {
          return;
        }
        const pending = pendingDragRef.current;
        if (!pending) return;
        if (!arraysShallowEqual(pending.activeSections, resolvedActiveSectionsRef.current)) {
          resetDragState();
          return;
        }

        if (!dragStartedRef.current) {
          const distance = Math.hypot(
            nativeEvent.clientX - pending.startX,
            nativeEvent.clientY - pending.startY,
          );
          if (distance < DRAG_START_DISTANCE) return;
          dragStartedRef.current = true;
          dragListRef.current = pending.listNode;
          lockScroll();
          updateDragState({ active: pending.sectionKey, over: null, position: null });
        }

        if (nativeEvent.cancelable) {
          nativeEvent.preventDefault();
        }
        dragOverInfoRef.current = { y: nativeEvent.clientY };
        requestHoverFrame();
      };

      const handleUp = (nativeEvent: PointerEvent) => {
        if (nativeEvent.pointerId !== activePointerRef.current.id) {
          return;
        }
        const pending = pendingDragRef.current;
        if (
          pending &&
          !arraysShallowEqual(pending.activeSections, resolvedActiveSectionsRef.current)
        ) {
          resetDragState();
          return;
        }
        if (nativeEvent.cancelable) {
          nativeEvent.preventDefault();
        }
        if (dragStartedRef.current) {
          finalizePointerReorder();
        } else {
          resetDragState();
        }
      };

      const handleCancel = (nativeEvent: PointerEvent) => {
        if (nativeEvent.pointerId !== activePointerRef.current.id) {
          return;
        }
        resetDragState();
      };

      const handleLostCapture = (nativeEvent: PointerEvent) => {
        if (nativeEvent.pointerId !== activePointerRef.current.id) {
          return;
        }
        resetDragState();
      };

      const captured = capturePointer(
        event,
        {
          onMove: handleMove,
          onUp: handleUp,
          onCancel: handleCancel,
          onLostCapture: handleLostCapture,
        },
        dragListNode,
      );
      if (!captured) {
        return;
      }

      pendingDragRef.current = pendingDrag;
    },
    [
      activePointerRef,
      capturePointer,
      finalizePointerReorder,
      lockScroll,
      requestHoverFrame,
      resetDragState,
      updateDragState,
      resolvedActiveSections,
    ],
  );

  useEffect(() => {
    return () => {
      resetDragState();
    };
  }, [resetDragState]);

  return {
    displayOrder,
    dragState,
    dragCompletion,
    dragListRef,
    handlePointerDown,
  };
};

export type { DragCompletion, DragPosition, DragState } from './drag/types';
