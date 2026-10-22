import { useI18n } from '@shared/i18n';
import { useRef } from 'react';

import { useAIResumeInterviewLauncher } from '../model/AIResumeInterviewContext';

const CreateResumeWithAIButton = () => {
  const { t } = useI18n();
  const { open } = useAIResumeInterviewLauncher();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <button
      ref={buttonRef}
      type="button"
      className="inline-flex min-w-fit flex-shrink-0 items-center justify-center gap-1.5 rounded-full border border-brand-700 bg-brand-700 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/30 transition-colors hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 motion-reduce:transition-none dark:border-brand-400 dark:bg-brand-500 dark:text-slate-950 dark:hover:bg-brand-400 sm:px-4 sm:text-sm"
      aria-haspopup="dialog"
      onClick={() => {
        const button = buttonRef.current;
        if (button) open(button);
      }}
    >
      {t('topbar.aiResume')}
    </button>
  );
};

export default CreateResumeWithAIButton;
