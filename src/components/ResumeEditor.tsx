import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from 'react';
import { createId } from '../utils/id';
import PhotoUpload from './PhotoUpload';
import {
  extractCustomSectionId,
  getCustomSectionKey,
  isCustomSectionKey,
  sectionDefinitions,
  sectionOrder,
} from '../data/sections';
import type { StandardSectionKey } from '../data/sections';
import type {
  ResumeCustomField,
  ResumeCustomSection,
  ResumeCustomSectionMode,
  ResumeData,
  ResumePersonal,
  ResumePersonalExtra,
} from '../types/resume';

const labelMap: Record<string, string> = {
  label: '名称',
  url: '链接',
  company: '公司',
  role: '职位',
  location: '地点',
  startDate: '起始时间',
  endDate: '结束时间',
  school: '学校',
  degree: '学历',
  details: '详情',
  name: '名称',
  summary: '概述',
  link: '链接',
  title: '标题',
  items: '条目',
  issuer: '颁发机构',
  year: '年份',
  level: '水平',
};

const cleanListInput = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const createCustomField = (): ResumeCustomField => ({
  id: createId('custom-field'),
  label: '',
  value: '',
});

const cardClass =
  'rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm shadow-slate-200/60 transition hover:border-brand-400/50 hover:shadow-lg hover:shadow-brand-500/10 dark:border-slate-800/60 dark:bg-slate-900/60 dark:hover:border-brand-400/60 sm:p-5';

const labelClass =
  'flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-300';

const labelTextClass = 'text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-300/60 bg-white/80 px-3 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400';

const textareaClass =
  'w-full rounded-xl border border-slate-300/60 bg-white/80 px-3 py-3 text-sm leading-relaxed text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400';

const subtleButtonClass =
  'inline-flex items-center justify-center gap-1 rounded-full border border-dashed border-slate-300/70 px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-300';

const dangerButtonClass =
  'inline-flex items-center justify-center gap-1 rounded-full border border-transparent bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30';

const emptyStateClass =
  'rounded-2xl border border-dashed border-slate-300/70 bg-white/60 px-4 py-6 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-400';

const toggleBaseClass =
  'inline-flex items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300';
const toggleEnabledClass =
  'border-brand-500/60 bg-brand-500/10 text-brand-600 shadow-sm dark:border-brand-400/60 dark:bg-brand-400/20 dark:text-brand-200';
const toggleDisabledClass =
  'border-slate-300/70 bg-white/80 text-slate-500 hover:border-brand-400 hover:text-brand-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-brand-400 dark:hover:text-brand-200';

const addCustomButtonClass =
  'inline-flex items-center gap-1 rounded-full border border-brand-500/60 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-brand-400/60 dark:bg-brand-400/20 dark:text-brand-200';

const removeChipButtonClass =
  'inline-flex items-center justify-center rounded-full border border-transparent bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 transition hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30';

const dragItemClass =
  'relative flex cursor-grab select-none items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 text-sm shadow-sm transition hover:border-brand-400 hover:shadow-lg dark:border-slate-700/60 dark:bg-slate-900/60 transition-transform duration-150 ease-out';
const dragIndicatorClass = 'pointer-events-none absolute left-4 right-4 h-1 rounded-full bg-brand-500';

const customModeOptions: Array<{ value: ResumeCustomSectionMode; label: string }> = [
  { value: 'list', label: '列表条目' },
  { value: 'fields', label: '键值对' },
  { value: 'text', label: '自由文本' },
];

const defaultPersonalSettings: PersonalSettings = {
  showPhoto: true,
  photoSize: 120,
  photoPosition: 'right',
};

type SectionToggleHandler = (sectionKey: string, enabled: boolean) => void;
type SectionReorderHandler = (order: string[]) => void;
type SectionFocusHandler = (sectionKey: string, itemKey: string) => void;
type RegisterSectionRef = (sectionKey: string, node: HTMLElement | null) => void;

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

type PersonalSettings = {
  showPhoto: boolean;
  photoSize: number;
  photoPosition: 'left' | 'right';
};

type PersonalSectionProps = {
  personal: ResumePersonal;
  settings: PersonalSettings;
  onChange: (field: string, value: string) => void;
  notifyFocus: SectionFocusHandler;
  sectionRef?: (node: HTMLElement | null) => void;
  onExtraAdd: () => void;
  onExtraChange: (id: string, key: keyof ResumePersonalExtra, value: string) => void;
  onExtraRemove: (id: string) => void;
  onSettingChange: <Key extends keyof PersonalSettings>(
    key: Key,
    value: PersonalSettings[Key],
  ) => void;
};

type ResumeSectionProps = {
  sectionKey: StandardSectionKey;
  items: ResumeSectionItem[];
  onAddItem: (sectionKey: StandardSectionKey) => void;
  onRemoveItem: (sectionKey: StandardSectionKey, index: number) => void;
  onFieldChange: (
    sectionKey: StandardSectionKey,
    index: number,
    field: string,
    value: string,
  ) => void;
  onListChange: (
    sectionKey: StandardSectionKey,
    index: number,
    field: string,
    value: string,
  ) => void;
  notifyFocus: SectionFocusHandler;
  sectionRef?: (node: HTMLElement | null) => void;
};

