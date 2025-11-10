import { getCustomSectionKey } from '@entities/module';
import type { ResumeCustomSection } from '@entities/resume';
import { useI18n } from '@shared/i18n';

import type { SectionToggleHandler } from '../../model/useSectionManager';

type CustomSectionPanelProps = {
  customSections: ResumeCustomSection[];
  resolvedActiveSections: string[];
  onToggleSection?: SectionToggleHandler;
  onAddCustomSection?: () => void;
  onRemoveCustomSection?: (sectionId: string) => void;
};

export const CustomSectionPanel = ({
  customSections,
  resolvedActiveSections,
  onToggleSection,
  onAddCustomSection,
  onRemoveCustomSection,
}: CustomSectionPanelProps) => {
  const { t } = useI18n();
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('modules.custom.title')}
        </h4>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1 rounded-full border border-transparent bg-brand-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:bg-brand-400 dark:hover:bg-brand-300"
          onClick={onAddCustomSection}
        >
          {t('modules.custom.add')}
        </button>
      </div>
      {customSections.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('modules.custom.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {customSections.map((section) => {
            const key = getCustomSectionKey(section.id);
            const enabled = resolvedActiveSections.includes(key);
            return (
              <li
                key={section.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60"
              >
                <div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {section.title || t('modules.customSection.untitled')}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {enabled ? t('modules.status.enabled') : t('modules.status.disabled')}
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
                    {enabled ? t('modules.actions.disable') : t('modules.actions.enable')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1 rounded-full border border-transparent bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500 transition hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30"
                    onClick={() => onRemoveCustomSection?.(section.id)}
                  >
                    {t('modules.actions.delete')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
