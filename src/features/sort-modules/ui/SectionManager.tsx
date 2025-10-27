import {
  getCustomSectionKey,
  isCustomSectionKey,
  sectionDefinitions,
  sectionOrder,
  type StandardSectionKey,
} from '@entities/module';
import type { ResumeCustomSection } from '@entities/resume';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SectionToggleHandler = (sectionKey: string, enabled: boolean) => void;
type SectionReorderHandler = (order: string[]) => void;

type DragPosition = 'before' | 'after' | null;
type DragState = {
  active: string | null;
  over: string | null;
  position: DragPosition;
};
type DragOverRect = { top: number; bottom: number; height: number };
type DragOverInfo = { y: number } | null;

type ScrollLock = () => void;

type SectionManagerProps = {
  activeSections?: string[];
  onToggleSection?: SectionToggleHandler;
  customSections?: ResumeCustomSection[];
  onAddCustomSection?: () => void;
  onRemoveCustomSection?: (sectionId: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
  onReorderSections?: SectionReorderHandler;
};

const dragItemClass =
  'relative flex cursor-grab select-none items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 text-sm shadow-sm transition hover:border-brand-400 hover:shadow-lg dark:border-slate-700/60 dark:bg-slate-900/60 transition-transform duration-150 ease-out';
const dragIndicatorClass = 'pointer-events-none absolute left-4 right-4 h-1 rounded-full bg-brand-500';

export const SectionManager = memo(
  ({
    activeSections,
    onToggleSection,
    customSections,
    onAddCustomSection,
    onRemoveCustomSection,
    isOpen,
    onToggle,
    onReorderSections,
  }: SectionManagerProps) => {
    const resolvedActiveSections = useMemo(
      () => (Array.isArray(activeSections) ? activeSections : [...sectionOrder]),
      [activeSections],
    );
    const customList = useMemo<ResumeCustomSection[]>(
      () => (Array.isArray(customSections) ? customSections : []),
      [customSections],
    );
    const open = typeof isOpen === 'boolean' ? isOpen : true;
    const [dragState, setDragState] = useState<DragState>({
      active: null,
      over: null,
      position: null,
    });
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
    }>({ move: null, up: null, cancel: null });

    const updateDragState = useCallback((valueOrUpdater: DragState | ((prev: DragState) => DragState)) => {
      setDragState((prev) => {
        const next =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (prevValue: DragState) => DragState)(prev)
            : valueOrUpdater;
        dragStateRef.current = next;
        return next;
      });
    }, []);

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

    const displayOrder = useMemo(() => {
      const { active, over, position } = dragState;
      if (!active) {
        return resolvedActiveSections;
      }

      const order = Array.isArray(resolvedActiveSections) ? [...resolvedActiveSections] : [];
      const fromIndex = order.indexOf(active);
      if (fromIndex === -1) {
        return order;
      }

      const [activeSection] = order.splice(fromIndex, 1);

      if (!over) {
        const insertIndex = position === 'before'
          ? 0
          : (position === 'after'
            ? order.length
            : Math.min(fromIndex, order.length));
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
    }, [dragState, resolvedActiveSections]);

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

      const y = info.y;
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

      const orderedKeys = displayOrder.filter((key) => key !== activeKey);
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
      commitDragHover(lastKey, 'after');
    }, [commitDragHover, displayOrder]);

    const applyReorder = useCallback(
      (targetKey: string | null, position: Exclude<DragPosition, null>) => {
        const activeKey = dragState.active;
        if (!activeKey) {
          resetDragState();
          return;
        }
        const currentOrder = Array.isArray(resolvedActiveSections)
          ? [...resolvedActiveSections]
          : [];

        const fromIndex = currentOrder.indexOf(activeKey);
        if (fromIndex === -1) {
          resetDragState();
          return;
        }
        currentOrder.splice(fromIndex, 1);

        if (!targetKey) {
          const insertIndex = position === 'before' ? 0 : currentOrder.length;
          currentOrder.splice(insertIndex, 0, activeKey);
          onReorderSections?.(currentOrder);
          resetDragState();
          return;
        }

        const targetIndex = currentOrder.indexOf(targetKey);
        if (targetIndex === -1) {
          resetDragState();
          return;
        }
        const insertIndex = targetIndex + (position === 'after' ? 1 : 0);
        currentOrder.splice(insertIndex, 0, activeKey);
        onReorderSections?.(currentOrder);
        resetDragState();
      },
      [dragState.active, onReorderSections, resetDragState, resolvedActiveSections],
    );

    const finalizePointerReorder = useCallback(() => {
      const { active, over, position } = dragStateRef.current;
      if (!active) {
        resetDragState();
        return;
      }
      const effectivePosition = position ?? 'after';
      applyReorder(over, effectivePosition);
    }, [applyReorder, resetDragState]);

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
      [finalizePointerReorder, lockScroll, processDragOver, removePointerListeners, resetDragState, updateDragState],
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

    return (
      <section className="space-y-3">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">模块管理</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              可自行开启/关闭模块，保持简历结构灵活，并支持拖动排序。
            </p>
          </div>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200 sm:w-auto"
            onClick={onToggle}
            aria-expanded={open}
          >
            {open ? '收起模块管理' : '展开模块管理'}
          </button>
        </header>
        {open && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">模块排序</h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">拖动进行排序</span>
              </div>
              {resolvedActiveSections.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  暂无启用的模块，先在下方开启需要的模块。
                </p>
              ) : (
                <ul ref={dragListRef} className="space-y-2">
                  {displayOrder.map((sectionKey) => {
                    const isDragging = dragState.active === sectionKey;
                    const isDragOver = dragState.over === sectionKey;
                    const indicatorPosition = isDragOver ? dragState.position : null;
                    const style = {
                      transform: isDragging ? 'scale(0.97)' : undefined,
                      marginTop: !isDragging && indicatorPosition === 'before' ? '18px' : undefined,
                      marginBottom: !isDragging && indicatorPosition === 'after' ? '18px' : undefined,
                      transition: 'transform 150ms ease, margin 150ms ease',
                      touchAction: 'none',
                    } as const;
                    return (
                      <li
                        key={sectionKey}
                        role="presentation"
                        draggable={false}
                        onPointerDown={(event) => handlePointerDown(event, sectionKey)}
                        className={`${dragItemClass} ${
                          isDragging ? 'cursor-grabbing opacity-60' : ''
                        } ${isDragOver ? 'border-brand-400 shadow-lg shadow-brand-500/10' : ''}`}
                        style={style}
                        data-section-key={sectionKey}
                        aria-label={`拖动调整${getSectionTitle(sectionKey)}的位置`}
                      >
                        {indicatorPosition === 'before' && (
                          <span className={`${dragIndicatorClass} top-0 -translate-y-1/2`} />
                        )}
                        {indicatorPosition === 'after' && (
                          <span className={`${dragIndicatorClass} bottom-0 translate-y-1/2`} />
                        )}
                        <div className="flex items-center gap-3">
                          <svg
                            aria-hidden="true"
                            width="12"
                            height="16"
                            viewBox="0 0 12 16"
                            className="text-slate-400 dark:text-slate-500"
                          >
                            <path
                              d="M0 2.5a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H1a1 1 0 0 1-1-1Zm0 11a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H1a1 1 0 0 1-1-1Zm1-6a1 1 0 0 0 0 2h10a1 1 0 1 0 0-2H1Z"
                              fill="currentColor"
                            />
                          </svg>
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {getSectionTitle(sectionKey)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">模块开关</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {sectionOrder.map((sectionKey) => {
                  const enabled = resolvedActiveSections.includes(sectionKey);
                  return (
                    <label key={sectionKey} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-800/70 dark:bg-slate-900/60 dark:hover:border-brand-400">
                      <div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {sectionDefinitions[sectionKey]?.title ?? sectionKey}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{enabled ? '已启用' : '未启用'}</p>
                      </div>
                      <button
                        type="button"
                        className={`inline-flex items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                          enabled
                            ? 'border-brand-500/60 bg-brand-500/10 text-brand-600 shadow-sm dark:border-brand-400/60 dark:bg-brand-400/20 dark:text-brand-200'
                            : 'border-slate-300/70 bg-white/80 text-slate-500 hover:border-brand-400 hover:text-brand-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-brand-400 dark:hover:text-brand-200'
                        }`}
                        onClick={() => onToggleSection?.(sectionKey, !enabled)}
                        aria-pressed={enabled}
                      >
                        {enabled ? '关闭' : '开启'}
                      </button>
                    </label>
                  );
                })}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">自定义模块</h4>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-brand-500/60 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-brand-400/60 dark:bg-brand-400/20 dark:text-brand-200"
                    onClick={onAddCustomSection}
                  >
                    添加自定义模块
                  </button>
                </div>
                {customList.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    暂无自定义模块，可点击上方按钮新增。
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {customList.map((section) => {
                      const key = getCustomSectionKey(section.id);
                      const enabled = resolvedActiveSections.includes(key);
                      return (
                        <li
                          key={section.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-800/70 dark:bg-slate-900/60 dark:hover:border-brand-400"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {section.title || '自定义模块'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {enabled ? '已启用' : '未启用'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className={`inline-flex items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                                enabled
                                  ? 'border-brand-500/60 bg-brand-500/10 text-brand-600 shadow-sm dark:border-brand-400/60 dark:bg-brand-400/20 dark:text-brand-200'
                                  : 'border-slate-300/70 bg-white/80 text-slate-500 hover:border-brand-400 hover:text-brand-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-brand-400 dark:hover:text-brand-200'
                              }`}
                              onClick={() => onToggleSection?.(key, !enabled)}
                              aria-pressed={enabled}
                            >
                              {enabled ? '关闭' : '开启'}
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center gap-1 rounded-full border border-transparent bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500 transition hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30"
                              onClick={() => onRemoveCustomSection?.(section.id)}
                            >
                              删除
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    );
  },
);

SectionManager.displayName = 'SectionManager';

export default SectionManager;