type CustomSectionEditorProps = {
  sectionKey: string;
  section: ResumeCustomSection;
  onTitleChange: (sectionId: string, value: string) => void;
  onModeChange: (sectionId: string, mode: ResumeCustomSection['mode']) => void;
  onItemsChange: (sectionId: string, value: string) => void;
  onFieldChange: (
    sectionId: string,
    fieldId: string,
    key: keyof ResumeCustomField,
    value: string,
  ) => void;
  onFieldAdd: (sectionId: string) => void;
  onFieldRemove: (sectionId: string, fieldId: string) => void;
  onTextChange: (sectionId: string, value: string) => void;
  onRemove: (sectionId: string) => void;
  notifyFocus: SectionFocusHandler;
  sectionRef?: (node: HTMLElement | null) => void;
};

type ResumeEditorProps = {
  resume: ResumeData;
  onChange: (updater: (draft: ResumeData) => void) => void;
  onFieldFocus?: SectionFocusHandler;
  activeSections: string[];
  onSectionToggle: SectionToggleHandler;
  onSectionReorder: SectionReorderHandler;
  customSections: ResumeCustomSection[];
  onAddCustomSection: () => void;
  onRemoveCustomSection: (sectionId: string) => void;
  modulePanelOpen: boolean;
  onToggleModulePanel: () => void;
  registerSectionRef?: RegisterSectionRef;
};

