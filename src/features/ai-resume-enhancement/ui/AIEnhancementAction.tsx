import { useI18n } from '@shared/i18n';

import { useAIResumeEnhancementLauncher } from '../model/AIResumeEnhancementLauncherContext';
import type { AIEnhancementTarget } from '../model/types';

type AIEnhancementActionProps = {
  target: AIEnhancementTarget;
};

const AIEnhancementAction = ({ target }: AIEnhancementActionProps) => {
  const { t } = useI18n();
  const { open } = useAIResumeEnhancementLauncher();
  const fieldLabel =
    target.kind === 'personal-summary'
      ? t('common.aiFields.personalSummary')
      : target.kind === 'experience-highlights'
        ? t('common.aiFields.experienceHighlights')
        : t('common.aiFields.projectSummary');

  return (
    <button
      type="button"
      className="dark:bg-brand-950/50 inline-flex min-h-8 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 motion-reduce:transition-none dark:border-brand-800 dark:text-brand-200 dark:hover:bg-brand-900/60"
      aria-haspopup="dialog"
      aria-label={t('common.aiEnhanceWithField', { field: fieldLabel })}
      onClick={(event) => open(target, event.currentTarget)}
    >
      {t('common.aiEnhance')}
    </button>
  );
};

export default AIEnhancementAction;
