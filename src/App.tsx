import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import { produce } from 'immer';
import type {
  ResumeCustomField,
  ResumeCustomSection,
  ResumeData,
  ResumeTemplate,
  TemplateTheme,
} from './types/resume';
import type { StandardSectionKey } from './data/sections';
import ResumeEditor from './components/ResumeEditor';
import ResumePreview from './components/ResumePreview';
import Toolbar from './components/Toolbar';
import { createEmptyResume, createSampleResume } from './data/sampleResume';
import { templates as baseTemplates } from './data/templates';
import { resumeToMarkdown } from './utils/markdown';
import {
  createCustomSection,
  extractCustomSectionId,
  getCustomSectionKey,
  isCustomSectionKey,
  sectionDefinitions,
  sectionOrder,
} from './data/sections';
import { createId } from './utils/id';

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

const TemplateSelector = lazy(() => import('./components/TemplateSelector'));

const TemplateSelectorFallback = () => (
  <div className="h-56 animate-pulse rounded-2xl border border-dashed border-slate-200/80 bg-white/60 dark:border-slate-800/70 dark:bg-slate-900/40" />
);

type ActiveSectionKey = StandardSectionKey | string;
type ResumeUpdater = (draft: ResumeData) => void;
type UpdateOptions = {
  markDirty?: boolean;
};

const clone = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value) as T;
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const isBrowser = typeof window !== 'undefined';

const getStoredValue = (key: string, legacyKey?: string): string | null => {
  if (!isBrowser) return null;
  const current = window.localStorage.getItem(key);
  if (current !== null) {
    return current;
  }
  if (legacyKey) {
    return window.localStorage.getItem(legacyKey);
  }
  return null;
};
const getDefaultSections = (): StandardSectionKey[] => sectionOrder.slice() as StandardSectionKey[];

const normalizeCustomField = (field?: Partial<ResumeCustomField> | null): ResumeCustomField => ({
  id: field?.id || createId('custom-field'),
  label: typeof field?.label === 'string' ? field.label : '',
  value: typeof field?.value === 'string' ? field.value : '',
});

const normalizeCustomSectionShape = (
  section: Partial<ResumeCustomSection> | null | undefined,
): ResumeCustomSection => {
  if (!section) return createCustomSection('自定义模块');
  const normalized: ResumeCustomSection = {
    id: section.id || createId('custom'),
    title: typeof section.title === 'string' ? section.title : '',
    mode: ['list', 'fields', 'text'].includes(section.mode as string)
      ? (section.mode as ResumeCustomSection['mode'])
      : 'list',
    items: Array.isArray(section.items)
      ? section.items
          .map((item) => (typeof item === 'string' ? item : ''))
          .filter((item): item is string => item !== undefined)
      : [],
    fields: Array.isArray(section.fields)
      ? section.fields.map((field) => normalizeCustomField(field))
      : [],
    text: typeof section.text === 'string' ? section.text : '',
  };
  if (normalized.mode === 'fields' && normalized.fields.length === 0) {
    normalized.fields = [normalizeCustomField()];
  }
  return normalized;
};

type NormalizeOptions = {
  clone?: boolean;
};

const normalizeResumeDraft = (draft: ResumeData): void => {
  if (!Array.isArray(draft.customSections)) {
    draft.customSections = [];
  }
  draft.customSections = draft.customSections.map((section) => normalizeCustomSectionShape(section));
};

const normalizeResumeSchema = (data: ResumeData, options: NormalizeOptions = {}): ResumeData => {
  const resume = options.clone ? clone(data) : data;
  normalizeResumeDraft(resume);
  return resume;
};

const loadInitialResume = (): ResumeData => {
  if (!isBrowser) return normalizeResumeSchema(createSampleResume(), { clone: true });
  const cached = getStoredValue(STORAGE_KEY, LEGACY_KEYS.data);
  if (cached) {
    try {
      return normalizeResumeSchema(JSON.parse(cached) as ResumeData, { clone: true });
    } catch (error) {
      console.warn('Failed to parse cached resume data', error);
    }
  }
  return normalizeResumeSchema(createSampleResume(), { clone: true });
};

const deriveSectionsFromResume = (data: ResumeData): ActiveSectionKey[] => {
  if (!data) return getDefaultSections();
  const baseKeys = sectionOrder.filter((key) => {
    const value = data[key];
    return Array.isArray(value) ? value.length > 0 : false;
  });
  const customKeys = Array.isArray(data.customSections)
    ? data.customSections.map((section) => getCustomSectionKey(section.id))
    : [];
  const combined = [...baseKeys, ...customKeys];
  return combined.length > 0 ? combined : getDefaultSections();
};

