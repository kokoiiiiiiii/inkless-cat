import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useRef } from 'react';

type PointerHandlers = {
  onMove?: (event: PointerEvent) => void;
  onUp?: (event: PointerEvent) => void;
  onCancel?: (event: PointerEvent) => void;
};

export const usePointerController = () => {
  const pointerCaptureRef = useRef<{ element: HTMLElement | null; prevTouchAction: string }>({
    element: null,
    prevTouchAction: '',
  });
  const pointerListenersRef = useRef<PointerHandlers>({
    onMove: undefined,
    onUp: undefined,
    onCancel: undefined,
  });
  const activePointerRef = useRef<{ id: number | null; type: string | null }>({
    id: null,
    type: null,
  });

  const detachListeners = useCallback(() => {
    if (typeof globalThis === 'undefined') {
      return;
    }
    const { onMove, onUp, onCancel } = pointerListenersRef.current;
    if (onMove) {
      globalThis.removeEventListener('pointermove', onMove);
    }
    if (onUp) {
      globalThis.removeEventListener('pointerup', onUp);
    }
    if (onCancel) {
      globalThis.removeEventListener('pointercancel', onCancel);
    }
    pointerListenersRef.current = { onMove: undefined, onUp: undefined, onCancel: undefined };
  }, []);

  const releasePointer = useCallback(() => {
    detachListeners();
    const capture = pointerCaptureRef.current;
    const pointerId = activePointerRef.current.id;
    if (capture.element && pointerId !== null) {
      try {
        capture.element.releasePointerCapture(pointerId);
      } catch {
        // ignore release failure
      }
      capture.element.style.touchAction = capture.prevTouchAction;
    }
    pointerCaptureRef.current = { element: null, prevTouchAction: '' };
    activePointerRef.current = { id: null, type: null };
  }, [detachListeners]);

  const capturePointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>, handlers: PointerHandlers) => {
      if (typeof globalThis === 'undefined') {
        return false;
      }
      const target = event.currentTarget;
      if (!target || typeof target.setPointerCapture !== 'function') {
        return false;
      }
      try {
        target.setPointerCapture(event.pointerId);
        pointerCaptureRef.current = {
          element: target,
          prevTouchAction: target.style.touchAction,
        };
        target.style.touchAction = 'none';
      } catch {
        return false;
      }
      activePointerRef.current = { id: event.pointerId, type: event.pointerType };
      pointerListenersRef.current = handlers;
      if (handlers.onMove) {
        globalThis.addEventListener('pointermove', handlers.onMove, { passive: false });
      }
      if (handlers.onUp) {
        globalThis.addEventListener('pointerup', handlers.onUp, { passive: false });
      }
      if (handlers.onCancel) {
        globalThis.addEventListener('pointercancel', handlers.onCancel, { passive: false });
      }
      return true;
    },
    [],
  );

  useEffect(() => releasePointer, [releasePointer]);

  return { capturePointer, releasePointer, activePointerRef };
};
