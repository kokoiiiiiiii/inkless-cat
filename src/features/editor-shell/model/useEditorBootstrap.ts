import type { ResumeData } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import type { Locale } from '@shared/i18n';
import { useEffect, useRef } from 'react';

import { loadInitialResume } from '../lib/resume';
import {
  CUSTOM_TEMPLATES_KEY,
  getStoredValue,
  isBrowser,
  LEGACY_KEYS,
  SECTIONS_KEY,
  TEMPLATE_KEY,
  THEME_KEY,
} from '../lib/storage';
import { normalizeTemplateTheme } from '../lib/templateTheme';

type UseEditorBootstrapParams = {
  resetState: (value: ResumeData) => void;
  updateActiveSections: (sections: string[]) => void;
  setTheme: (value: string) => void;
  setTemplateId: (value: string) => void;
  setCustomTemplates: (templates: ResumeTemplate[]) => void;
  defaultTemplateId: string;
  locale: Locale;
};

export const useEditorBootstrap = ({
  resetState,
  updateActiveSections,
  setTheme,
  setTemplateId,
  setCustomTemplates,
  defaultTemplateId,
  locale,
}: UseEditorBootstrapParams) => {
  const initialisedRef = useRef(false);

  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;

    const initialResume = loadInitialResume(locale);
    resetState(initialResume);

    const storedSections = getStoredValue(SECTIONS_KEY, LEGACY_KEYS.sections);
    if (storedSections) {
      try {
        const parsed = JSON.parse(storedSections) as string[];
        if (Array.isArray(parsed)) {
          updateActiveSections(parsed);
        }
      } catch {
        // ignore invalid section cache
      }
    }

    const storedTheme = getStoredValue(THEME_KEY, LEGACY_KEYS.theme);
    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme);
      if (storedTheme === 'dark' && isBrowser) {
        document.documentElement.classList.add('dark');
      }
    }

    const storedTemplate = getStoredValue(TEMPLATE_KEY, LEGACY_KEYS.template);
    setTemplateId(storedTemplate || defaultTemplateId);

    const storedCustomTemplates = getStoredValue(CUSTOM_TEMPLATES_KEY, LEGACY_KEYS.customTemplates);
    if (storedCustomTemplates) {
      try {
        const parsed = JSON.parse(storedCustomTemplates) as ResumeTemplate[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed
            .filter((item): item is ResumeTemplate => Boolean(item && item.id))
            .map((item) => ({
              ...item,
              theme: normalizeTemplateTheme(item.theme),
            }));
          if (normalized.length > 0) {
            setCustomTemplates(normalized);
          }
        }
      } catch {
        // ignore invalid cached templates
      }
    }
  }, [
    defaultTemplateId,
    locale,
    resetState,
    setCustomTemplates,
    setTemplateId,
    setTheme,
    updateActiveSections,
  ]);
};
