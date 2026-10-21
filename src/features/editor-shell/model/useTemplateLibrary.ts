import { createSampleResume, normalizeResumeSchema, type ResumeData } from '@entities/resume';
import {
  DEFAULT_TEMPLATE_ID,
  type ResumeTemplate,
  type TemplateUpdatePayload,
} from '@entities/template';
import { type Locale, useI18n } from '@shared/i18n';
import { clone } from '@shared/lib';
import { createAppError } from '@shared/lib/errors';
import {
  MAX_CUSTOM_TEMPLATES,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
} from '@shared/lib/limits';
import { useAppFeedback } from '@shared/ui/feedback';
import { type Dispatch, type SetStateAction, useCallback, useMemo } from 'react';

import { createCustomTemplateId, normalizeTemplateTheme } from '../lib/templateTheme';
import { useDestructiveAction } from './useDestructiveAction';

type UseTemplateLibraryParams = {
  baseTemplates: ResumeTemplate[];
  templateId?: string;
  customTemplates: ResumeTemplate[];
  setTemplateId: Dispatch<SetStateAction<string>>;
  setCustomTemplates: Dispatch<SetStateAction<ResumeTemplate[]>>;
  resume: ResumeData;
  resetState: (value: ResumeData) => void;
  setHasResumeChanges: (value: boolean) => void;
  defaultTemplateId: string;
};

