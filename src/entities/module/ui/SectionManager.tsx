import type { ResumeCustomSection } from '@entities/resume';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';

import { getCustomSectionKey, sectionDefinitions, sectionOrder } from '../lib/sections';
import type { SectionReorderHandler, SectionToggleHandler } from '../model/useSectionManager';
import { useSectionManager } from '../model/useSectionManager';

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
const dragIndicatorClass =
  'pointer-events-none absolute left-4 right-4 h-1 rounded-full bg-brand-500';

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
    const open = typeof isOpen === 'boolean' ? isOpen : true;

    const {
      resolvedActiveSections,
      customList,
      standardAllEnabled,
      standardAnyEnabled,
      displayOrder,
      dragState,
      dragListRef,
      getSectionTitle,
      handleToggleAllStandard,
      handlePointerDown,
    } = useSectionManager({
      activeSections,
      customSections,
      onToggleSection,
      onReorderSections,
    });

    // ----- 排序：复原 & 撤销（单步） -----
    const initialOrderRef = useRef<string[] | null>(null); // 初始顺序深拷贝
    const prevActiveRef = useRef<string[] | null>(null); // 上一次的活动顺序
    const undoOrderRef = useRef<string[] | null>(null); // 撤销目标（单步）

    const arraysShallowEqual = useCallback((a?: readonly string[] | null, b?: readonly string[] | null) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }, []);

    // 首次记录初始顺序（深拷贝）。
    useEffect(() => {
      if (!initialOrderRef.current && Array.isArray(activeSections) && activeSections.length > 0) {
        initialOrderRef.current = [...activeSections];
      }
    }, [activeSections]);

    // 监听外部顺序变化：若是纯排序变动，则提供撤销堆栈（单步）。
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
            // 模块增删导致集合变化，清空单步撤销
            undoOrderRef.current = null;
          }
        } else {
          undoOrderRef.current = null;
        }
      }
      prevActiveRef.current = Array.isArray(activeSections) ? [...activeSections] : null;
    }, [activeSections, arraysShallowEqual]);

    // 计算当前集合下的“原始顺序”（初始顺序中过滤当前存在的模块 + 新增的排在末尾，保持当前相对次序）
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
    }, [activeSections, targetRestoreOrder, arraysShallowEqual]);

    const canUndo = Array.isArray(undoOrderRef.current) && undoOrderRef.current.length > 0;

    const handleRestore = useCallback(() => {
      const current = Array.isArray(activeSections) ? activeSections : [];
      if (!onReorderSections || current.length === 0) return;
      // 点击反馈动画由类控制
      undoOrderRef.current = [...current];
      onReorderSections([...targetRestoreOrder]);
    }, [activeSections, onReorderSections, targetRestoreOrder]);

    const handleUndo = useCallback(() => {
      if (!onReorderSections) return;
      const undoOrder = undoOrderRef.current;
      if (!Array.isArray(undoOrder) || undoOrder.length === 0) return;
      onReorderSections([...undoOrder]);
      // 单步撤销后清空（下一次排序变更会再刷新）
      undoOrderRef.current = null;
    }, [onReorderSections]);

    // Ctrl/Cmd+Z 撤销（仅在面板展开时启用；避免输入框干扰）
    useEffect(() => {
      if (!open) return;
      const handler = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        const tag = (target?.tagName || '').toLowerCase();
        const editable = target?.isContentEditable || tag === 'input' || tag === 'textarea';
        if (editable) return; // 不拦截编辑中的撤销
        const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z');
        if (isUndo) {
          e.preventDefault();
          handleUndo();
        }
      };
      globalThis.addEventListener('keydown', handler, { passive: false });
      return () => globalThis.removeEventListener('keydown', handler as EventListener);
    }, [open, handleUndo]);

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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">拖动进行排序</span>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200 active:scale-95"
                    onClick={handleRestore}
                    disabled={!canRestore}
                    title="恢复原始排序"
                    aria-disabled={!canRestore}
                  >
                    复原
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200 active:scale-95"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    title="撤销上一次排序 (Ctrl/⌘+Z)"
                    aria-disabled={!canUndo}
                  >
                    撤销
                  </button>
                </div>
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
                      marginBottom:
                        !isDragging && indicatorPosition === 'after' ? '18px' : undefined,
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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">模块开关</h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-200/70 disabled:hover:text-slate-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200 dark:disabled:hover:border-slate-700 dark:disabled:hover:text-slate-300"
                    onClick={() => handleToggleAllStandard(true)}
                    disabled={standardAllEnabled}
                    aria-disabled={standardAllEnabled}
                  >
                    全部开启
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-200/70 disabled:hover:text-slate-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200 dark:disabled:hover:border-slate-700 dark:disabled:hover:text-slate-300"
                    onClick={() => handleToggleAllStandard(false)}
                    disabled={!standardAnyEnabled}
                    aria-disabled={!standardAnyEnabled}
                  >
                    全部关闭
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {sectionOrder.map((sectionKey) => {
                  const enabled = resolvedActiveSections.includes(sectionKey);
                  return (
                    <label
                      key={sectionKey}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-800/70 dark:bg-slate-900/60 dark:hover:border-brand-400"
                    >
                      <div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {sectionDefinitions[sectionKey]?.title ?? sectionKey}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {enabled ? '已启用' : '未启用'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
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
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">自定义模块</h4>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1 rounded-full border border-transparent bg-brand-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:bg-brand-400 dark:hover:bg-brand-300"
                  onClick={onAddCustomSection}
                >
                  新增模块
                </button>
              </div>
              {customList.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  暂无自定义模块，可点击“新增模块”创建。
                </p>
              ) : (
                <ul className="space-y-2">
                  {customList.map((section) => {
                    const key = getCustomSectionKey(section.id);
                    const enabled = resolvedActiveSections.includes(key);
                    return (
                      <li
                        key={section.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60"
                      >
                        <div>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {section.title || '未命名模块'}
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {enabled ? '已启用' : '未启用'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={`inline-flex items-center justify-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
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
        )}
      </section>
    );
  },
);

SectionManager.displayName = 'SectionManager';

export default SectionManager;
