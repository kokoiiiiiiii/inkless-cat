import { useI18n } from '@shared/i18n';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

import type { DragState } from '../../model/useSectionDragController';

type SectionSortPanelProps = {
  resolvedActiveSections: string[];
  displayOrder: string[];
  dragState: DragState;
  dragListRef: MutableRefObject<HTMLUListElement | null>;
  getSectionTitle: (key: string) => string;
  handlePointerDown: (event: ReactPointerEvent<HTMLLIElement>, sectionKey: string) => void;
  canRestore: boolean;
  canUndo: boolean;
  onRestore: () => void;
  onUndo: () => void;
};

const dragItemClass =
  'relative flex cursor-grab select-none items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 text-sm shadow-sm transition hover:border-brand-400 hover:shadow-lg dark:border-slate-700/60 dark:bg-slate-900/60 transition-transform duration-150 ease-out';
const dragIndicatorClass =
  'pointer-events-none absolute left-4 right-4 h-1 rounded-full bg-brand-500';

export const SectionSortPanel = ({
  resolvedActiveSections,
  displayOrder,
  dragState,
  dragListRef,
  getSectionTitle,
  handlePointerDown,
  canRestore,
  canUndo,
  onRestore,
  onUndo,
}: SectionSortPanelProps) => {
  const { t } = useI18n();
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('modules.sort.title')}
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('modules.sort.hint')}
          </span>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200"
            onClick={onRestore}
            disabled={!canRestore}
            title={t('modules.sort.restoreTitle')}
            aria-disabled={!canRestore}
          >
            {t('modules.sort.restore')}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200"
            onClick={onUndo}
            disabled={!canUndo}
            title={t('modules.sort.undoTitle')}
            aria-disabled={!canUndo}
          >
            {t('modules.sort.undo')}
          </button>
        </div>
      </div>
      {resolvedActiveSections.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('modules.sort.empty')}</p>
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
                aria-label={t('modules.sort.aria', { title: getSectionTitle(sectionKey) })}
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
  );
};
