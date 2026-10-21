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

const orderForDragState = (baseOrder: string[], dragState: DragState) => {
  const { active, over, position } = dragState;
  if (!active) return baseOrder;

  const order = [...baseOrder];
  const fromIndex = order.indexOf(active);
  if (fromIndex === -1) return order;

  const [activeSection] = order.splice(fromIndex, 1);
  if (!activeSection) return order;

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

  order.splice(targetIndex + (position === 'after' ? 1 : 0), 0, activeSection);
  return order;
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
    return orderForDragState(baseOrder, dragState);
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
    if (!dragStateRef.current.active) return null;
    const latestOrder = orderForDragState(resolvedActiveSections, dragStateRef.current);
    displayOrderRef.current = latestOrder;
    setOptimisticOrder([...latestOrder]);
    onReorderSections?.([...latestOrder]);
    return [...latestOrder];
  }, [dragStateRef, onReorderSections, resolvedActiveSections]);

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
