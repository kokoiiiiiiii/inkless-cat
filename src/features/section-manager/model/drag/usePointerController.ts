import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useRef } from 'react';

type PointerHandlers = {
  onMove?: (event: PointerEvent) => void;
  onUp?: (event: PointerEvent) => void;
  onCancel?: (event: PointerEvent) => void;
  onLostCapture?: (event: PointerEvent) => void;
};

export const usePointerController = () => {
  const pointerCaptureRef = useRef<HTMLElement | null>(null);
  const pointerListenersRef = useRef<PointerHandlers>({
    onMove: undefined,
    onUp: undefined,
    onCancel: undefined,
    onLostCapture: undefined,
  });
  const activePointerRef = useRef<{ id: number | null; type: string | null }>({
    id: null,
    type: null,
  });

  const detachListeners = useCallback(() => {
    if (typeof globalThis === 'undefined') {
      return;
    }
    const { onMove, onUp, onCancel, onLostCapture } = pointerListenersRef.current;
    if (onMove) {
      globalThis.removeEventListener('pointermove', onMove);
    }
    if (onUp) {
      globalThis.removeEventListener('pointerup', onUp);
    }
    if (onCancel) {
      globalThis.removeEventListener('pointercancel', onCancel);
    }
    if (onLostCapture) {
      globalThis.removeEventListener('lostpointercapture', onLostCapture);
    }
    pointerListenersRef.current = {
      onMove: undefined,
      onUp: undefined,
      onCancel: undefined,
      onLostCapture: undefined,
    };
  }, []);

  const releasePointer = useCallback(() => {
    detachListeners();
    const captureElement = pointerCaptureRef.current;
    const pointerId = activePointerRef.current.id;
    pointerCaptureRef.current = null;
    activePointerRef.current = { id: null, type: null };
    if (captureElement && pointerId !== null) {
      try {
        captureElement.releasePointerCapture(pointerId);
      } catch {
        // ignore release failure
      }
    }
  }, [detachListeners]);

  const capturePointer = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      handlers: PointerHandlers,
      captureTarget?: HTMLElement,
    ) => {
      if (typeof globalThis === 'undefined') {
        return false;
      }
      if (activePointerRef.current.id !== null) {
        return false;
      }
      const target = captureTarget ?? event.currentTarget;
      if (!target || typeof target.setPointerCapture !== 'function') {
        return false;
      }
      try {
        target.setPointerCapture(event.pointerId);
        pointerCaptureRef.current = target;
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
      if (handlers.onLostCapture) {
        globalThis.addEventListener('lostpointercapture', handlers.onLostCapture);
      }
      return true;
    },
    [],
  );

  useEffect(() => releasePointer, [releasePointer]);

  return { capturePointer, releasePointer, activePointerRef };
};
