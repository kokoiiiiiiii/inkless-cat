import {
  type ActiveSectionKey,
  createEmptyResume,
  createSampleResume,
  deriveSectionsFromResume,
  normalizeResumeSchema,
  type ResumeData,
} from '@entities/resume';
import {
  type ResumeTemplate,
  templates as builtInTemplates,
  type TemplateTheme,
} from '@entities/template';
import { useExportResume } from '@features/export-resume';
import { useImportResume } from '@features/import-resume';
import { useSortableSections } from '@features/sort-modules';
import { useMediaQuery } from '@shared/hooks';
import { clone } from '@shared/lib/clone';
import type { TemplateUpdatePayload } from '@widgets/template-selector';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { useResumeActions, useResumeState } from '@/stores/resume.store';
import { useUIActions, useUIState } from '@/stores/ui.store';

const STORAGE_KEY = 'inkless-cat-data';
const THEME_KEY = 'inkless-cat-theme';
const TEMPLATE_KEY = 'inkless-cat-template';
const SECTIONS_KEY = 'inkless-cat-sections';
const CUSTOM_TEMPLATES_KEY = 'inkless-cat-custom-templates';

const LEGACY_KEYS = {
  data: 'resume-studio-data',
  theme: 'resume-studio-theme',
  template: 'resume-studio-template',
  sections: 'resume-studio-sections',
  customTemplates: 'resume-studio-custom-templates',
} as const;

const THEME_KEYS: (keyof TemplateTheme)[] = [
  'accent',
  'background',
  'heading',
  'subheading',
  'text',
  'muted',
  'cardBackground',
  'cardBorder',
  'divider',
];

const isBrowser = typeof globalThis !== 'undefined';

const getStoredValue = (key: string, legacyKey?: string): string | null => {
  if (!isBrowser) return null;
  const current = globalThis.localStorage.getItem(key);
  if (current !== null) {
    return current;
  }
  if (legacyKey) {
    return globalThis.localStorage.getItem(legacyKey);
  }
  return null;
};

