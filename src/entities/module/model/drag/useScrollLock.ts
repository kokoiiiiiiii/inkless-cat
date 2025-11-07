import { useCallback, useEffect, useRef } from 'react';

type ScrollLockRestore = () => void;

export const useScrollLock = () => {
  const restoreRef = useRef<ScrollLockRestore | null>(null);

  const unlockScroll = useCallback(() => {
    const restore = restoreRef.current;
    if (restore) {
      restore();
      restoreRef.current = null;
    }
  }, []);

  const lockScroll = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (restoreRef.current) return;
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
    restoreRef.current = () => {
      body.style.touchAction = prevBodyTouchAction;
      body.style.userSelect = prevBodyUserSelect;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
    };
  }, []);

  useEffect(() => unlockScroll, [unlockScroll]);

  return { lockScroll, unlockScroll };
};