const sanitizeSections = (
  sections: string[] | null | undefined,
  resume: ResumeData,
): ActiveSectionKey[] => {
  if (!Array.isArray(sections)) return deriveSectionsFromResume(resume);
  const availableCustomIds = new Set(
    (resume?.customSections || []).map((section) => section.id),
  );
  const seen = new Set<string>();
  const filtered = sections.filter((key) => {
    if (seen.has(key)) return false;
    seen.add(key);
    if (sectionOrder.includes(key as StandardSectionKey)) return true;
    if (isCustomSectionKey(key)) {
      const id = extractCustomSectionId(key);
      return Boolean(id && availableCustomIds.has(id));
    }
    return false;
  });
  if (filtered.length === 0) {
    return deriveSectionsFromResume(resume);
  }
  return filtered;
};

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

const normalizeTemplateTheme = (theme: unknown): TemplateTheme | undefined => {
  if (!theme || typeof theme !== 'object') {
    return undefined;
  }
  const normalized: TemplateTheme = {};
  THEME_KEYS.forEach((key) => {
    const value = (theme as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) {
      normalized[key] = value.trim();
    }
  });
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

function App() {
  const initialResumeRef = useRef<ResumeData | null>(null);
  const [resume, setResume] = useState<ResumeData>(() => {
    const initial = loadInitialResume();
    initialResumeRef.current = initial;
    return initial;
  });
  const deferredResume = useDeferredValue(resume);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (!isBrowser) return 'light';
    const stored = getStoredValue(THEME_KEY, LEGACY_KEYS.theme);
    return stored === 'dark' ? 'dark' : 'light';
  });
  const [templateId, setTemplateId] = useState<string>(() => {
    if (!isBrowser) return baseTemplates[0].id;
    return getStoredValue(TEMPLATE_KEY, LEGACY_KEYS.template) || baseTemplates[0].id;
  });
  const [customTemplates, setCustomTemplates] = useState<ResumeTemplate[]>(() => {
    if (!isBrowser) return [];
    const cached = getStoredValue(CUSTOM_TEMPLATES_KEY, LEGACY_KEYS.customTemplates);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ResumeTemplate[];
        return Array.isArray(parsed)
          ? parsed
              .filter((item): item is ResumeTemplate => Boolean(item && item.id))
              .map((item) => ({
                ...item,
                theme: normalizeTemplateTheme(item.theme),
              }))
          : [];
      } catch (error) {
        console.warn('Failed to parse custom templates', error);
      }
    }
    return [];
  });
  const [templatePanelOpen, setTemplatePanelOpen] = useState<boolean>(true);
  const [modulePanelOpen, setModulePanelOpen] = useState<boolean>(true);
  const [hasResumeChanges, setHasResumeChanges] = useState<boolean>(false);
  const [activeSections, setActiveSections] = useState<ActiveSectionKey[]>(() => {
    const resumeSnapshot = initialResumeRef.current || loadInitialResume();
    if (!isBrowser) return deriveSectionsFromResume(resumeSnapshot);
    const cached = getStoredValue(SECTIONS_KEY, LEGACY_KEYS.sections);
    if (cached) {
      try {
        return sanitizeSections(JSON.parse(cached) as string[], resumeSnapshot);
      } catch (error) {
        console.warn('Failed to parse cached section data', error);
      }
    }
    return deriveSectionsFromResume(resumeSnapshot);
  });
  const deferredActiveSections = useDeferredValue(activeSections);

  const allTemplates: ResumeTemplate[] = [...baseTemplates, ...customTemplates];
  const activeTemplate =
    allTemplates.find((item) => item.id === templateId) || allTemplates[0] || baseTemplates[0];

  const previewRefs = useRef<Map<string, HTMLElement>>(new Map());
  const editorSectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const resumePersistTimeout = useRef<number | null>(null);
  const pendingResumeSnapshot = useRef<string | null>(null);
  const editorScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previewScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastActiveOrderRef = useRef<Map<string, number>>(new Map());

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

  const handleFieldFocus = (sectionKey, itemKey) => {
    if (!isBrowser) return;
    const keysToTry = [];
    if (itemKey) {
      keysToTry.push(`${sectionKey}:${itemKey}`);
    }
    keysToTry.push(`${sectionKey}:__section__`);
    const targetNode = keysToTry
      .map((key) => previewRefs.current.get(key))
      .find((node) => node);
    if (!targetNode) return;
    window.requestAnimationFrame(() => {
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
  };

  useEffect(() => {
    if (!isBrowser) return undefined;
    window.clearTimeout(resumePersistTimeout.current);
    const snapshot = JSON.stringify(resume);
    pendingResumeSnapshot.current = snapshot;
    resumePersistTimeout.current = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, snapshot);
      pendingResumeSnapshot.current = null;
    }, 400);
    return () => {
      window.clearTimeout(resumePersistTimeout.current);
    };
  }, [resume]);

  useEffect(() => {
    const editorEl = editorScrollContainerRef.current;
    const previewEl = previewScrollContainerRef.current;
    if (!editorEl || !previewEl) return undefined;
    let ticking = false;

    const syncScroll = () => {
      const editor = editorScrollContainerRef.current;
      const preview = previewScrollContainerRef.current;
      if (!editor || !preview) {
        ticking = false;
        return;
      }

      const sectionOrderKeys = ['personal', ...activeSections];
      const sectionKeys = sectionOrderKeys.filter((key) => {
        return (
          editorSectionRefs.current.has(key) &&
          previewRefs.current.has(`${key}:__section__`)
        );
      });

      if (sectionKeys.length === 0) {
        const editorScrollable = editor.scrollHeight - editor.clientHeight;
        const previewScrollable = preview.scrollHeight - preview.clientHeight;
        const ratio = editorScrollable > 0 ? editor.scrollTop / editorScrollable : 0;
        const target = previewScrollable > 0 ? ratio * previewScrollable : 0;
        preview.scrollTo({ top: target, behavior: 'auto' });
        ticking = false;
        return;
      }

      const editorHeights = [];
      const previewHeights = [];
      let editorAccum = 0;
      let previewAccum = 0;
      const editorScrollTop = editor.scrollTop;
      let targetTop = 0;

      for (let index = 0; index < sectionKeys.length; index += 1) {
        const key = sectionKeys[index];
        const editorNode = editorSectionRefs.current.get(key);
        const previewNode = previewRefs.current.get(`${key}:__section__`);
        const editorHeight = editorNode ? editorNode.offsetHeight : 0;
        const previewHeight = previewNode ? previewNode.offsetHeight : 0;
        editorHeights.push(editorHeight);
        previewHeights.push(previewHeight);
      }

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
        window.requestAnimationFrame(syncScroll);
        ticking = true;
      }
    };

    editorEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      editorEl.removeEventListener('scroll', handleScroll);
    };
  }, [resume, activeSections]);

  useEffect(() => {
    if (!isBrowser) return undefined;
    return () => {
      if (pendingResumeSnapshot.current) {
        window.localStorage.setItem(STORAGE_KEY, pendingResumeSnapshot.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isBrowser) return;
    window.localStorage.setItem(SECTIONS_KEY, JSON.stringify(activeSections));
  }, [activeSections]);

  useEffect(() => {
    const map = lastActiveOrderRef.current;
    activeSections.forEach((key, index) => {
      map.set(key, index);
    });
  }, [activeSections]);

  useEffect(() => {
    if (!isBrowser) return;
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!isBrowser) return;
    window.localStorage.setItem(TEMPLATE_KEY, templateId);
  }, [templateId]);

  useEffect(() => {
    if (!isBrowser) return;
    window.localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));
  }, [customTemplates]);

  const updateResume = useCallback(
    (updater: ResumeData | ResumeUpdater, options: UpdateOptions = {}) => {
      const { markDirty = true } = options;
      setResume((prev) => {
        if (typeof updater === 'function') {
          return produce(prev, (draft: ResumeData) => {
            (updater as ResumeUpdater)(draft);
            normalizeResumeDraft(draft);
          });
        }
        return normalizeResumeSchema(updater as ResumeData, { clone: true });
      });
      setHasResumeChanges(Boolean(markDirty));
    },
    [setHasResumeChanges]
  );

  const handleResetSample = () => {
    const normalized = normalizeResumeSchema(activeTemplate.sample, { clone: true });
    updateResume(normalized, { markDirty: false });
    setActiveSections(deriveSectionsFromResume(normalized));
  };

  const handleClear = () => {
    const empty = normalizeResumeSchema(createEmptyResume(), { clone: true });
    updateResume(empty, { markDirty: false });
    setActiveSections(deriveSectionsFromResume(empty));
  };

  const handleImport = (data: unknown) => {
    if (!data || typeof data !== 'object' || !('personal' in data)) {
      window.alert('导入的文件缺少必要的字段。');
      return;
    }
    const normalized = normalizeResumeSchema(data as ResumeData, { clone: true });
    updateResume(normalized);
    setActiveSections(deriveSectionsFromResume(normalized));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(resume, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resume-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const markdown = resumeToMarkdown(resume, { activeSections });
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resume-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const handleTemplateStyleChange = (template) => {
    setTemplateId(template.id);
  };

  const handleTemplateSampleLoad = (template) => {
    if (hasResumeChanges) {
      const confirmed = window.confirm('将使用该模板的示例数据覆盖当前内容，是否继续？');
      if (!confirmed) return;
    }
    const normalized = normalizeResumeSchema(template.sample, { clone: true });
    updateResume(normalized, { markDirty: false });
    setTemplateId(template.id);
    setActiveSections(deriveSectionsFromResume(normalized));
  };

  const handleSaveCustomTemplate = useCallback(
    ({ name, description, accentColor, previewStyle, theme }) => {
      const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const resolvedPreviewStyle = previewStyle || 'modern';
      const resolvedAccentColor = accentColor || '#2563eb';
      const normalizedTheme = normalizeTemplateTheme(
        resolvedPreviewStyle === 'custom'
          ? { accent: resolvedAccentColor, ...(theme ?? {}) }
          : theme,
      );
      const template = {
        id,
        name: name || '自定义模板',
        description: description || '用户自定义模板',
        accentColor: resolvedAccentColor,
        previewStyle: resolvedPreviewStyle,
        theme: normalizedTheme,
        sample: clone(resume),
      };
      setCustomTemplates((prev) => [...prev, template]);
      setTemplateId(id);
    },
    [resume]
  );

  const handleDeleteCustomTemplate = useCallback(
    (templateIdToDelete) => {
      setCustomTemplates((prev) => {
        const next = prev.filter((item) => item.id !== templateIdToDelete);
        if (templateId === templateIdToDelete) {
          const fallbackTemplate =
            baseTemplates[0]?.id ||
            next[0]?.id ||
            (prev.find((item) => item.id !== templateIdToDelete)?.id ?? templateId);
          if (fallbackTemplate) {
            setTemplateId(fallbackTemplate);
          }
        }
        return next;
      });
    },
    [templateId]
  );

  const handleUpdateCustomTemplate = useCallback(
    (templateIdToUpdate, updates) => {
      if (!templateIdToUpdate || !updates) return;
      setCustomTemplates((prev) =>
        prev.map((template) => {
          if (template.id !== templateIdToUpdate) {
            return template;
          }
          const next = { ...template };
          Object.entries(updates).forEach(([key, value]) => {
            if (key === 'sample') {
              if (value === '__CURRENT__') {
                next.sample = clone(resume);
              } else if (value && typeof value === 'object') {
                next.sample = clone(value as ResumeData);
              }
            } else if (key === 'theme') {
              const normalizedTheme = normalizeTemplateTheme(value);
              if (normalizedTheme) {
                next.theme = normalizedTheme;
              } else {
                delete next.theme;
              }
            } else if (typeof value === 'string') {
              next[key] = value;
            } else if (value !== undefined) {
              next[key] = value;
            }
          });
          if (updates.previewStyle && updates.previewStyle !== 'custom') {
            delete next.theme;
          }
          if (next.previewStyle === 'custom' && next.accentColor && next.theme) {
            next.theme = {
              ...next.theme,
              accent: next.accentColor,
            };
          }
          return next;
        }),
      );
    },
    [resume]
  );

  const handleAddCustomSection = useCallback(() => {
    if (typeof window === 'undefined') return;
    const input = window.prompt('请输入模块名称', '自定义模块');
    if (input === null) return;
    const title = input.trim() || '自定义模块';
    const newSection = createCustomSection(title);
    updateResume((draft) => {
      if (!Array.isArray(draft.customSections)) {
        draft.customSections = [];
      }
      draft.customSections.push(newSection);
    });
    const newKey = getCustomSectionKey(newSection.id);
    setActiveSections((prev) => {
      const without = prev.filter((key) => key !== newKey);
      return [...without, newKey];
    });
  }, [updateResume]);

  const handleRemoveCustomSection = useCallback(
    (sectionId) => {
      const targetKey = getCustomSectionKey(sectionId);
      setActiveSections((prev) => prev.filter((key) => key !== targetKey));
      updateResume((draft) => {
        if (!Array.isArray(draft.customSections)) return;
        draft.customSections = draft.customSections.filter((item) => item.id !== sectionId);
      });
    },
    [updateResume]
  );

  const handleSectionReorder = useCallback(
    (nextOrder) => {
      if (!Array.isArray(nextOrder)) return;
      setActiveSections((prev) => {
        const sanitized = sanitizeSections(nextOrder as string[], resume);
        if (sanitized.length === prev.length && sanitized.every((key, index) => key === prev[index])) {
          return prev;
        }
        return sanitized;
      });
    },
    [resume],
  );

  const handleSectionToggle = useCallback(
    (sectionKey, enabled) => {
      setActiveSections((prev) => {
        const existingIndex = prev.indexOf(sectionKey);
        if (existingIndex === -1 && !enabled) {
          return prev;
        }
        const cleaned = prev.filter((key) => key !== sectionKey);
        if (!enabled) {
          return cleaned;
        }
        if (existingIndex !== -1) {
          return prev;
        }
        const savedIndex = lastActiveOrderRef.current.get(sectionKey);
        const next = [...cleaned];
        if (typeof savedIndex === 'number' && Number.isFinite(savedIndex)) {
          const clamped = Math.max(0, Math.min(savedIndex, next.length));
          next.splice(clamped, 0, sectionKey);
          return next;
        }
        next.push(sectionKey);
        return next;
      });
      if (enabled && sectionOrder.includes(sectionKey as StandardSectionKey)) {
        updateResume((draft) => {
          const standardKey = sectionKey as StandardSectionKey;
          const currentSection = draft[standardKey];
          if (!Array.isArray(currentSection)) {
            (draft as Record<StandardSectionKey, unknown[]>)[standardKey] = [];
          }
          const items = (draft[standardKey] as unknown[]) || [];
          if (items.length === 0) {
            const factory = sectionDefinitions[standardKey]?.createItem;
            if (typeof factory === 'function') {
              items.push(factory());
            }
            (draft as Record<StandardSectionKey, unknown[]>)[standardKey] = items;
          }
        });
      }
    },
    [updateResume]
  );

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <Toolbar
        onResetSample={handleResetSample}
        onClear={handleClear}
        onImport={handleImport}
        onExport={handleExport}
        onExportMarkdown={handleExportMarkdown}
        onPrint={handlePrint}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="mx-auto grid w-full max-w-[1400px] flex-1 gap-6 px-4 pb-16 pt-6 lg:grid-cols-2 print:max-w-none print:px-0 print:pb-0 print:pt-0">
        <section className="flex min-h-0 flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-soft backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/60 dark:shadow-[0_35px_60px_-25px_rgba(15,23,42,0.75)] print:hidden lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">编辑器</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              左侧编辑内容，右侧实时预览排版效果。
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200"
              onClick={() => setTemplatePanelOpen((open) => !open)}
              aria-expanded={templatePanelOpen}
            >
              {templatePanelOpen ? '收起模板' : '展开模板'}
            </button>
          </div>
          <div
            ref={editorScrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-2 scrollbar-thin"
          >
            {templatePanelOpen && (
              <div className="mb-4">
                <Suspense fallback={<TemplateSelectorFallback />}>
                  <TemplateSelector
                    builtInTemplates={baseTemplates}
                    customTemplates={customTemplates}
                    activeId={activeTemplate.id}
                    onStyleChange={handleTemplateStyleChange}
                    onLoadSample={handleTemplateSampleLoad}
                    onSaveTemplate={handleSaveCustomTemplate}
                    onDeleteTemplate={handleDeleteCustomTemplate}
                    onUpdateTemplate={handleUpdateCustomTemplate}
                  />
                </Suspense>
              </div>
            )}
            <ResumeEditor
              resume={resume}
              onChange={updateResume}
              onFieldFocus={handleFieldFocus}
              activeSections={activeSections}
              onSectionToggle={handleSectionToggle}
              onSectionReorder={handleSectionReorder}
              customSections={resume.customSections || []}
              onAddCustomSection={handleAddCustomSection}
              onRemoveCustomSection={handleRemoveCustomSection}
              modulePanelOpen={modulePanelOpen}
              onToggleModulePanel={() => setModulePanelOpen((open) => !open)}
              registerSectionRef={registerEditorSectionRef}
            />
          </div>
        </section>
        <section className="flex min-h-0 flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-soft backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/60 dark:shadow-[0_35px_60px_-25px_rgba(15,23,42,0.75)] print:m-0 print:block print:w-full print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden">
          <div className="flex items-center justify-between print:hidden">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">实时预览</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                模板：{activeTemplate.name}
              </p>
            </div>
          </div>
          <div
            ref={previewScrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-2 scrollbar-thin"
          >
            <ResumePreview
              resume={deferredResume}
              registerSectionRef={registerPreviewRef}
              templateStyle={activeTemplate.previewStyle}
              accentColor={activeTemplate.accentColor}
              activeSections={deferredActiveSections}
              theme={activeTemplate.theme}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