const normalizeTemplateTheme = (theme: unknown): TemplateTheme | undefined => {
  if (!theme || typeof theme !== 'object') {
    return undefined;
  }
  const normalized: TemplateTheme = {};
  for (const key of THEME_KEYS) {
    const value = (theme as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) {
      normalized[key] = value.trim();
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const loadInitialResume = (): ResumeData => {
  if (!isBrowser) {
    return normalizeResumeSchema(createSampleResume(), { clone: true });
  }
  const cached = getStoredValue(STORAGE_KEY, LEGACY_KEYS.data);
  if (cached) {
    try {
      return normalizeResumeSchema(JSON.parse(cached) as ResumeData, { clone: true });
    } catch {
      // ignore parse errors and fall back to defaults
    }
  }
  return normalizeResumeSchema(createSampleResume(), { clone: true });
};

const getDefaultTemplateId = (): string =>
  builtInTemplates[0]?.id ?? 'modern-blue';

const createCustomTemplateId = () =>
  `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

type SectionRefMap = Map<string, HTMLElement>;

export const useEditorController = () => {
  const { resume, activeSections, hasResumeChanges } = useResumeState();
  const { updateResume, updateActiveSections, setHasResumeChanges, resetState } =
    useResumeActions();
  const {
    theme,
    templateId,
    customTemplates,
    templatePanelOpen,
    modulePanelOpen,
    mobileView,
  } = useUIState();
  const {
    setTheme,
    setTemplateId,
    setCustomTemplates,
    setTemplatePanelOpen,
    setModulePanelOpen,
    setMobileView,
  } = useUIActions();
  const {
    customSections,
    toggleSection,
    reorderSections,
    addCustomSection: appendCustomSection,
    removeCustomSection,
  } = useSortableSections();
  const { importFromObject } = useImportResume();
  const { exportJson, exportMarkdown } = useExportResume();

  const deferredResume = useDeferredValue(resume);
  const deferredActiveSections = useDeferredValue(activeSections);
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');

  const allTemplates = useMemo<ResumeTemplate[]>(() => {
    if (!Array.isArray(customTemplates) || customTemplates.length === 0) {
      return builtInTemplates;
    }
    return [...builtInTemplates, ...customTemplates];
  }, [customTemplates]);

  const activeTemplate = useMemo<ResumeTemplate>(() => {
    const found = allTemplates.find((item) => item.id === templateId);
    return found ?? allTemplates[0] ?? builtInTemplates[0];
  }, [allTemplates, templateId]);

  const editorScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previewScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previewRefs = useRef<SectionRefMap>(new Map());
  const editorSectionRefs = useRef<SectionRefMap>(new Map());
  const resumePersistTimeoutRef = useRef<number | null>(null);
  const pendingResumeSnapshotRef = useRef<string | null>(null);
  const initialisedRef = useRef<boolean>(false);

  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;

    const initialResume = loadInitialResume();
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
      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }

    const storedTemplate = getStoredValue(TEMPLATE_KEY, LEGACY_KEYS.template);
    setTemplateId(storedTemplate || getDefaultTemplateId());

    const storedCustomTemplates = getStoredValue(
      CUSTOM_TEMPLATES_KEY,
      LEGACY_KEYS.customTemplates,
    );
    if (storedCustomTemplates) {
      try {
        const parsed = JSON.parse(storedCustomTemplates) as ResumeTemplate[];
        if (Array.isArray(parsed)) {
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
  }, [resetState, setTheme, setTemplateId, setCustomTemplates, updateActiveSections]);

  useEffect(() => {
    if (isLargeScreen) {
      setMobileView('editor');
    }
  }, [isLargeScreen, setMobileView]);

  useEffect(() => {
    if (isLargeScreen) return;
    const target =
      mobileView === 'editor'
        ? editorScrollContainerRef.current
        : previewScrollContainerRef.current;
    target?.scrollTo({ top: 0, behavior: 'smooth' });
    if (isBrowser) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [mobileView, isLargeScreen]);

  useEffect(() => {
    if (!isBrowser) return;
    if (resumePersistTimeoutRef.current !== null) {
      globalThis.clearTimeout(resumePersistTimeoutRef.current);
    }
    const snapshot = JSON.stringify(resume);
    pendingResumeSnapshotRef.current = snapshot;
    resumePersistTimeoutRef.current = globalThis.setTimeout(() => {
      globalThis.localStorage.setItem(STORAGE_KEY, snapshot);
      pendingResumeSnapshotRef.current = null;
    }, 400);
    return () => {
      if (resumePersistTimeoutRef.current !== null) {
        globalThis.clearTimeout(resumePersistTimeoutRef.current);
      }
    };
  }, [resume]);

  useEffect(() => {
    if (!isBrowser) return;
    return () => {
      if (pendingResumeSnapshotRef.current) {
        globalThis.localStorage.setItem(STORAGE_KEY, pendingResumeSnapshotRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isBrowser) return;
    globalThis.localStorage.setItem(SECTIONS_KEY, JSON.stringify(activeSections));
  }, [activeSections]);

  useEffect(() => {
    if (!isBrowser) return;
    globalThis.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!isBrowser || !templateId) return;
    globalThis.localStorage.setItem(TEMPLATE_KEY, templateId);
  }, [templateId]);

  useEffect(() => {
    if (!isBrowser) return;
    if (customTemplates.length === 0) {
      globalThis.localStorage.removeItem(CUSTOM_TEMPLATES_KEY);
      return;
    }
    globalThis.localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));
  }, [customTemplates]);

  useEffect(() => {
    const editorEl = editorScrollContainerRef.current;
    const previewEl = previewScrollContainerRef.current;
    if (!editorEl || !previewEl) return;

    let ticking = false;

    const syncScroll = () => {
      const editor = editorScrollContainerRef.current;
      const preview = previewScrollContainerRef.current;
      if (!editor || !preview) {
        ticking = false;
        return;
      }

      const orderedKeys = ['personal', ...activeSections];
      const sectionKeys = orderedKeys.filter(
        (key) =>
          editorSectionRefs.current.has(key) &&
          previewRefs.current.has(`${key}:__section__`),
      );

      if (sectionKeys.length === 0) {
        const editorScrollable = editor.scrollHeight - editor.clientHeight;
        const previewScrollable = preview.scrollHeight - preview.clientHeight;
        const ratio = editorScrollable > 0 ? editor.scrollTop / editorScrollable : 0;
        const target = previewScrollable > 0 ? ratio * previewScrollable : 0;
        preview.scrollTo({ top: target, behavior: 'auto' });
        ticking = false;
        return;
      }

      const editorHeights: number[] = [];
      const previewHeights: number[] = [];

      for (const key of sectionKeys) {
        const editorNode = editorSectionRefs.current.get(key);
        const previewNode = previewRefs.current.get(`${key}:__section__`);
        editorHeights.push(editorNode ? editorNode.offsetHeight : 0);
        previewHeights.push(previewNode ? previewNode.offsetHeight : 0);
      }

      let editorAccum = 0;
      let previewAccum = 0;
      const editorScrollTop = editor.scrollTop;
      let targetTop = 0;

      for (let index = 0; index < sectionKeys.length; index += 1) {
        const editorHeight = editorHeights[index];
        const previewHeight = previewHeights[index];
        const sectionStart = editorAccum;
        const sectionEnd = sectionStart + editorHeight;
        if (editorScrollTop < sectionEnd || index === sectionKeys.length - 1) {
          const sectionProgress =
            editorHeight > 0 ? (editorScrollTop - sectionStart) / editorHeight : 0;
          targetTop = previewAccum + sectionProgress * previewHeight;
          break;
        }
        editorAccum += editorHeight;
        previewAccum += previewHeight;
      }

      preview.scrollTo({ top: targetTop, behavior: 'auto' });
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        globalThis.requestAnimationFrame(syncScroll);
        ticking = true;
      }
    };

    editorEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      editorEl.removeEventListener('scroll', handleScroll);
    };
  }, [resume, activeSections]);

  const registerPreviewRef = useCallback(
    (sectionKey: string, itemKey: string, node: HTMLElement | null) => {
      const key = `${sectionKey}:${itemKey}`;
      if (node) {
        previewRefs.current.set(key, node);
      } else {
        previewRefs.current.delete(key);
      }
    },
    [],
  );

  const registerEditorSectionRef = useCallback((sectionKey: string, node: HTMLElement | null) => {
    if (node) {
      editorSectionRefs.current.set(sectionKey, node);
    } else {
      editorSectionRefs.current.delete(sectionKey);
    }
  }, []);

  const handleFieldFocus = useCallback(
    (sectionKey: string, itemKey: string) => {
      if (!isBrowser) return;
      const keysToTry = [];
      if (itemKey) {
        keysToTry.push(`${sectionKey}:${itemKey}`);
      }
      keysToTry.push(`${sectionKey}:__section__`);
      const targetNode = keysToTry
        .map((key) => previewRefs.current.get(key))
        .find(Boolean);
      if (!targetNode) return;
      globalThis.requestAnimationFrame(() => {
        if (typeof targetNode.scrollIntoView === 'function') {
          targetNode.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        }
        const toolbarHeight = 96;
        const targetTop = targetNode.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: Math.max(targetTop - toolbarHeight, 0),
          behavior: 'smooth',
        });
      });
    },
    [],
  );

  const handleResetSample = useCallback(() => {
    const templateSample =
      activeTemplate.sample ?? normalizeResumeSchema(createSampleResume(), { clone: true });
    resetState(templateSample);
    setHasResumeChanges(false);
  }, [activeTemplate.sample, resetState, setHasResumeChanges]);

  const handleClear = useCallback(() => {
    resetState(createEmptyResume());
    setHasResumeChanges(false);
  }, [resetState, setHasResumeChanges]);

  const handleImport = useCallback(
    (payload: unknown) => {
      const result = importFromObject(payload);
      if (!result.success && result.message && isBrowser) {
          globalThis.alert(result.message);
        }
    },
    [importFromObject],
  );

  const handleExportJson = useCallback(() => {
    exportJson();
  }, [exportJson]);

  const handleExportMarkdown = useCallback(() => {
    exportMarkdown();
  }, [exportMarkdown]);

  const handlePrint = useCallback(() => {
    if (!isBrowser) return;
    if (!isLargeScreen) {
      setMobileView('preview');
      globalThis.requestAnimationFrame(() => {
        globalThis.setTimeout(() => {
          globalThis.print();
        }, 120);
      });
      return;
    }
    globalThis.print();
  }, [isLargeScreen, setMobileView]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  }, [setTheme]);

  const handleToggleTemplatePanel = useCallback(() => {
    setTemplatePanelOpen((open) => !open);
  }, [setTemplatePanelOpen]);

  const toggleModulePanel = useCallback(() => {
    setModulePanelOpen((open) => !open);
  }, [setModulePanelOpen]);

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
        isBrowser &&
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
            builtInTemplates[0]?.id ||
            next[0]?.id ||
            previous.find((item) => item.id !== targetId)?.id ||
            templateId ||
            getDefaultTemplateId();
          setTemplateId(fallback);
        }
        return next;
      });
    },
    [setCustomTemplates, setTemplateId, templateId],
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

  const addCustomSection = useCallback(() => {
    if (!isBrowser) {
      appendCustomSection();
      return;
    }
    const input = globalThis.prompt('请输入模块名称', '自定义模块');
    if (input === null) return;
    appendCustomSection(input.trim() || '自定义模块');
  }, [appendCustomSection]);

  const showEditor = isLargeScreen || mobileView === 'editor';
  const showPreview = isLargeScreen || mobileView === 'preview';

  return {
    resume,
    deferredResume,
    activeSections,
    deferredActiveSections,
    customSections,
    updateResume,
    handleResetSample,
    handleClear,
    handleImport,
    handleExportJson,
    handleExportMarkdown,
    handlePrint,
    theme,
    toggleTheme,
    templatePanelOpen,
    handleToggleTemplatePanel,
    modulePanelOpen,
    toggleModulePanel,
    activeTemplate,
    customTemplates,
    handleTemplateStyleChange,
    handleTemplateSampleLoad,
    handleSaveCustomTemplate,
    handleDeleteCustomTemplate,
    handleUpdateCustomTemplate,
    addCustomSection,
    removeCustomSection,
    reorderSections,
    toggleSection,
    handleFieldFocus,
    registerPreviewRef,
    registerEditorSectionRef,
    editorScrollContainerRef,
    previewScrollContainerRef,
    showEditor,
    showPreview,
    isLargeScreen,
    mobileView,
    setMobileView,
    baseTemplates: builtInTemplates,
  };
};

export type UseEditorControllerResult = ReturnType<typeof useEditorController>;
