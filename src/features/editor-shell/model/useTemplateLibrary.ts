import { createSampleResume, normalizeResumeSchema, type ResumeData } from '@entities/resume';
import type { ResumeTemplate, TemplateUpdatePayload } from '@entities/template';
import { clone } from '@shared/lib/clone';
import { useCallback, useMemo } from 'react';

import { createCustomTemplateId, normalizeTemplateTheme } from '../lib/templateTheme';

type UseTemplateLibraryParams = {
  baseTemplates: ResumeTemplate[];
  templateId?: string;
  customTemplates: ResumeTemplate[];
  setTemplateId: (value: string) => void;
  setCustomTemplates: (updater: (prev: ResumeTemplate[]) => ResumeTemplate[]) => void;
  resume: ResumeData;
  resetState: (value: ResumeData) => void;
  hasResumeChanges: boolean;
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
  hasResumeChanges,
  setHasResumeChanges,
  defaultTemplateId,
}: UseTemplateLibraryParams) => {
  const allTemplates = useMemo<ResumeTemplate[]>(() => {
    if (!Array.isArray(customTemplates) || customTemplates.length === 0) {
      return baseTemplates;
    }
    return [...baseTemplates, ...customTemplates];
  }, [baseTemplates, customTemplates]);

  const activeTemplate = useMemo<ResumeTemplate>(() => {
    const found = allTemplates.find((item) => item.id === templateId);
    return found ?? allTemplates[0] ?? baseTemplates[0];
  }, [allTemplates, baseTemplates, templateId]);

  const handleResetSample = useCallback(() => {
    const templateSample =
      activeTemplate.sample ?? normalizeResumeSchema(createSampleResume(), { clone: true });
    resetState(templateSample);
    setHasResumeChanges(false);
  }, [activeTemplate.sample, resetState, setHasResumeChanges]);

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
      if (!template?.sample) return;
      if (
        hasResumeChanges &&
        typeof globalThis !== 'undefined' &&
        !globalThis.confirm('将使用该模板的示例数据覆盖当前内容，是否继续？')
      ) {
        return;
      }
      const normalized = normalizeResumeSchema(template.sample, { clone: true });
      resetState(normalized);
      setTemplateId(template.id);
      setHasResumeChanges(false);
    },
    [hasResumeChanges, resetState, setTemplateId, setHasResumeChanges],
  );

  const handleSaveCustomTemplate = useCallback(
    (payload: TemplateUpdatePayload) => {
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
        name: payload.name || '自定义模板',
        description: payload.description || '用户自定义模板',
        accentColor,
        previewStyle,
        theme: normalizedTheme,
        sample: clone(resume),
      };
      setCustomTemplates((previous) => [...previous, template]);
      setTemplateId(id);
    },
    [resume, setCustomTemplates, setTemplateId],
  );

  const handleDeleteCustomTemplate = useCallback(
    (targetId: string) => {
      setCustomTemplates((previous) => {
        const next = previous.filter((item) => item.id !== targetId);
        if (templateId === targetId) {
          const fallback =
            baseTemplates[0]?.id ||
            next[0]?.id ||
            previous.find((item) => item.id !== targetId)?.id ||
            templateId ||
            defaultTemplateId;
          setTemplateId(fallback);
        }
        return next;
      });
    },
    [baseTemplates, setCustomTemplates, setTemplateId, templateId, defaultTemplateId],
  );

  const handleUpdateCustomTemplate = useCallback(
    (targetId: string, updates: TemplateUpdatePayload) => {
      if (!targetId || !updates) return;
      setCustomTemplates((previous) =>
        previous.map((template) => {
          if (template.id !== targetId) {
            return template;
          }
          const next: ResumeTemplate = { ...template };
          for (const [key, value] of Object.entries(updates)) {
            if (key === 'sample') {
              if (value === '__CURRENT__') {
                next.sample = clone(resume);
              } else if (value && typeof value === 'object') {
                next.sample = clone(value as ResumeData);
              }
            } else if (key === 'theme') {
              const normalized = normalizeTemplateTheme(value);
              if (normalized) {
                next.theme = normalized;
              } else {
                delete next.theme;
              }
            } else if (typeof value === 'string') {
              (next as Record<string, unknown>)[key] = value;
            } else if (value !== undefined) {
              (next as Record<string, unknown>)[key] = value;
            }
          }
          if (updates.previewStyle && updates.previewStyle !== 'custom') {
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
    },
    [resume, setCustomTemplates],
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
  };
};
