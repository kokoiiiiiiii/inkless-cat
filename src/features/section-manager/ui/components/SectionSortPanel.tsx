import { useI18n } from '@shared/i18n';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { DragCompletion, DragState } from '../../model/useSectionDragController';
import type { SectionReorderHandler } from '../../model/useSectionManager';
import { useUndoHotkey } from '../hooks/useUndoHotkey';

type MoveDirection = 'up' | 'down';
type PendingActionFocus = 'restore' | 'undo';

type SectionSortPanelProps = {
  resolvedActiveSections: string[];
  displayOrder: string[];
  dragState: DragState;
  dragCompletion: DragCompletion | null;
  dragListRef: MutableRefObject<HTMLUListElement | null>;
  getSectionTitle: (key: string) => string;
  handlePointerDown: (event: ReactPointerEvent<HTMLElement>, sectionKey: string) => void;
  canRestore: boolean;
  canUndo: boolean;
  isOpen?: boolean;
  onRestore: () => boolean;
  onUndo: () => boolean;
  onReorderSections?: SectionReorderHandler;
};

const dragItemClass =
  'relative flex cursor-default select-none items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 text-sm shadow-xs transition-[transform,margin] duration-150 ease-out hover:border-brand-400 hover:shadow-lg motion-reduce:transition-none dark:border-slate-700/60 dark:bg-slate-900/60';
const dragIndicatorClass =
  'pointer-events-none absolute left-4 right-4 h-1 rounded-full bg-brand-500';
const actionButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200';

