import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SectionReorderHandler } from '../useSectionManager';
import type { DragPosition, DragState } from './types';
import { arraysShallowEqual } from './utils';

type UseDragOrderSyncParams = {
  resolvedActiveSections: string[];
  dragState: DragState;
  dragStateRef: React.MutableRefObject<DragState>;
  updateDragState: (valueOrUpdater: DragState | ((prev: DragState) => DragState)) => void;
  onReorderSections?: SectionReorderHandler;
};

export const useDragOrderSync = ({
  resolvedActiveSections,
  dragState,
  dragStateRef,
  updateDragState,
  onReorderSections,
}: UseDragOrderSyncParams) => {
  const [optimisticOrder, setOptimisticOrder] = useState<string[] | null>(null);

  const baseOrder = useMemo(() => {
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

  const finalizeOrder = useCallback(() => {
    const { active } = dragStateRef.current;
    if (!active) {
      return false;
    }
    const latestOrder = displayOrderRef.current;
    setOptimisticOrder([...latestOrder]);
    onReorderSections?.([...latestOrder]);
    return true;
  }, [dragStateRef, onReorderSections]);

  useEffect(() => {
    if (!Array.isArray(optimisticOrder)) return;
    if (arraysShallowEqual(optimisticOrder, resolvedActiveSections)) {
      setOptimisticOrder(null);
      return;
    }
    const keysChanged =
      optimisticOrder.length !== resolvedActiveSections.length ||
      !optimisticOrder.every((key) => resolvedActiveSections.includes(key));
    if (keysChanged) {
      setOptimisticOrder(null);
    }
  }, [optimisticOrder, resolvedActiveSections]);

  return {
    displayOrder,
    displayOrderRef,
    commitDragHover,
    finalizeOrder,
  };
};
