import { useEffect } from 'react';

export const useUndoHotkey = (enabled: boolean, handler: () => void) => {
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = (target?.tagName || '').toLowerCase();
      const editable = target?.isContentEditable || tag === 'input' || tag === 'textarea';
      if (editable) return;
      const isUndo =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        (event.key === 'z' || event.key === 'Z');
      if (isUndo) {
        event.preventDefault();
        handler();
      }
    };
    globalThis.addEventListener('keydown', listener, { passive: false });
    return () => globalThis.removeEventListener('keydown', listener as EventListener);
  }, [enabled, handler]);
};