export const SectionSortPanel = ({
  resolvedActiveSections,
  displayOrder,
  dragState,
  dragCompletion,
  dragListRef,
  getSectionTitle,
  handlePointerDown,
  canRestore,
  canUndo,
  isOpen = true,
  onRestore,
  onUndo,
  onReorderSections,
}: SectionSortPanelProps) => {
  const { t } = useI18n();
  const [announcement, setAnnouncement] = useState('');
  const pendingFocusRef = useRef<{ sectionKey: string; direction: MoveDirection } | null>(null);
  const pendingActionFocusRef = useRef<PendingActionFocus | null>(null);
  const moveButtonRefs = useRef(new Map<string, Map<MoveDirection, HTMLButtonElement>>());
  const restoreButtonRef = useRef<HTMLButtonElement | null>(null);
  const undoButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const focusFirstAvailableMoveButton = useCallback(() => {
    for (const sectionKey of displayOrder) {
      const sectionButtons = moveButtonRefs.current.get(sectionKey);
      for (const direction of ['down', 'up'] as const) {
        const button = sectionButtons?.get(direction);
        if (button && !button.disabled) {
          button.focus({ preventScroll: true });
          return;
        }
      }
    }
  }, [displayOrder]);

  const applyUndo = useCallback(
    (focusAfter: boolean) => {
      const didUndo = onUndo();
      if (!didUndo) return false;

      setAnnouncement(t('modules.sort.undone'));
      if (focusAfter || document.activeElement === undoButtonRef.current) {
        pendingActionFocusRef.current = 'undo';
      }
      return true;
    },
    [onUndo, t],
  );

  useUndoHotkey(
    canUndo && isOpen,
    () => applyUndo(document.activeElement === undoButtonRef.current),
    panelRef,
  );

  useEffect(() => {
    if (!dragCompletion) return;
    setAnnouncement(
      t('modules.sort.movedToPosition', {
        title: getSectionTitle(dragCompletion.sectionKey),
        position: dragCompletion.position,
        total: dragCompletion.total,
      }),
    );
  }, [dragCompletion, getSectionTitle, t]);

  useEffect(() => {
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) return;
    pendingFocusRef.current = null;

    const sectionButtons = moveButtonRefs.current.get(pendingFocus.sectionKey);
    const preferredButton = sectionButtons?.get(pendingFocus.direction);
    if (preferredButton && !preferredButton.disabled) {
      preferredButton.focus();
      return;
    }

    const alternateDirection = pendingFocus.direction === 'up' ? 'down' : 'up';
    const alternateButton = sectionButtons?.get(alternateDirection);
    if (alternateButton && !alternateButton.disabled) alternateButton.focus();
  }, [displayOrder]);

  useEffect(() => {
    const pendingActionFocus = pendingActionFocusRef.current;
    if (!pendingActionFocus) return;
    pendingActionFocusRef.current = null;

    const preferredButton =
      pendingActionFocus === 'restore' ? undoButtonRef.current : restoreButtonRef.current;
    if (preferredButton && !preferredButton.disabled) {
      preferredButton.focus({ preventScroll: true });
      return;
    }

    focusFirstAvailableMoveButton();
  }, [canRestore, canUndo, displayOrder, focusFirstAvailableMoveButton]);

  const announceOrderChange = (title: string, position: number, total: number) => {
    setAnnouncement(t('modules.sort.movedToPosition', { title, position, total }));
  };

  return (
    <div
      ref={panelRef}
      className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-xs dark:border-slate-800/70 dark:bg-slate-900/60"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('modules.sort.title')}
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('modules.sort.hint')}
          </span>
          <button
            ref={restoreButtonRef}
            type="button"
            className={actionButtonClass}
            onClick={() => {
              pendingActionFocusRef.current = 'restore';
              if (!onRestore()) {
                pendingActionFocusRef.current = null;
                return;
              }
              setAnnouncement(t('modules.sort.restored'));
            }}
            disabled={!canRestore}
            title={t('modules.sort.restoreTitle')}
          >
            {t('modules.sort.restore')}
          </button>
          <button
            ref={undoButtonRef}
            type="button"
            className={actionButtonClass}
            onClick={() => {
              if (!applyUndo(true)) pendingActionFocusRef.current = null;
            }}
            disabled={!canUndo}
            title={t('modules.sort.undoTitle')}
          >
            {t('modules.sort.undo')}
          </button>
        </div>
      </div>
      {resolvedActiveSections.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('modules.sort.empty')}</p>
      ) : (
        <ul
          ref={dragListRef}
          aria-label={t('modules.sort.title')}
          className="space-y-2"
          data-testid="section-sort-list"
        >
          {displayOrder.map((sectionKey) => {
            const isDragging = dragState.active === sectionKey;
            const isDragOver = dragState.over === sectionKey;
            const indicatorPosition = isDragOver ? dragState.position : null;
            const style = {
              transform: isDragging ? 'scale(0.97)' : undefined,
              marginTop: !isDragging && indicatorPosition === 'before' ? '18px' : undefined,
              marginBottom: !isDragging && indicatorPosition === 'after' ? '18px' : undefined,
            } as const;
            return (
              <li
                key={sectionKey}
                draggable={false}
                className={`${dragItemClass} ${
                  isDragging ? 'cursor-grabbing opacity-60' : ''
                } ${isDragOver ? 'border-brand-400 shadow-lg shadow-brand-500/10' : ''}`}
                style={style}
                data-section-key={sectionKey}
              >
                {indicatorPosition === 'before' && (
                  <span className={`${dragIndicatorClass} top-0 -translate-y-1/2`} />
                )}
                {indicatorPosition === 'after' && (
                  <span className={`${dragIndicatorClass} bottom-0 translate-y-1/2`} />
                )}
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="-ml-2 flex h-11 w-11 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 active:cursor-grabbing motion-reduce:transition-none dark:text-slate-500 dark:hover:bg-slate-800"
                    data-testid="section-drag-handle"
                    onPointerDown={(event) => handlePointerDown(event, sectionKey)}
                  >
                    <svg
                      aria-hidden="true"
                      width="12"
                      height="16"
                      viewBox="0 0 12 16"
                      className="pointer-events-none"
                    >
                      <path
                        d="M0 2.5a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H1a1 1 0 0 1-1-1Zm0 11a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H1a1 1 0 0 1-1-1Zm1-6a1 1 0 0 0 0 2h10a1 1 0 1 0 0-2H1Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                    {getSectionTitle(sectionKey)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {(['up', 'down'] as const satisfies readonly MoveDirection[]).map((direction) => {
                    const index = displayOrder.indexOf(sectionKey);
                    const isDisabled =
                      !onReorderSections ||
                      (direction === 'up' ? index <= 0 : index === displayOrder.length - 1);
                    const label = t(
                      direction === 'up' ? 'modules.sort.moveUp' : 'modules.sort.moveDown',
                      { title: getSectionTitle(sectionKey) },
                    );

                    return (
                      <button
                        key={direction}
                        type="button"
                        ref={(node) => {
                          const sectionButtons =
                            moveButtonRefs.current.get(sectionKey) ??
                            new Map<MoveDirection, HTMLButtonElement>();
                          if (node) {
                            sectionButtons.set(direction, node);
                            moveButtonRefs.current.set(sectionKey, sectionButtons);
                          } else {
                            sectionButtons.delete(direction);
                            if (sectionButtons.size === 0) {
                              moveButtonRefs.current.delete(sectionKey);
                            }
                          }
                        }}
                        aria-label={label}
                        title={label}
                        data-move-direction={direction}
                        disabled={isDisabled}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md font-semibold text-slate-500 hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (isDisabled || !onReorderSections) return;
                          const nextOrder = [...displayOrder];
                          const targetIndex = direction === 'up' ? index - 1 : index + 1;
                          const current = nextOrder[index];
                          const target = nextOrder[targetIndex];
                          if (current === undefined || target === undefined) return;
                          nextOrder[index] = target;
                          nextOrder[targetIndex] = current;
                          pendingFocusRef.current = { sectionKey, direction };
                          onReorderSections(nextOrder);
                          announceOrderChange(
                            getSectionTitle(sectionKey),
                            targetIndex + 1,
                            nextOrder.length,
                          );
                        }}
                      >
                        <span aria-hidden="true">{direction === 'up' ? '↑' : '↓'}</span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="sr-only" role="status" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
};
