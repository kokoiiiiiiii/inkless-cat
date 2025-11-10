import { sectionDefinitions, sectionOrder } from '@entities/module';
import { useI18n } from '@shared/i18n';

import type { SectionToggleHandler } from '../../model/useSectionManager';

type SectionTogglePanelProps = {
  resolvedActiveSections: string[];
  standardAllEnabled: boolean;
  standardAnyEnabled: boolean;
  handleToggleAllStandard: (nextState: boolean) => void;
  onToggleSection?: SectionToggleHandler;
};

export const SectionTogglePanel = ({
  resolvedActiveSections,
  standardAllEnabled,
  standardAnyEnabled,
  handleToggleAllStandard,
  onToggleSection,
}: SectionTogglePanelProps) => {
  const { t } = useI18n();
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('modules.toggle.title')}
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-200/70 disabled:hover:text-slate-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200 dark:disabled:hover:border-slate-700 dark:disabled:hover:text-slate-300"
            onClick={() => handleToggleAllStandard(true)}
            disabled={standardAllEnabled}
            aria-disabled={standardAllEnabled}
          >
            {t('modules.toggle.enableAll')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-200/70 disabled:hover:text-slate-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200 dark:disabled:hover:border-slate-700 dark:disabled:hover:text-slate-300"
            onClick={() => handleToggleAllStandard(false)}
            disabled={!standardAnyEnabled}
            aria-disabled={!standardAnyEnabled}
          >
            {t('modules.toggle.disableAll')}
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sectionOrder.map((sectionKey) => {
          const enabled = resolvedActiveSections.includes(sectionKey);
          const titleKey = sectionDefinitions[sectionKey]?.titleKey;
          const title = titleKey ? t(titleKey) : sectionKey;
          return (
            <label
              key={sectionKey}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-800/70 dark:bg-slate-900/60 dark:hover:border-brand-400"
            >
              <div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {title === titleKey ? sectionKey : title}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {enabled ? t('modules.status.enabled') : t('modules.status.disabled')}
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
                {enabled ? t('modules.actions.disable') : t('modules.actions.enable')}
              </button>
            </label>
          );
        })}
      </div>
    </div>
  );
};
