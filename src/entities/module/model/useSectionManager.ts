import type { ResumeCustomSection } from '@entities/resume';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  getCustomSectionKey,
  isCustomSectionKey,
  sectionDefinitions,
  sectionOrder,
  type StandardSectionKey,
} from '../lib/sections';

export type SectionToggleHandler = (sectionKey: string, enabled: boolean) => void;
export type SectionReorderHandler = (order: string[]) => void;

export type DragPosition = 'before' | 'after' | null;
export type DragState = {
  active: string | null;
  over: string | null;
  position: DragPosition;
};

export type UseSectionManagerOptions = {
  activeSections?: string[];
  customSections?: ResumeCustomSection[];
  onToggleSection?: SectionToggleHandler;
  onReorderSections?: SectionReorderHandler;
};

type DragOverRect = { top: number; bottom: number; height: number };
type DragOverInfo = { y: number } | null;
type ScrollLock = () => void;

export type SectionManagerController = {
  resolvedActiveSections: string[];
  customList: ResumeCustomSection[];
  standardAllEnabled: boolean;
  standardAnyEnabled: boolean;
  displayOrder: string[];
  dragState: DragState;
  dragListRef: MutableRefObject<HTMLUListElement | null>;
  getSectionTitle: (key: string) => string;
  handleToggleAllStandard: (nextState: boolean) => void;
  handlePointerDown: (event: ReactPointerEvent<HTMLLIElement>, sectionKey: string) => void;
};