export const useTemplateLibrary = ({
  baseTemplates,
  templateId,
  customTemplates,
  setTemplateId,
  setCustomTemplates,
  resume,
  resetState,
  setHasResumeChanges,
  defaultTemplateId,
}: UseTemplateLibraryParams) => {
  const { t, locale } = useI18n();
  const { showError, showInfo } = useAppFeedback();
  const runDestructiveAction = useDestructiveAction();

  const showLimitExceeded = useCallback(
    (limit: number) => {
      showError(createAppError('LIMIT_EXCEEDED', t('common.errors.limitExceeded', { limit })));
    },
    [showError, t],
  );

  const allTemplates = useMemo<ResumeTemplate[]>(() => {
    if (!Array.isArray(customTemplates) || customTemplates.length === 0) {
      return baseTemplates;
    }
    return [...baseTemplates, ...customTemplates];
  }, [baseTemplates, customTemplates]);

  const activeTemplate = useMemo<ResumeTemplate>(() => {
    const fallbackTemplate: ResumeTemplate = allTemplates[0] ??
      baseTemplates[0] ?? {
        id: templateId || defaultTemplateId || DEFAULT_TEMPLATE_ID,
        name: 'Default Template',
        sample: createSampleResume(locale),
      };
    const found = allTemplates.find((item) => item.id === templateId);
    return found ?? fallbackTemplate;
  }, [allTemplates, baseTemplates, defaultTemplateId, locale, templateId]);

  const selectTemplateSample = useCallback(
    (template: ResumeTemplate, targetLocale: Locale = locale) => {
      const localized = template.localizedSamples?.[targetLocale];
      const baseSample = localized ?? template.sample ?? createSampleResume(targetLocale);
      return normalizeResumeSchema(baseSample, { clone: true });
    },
    [locale],
  );

  const handleResetSample = useCallback(() => {
    runDestructiveAction(t('common.confirmations.loadSample'), () => {
      const templateSample = selectTemplateSample(activeTemplate);
      resetState(templateSample);
      setHasResumeChanges(false);
      return true;
    });
  }, [
    activeTemplate,
    resetState,
    runDestructiveAction,
    selectTemplateSample,
    setHasResumeChanges,
    t,
  ]);

  const handleTemplateStyleChange = useCallback(
    (template: ResumeTemplate) => {
      if (template?.id) {
        setTemplateId(template.id);
      }
    },
    [setTemplateId],
  );

  const handleTemplateSampleLoad = useCallback(
    (template: ResumeTemplate) => {
      if (!template?.sample && !template.localizedSamples) return;
      runDestructiveAction(t('template.confirmLoadSample'), () => {
        const normalized = selectTemplateSample(template);
        resetState(normalized);
        setTemplateId(template.id);
        setHasResumeChanges(false);
        return true;
      });
    },
    [resetState, runDestructiveAction, selectTemplateSample, setTemplateId, setHasResumeChanges, t],
  );

  const loadTemplateForLocale = useCallback(
    (targetLocale: Locale) => {
      runDestructiveAction(
        t('common.confirmations.loadSample'),
        () => {
          const localizedSample = selectTemplateSample(activeTemplate, targetLocale);
          resetState(localizedSample);
          setHasResumeChanges(false);
          return true;
        },
        true,
      );
    },
    [
      activeTemplate,
      resetState,
      runDestructiveAction,
      selectTemplateSample,
      setHasResumeChanges,
      t,
    ],
  );

  const handleSaveCustomTemplate = useCallback(
    (payload: TemplateUpdatePayload) => {
      if (customTemplates.length >= MAX_CUSTOM_TEMPLATES) {
        showLimitExceeded(MAX_CUSTOM_TEMPLATES);
        return;
      }
      const name = payload.name?.trim();
      if ((name?.length ?? 0) > MAX_TEMPLATE_NAME_LENGTH) {
        showLimitExceeded(MAX_TEMPLATE_NAME_LENGTH);
        return;
      }
      if ((payload.description?.length ?? 0) > MAX_TEMPLATE_DESCRIPTION_LENGTH) {
        showLimitExceeded(MAX_TEMPLATE_DESCRIPTION_LENGTH);
        return;
      }
      const id = createCustomTemplateId();
      const previewStyle = payload.previewStyle || 'modern';
      const accentColor = payload.accentColor || '#2563eb';
      const normalizedTheme = normalizeTemplateTheme(
        previewStyle === 'custom'
          ? {
              accent: accentColor,
              ...payload.theme,
            }
          : payload.theme,
      );

      const template: ResumeTemplate = {
        id,
        name: name || t('template.inputs.unnamedName'),
        description: payload.description || '用户自定义模板',
        accentColor,
        previewStyle,
        theme: normalizedTheme,
        sample: clone(resume),
      };
      setCustomTemplates((previous) => [...previous, template]);
      setTemplateId(id);
    },
    [customTemplates.length, resume, setCustomTemplates, setTemplateId, showLimitExceeded, t],
  );

  const handleDeleteCustomTemplate = useCallback(
    (targetId: string) => {
      const target = customTemplates.find((item) => item.id === targetId);
      if (!target) return;
      const fallback =
        baseTemplates[0]?.id ||
        customTemplates.find((item) => item.id !== targetId)?.id ||
        defaultTemplateId;
      runDestructiveAction(t('common.confirmations.deleteTemplate', { name: target.name }), () => {
        setCustomTemplates((previous) => previous.filter((item) => item.id !== targetId));
        if (templateId === targetId) setTemplateId(fallback);
        return true;
      });
    },
    [
      baseTemplates,
      customTemplates,
      defaultTemplateId,
      setCustomTemplates,
      setTemplateId,
      runDestructiveAction,
      t,
      templateId,
    ],
  );

  const handleUpdateCustomTemplate = useCallback(
    (targetId: string, updates: TemplateUpdatePayload) => {
      if (!targetId || !updates) return;
      let normalizedUpdates = updates;
      if (updates.name !== undefined) {
        const name = updates.name.trim();
        if (!name) {
          showInfo(t('template.validation.nameRequired'));
          return;
        }
        if (name.length > MAX_TEMPLATE_NAME_LENGTH) {
          showInfo(t('template.validation.nameTooLong', { limit: MAX_TEMPLATE_NAME_LENGTH }));
          return;
        }
        normalizedUpdates = { ...updates, name };
      }
      if ((normalizedUpdates.description?.length ?? 0) > MAX_TEMPLATE_DESCRIPTION_LENGTH) {
        showLimitExceeded(MAX_TEMPLATE_DESCRIPTION_LENGTH);
        return;
      }
      const applyUpdate = () => {
        setCustomTemplates((previous) =>
          previous.map((template) => {
            if (template.id !== targetId) {
              return template;
            }
            const next: ResumeTemplate = { ...template };

            if (normalizedUpdates.name !== undefined) {
              next.name = normalizedUpdates.name;
            }
            if (normalizedUpdates.description !== undefined) {
              next.description = normalizedUpdates.description;
            }
            if (normalizedUpdates.accentColor !== undefined) {
              next.accentColor = normalizedUpdates.accentColor;
            }
            if (normalizedUpdates.previewStyle !== undefined) {
              next.previewStyle = normalizedUpdates.previewStyle;
            }
            if (normalizedUpdates.sample === '__CURRENT__') {
              next.sample = clone(resume);
            } else if (normalizedUpdates.sample) {
              next.sample = clone(normalizedUpdates.sample);
            }
            if (normalizedUpdates.theme !== undefined) {
              const normalized = normalizeTemplateTheme(normalizedUpdates.theme);
              if (normalized) {
                next.theme = normalized;
              } else {
                delete next.theme;
              }
            }

            if (normalizedUpdates.previewStyle && normalizedUpdates.previewStyle !== 'custom') {
              delete next.theme;
            }
            if (next.previewStyle === 'custom' && next.accentColor) {
              next.theme = {
                accent: next.accentColor,
                ...next.theme,
              };
            }
            return next;
          }),
        );
        return true;
      };

      if (normalizedUpdates.sample === undefined) {
        applyUpdate();
      } else {
        runDestructiveAction(t('common.confirmations.updateTemplateSample'), applyUpdate);
      }
    },
    [resume, runDestructiveAction, setCustomTemplates, showInfo, showLimitExceeded, t],
  );

  return {
    allTemplates,
    activeTemplate,
    handleResetSample,
    handleTemplateStyleChange,
    handleTemplateSampleLoad,
    handleSaveCustomTemplate,
    handleDeleteCustomTemplate,
    handleUpdateCustomTemplate,
    loadTemplateForLocale,
  };
};
