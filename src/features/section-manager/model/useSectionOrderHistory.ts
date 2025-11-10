import { useCallback, useEffect, useMemo, useRef } from 'react';

import { arraysShallowEqual } from './drag/utils';
import type { SectionReorderHandler } from './useSectionManager';

type UseSectionOrderHistoryParams = {
  activeSections?: string[];
  onReorderSections?: SectionReorderHandler;
};

export const useSectionOrderHistory = ({
  activeSections,
  onReorderSections,
}: UseSectionOrderHistoryParams) => {
  const initialOrderRef = useRef<string[] | null>(null);
  const prevActiveRef = useRef<string[] | null>(null);
  const undoOrderRef = useRef<string[] | null>(null);

  useEffect(() => {
    if (!initialOrderRef.current && Array.isArray(activeSections) && activeSections.length > 0) {
      initialOrderRef.current = [...activeSections];
    }
  }, [activeSections]);

  useEffect(() => {
    const prev = prevActiveRef.current;
    if (Array.isArray(prev) && Array.isArray(activeSections)) {
      const sameLength = prev.length === activeSections.length;
      if (sameLength) {
        const prevSet = new Set(prev);
        const sameMembers = activeSections.every((k) => prevSet.has(k));
        if (sameMembers && !arraysShallowEqual(prev, activeSections)) {
          undoOrderRef.current = [...prev];
        } else if (!sameMembers) {
          undoOrderRef.current = null;
        }
      } else {
        undoOrderRef.current = null;
      }
    }
    prevActiveRef.current = Array.isArray(activeSections) ? [...activeSections] : null;
  }, [activeSections]);

  const targetRestoreOrder = useMemo(() => {
    const current = Array.isArray(activeSections) ? activeSections : [];
    const initial = Array.isArray(initialOrderRef.current) ? initialOrderRef.current : [];
    const initialSet = new Set(initial);
    const base = initial.filter((k) => current.includes(k));
    const extras = current.filter((k) => !initialSet.has(k));
    return [...base, ...extras];
  }, [activeSections]);

  const canRestore = useMemo(() => {
    const current = Array.isArray(activeSections) ? activeSections : [];
    return !arraysShallowEqual(current, targetRestoreOrder) && current.length > 0;
  }, [activeSections, targetRestoreOrder]);

  const handleRestore = useCallback(() => {
    const current = Array.isArray(activeSections) ? activeSections : [];
    if (!onReorderSections || current.length === 0) return;
    undoOrderRef.current = [...current];
    onReorderSections([...targetRestoreOrder]);
  }, [activeSections, onReorderSections, targetRestoreOrder]);

  const handleUndo = useCallback(() => {
    if (!onReorderSections) return;
    const undoOrder = undoOrderRef.current;
    if (!Array.isArray(undoOrder) || undoOrder.length === 0) return;
    onReorderSections([...undoOrder]);
    undoOrderRef.current = null;
  }, [onReorderSections]);

  const canUndo = Array.isArray(undoOrderRef.current) && undoOrderRef.current.length > 0;

  return {
    canRestore,
    canUndo,
    handleRestore,
    handleUndo,
  };
};