const SectionManager = memo(
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
    const activePointerRef = useRef<{ id: number | null; type: string | null }>({ id: null, type: null });
    const pointerListenersRef = useRef<{
      move: ((event: PointerEvent) => void) | null;
      up: ((event: PointerEvent) => void) | null;
      cancel: ((event: PointerEvent) => void) | null;
    }>({ move: null, up: null, cancel: null });

    const updateDragState = useCallback((valueOrUpdater: DragState | ((prev: DragState) => DragState)) => {
      setDragState((prev) => {
        const next = typeof valueOrUpdater === 'function'
          ? (valueOrUpdater as (prevValue: DragState) => DragState)(prev)
          : valueOrUpdater;
        dragStateRef.current = next;
        return next;
      });
    }, []);

    const customTitleMap = useMemo(() => {
      const map = new Map<string, string>();
      customList.forEach((section) => {
        map.set(getCustomSectionKey(section.id), section.title || '未命名模块');
      });
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
      if (typeof window === 'undefined') {
        return;
      }
      const { move, up, cancel } = pointerListenersRef.current;
      if (move) {
        window.removeEventListener('pointermove', move);
      }
      if (up) {
        window.removeEventListener('pointerup', up);
      }
      if (cancel) {
        window.removeEventListener('pointercancel', cancel);
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

      const order = Array.isArray(resolvedActiveSections)
        ? [...resolvedActiveSections]
        : [];
      const fromIndex = order.indexOf(active);
      if (fromIndex === -1) {
        return order;
      }

      const [activeSection] = order.splice(fromIndex, 1);

      if (!over) {
        const insertIndex = position === 'before'
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
      const childNodes = Array.from(listNode.querySelectorAll('li[data-section-key]')) as HTMLElement[];
      const rectMap = new Map<string, DragOverRect>();

      childNodes.forEach((node) => {
        const keyAttr = node.getAttribute('data-section-key');
        if (!keyAttr) {
          return;
        }
        const rect = node.getBoundingClientRect();
        rectMap.set(keyAttr, { top: rect.top, bottom: rect.bottom, height: rect.height });
      });

      const orderedKeys = displayOrder.filter((key) => key !== activeKey);
      if (orderedKeys.length === 0) {
        commitDragHover(null, 'after');
        return;
      }

      const previousState = dragStateRef.current;

      for (let index = 0; index < orderedKeys.length; index += 1) {
        const key = orderedKeys[index];
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

      const lastKey = orderedKeys[orderedKeys.length - 1];
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
        let insertIndex = currentOrder.length;
        if (targetKey) {
          const baseIndex = currentOrder.indexOf(targetKey);
          if (baseIndex === -1) {
            resetDragState();
            return;
          }
          insertIndex = baseIndex + (position === 'after' ? 1 : 0);
        }
        currentOrder.splice(fromIndex, 1);
        if (fromIndex < insertIndex) {
          insertIndex -= 1;
        }
        currentOrder.splice(insertIndex, 0, activeKey);
        if (typeof onReorderSections === 'function') {
          onReorderSections(currentOrder);
        }
        resetDragState();
      },
      [dragState, resolvedActiveSections, onReorderSections, resetDragState],
    );

    const finalizePointerReorder = useCallback(() => {
      const state = dragStateRef.current;
      if (!state.active) {
        resetDragState();
        return;
      }
      if (!state.over && !state.position) {
        resetDragState();
        return;
      }
      if (state.over) {
        applyReorder(state.over, state.position || 'before');
      } else {
        applyReorder(null, state.position || 'after');
      }
    }, [applyReorder, resetDragState]);

    const handlePointerDown = useCallback(
      (event: ReactPointerEvent<HTMLLIElement>, key: string) => {
        if (event.pointerType === 'mouse' && event.button !== 0) {
          return;
        }
        const target = event.currentTarget as HTMLElement | null;
        const listNode = target?.parentElement as HTMLUListElement | null;
        if (!target || !listNode) {
          return;
        }

        event.stopPropagation();
        if (event.cancelable) {
          event.preventDefault();
        }

        removePointerListeners();

        pointerCaptureRef.current = { element: target, prevTouchAction: target.style.touchAction || '' };
        target.style.touchAction = 'none';
        activePointerRef.current = { id: event.pointerId, type: event.pointerType };
        dragListRef.current = listNode;

        try {
          target.setPointerCapture(event.pointerId);
        } catch {
          // Some browsers might throw if capture is not supported; ignore.
        }

        if (event.pointerType === 'touch' || event.pointerType === 'pen') {
          lockScroll();
        }

        dragOverInfoRef.current = { y: event.clientY };
        lastProcessYRef.current = null;
        updateDragState({ active: key, over: null, position: null });

        if (typeof window !== 'undefined') {
          const handleMove = (nativeEvent: PointerEvent) => {
            if (nativeEvent.pointerId !== activePointerRef.current.id) {
              return;
            }
            if (nativeEvent.cancelable) {
              nativeEvent.preventDefault();
            }
            dragOverInfoRef.current = { y: nativeEvent.clientY };
            lastProcessYRef.current = null;
            if (dragOverFrameRef.current === null) {
              dragOverFrameRef.current = window.requestAnimationFrame(processDragOver);
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

          window.addEventListener('pointermove', handleMove, { passive: false });
          window.addEventListener('pointerup', handleUp, { passive: false });
          window.addEventListener('pointercancel', handleCancel, { passive: false });
        }
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
        if (dragOverFrameRef.current !== null && typeof window !== 'undefined') {
          window.cancelAnimationFrame(dragOverFrameRef.current);
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
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {sectionOrder.map((sectionKey) => {
                  const enabled = resolvedActiveSections.includes(sectionKey);
                  return (
                    <button
                      key={sectionKey}
                      type="button"
                      className={`${toggleBaseClass} ${
                        enabled ? toggleEnabledClass : toggleDisabledClass
                      }`}
                      onClick={() => onToggleSection?.(sectionKey, !enabled)}
                      aria-pressed={enabled}
                    >
                      <span>{sectionDefinitions[sectionKey]?.title ?? sectionKey}</span>
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm dark:bg-slate-800/70 dark:text-slate-300">
                        {enabled ? '启用' : '关闭'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-3 rounded-2xl border border-dashed border-slate-300/60 bg-white/70 p-3 dark:border-slate-700/60 dark:bg-slate-900/60">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">自定义模块</h4>
                  <button
                    type="button"
                    className={addCustomButtonClass}
                    onClick={() => onAddCustomSection?.()}
                  >
                    新增模块
                  </button>
                </div>
                {customList.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    暂无自定义模块，点击“新增模块”创建专属版块。
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {customList.map((section) => {
                      const key = getCustomSectionKey(section.id);
                      const enabled = resolvedActiveSections.includes(key);
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <button
                            type="button"
                            className={`${toggleBaseClass} ${
                              enabled ? toggleEnabledClass : toggleDisabledClass
                            }`}
                            onClick={() => onToggleSection?.(key, !enabled)}
                            aria-pressed={enabled}
                          >
                            <span>{section.title || '未命名模块'}</span>
                            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm dark:bg-slate-800/70 dark:text-slate-300">
                              {enabled ? '启用' : '关闭'}
                            </span>
                          </button>
                          <button
                            type="button"
                            className={removeChipButtonClass}
                            onClick={() => {
                              const shouldRemove =
                                typeof window === 'undefined' ||
                                window.confirm(
                                  `确定删除模块“${section.title || '未命名模块'}”及其内容吗？`,
                                );
                              if (shouldRemove) {
                                onRemoveCustomSection?.(section.id);
                              }
                            }}
                          >
                            删除
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    );
  },
);

const PersonalSection = memo(
  ({
    personal,
    settings,
    onChange,
    notifyFocus,
    sectionRef,
    onExtraAdd,
    onExtraChange,
    onExtraRemove,
    onSettingChange,
  }: PersonalSectionProps) => {
    const extras = Array.isArray(personal.extras) ? personal.extras : [];
    const showPhoto = settings.showPhoto !== false;
    const photoSize = Math.max(80, Math.min(settings.photoSize ?? 120, 260));
    const photoPosition = settings.photoPosition === 'left' ? 'left' : 'right';

    return (
      <section ref={sectionRef} className="space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">个人信息</h3>
        </header>
        <div className={cardClass}>
          <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-8">
            <div className="space-y-4">
              <label className={labelClass}>
                <span className={labelTextClass}>姓名</span>
                <input
                  className={inputClass}
                  type="text"
                  value={personal.fullName}
                  placeholder="张三"
                  onChange={(event) => onChange('fullName', event.target.value)}
                  onFocus={() => notifyFocus('personal', 'personal')}
                />
              </label>
              <label className={labelClass}>
                <span className={labelTextClass}>头衔</span>
                <input
                  className={inputClass}
                  type="text"
                  value={personal.title}
                  placeholder="前端工程师 / 产品技术负责人"
                  onChange={(event) => onChange('title', event.target.value)}
                  onFocus={() => notifyFocus('personal', 'personal')}
                />
              </label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className={labelClass}>
                  <span className={labelTextClass}>邮箱</span>
                  <input
                    className={inputClass}
                    type="email"
                    value={personal.email}
                    placeholder="you@example.com"
                    onChange={(event) => onChange('email', event.target.value)}
                    onFocus={() => notifyFocus('personal', 'personal')}
                  />
                </label>
                <label className={labelClass}>
                  <span className={labelTextClass}>电话</span>
                  <input
                    className={inputClass}
                    type="text"
                    value={personal.phone}
                    placeholder="+86 138 0000 0000"
                    onChange={(event) => onChange('phone', event.target.value)}
                    onFocus={() => notifyFocus('personal', 'personal')}
                  />
                </label>
              </div>
              <label className={labelClass}>
                <span className={labelTextClass}>所在地</span>
                <input
                  className={inputClass}
                  type="text"
                  value={personal.location}
                  placeholder="上海 / 远程"
                  onChange={(event) => onChange('location', event.target.value)}
                  onFocus={() => notifyFocus('personal', 'personal')}
                />
              </label>
              <label className={labelClass}>
                <span className={labelTextClass}>个人简介</span>
                <textarea
                  className={textareaClass}
                  rows={4}
                  value={personal.summary}
                  placeholder="用 2-3 句话突出你的价值、成果与优势"
                  onChange={(event) => onChange('summary', event.target.value)}
                  onFocus={() => notifyFocus('summary', 'summary')}
                />
              </label>
            </div>
            <div className="flex flex-col gap-4 lg:w-[260px] lg:flex-shrink-0">
              {showPhoto && (
                <div className="self-center lg:self-stretch">
                  <PhotoUpload
                    value={personal.photo}
                    onChange={(value) => onChange('photo', value)}
                    onFocus={() => notifyFocus('personal', 'personal')}
                    size={photoSize}
                  />
                </div>
              )}
              <div className="w-full space-y-3 rounded-2xl border border-slate-200/60 bg-white/80 p-4 text-left text-xs font-semibold text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-400">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>显示照片</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-500"
                    checked={showPhoto}
                    onChange={(event) => onSettingChange('showPhoto', event.target.checked)}
                  />
                </div>
                <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  照片尺寸 ({photoSize}px)
                  <input
                    type="range"
                    min="96"
                    max="240"
                    step="4"
                    value={photoSize}
                    onChange={(event) => onSettingChange('photoSize', Number(event.target.value))}
                  />
                </label>
                <div className="space-y-2">
                  <span>照片位置</span>
                  <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="photo-position"
                        value="left"
                        checked={photoPosition === 'left'}
                        onChange={() => onSettingChange('photoPosition', 'left')}
                      />
                      左侧
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="photo-position"
                        value="right"
                        checked={photoPosition === 'right'}
                        onChange={() => onSettingChange('photoPosition', 'right')}
                      />
                      右侧
                    </label>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/70 p-4 text-[11px] leading-relaxed text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/50 dark:text-slate-300">
                <h4 className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-200">
                  照片小贴士
                </h4>
                <ul className="space-y-2">
                  <li>选择光线均匀、背景干净的正面照片，更易传递专业感。</li>
                  <li>保持头肩居中并留出适度空白，避免裁剪过多造成失真。</li>
                  <li>服装与背景配色与简历主题相呼应，整体视觉更协调。</li>
                </ul>
              </div>
            </div>
            <div className="space-y-3 lg:col-span-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className={labelTextClass}>补充信息</span>
                <button
                  type="button"
                  className={subtleButtonClass}
                  onClick={onExtraAdd}
                >
                  添加
                </button>
              </div>
              {extras.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300/60 bg-white/60 px-3 py-4 text-xs text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-400">
                  暂无补充信息，点击“添加”可自定义标签与内容。
                </p>
              ) : (
                <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  {extras.map((extra) => (
                    <div
                      key={extra.id}
                      className="rounded-xl border border-slate-200/60 bg-white/80 p-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60"
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className={labelClass}>
                          <span className={labelTextClass}>标签</span>
                          <input
                            className={inputClass}
                            type="text"
                            value={extra.label || ''}
                            placeholder="例如：个人网站"
                            onChange={(event) => onExtraChange(extra.id, 'label', event.target.value)}
                            onFocus={() => notifyFocus('personal', extra.id)}
                          />
                        </label>
                        <label className={labelClass}>
                          <span className={labelTextClass}>内容</span>
                          <input
                            className={inputClass}
                            type="text"
                            value={extra.value || ''}
                            placeholder="https://example.com"
                            onChange={(event) => onExtraChange(extra.id, 'value', event.target.value)}
                            onFocus={() => notifyFocus('personal', extra.id)}
                          />
                        </label>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          className={dangerButtonClass}
                          onClick={() => onExtraRemove(extra.id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }
);

const ResumeSection = memo(
  ({
    sectionKey,
    items,
    onAddItem,
    onRemoveItem,
    onFieldChange,
    onListChange,
    notifyFocus,
    sectionRef,
  }: ResumeSectionProps) => {
    const resolveFocusId = (item: ResumeSectionItem, fallback: string): string => {
      return typeof item.id === 'string' && item.id.trim().length > 0 ? item.id : fallback;
    };

    const toStringValue = (value: unknown): string =>
      typeof value === 'string' ? value : '';

    const renderInput = (
      item: ResumeSectionItem,
      index: number,
      field: string,
      placeholder = '',
      focusId = resolveFocusId(item, sectionKey),
    ) => (
      <label className={labelClass}>
        <span className={labelTextClass}>{labelMap[field] || field}</span>
        <input
          className={inputClass}
          type="text"
          value={typeof item[field] === 'string' ? (item[field] as string) : ''}
          placeholder={placeholder}
          onChange={(event) => onFieldChange(sectionKey, index, field, event.target.value)}
          onFocus={() => notifyFocus(sectionKey, focusId)}
        />
      </label>
    );

    const renderListTextarea = (
      item: ResumeSectionItem,
      index: number,
      field: string,
      placeholder: string,
      focusId = resolveFocusId(item, sectionKey),
    ) => (
      <label className={labelClass}>
        <span className={labelTextClass}>{labelMap[field] || field}</span>
        <textarea
          className={textareaClass}
          rows={4}
          value={
            Array.isArray(item[field])
              ? (item[field] as string[]).filter(Boolean).join('\n')
              : ''
          }
          placeholder={placeholder}
          onChange={(event) => onListChange(sectionKey, index, field, event.target.value)}
          onFocus={() => notifyFocus(sectionKey, focusId)}
        />
      </label>
    );

    return (
      <section ref={sectionRef} className="space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {sectionDefinitions[sectionKey]?.title || sectionKey}
          </h3>
          <button
            type="button"
            className={subtleButtonClass}
            onClick={() => onAddItem(sectionKey)}
          >
            添加
          </button>
        </header>
        {items.length === 0 ? (
          <p className={emptyStateClass}>暂无内容，点击“添加”开始编辑。</p>
        ) : (
          items.map((item, index) => {
            const itemId = resolveFocusId(item, `${sectionKey}-${index}`);
            return (
              <div key={itemId} className={cardClass}>
              <div className="grid gap-4">
                {sectionKey === 'socials' && (
                  <>
                    {renderInput(item, index, 'label', 'GitHub / 个人网站')}
                    {renderInput(item, index, 'url', 'https://example.com')}
                  </>
                )}
                {sectionKey === 'experience' && (
                  <>
                    {renderInput(item, index, 'company', '公司或团队名称')}
                    {renderInput(item, index, 'role', '职位 / 角色')}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {renderInput(item, index, 'location', '所在城市')}
                      {renderInput(item, index, 'startDate', '2019-06')}
                      {renderInput(item, index, 'endDate', '至今 / 2023-08')}
                    </div>
                    {renderListTextarea(item, index, 'highlights', '每行一个成果或职责')}
                  </>
                )}
                {sectionKey === 'education' && (
                  <>
                    {renderInput(item, index, 'school', '学校')}
                    {renderInput(item, index, 'degree', '学历 / 专业')}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {renderInput(item, index, 'startDate', '2014')}
                      {renderInput(item, index, 'endDate', '2018')}
                    </div>
                    <label className={labelClass}>
                      <span className={labelTextClass}>详情</span>
                      <textarea
                        className={textareaClass}
                        rows={3}
                        value={toStringValue(item.details)}
                        placeholder="校内成绩、荣誉或主修课程"
                        onChange={(event) =>
                          onFieldChange(sectionKey, index, 'details', event.target.value)
                        }
                        onFocus={() => notifyFocus(sectionKey, itemId)}
                      />
                    </label>
                  </>
                )}
                {sectionKey === 'projects' && (
                  <>
                    {renderInput(item, index, 'name', '项目名称')}
                    {renderInput(item, index, 'role', '角色 / 负责范围')}
                    <label className={labelClass}>
                      <span className={labelTextClass}>概述</span>
                      <textarea
                        className={textareaClass}
                        rows={3}
                        value={toStringValue(item.summary)}
                        placeholder="简要说明项目背景、亮点与成果"
                        onChange={(event) =>
                          onFieldChange(sectionKey, index, 'summary', event.target.value)
                        }
                        onFocus={() => notifyFocus(sectionKey, itemId)}
                      />
                    </label>
                    {renderInput(item, index, 'link', 'https://项目链接（可选）')}
                  </>
                )}
                {sectionKey === 'skills' && (
                  <>
                    {renderInput(item, index, 'title', '例如：前端 / 工程实践')}
                    <label className={labelClass}>
                      <span className={labelTextClass}>技能条目</span>
                      <textarea
                        className={textareaClass}
                        rows={3}
                        value={
                          Array.isArray(item.items)
                            ? (item.items as string[]).filter(Boolean).join('\n')
                            : ''
                        }
                        placeholder="每行一个技能或关键字"
                        onChange={(event) =>
                          onListChange(sectionKey, index, 'items', event.target.value)
                        }
                        onFocus={() => notifyFocus(sectionKey, itemId)}
                      />
                    </label>
                  </>
                )}
                {sectionKey === 'languages' && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {renderInput(item, index, 'name', '语言')}
                    {renderInput(item, index, 'level', '熟练程度')}
                  </div>
                )}
                {sectionKey === 'interests' && renderInput(item, index, 'name', '兴趣 / 爱好')}
                {sectionKey === 'awards' && (
                  <>
                    {renderInput(item, index, 'name', '奖项名称')}
                    {renderInput(item, index, 'issuer', '颁发机构')}
                    {renderInput(item, index, 'year', '年份')}
                  </>
                )}
              </div>
              <footer className="flex justify-end pt-2">
                <button
                  type="button"
                  className={dangerButtonClass}
                  onClick={() => onRemoveItem(sectionKey, index)}
                >
                  删除
                </button>
              </footer>
            </div>
            );
          })
        )}
      </section>
    );
  }
);

const CustomSectionEditor = memo(
  ({
    sectionKey,
    section,
    onTitleChange,
    onModeChange,
    onItemsChange,
    onFieldChange,
    onFieldAdd,
    onFieldRemove,
    onTextChange,
    onRemove,
    notifyFocus,
    sectionRef,
  }: CustomSectionEditorProps) => {
    const mode: ResumeCustomSectionMode = section.mode ?? 'list';
    const itemsValue = Array.isArray(section.items) ? section.items.join('\n') : '';
    const fieldsValue = Array.isArray(section.fields) ? section.fields : [];
    const textValue = typeof section.text === 'string' ? section.text : '';

    return (
      <section ref={sectionRef} className="space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {section.title || '自定义模块'}
          </h3>
          <button
            type="button"
            className={dangerButtonClass}
            onClick={() => {
              const shouldRemove =
                typeof window === 'undefined' ||
                window.confirm(`确定删除模块“${section.title || '未命名模块'}”吗？`);
              if (shouldRemove) {
                onRemove?.(section.id);
              }
            }}
          >
            删除模块
          </button>
        </header>
        <div className={cardClass}>
          <div className="space-y-4">
            <label className={labelClass}>
              <span className={labelTextClass}>模块名称</span>
              <input
                className={inputClass}
                type="text"
                value={section.title || ''}
                placeholder="自定义模块名称"
                onChange={(event) => onTitleChange(section.id, event.target.value)}
                onFocus={() => notifyFocus(sectionKey, section.id)}
              />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>内容类型</span>
              <select
                className={inputClass}
                value={mode}
                onChange={(event) =>
                  onModeChange(section.id, event.target.value as ResumeCustomSectionMode)
                }
                onFocus={() => notifyFocus(sectionKey, `${section.id}-mode`)}
              >
                {customModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {mode === 'list' && (
              <label className={labelClass}>
                <span className={labelTextClass}>内容条目</span>
                <textarea
                  className={textareaClass}
                  rows={4}
                  value={itemsValue}
                  placeholder="每行一个亮点或描述"
                  onChange={(event) => onItemsChange(section.id, event.target.value)}
                  onFocus={() => notifyFocus(sectionKey, section.id)}
                />
              </label>
            )}
            {mode === 'fields' && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className={labelTextClass}>键值对</span>
                  <button
                    type="button"
                    className={subtleButtonClass}
                    onClick={() => onFieldAdd(section.id)}
                  >
                    添加字段
                  </button>
                </div>
                {fieldsValue.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300/70 bg-white/60 px-3 py-4 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-400">
                    目前没有字段，点击“添加字段”开始编辑。
                  </p>
                ) : (
                  <div className="space-y-3">
                    {fieldsValue.map((field) => (
                      <div
                        key={field.id}
                        className="rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60"
                      >
                        <div className="flex flex-col gap-3 md:flex-row">
                          <label className={`${labelClass} md:flex-1`}>
                            <span className={labelTextClass}>字段名称</span>
                            <input
                              className={inputClass}
                              type="text"
                              value={field.label || ''}
                              placeholder="例如：职责"
                              onChange={(event) =>
                                onFieldChange(section.id, field.id, 'label', event.target.value)
                              }
                              onFocus={() => notifyFocus(sectionKey, `${field.id}-label`)}
                            />
                          </label>
                          <label className={`${labelClass} md:flex-1`}>
                            <span className={labelTextClass}>字段内容</span>
                            <input
                              className={inputClass}
                              type="text"
                              value={field.value || ''}
                              placeholder="例如：负责团队管理与项目规划"
                              onChange={(event) =>
                                onFieldChange(section.id, field.id, 'value', event.target.value)
                              }
                              onFocus={() => notifyFocus(sectionKey, `${field.id}-value`)}
                            />
                          </label>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            className={dangerButtonClass}
                            onClick={() => onFieldRemove(section.id, field.id)}
                          >
                            删除字段
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {mode === 'text' && (
              <label className={labelClass}>
                <span className={labelTextClass}>自由文本</span>
                <textarea
                  className={textareaClass}
                  rows={5}
                  value={textValue}
                  placeholder="可粘贴多个段落，自由调整格式。"
                  onChange={(event) => onTextChange(section.id, event.target.value)}
                  onFocus={() => notifyFocus(sectionKey, `${section.id}-text`)}
                />
              </label>
            )}
          </div>
        </div>
      </section>
    );
  }
);

const ResumeEditor = ({
  resume,
  onChange,
  onFieldFocus,
  activeSections,
  onSectionToggle,
  onSectionReorder,
  customSections,
  onAddCustomSection,
  onRemoveCustomSection,
  modulePanelOpen,
  onToggleModulePanel,
  registerSectionRef,
}: ResumeEditorProps) => {
  const notifyFocus = useCallback(
    (sectionKey: string, itemKey: string) => {
      if (typeof onFieldFocus === 'function') {
        onFieldFocus(sectionKey, itemKey);
      }
    },
    [onFieldFocus]
  );

  const updateDraft = useCallback(
    (updater: (draft: ResumeData) => void) => {
      onChange((draft) => {
        updater(draft);
      });
    },
    [onChange]
  );

  const handlePersonalChange = useCallback(
    (field: string, value: string) => {
      updateDraft((draft) => {
        (draft.personal as Record<string, unknown>)[field] = value;
      });
    },
    [updateDraft]
  );

  const handleArrayFieldChange = useCallback(
    (section: StandardSectionKey, index: number, field: string, value: string) => {
      updateDraft((draft) => {
        const sectionList = Array.isArray(draft[section])
          ? (draft[section] as ResumeSectionItem[])
          : [];
        if (!Array.isArray(draft[section])) {
          (draft as Record<string, unknown>)[section] = sectionList;
        }
        const target = sectionList[index];
        if (target) {
          target[field] = value;
        }
      });
    },
    [updateDraft]
  );

  const handleArrayListChange = useCallback(
    (section: StandardSectionKey, index: number, field: string, value: string) => {
      updateDraft((draft) => {
        const sectionList = Array.isArray(draft[section])
          ? (draft[section] as ResumeSectionItem[])
          : [];
        if (!Array.isArray(draft[section])) {
          (draft as Record<string, unknown>)[section] = sectionList;
        }
        const target = sectionList[index];
        if (target) {
          target[field] = cleanListInput(value);
        }
      });
    },
    [updateDraft]
  );

  const handleAddSectionItem = useCallback(
    (section: StandardSectionKey) => {
      updateDraft((draft) => {
        const sectionList = Array.isArray(draft[section])
          ? (draft[section] as ResumeSectionItem[])
          : [];
        if (!Array.isArray(draft[section])) {
          (draft as Record<string, unknown>)[section] = sectionList;
        }
        const factory = sectionDefinitions[section]?.createItem;
        if (typeof factory === 'function') {
          sectionList.push(factory() as ResumeSectionItem);
        }
      });
    },
    [updateDraft]
  );

  const handleRemoveSectionItem = useCallback(
    (section: StandardSectionKey, index: number) => {
      updateDraft((draft) => {
        if (!Array.isArray(draft[section])) return;
        (draft[section] as ResumeSectionItem[]).splice(index, 1);
      });
    },
    [updateDraft]
  );

  const mutateCustomSection = useCallback(
    (sectionId: string, mutator: (section: ResumeCustomSection, draft: ResumeData) => void) => {
      updateDraft((draft) => {
        if (!Array.isArray(draft.customSections)) return;
        const target = draft.customSections.find((item) => item.id === sectionId);
        if (!target) return;
        if (!target.mode) target.mode = 'list';
        if (!Array.isArray(target.items)) target.items = [];
        if (!Array.isArray(target.fields)) target.fields = [];
        if (typeof target.text !== 'string') target.text = '';
        mutator(target, draft);
      });
    },
    [updateDraft]
  );

  const handleCustomTitleChange = useCallback(
    (sectionId: string, value: string) => {
      mutateCustomSection(sectionId, (target) => {
        target.title = value;
      });
    },
    [mutateCustomSection]
  );

  const handleCustomItemsChange = useCallback(
    (sectionId: string, value: string) => {
      mutateCustomSection(sectionId, (target) => {
        if (target.mode !== 'list') return;
        target.items = cleanListInput(value);
      });
    },
    [mutateCustomSection]
  );

  const handleCustomModeChange = useCallback(
    (sectionId: string, mode: ResumeCustomSection['mode']) => {
      mutateCustomSection(sectionId, (target) => {
        target.mode = mode;
        if (mode === 'list') {
          if (!Array.isArray(target.items)) {
            target.items = [];
          }
          if (target.items.length === 0) {
            if (typeof target.text === 'string' && target.text.trim()) {
              target.items = cleanListInput(target.text);
            } else if (Array.isArray(target.fields) && target.fields.length > 0) {
              target.items = target.fields
                .map((field) => [field.label, field.value].filter(Boolean).join('：'))
                .filter(Boolean);
            }
          }
        } else if (mode === 'fields') {
          if (!Array.isArray(target.fields)) {
            target.fields = [];
          }
          if (target.fields.length === 0) {
            target.fields.push(createCustomField());
          }
        } else if (mode === 'text') {
          if (typeof target.text !== 'string' || !target.text.trim()) {
            if (Array.isArray(target.items) && target.items.length > 0) {
              target.text = target.items.join('\n');
            } else if (Array.isArray(target.fields) && target.fields.length > 0) {
              target.text = target.fields
                .map((field) => [field.label, field.value].filter(Boolean).join('：'))
                .filter(Boolean)
                .join('\n');
            } else {
              target.text = '';
            }
          }
        }
      });
    },
    [mutateCustomSection]
  );

  const handleCustomFieldChange = useCallback(
    (
      sectionId: string,
      fieldId: string,
      key: keyof ResumeCustomField,
      value: string,
    ) => {
      mutateCustomSection(sectionId, (target) => {
        if (target.mode !== 'fields') return;
        const targetField = target.fields.find((field) => field.id === fieldId);
        if (!targetField) return;
        targetField[key] = value;
      });
    },
    [mutateCustomSection]
  );

  const handleCustomFieldAdd = useCallback(
    (sectionId: string) => {
      mutateCustomSection(sectionId, (target) => {
        if (!Array.isArray(target.fields)) {
          target.fields = [];
        }
        target.fields.push(createCustomField());
        target.mode = target.mode || 'fields';
      });
    },
    [mutateCustomSection]
  );

  const handleCustomFieldRemove = useCallback(
    (sectionId: string, fieldId: string) => {
      mutateCustomSection(sectionId, (target) => {
        if (target.mode !== 'fields') return;
        target.fields = target.fields.filter((field) => field.id !== fieldId);
      });
    },
    [mutateCustomSection]
  );

  const handleCustomTextChange = useCallback(
    (sectionId: string, value: string) => {
      mutateCustomSection(sectionId, (target) => {
        if (target.mode !== 'text') return;
        target.text = value;
      });
    },
    [mutateCustomSection]
  );

  const handleDeleteCustomSection = useCallback(
    (sectionId: string) => {
      onRemoveCustomSection?.(sectionId);
    },
    [onRemoveCustomSection]
  );

  const handlePersonalExtraAdd = useCallback(() => {
    updateDraft((draft) => {
      if (!Array.isArray(draft.personal.extras)) {
        draft.personal.extras = [];
      }
      draft.personal.extras.push({ id: createId('extra'), label: '', value: '' });
    });
  }, [updateDraft]);

  const handlePersonalExtraChange = useCallback(
    (extraId: string, field: keyof ResumePersonalExtra, value: string) => {
      updateDraft((draft) => {
        if (!Array.isArray(draft.personal.extras)) {
          draft.personal.extras = [];
        }
        const target = draft.personal.extras.find((item) => item.id === extraId);
        if (target) {
          target[field] = value;
        }
      });
    },
    [updateDraft]
  );

  const handlePersonalExtraRemove = useCallback(
    (extraId: string) => {
      updateDraft((draft) => {
        if (!Array.isArray(draft.personal.extras)) return;
        draft.personal.extras = draft.personal.extras.filter((item) => item.id !== extraId);
      });
    },
    [updateDraft]
  );

  const handlePersonalSettingChange = useCallback(
    <Key extends keyof PersonalSettings>(key: Key, value: PersonalSettings[Key]) => {
      updateDraft((draft) => {
        if (!draft.settings) draft.settings = {};
        if (!draft.settings.personal) {
          draft.settings.personal = { ...defaultPersonalSettings };
        }
        (draft.settings.personal as PersonalSettings)[key] = value as PersonalSettings[Key];
      });
    },
    [updateDraft]
  );

  const resolvedActiveSections = Array.isArray(activeSections) ? activeSections : [...sectionOrder];
  const availableCustomSections: ResumeCustomSection[] = Array.isArray(customSections)
    ? customSections
    : Array.isArray(resume.customSections)
      ? (resume.customSections as ResumeCustomSection[])
      : [];

  const personalSettings: PersonalSettings = {
    ...defaultPersonalSettings,
    ...(resume.settings?.personal
      ? (resume.settings.personal as Partial<PersonalSettings>)
      : {}),
  };
  personalSettings.photoSize = Math.max(
    80,
    Math.min(Number(personalSettings.photoSize) || 120, 260),
  );
  personalSettings.photoPosition = personalSettings.photoPosition === 'left' ? 'left' : 'right';
  personalSettings.showPhoto = personalSettings.showPhoto !== false;

  const sectionRefCallbacks = useRef<Map<string, (node: HTMLElement | null) => void>>(new Map());

  useEffect(() => {
    sectionRefCallbacks.current.clear();
  }, [registerSectionRef]);

  const getSectionRef = useCallback(
    (key: string) => {
      const existing = sectionRefCallbacks.current.get(key);
      if (existing) {
        return existing;
      }
      const callback = (node: HTMLElement | null) => {
        registerSectionRef?.(key, node);
      };
      sectionRefCallbacks.current.set(key, callback);
      return callback;
    },
    [registerSectionRef]
  );

  return (
    <div className="space-y-10 pb-10">
      <SectionManager
        activeSections={activeSections}
        onToggleSection={onSectionToggle}
        customSections={availableCustomSections}
        onAddCustomSection={onAddCustomSection}
        onRemoveCustomSection={onRemoveCustomSection}
        isOpen={modulePanelOpen}
        onToggle={onToggleModulePanel}
        onReorderSections={onSectionReorder}
      />
      <PersonalSection
        personal={resume.personal}
        settings={personalSettings}
        onChange={handlePersonalChange}
        notifyFocus={notifyFocus}
        sectionRef={getSectionRef('personal')}
        onExtraAdd={handlePersonalExtraAdd}
        onExtraChange={handlePersonalExtraChange}
        onExtraRemove={handlePersonalExtraRemove}
        onSettingChange={handlePersonalSettingChange}
      />
      {resolvedActiveSections.map((sectionKey) => {
        if (sectionOrder.includes(sectionKey as StandardSectionKey)) {
          const standardKey = sectionKey as StandardSectionKey;
          const sectionItems = Array.isArray(resume[standardKey])
            ? (resume[standardKey] as ResumeSectionItem[])
            : [];
          return (
            <ResumeSection
              key={standardKey}
              sectionKey={standardKey}
              items={sectionItems}
              onAddItem={handleAddSectionItem}
              onRemoveItem={handleRemoveSectionItem}
              onFieldChange={handleArrayFieldChange}
              onListChange={handleArrayListChange}
              notifyFocus={notifyFocus}
              sectionRef={getSectionRef(standardKey)}
            />
          );
        }
        if (isCustomSectionKey(sectionKey)) {
          const customId = extractCustomSectionId(sectionKey);
          const customSection =
            customId && availableCustomSections.find((item) => item.id === customId);
          if (!customSection) return null;
          return (
            <CustomSectionEditor
              key={sectionKey}
              sectionKey={sectionKey}
              section={customSection}
              onTitleChange={handleCustomTitleChange}
              onModeChange={handleCustomModeChange}
              onItemsChange={handleCustomItemsChange}
              onFieldChange={handleCustomFieldChange}
              onFieldAdd={handleCustomFieldAdd}
              onFieldRemove={handleCustomFieldRemove}
              onTextChange={handleCustomTextChange}
              onRemove={handleDeleteCustomSection}
              notifyFocus={notifyFocus}
              sectionRef={getSectionRef(sectionKey)}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

export default ResumeEditor;
type ResumeSectionItem = {
  id?: string;
  [key: string]: unknown;
};
