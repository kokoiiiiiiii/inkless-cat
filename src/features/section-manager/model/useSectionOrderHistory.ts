import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { arraysShallowEqual } from './drag/utils';
import type { SectionReorderHandler } from './useSectionManager';

type UseSectionOrderHistoryParams = {
  activeSections?: string[];
  onReorderSections?: SectionReorderHandler;
};

const sameMembers = (left: readonly string[], right: readonly string[]) => {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return (
    leftSet.size === rightSet.size &&
    leftSet.size === left.length &&
    rightSet.size === right.length &&
    right.every((key) => leftSet.has(key))
  );
};

export const useSectionOrderHistory = ({
  activeSections,
  onReorderSections,
}: UseSectionOrderHistoryParams) => {
  const currentOrderRef = useRef<string[]>(
    Array.isArray(activeSections) ? [...activeSections] : [],
  );
  const initialOrderRef = useRef<string[] | null>(null);
  const undoOrderRef = useRef<string[] | null>(null);
  const [undoOrder, setUndoOrder] = useState<string[] | null>(null);

  useEffect(() => {
    if (!initialOrderRef.current && Array.isArray(activeSections) && activeSections.length > 0) {
      initialOrderRef.current = [...activeSections];
    }
  }, [activeSections]);

  useEffect(() => {
    const nextOrder = Array.isArray(activeSections) ? [...activeSections] : [];
    const expectedOrder = currentOrderRef.current;
    if (!arraysShallowEqual(expectedOrder, nextOrder)) {
      // Parent changes such as toggling or importing modules invalidate the one-step history.
      undoOrderRef.current = null;
      setUndoOrder(null);
      currentOrderRef.current = nextOrder;
    }
  }, [activeSections]);

  const targetRestoreOrder = useMemo(() => {
    const current = Array.isArray(activeSections) ? activeSections : [];
    const initial = Array.isArray(initialOrderRef.current) ? initialOrderRef.current : [];
    const initialSet = new Set(initial);
    const base = initial.filter((key) => current.includes(key));
    const extras = current.filter((key) => !initialSet.has(key));
    return [...base, ...extras];
  }, [activeSections]);

  const canRestore = useMemo(() => {
    const current = Array.isArray(activeSections) ? activeSections : [];
    return (
      Boolean(onReorderSections) &&
      !arraysShallowEqual(current, targetRestoreOrder) &&
      current.length > 0
    );
  }, [activeSections, onReorderSections, targetRestoreOrder]);

  const handleReorder = useCallback<SectionReorderHandler>(
    (nextOrder) => {
      if (!onReorderSections) return;
      const currentOrder = currentOrderRef.current;
      if (
        nextOrder.length !== currentOrder.length ||
        !sameMembers(currentOrder, nextOrder) ||
        arraysShallowEqual(currentOrder, nextOrder)
      ) {
        return;
      }

      const previousOrder = [...currentOrder];
      const nextOrderSnapshot = [...nextOrder];
      undoOrderRef.current = previousOrder;
      currentOrderRef.current = nextOrderSnapshot;
      setUndoOrder(previousOrder);
      onReorderSections(nextOrderSnapshot);
    },
    [onReorderSections],
  );

  const handleRestore = useCallback(() => {
    if (!onReorderSections) return false;
    const currentOrder = currentOrderRef.current;
    if (
      arraysShallowEqual(currentOrder, targetRestoreOrder) ||
      !sameMembers(currentOrder, targetRestoreOrder)
    ) {
      return false;
    }
    handleReorder(targetRestoreOrder);
    return true;
  }, [handleReorder, onReorderSections, targetRestoreOrder]);

  const handleUndo = useCallback(() => {
    if (!onReorderSections) return false;
    const previousOrder = undoOrderRef.current;
    const currentOrder = currentOrderRef.current;
    if (!previousOrder || !sameMembers(currentOrder, previousOrder)) {
      undoOrderRef.current = null;
      setUndoOrder(null);
      return false;
    }

    const restoredOrder = [...previousOrder];
    undoOrderRef.current = null;
    currentOrderRef.current = restoredOrder;
    setUndoOrder(null);
    // Applying the snapshot directly consumes the one-step history instead of recording Undo as a new sort.
    onReorderSections(restoredOrder);
    return true;
  }, [onReorderSections]);

  const canUndo = Boolean(onReorderSections && undoOrder?.length);

  return {
    canRestore,
    canUndo,
    handleReorder,
    handleRestore,
    handleUndo,
  };
};
