import { useI18n } from '@shared/i18n';
import { isBrowser } from '@shared/lib/storage';
import { useCallback } from 'react';

type UseCustomSectionPromptOptions = {
  appendCustomSection: (title?: string) => void;
};

export const useCustomSectionPrompt = ({ appendCustomSection }: UseCustomSectionPromptOptions) => {
  const { t } = useI18n();

  const addCustomSection = useCallback(() => {
    if (!isBrowser) {
      appendCustomSection();
      return;
    }
    const message = t('modules.customSection.promptTitle');
    const placeholder = t('modules.customSection.promptPlaceholder');
    const fallback = t('modules.customSection.defaultTitle');
    const input = globalThis.prompt(
      message === 'modules.customSection.promptTitle' ? 'Enter a module name' : message,
      placeholder === 'modules.customSection.promptPlaceholder' ? fallback : placeholder,
    );
    if (input === null) return;
    appendCustomSection(input.trim() || fallback);
  }, [appendCustomSection, t]);

  return addCustomSection;
};

export type UseCustomSectionPromptResult = ReturnType<typeof useCustomSectionPrompt>;