export const useSectionManager = ({
  activeSections,
  customSections,
  onToggleSection,
  onReorderSections,
}: UseSectionManagerOptions): SectionManagerController => {
  const resolvedActiveSections = useMemo(
    () => (Array.isArray(activeSections) ? activeSections : [...sectionOrder]),
    [activeSections],
  );

  const customList = useMemo<ResumeCustomSection[]>(
    () => (Array.isArray(customSections) ? customSections : []),
    [customSections],
  );

  const [dragState, setDragState] = useState<DragState>({
    active: null,
    over: null,
    position: null,
  });

  // 乐观顺序：在指针释放的一刻立刻采用新顺序渲染，直到外部 activeSections 同步完成
  const [optimisticOrder, setOptimisticOrder] = useState<string[] | null>(null);

  const dragStateRef = useRef<DragState>(dragState);
  const dragOverFrameRef = useRef<number | null>(null);
  const dragOverInfoRef = useRef<DragOverInfo>(null);
  const dragListRef = useRef<HTMLUListElement | null>(null);
  const lastProcessYRef = useRef<number | null>(null);
  const scrollLockRef = useRef<ScrollLock | null>(null);
  const pointerCaptureRef = useRef<{ element: HTMLElement | null; prevTouchAction: string }>({
    element: null,
    prevTouchAction: '',
  });
  const activePointerRef = useRef<{ id: number | null; type: string | null }>({
    id: null,
    type: null,
  });
  const pointerListenersRef = useRef<{
    move: ((event: PointerEvent) => void) | null;
    up: ((event: PointerEvent) => void) | null;
    cancel: ((event: PointerEvent) => void) | null;
  }>({
    move: null,
    up: null,
    cancel: null,
  });

  const updateDragState = useCallback(
    (valueOrUpdater: DragState | ((prev: DragState) => DragState)) => {
      setDragState((prev) => {
        const next =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (prevValue: DragState) => DragState)(prev)
            : valueOrUpdater;
        dragStateRef.current = next;
        return next;
      });
    },
    [],
  );

  const customTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const section of customList) {
      map.set(getCustomSectionKey(section.id), section.title || '未命名模块');
    }
    return map;
  }, [customList]);

  const getSectionTitle = useCallback(
    (key: string) => {
      if (sectionOrder.includes(key as StandardSectionKey)) {
        return sectionDefinitions[key as StandardSectionKey]?.title ?? key;
      }
      if (isCustomSectionKey(key)) {
        return customTitleMap.get(key) || '自定义模块';
      }
      return key;
    },
    [customTitleMap],
  );

  const standardAllEnabled = useMemo(
    () => sectionOrder.every((key) => resolvedActiveSections.includes(key)),
    [resolvedActiveSections],
  );

  const standardAnyEnabled = useMemo(
    () => sectionOrder.some((key) => resolvedActiveSections.includes(key)),
    [resolvedActiveSections],
  );

  const handleToggleAllStandard = useCallback(
    (nextState: boolean) => {
      if (typeof onToggleSection !== 'function') {
        return;
      }
      const activeSet = new Set(resolvedActiveSections);
      for (const sectionKey of sectionOrder) {
        const isActive = activeSet.has(sectionKey);
        if (nextState && !isActive) {
          onToggleSection(sectionKey, true);
        } else if (!nextState && isActive) {
          onToggleSection(sectionKey, false);
        }
      }
    },
    [onToggleSection, resolvedActiveSections],
  );

  const removePointerListeners = useCallback(() => {
    if (typeof globalThis === 'undefined') {
      return;
    }
    const { move, up, cancel } = pointerListenersRef.current;
    if (move) {
      globalThis.removeEventListener('pointermove', move);
    }
    if (up) {
      globalThis.removeEventListener('pointerup', up);
    }
    if (cancel) {
      globalThis.removeEventListener('pointercancel', cancel);
    }
    pointerListenersRef.current = { move: null, up: null, cancel: null };
    const capture = pointerCaptureRef.current;
    const pointerId = activePointerRef.current.id;
    if (capture.element && pointerId !== null) {
      try {
        capture.element.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
      capture.element.style.touchAction = capture.prevTouchAction;
    }
    pointerCaptureRef.current = { element: null, prevTouchAction: '' };
    activePointerRef.current = { id: null, type: null };
  }, []);

  const resetDragState = useCallback(() => {
    dragOverInfoRef.current = null;
    dragListRef.current = null;
    lastProcessYRef.current = null;
    removePointerListeners();
    const unlock = scrollLockRef.current;
    scrollLockRef.current = null;
    if (unlock) {
      unlock();
    }
    updateDragState({ active: null, over: null, position: null });
  }, [removePointerListeners, updateDragState]);

  const lockScroll = useCallback(() => {
    if (typeof document === 'undefined') {
      return;
    }
    if (scrollLockRef.current) {
      return;
    }
    const { body } = document;
    const html = document.documentElement;
    const prevBodyTouchAction = body.style.touchAction;
    const prevBodyUserSelect = body.style.userSelect;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    body.style.touchAction = 'none';
    body.style.userSelect = 'none';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    scrollLockRef.current = () => {
      body.style.touchAction = prevBodyTouchAction;
      body.style.userSelect = prevBodyUserSelect;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
    };
  }, []);

  const baseOrder = useMemo(() => {
    // 未拖拽时优先使用乐观顺序，否则回退到外部传入顺序
    if (!dragState.active && Array.isArray(optimisticOrder)) {
      return optimisticOrder;
    }
    return resolvedActiveSections;
  }, [dragState.active, optimisticOrder, resolvedActiveSections]);

  const displayOrder = useMemo(() => {
    const { active, over, position } = dragState;
    if (!active) {
      return baseOrder;
    }

    const order = Array.isArray(baseOrder) ? [...baseOrder] : [];
    const fromIndex = order.indexOf(active);
    if (fromIndex === -1) {
      return order;
    }

    const [activeSection] = order.splice(fromIndex, 1);

    if (!over) {
      const insertIndex =
        position === 'before'
          ? 0
          : position === 'after'
            ? order.length
            : Math.min(fromIndex, order.length);
      order.splice(insertIndex, 0, activeSection);
      return order;
    }

    if (over === active) {
      order.splice(Math.min(fromIndex, order.length), 0, activeSection);
      return order;
    }

    const targetIndex = order.indexOf(over);
    if (targetIndex === -1) {
      order.splice(Math.min(fromIndex, order.length), 0, activeSection);
      return order;
    }

    const insertIndex = targetIndex + (position === 'after' ? 1 : 0);
    order.splice(insertIndex, 0, activeSection);
    return order;
  }, [dragState, baseOrder]);

  const displayOrderRef = useRef<string[]>(displayOrder);

  useEffect(() => {
    displayOrderRef.current = displayOrder;
  }, [displayOrder]);

  const commitDragHover = useCallback(
    (nextOver: string | null, nextPosition: Exclude<DragPosition, null>) => {
      updateDragState((prev) => {
        if (!prev.active) {
          return prev;
        }
        if (nextOver === prev.active) {
          return prev;
        }
        if (prev.over === nextOver && prev.position === nextPosition) {
          return prev;
        }
        return { active: prev.active, over: nextOver, position: nextPosition };
      });
    },
    [updateDragState],
  );

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
  }, [commitDragHover]);

  const arraysShallowEqual = (a: readonly string[] | null | undefined, b: readonly string[] | null | undefined) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  const finalizePointerReorder = useCallback(() => {
    const { active } = dragStateRef.current;
    if (!active) {
      resetDragState();
      return;
    }
    const latestOrder = displayOrderRef.current;
    // 先本地乐观渲染，避免用户看到“回弹”
    setOptimisticOrder([...latestOrder]);
    onReorderSections?.([...latestOrder]);
    resetDragState();
  }, [onReorderSections, resetDragState]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLLIElement>, sectionKey: string) => {
      if (event.button !== 0) {
        return;
      }
      const target = event.currentTarget;
      if (!target) {
        return;
      }
      if (typeof target.setPointerCapture !== 'function') {
        return;
      }
      try {
        target.setPointerCapture(event.pointerId);
        pointerCaptureRef.current = {
          element: target,
          prevTouchAction: target.style.touchAction,
        };
        target.style.touchAction = 'none';
      } catch {
        return;
      }
      lockScroll();
      dragListRef.current = target.closest('ul');
      activePointerRef.current = { id: event.pointerId, type: event.pointerType };
      updateDragState({ active: sectionKey, over: null, position: null });

      const handleMove = (nativeEvent: PointerEvent) => {
        if (nativeEvent.pointerId !== activePointerRef.current.id) {
          return;
        }
        if (nativeEvent.cancelable) {
          nativeEvent.preventDefault();
        }
        dragOverInfoRef.current = { y: nativeEvent.clientY };
        if (dragOverFrameRef.current === null) {
          dragOverFrameRef.current = globalThis.requestAnimationFrame(processDragOver);
        }
      };

      const handleUp = (nativeEvent: PointerEvent) => {
        if (nativeEvent.pointerId !== activePointerRef.current.id) {
          return;
        }
        if (nativeEvent.cancelable) {
          nativeEvent.preventDefault();
        }
        removePointerListeners();
        finalizePointerReorder();
      };

      const handleCancel = (nativeEvent: PointerEvent) => {
        if (nativeEvent.pointerId !== activePointerRef.current.id) {
          return;
        }
        removePointerListeners();
        resetDragState();
      };

      pointerListenersRef.current = {
        move: handleMove,
        up: handleUp,
        cancel: handleCancel,
      };

      globalThis.addEventListener('pointermove', handleMove, { passive: false });
      globalThis.addEventListener('pointerup', handleUp, { passive: false });
      globalThis.addEventListener('pointercancel', handleCancel, { passive: false });
    },
    [
      finalizePointerReorder,
      lockScroll,
      processDragOver,
      removePointerListeners,
      resetDragState,
      updateDragState,
    ],
  );

  useEffect(() => {
    return () => {
      removePointerListeners();
      const unlock = scrollLockRef.current;
      scrollLockRef.current = null;
      if (unlock) {
        unlock();
      }
      if (dragOverFrameRef.current !== null && typeof globalThis !== 'undefined') {
        globalThis.cancelAnimationFrame(dragOverFrameRef.current);
      }
      dragOverFrameRef.current = null;
    };
  }, [removePointerListeners]);

  // 当外部 activeSections 同步到与乐观顺序一致时，清理乐观态
  useEffect(() => {
    if (!Array.isArray(optimisticOrder)) return;
    // 如果外部顺序与乐观顺序完全一致，清理乐观态
    if (arraysShallowEqual(optimisticOrder, resolvedActiveSections)) {
      setOptimisticOrder(null);
      return;
    }
    // 如果 keys 集合发生变化（例如开启/关闭模块），放弃乐观态，使用外部状态
    const keysChanged =
      optimisticOrder.length !== resolvedActiveSections.length ||
      !optimisticOrder.every((key) => resolvedActiveSections.includes(key));
    if (keysChanged) {
      setOptimisticOrder(null);
    }
  }, [optimisticOrder, resolvedActiveSections]);

  return {
    resolvedActiveSections,
    customList,
    standardAllEnabled,
    standardAnyEnabled,
    displayOrder,
    dragState,
    dragListRef,
    getSectionTitle,
    handleToggleAllStandard,
    handlePointerDown,
  };
};
