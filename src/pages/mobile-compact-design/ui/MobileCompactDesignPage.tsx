/* eslint-disable tailwindcss/no-custom-classname -- M0 selectors are defined in the adjacent CSS module. */
import './mobile-compact-design.css';

import type { ResumeCustomSection, ResumeData } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import { ResumePreview } from '@features/resume-preview';
import { SectionManager } from '@features/section-manager';
import { I18nProvider, useI18n } from '@shared/i18n';
import { MAX_IMAGE_DIMENSION, MAX_IMAGE_FILE_BYTES, MAX_IMAGE_PIXELS } from '@shared/lib/limits';
import { TemplateSelector, type TemplateUpdatePayload } from '@widgets/template-selector';
import {
  type ChangeEvent,
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { createM0Resume, createM0Templates, M0_ACTIVE_SECTIONS } from '../model/fixtures';
import { useM0Strings } from '../model/strings';

type View = 'edit' | 'preview';
type Screen = 'workspace' | 'templates' | 'modules';
type PreviewMode = 'responsive' | 'fixed' | 'reader';

const prototypeQuery = new URLSearchParams(globalThis.location.search);
const brandMark = new URL('../../../assets/inkless-cat-256.webp', import.meta.url).href;
const firstBuiltInTemplate = (locale: 'zh-CN' | 'en', resume: ResumeData) => {
  const first = createM0Templates(locale, resume).builtInTemplates[0];
  if (!first) throw new Error('M0 prototype requires at least one synthetic template');
  return first;
};
const cycleDialogFocus = (dialog: HTMLDialogElement, event: KeyboardEvent) => {
  if (event.key !== 'Tab') return;
  const focusable = [
    ...dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => element.getClientRects().length > 0 && element.tabIndex >= 0);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
  if (activeIndex === -1) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
  } else if (event.shiftKey && activeIndex === 0) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && activeIndex === focusable.length - 1) {
    event.preventDefault();
    first?.focus();
  }
};

const Icon = ({ name }: { name: 'spark' | 'more' | 'edit' | 'preview' | 'back' | 'chevron' }) => {
  const paths: Record<typeof name, string> = {
    spark:
      'M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3zm7 12 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15z',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    edit: 'M4 20h4l10.5-10.5a2.12 2.12 0 0 0-4-4L4 16v4zm9.5-13.5 4 4',
    preview: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    back: 'm15 18-6-6 6-6M9 12h12',
    chevron: 'm9 18 6-6-6-6',
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="m0-icon"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
};

const M0Experience = () => {
  const strings = useM0Strings();
  const { locale, setLocale } = useI18n();
  const [view, setView] = useState<View>(() =>
    prototypeQuery.get('view') === 'preview' ? 'preview' : 'edit',
  );
  const [screen, setScreen] = useState<Screen>(() => {
    const screen = prototypeQuery.get('screen');
    return screen === 'templates' || screen === 'modules' ? screen : 'workspace';
  });
  const [resume, setResume] = useState<ResumeData>(() => createM0Resume(locale));
  const [activeSections, setActiveSections] = useState<string[]>([...M0_ACTIVE_SECTIONS]);
  const [template, setTemplate] = useState<ResumeTemplate>(() =>
    firstBuiltInTemplate(locale, createM0Resume(locale)),
  );
  const [templates, setTemplates] = useState<ReturnType<typeof createM0Templates>>(() =>
    createM0Templates(locale, createM0Resume(locale)),
  );
  const [actionOpen, setActionOpen] = useState(() => prototypeQuery.get('screen') === 'actions');
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingTemplateDelete, setPendingTemplateDelete] = useState<Pick<
    ResumeTemplate,
    'id' | 'name'
  > | null>(null);
  const [toast, setToast] = useState('');
  const [resumeLength, setResumeLength] = useState<'single' | 'long'>(() =>
    prototypeQuery.get('resume') === 'long' ? 'long' : 'single',
  );
  const [previewMode, setPreviewMode] = useState<PreviewMode>(() => {
    const mode = prototypeQuery.get('mode');
    return mode === 'fixed' || mode === 'reader' ? mode : 'responsive';
  });
  const [zoomed, setZoomed] = useState(() => prototypeQuery.get('zoom') === 'true');
  const [dark, setDark] = useState(() => prototypeQuery.get('theme') === 'dark');
  const [fontScale, setFontScale] = useState(() => {
    const scale = Number(prototypeQuery.get('font'));
    return scale === 1.5 || scale === 2 ? scale : 1;
  });
  const [keyboardSimulation, setKeyboardSimulation] = useState(
    () => prototypeQuery.get('keyboard') === 'true',
  );
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [previewHeight, setPreviewHeight] = useState(500);
  const [previewViewportWidth, setPreviewViewportWidth] = useState(0);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const actionDialogRef = useRef<HTMLDialogElement | null>(null);
  const confirmDialogRef = useRef<HTMLDialogElement | null>(null);
  const deleteTemplateDialogRef = useRef<HTMLDialogElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const clearReturnFocus = useRef<HTMLElement | null>(null);
  const deleteTemplateReturnFocus = useRef<HTMLElement | null>(null);
  const deleteTemplateConfirmed = useRef(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined);
  const editScrollTop = useRef(0);
  const managementReturn = useRef<{ screen: 'templates' | 'modules'; scrollTop: number }>({
    screen: 'templates',
    scrollTop: 0,
  });
  const resetForLocale = useCallback(
    (nextLocale: 'zh-CN' | 'en') => {
      const nextResume = createM0Resume(nextLocale, resumeLength);
      const nextTemplates = createM0Templates(nextLocale, nextResume);
      setResume(nextResume);
      setTemplates(nextTemplates);
      setTemplate(firstBuiltInTemplate(nextLocale, nextResume));
    },
    [resumeLength],
  );

  useEffect(() => {
    resetForLocale(locale);
  }, [locale, resetForLocale]);

  useEffect(
    () => () => {
      if (photoUrl.startsWith('blob:')) URL.revokeObjectURL(photoUrl);
      if (toastTimer.current) globalThis.clearTimeout(toastTimer.current);
    },
    [photoUrl],
  );

  useEffect(() => {
    const dialog = actionDialogRef.current;
    if (!dialog) return;
    if (actionOpen && !dialog.open) {
      previousFocus.current = document.activeElement as HTMLElement;
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-action-first]')?.focus();
    } else if (!actionOpen && dialog.open) {
      dialog.close();
    }
  }, [actionOpen]);

  useEffect(() => {
    const dialog = confirmDialogRef.current;
    if (!dialog) return;
    if (confirmClear && !dialog.open) {
      clearReturnFocus.current = document.activeElement as HTMLElement;
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-dialog-autofocus]')?.focus();
    } else if (!confirmClear && dialog.open) {
      dialog.close();
    }
    if (!confirmClear) return;
    const handleFocusCycle = (event: KeyboardEvent) => cycleDialogFocus(dialog, event);
    document.addEventListener('keydown', handleFocusCycle, true);
    return () => document.removeEventListener('keydown', handleFocusCycle, true);
  }, [confirmClear]);

  useEffect(() => {
    const dialog = deleteTemplateDialogRef.current;
    if (!dialog) return;
    if (pendingTemplateDelete && !dialog.open) {
      deleteTemplateReturnFocus.current = document.activeElement as HTMLElement;
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-dialog-autofocus]')?.focus();
    } else if (!pendingTemplateDelete && dialog.open) {
      dialog.close();
    }
    if (!pendingTemplateDelete) return;
    const handleFocusCycle = (event: KeyboardEvent) => cycleDialogFocus(dialog, event);
    document.addEventListener('keydown', handleFocusCycle, true);
    return () => document.removeEventListener('keydown', handleFocusCycle, true);
  }, [pendingTemplateDelete]);

  useEffect(() => {
    const dialog = actionDialogRef.current;
    if (!dialog || !actionOpen) return;
    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target === dialog) setActionOpen(false);
    };
    const handleFocusCycle = (event: KeyboardEvent) => cycleDialogFocus(dialog, event);
    dialog.addEventListener('click', handleBackdropClick);
    document.addEventListener('keydown', handleFocusCycle, true);
    return () => {
      dialog.removeEventListener('click', handleBackdropClick);
      document.removeEventListener('keydown', handleFocusCycle, true);
    };
  }, [actionOpen]);

  const say = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) globalThis.clearTimeout(toastTimer.current);
    toastTimer.current = globalThis.setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => {
    const node = previewContentRef.current;
    if (!node) return;
    const paper = node.closest<HTMLElement>('.m0-paper');
    const measureHeight = () =>
      setPreviewHeight(Math.max(node.scrollHeight, paper?.scrollHeight ?? 0));
    const observer = new ResizeObserver(measureHeight);
    observer.observe(node);
    if (paper) observer.observe(paper);
    measureHeight();
    return () => observer.disconnect();
  }, [resume, template, activeSections, resumeLength, previewMode]);

  useEffect(() => {
    const viewport = previewViewportRef.current;
    if (!viewport) return;
    const measureWidth = () => setPreviewViewportWidth(viewport.clientWidth);
    const observer = new ResizeObserver(measureWidth);
    observer.observe(viewport);
    measureWidth();
    return () => observer.disconnect();
  }, [screen, view]);

  const openPreview = () => {
    editScrollTop.current = document.querySelector<HTMLElement>('.m0-main')?.scrollTop ?? 0;
    setScreen('workspace');
    setView('preview');
    document.querySelector<HTMLElement>('.m0-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openEdit = () => {
    const returningFromManagement = screen !== 'workspace';
    const returningFromPreview = screen === 'workspace' && view === 'preview';
    setScreen('workspace');
    setView('edit');
    requestAnimationFrame(() => {
      const main = document.querySelector<HTMLElement>('.m0-main');
      if (returningFromManagement) {
        main?.scrollTo({ top: managementReturn.current.scrollTop, behavior: 'instant' });
        document
          .querySelector<HTMLElement>(`[data-m0-entry="${managementReturn.current.screen}"]`)
          ?.focus({ preventScroll: true });
      } else if (returningFromPreview) {
        main?.scrollTo({ top: editScrollTop.current, behavior: 'instant' });
      } else {
        main?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };
  const openManagement = (next: 'templates' | 'modules') => {
    managementReturn.current = {
      screen: next,
      scrollTop: document.querySelector<HTMLElement>('.m0-main')?.scrollTop ?? 0,
    };
    setScreen(next);
    setView('edit');
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('.m0-main')?.scrollTo({ top: 0, behavior: 'instant' }),
    );
  };
  const jumpToExperience = () => {
    setScreen('workspace');
    setView('edit');
    requestAnimationFrame(() => {
      const section = document.querySelector<HTMLElement>('.m0-workspace .m0-section-card');
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      section?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    });
  };
  const updatePersonal = (key: keyof NonNullable<ResumeData['personal']>, value: string) => {
    setResume((current) => ({ ...current, personal: { ...current.personal, [key]: value } }));
  };
  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    if (
      file.size > MAX_IMAGE_FILE_BYTES ||
      !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
    ) {
      setPhotoError(strings.photoError);
      event.target.value = '';
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (
        image.naturalWidth > MAX_IMAGE_DIMENSION ||
        image.naturalHeight > MAX_IMAGE_DIMENSION ||
        image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS
      ) {
        URL.revokeObjectURL(objectUrl);
        setPhotoError(strings.photoError);
      } else {
        setPhotoUrl((previous) => {
          if (previous.startsWith('blob:')) URL.revokeObjectURL(previous);
          return objectUrl;
        });
      }
      if (photoInputRef.current) photoInputRef.current.value = '';
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setPhotoError(strings.photoError);
      if (photoInputRef.current) photoInputRef.current.value = '';
    };
    image.src = objectUrl;
  };

  const updateTemplate = (selected: ResumeTemplate) => {
    setTemplate(selected);
    setTemplates((current) => ({
      ...current,
      customTemplates: current.customTemplates.map((item) =>
        item.id === selected.id ? selected : item,
      ),
    }));
  };
  const allCustomSections = resume.customSections ?? [];
  const sectionToggle = (key: string, enabled: boolean) =>
    setActiveSections((current) => {
      const next = new Set(current);
      if (enabled) next.add(key);
      else next.delete(key);
      return [...next];
    });
  const reorderSections = (next: string[]) => {
    setActiveSections(next);
  };
  const changeLength = (next: 'single' | 'long') => {
    setResumeLength(next);
    setResume(createM0Resume(locale, next));
    setActiveSections([...M0_ACTIVE_SECTIONS]);
  };
  const registerPreviewSection = useCallback(
    (sectionKey: string, itemKey: string, node: HTMLElement | null) => {
      if (!node) return;
      node.dataset.m0Section = sectionKey;
      node.dataset.m0Item = itemKey;
    },
    [],
  );
  const scale =
    previewMode === 'fixed'
      ? Math.min(1, Math.max(0.1, (previewViewportWidth || globalThis.innerWidth - 60) / 794))
      : previewMode === 'reader' && zoomed
        ? 1.28
        : 1;

  const handleAction = (action: string) => {
    setActionOpen(false);
    switch (action) {
      case 'clear': {
        globalThis.setTimeout(() => setConfirmClear(true), 120);
        break;
      }
      case 'sample': {
        say(strings.sampleDone);
        break;
      }
      case 'import': {
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = '.json,.md,.zip,application/json,text/markdown';
        picker.onchange = () =>
          say(picker.files?.length ? strings.fileReturned : strings.fileCancelled);
        picker.addEventListener('cancel', () => say(strings.fileCancelled), { once: true });
        picker.click();
        break;
      }
      case 'language': {
        setLocale(locale === 'en' ? 'zh-CN' : 'en');
        break;
      }
      case 'theme': {
        setDark((value) => !value);
        break;
      }
      case 'provider': {
        say(strings.demoNoProvider);
        break;
      }
      case 'ai': {
        say(strings.demoNoAi);
        break;
      }
      default: {
        say(strings.noExport);
      }
    }
  };

  const templatesView = (
    <TemplateSelector
      builtInTemplates={templates.builtInTemplates}
      customTemplates={templates.customTemplates}
      activeId={template.id}
      onStyleChange={updateTemplate}
      onLoadSample={() => say(strings.templateLoadedNote)}
      onSaveTemplate={(payload: TemplateUpdatePayload) => {
        const newTemplate = {
          ...template,
          ...payload,
          id: `m0-custom-${Date.now()}`,
          name: payload.name || (locale === 'en' ? 'My demo template' : '我的演示模板'),
          sample: resume,
          localizedSamples: { 'zh-CN': resume, en: resume },
        } as ResumeTemplate;
        setTemplates((current) => ({
          ...current,
          customTemplates: [...current.customTemplates, newTemplate],
        }));
        setTemplate(newTemplate);
        say(strings.templateSaved);
      }}
      onDeleteTemplate={(id) => {
        const target = templates.customTemplates.find((item) => item.id === id);
        if (target) setPendingTemplateDelete({ id: target.id, name: target.name });
      }}
      onUpdateTemplate={(id, updates) =>
        setTemplates((current) => ({
          ...current,
          customTemplates: current.customTemplates.map((item) =>
            item.id === id ? ({ ...item, ...updates } as ResumeTemplate) : item,
          ),
        }))
      }
    />
  );

  return (
    <div
      className={`m0-app ${dark ? 'is-dark' : ''} ${keyboardSimulation ? 'keyboard-is-simulated' : ''}`}
      data-font-scale={fontScale}
      style={{ '--m0-font-scale': fontScale } as CSSProperties}
    >
      <header className="m0-header" data-testid="m0-header">
        <a
          className="m0-brand"
          href="#prototype"
          aria-label={strings.brand}
          onClick={(event) => event.preventDefault()}
        >
          <img className="m0-mark" src={brandMark} alt="" />
          <span className="m0-brand-copy">
            <strong>{strings.brand}</strong>
            <small>{strings.prototype}</small>
          </span>
        </a>
        <div className="m0-header-actions">
          <button
            className="m0-icon-button m0-ai"
            type="button"
            onClick={() => say(strings.demoNoAi)}
            aria-label={strings.aiCreate}
          >
            <Icon name="spark" />
            <span>{strings.aiCreate}</span>
          </button>
          <button
            className="m0-icon-button m0-more-trigger"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={actionOpen}
            aria-label={actionOpen ? strings.closeActions : strings.more}
            onClick={() => setActionOpen((open) => !open)}
          >
            <Icon name="more" />
          </button>
        </div>
      </header>

      <main className="m0-main">
        <div className="m0-prototype-bar">
          <div>
            <span className="m0-live-dot" />
            {strings.syntheticData}
          </div>
          <details className="m0-lab">
            <summary>{strings.simulationTools}</summary>
            <div className="m0-lab-controls">
              <label>
                {strings.fontScale}
                <select
                  value={fontScale}
                  onChange={(event) => setFontScale(Number(event.target.value))}
                >
                  <option value={1}>{strings.fontNormal}</option>
                  <option value={1.5}>{strings.font150}</option>
                  <option value={2}>{strings.font200}</option>
                </select>
              </label>
              <label className="m0-check">
                <input
                  type="checkbox"
                  checked={keyboardSimulation}
                  onChange={(event) => setKeyboardSimulation(event.target.checked)}
                />
                {strings.keyboardLabel}
              </label>
              <label className="m0-check">
                <input
                  type="checkbox"
                  checked={dark}
                  onChange={(event) => setDark(event.target.checked)}
                />
                {strings.dark}
              </label>
              <label>
                {strings.language}
                <select
                  value={locale}
                  onChange={(event) => setLocale(event.target.value as 'zh-CN' | 'en')}
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>
          </details>
        </div>

        {screen === 'workspace' && view === 'edit' ? (
          <div className="m0-screen-context">
            <span className="m0-eyebrow">
              {strings.editor} / {strings.personal}
            </span>
            <span className="m0-save-state">
              <span aria-hidden="true">•</span>
              {strings.saved}
            </span>
          </div>
        ) : (
          <div className="m0-screen-heading">
            <div>
              <p className="m0-eyebrow">
                {screen === 'workspace'
                  ? strings.preview
                  : screen === 'templates'
                    ? strings.templateSelection
                    : strings.moduleManagement}
              </p>
              <h1>
                {screen === 'workspace'
                  ? strings.previewTitle
                  : screen === 'templates'
                    ? strings.template
                    : strings.modules}
              </h1>
            </div>
            <span className="m0-save-state">
              <span aria-hidden="true">•</span>
              {strings.saved}
            </span>
          </div>
        )}

        {screen === 'workspace' && view === 'edit' && (
          <section className="m0-workspace" aria-label={strings.editor}>
            <div className="m0-summary-card">
              <div className="m0-section-title">
                <div>
                  <span className="m0-eyebrow">01 / {strings.editor}</span>
                  <h2>{strings.personal}</h2>
                </div>
                <span className="m0-state-pill">{strings.saved}</span>
              </div>
              <div className="m0-avatar-row">
                <div className="m0-avatar" aria-label={strings.photo}>
                  {photoUrl ? (
                    <img src={photoUrl} alt={strings.photo} />
                  ) : (
                    <span>{String(resume.personal?.fullName ?? 'IC').slice(0, 1)}</span>
                  )}
                </div>
                <div className="m0-avatar-copy">
                  <strong>{strings.photo}</strong>
                  <span>{strings.photoHint}</span>
                  <div className="m0-avatar-actions">
                    <button type="button" onClick={() => photoInputRef.current?.click()}>
                      {strings.selectPhoto}
                    </button>
                    {photoUrl && (
                      <button
                        type="button"
                        className="m0-subtle-action"
                        onClick={() => {
                          URL.revokeObjectURL(photoUrl);
                          setPhotoUrl('');
                        }}
                      >
                        {strings.removePhoto}
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={photoInputRef}
                  className="m0-visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={handlePhoto}
                />
              </div>
              {photoError && (
                <p className="m0-error" role="alert">
                  {photoError}
                </p>
              )}
              <div className="m0-form-grid">
                <label className="m0-field">
                  <span>{strings.fieldName}</span>
                  <input
                    value={resume.personal?.fullName ?? ''}
                    onChange={(event) => updatePersonal('fullName', event.target.value)}
                  />
                </label>
                <label className="m0-field">
                  <span>{strings.fieldTitle}</span>
                  <input
                    value={resume.personal?.title ?? ''}
                    onChange={(event) => updatePersonal('title', event.target.value)}
                  />
                </label>
                <label className="m0-field">
                  <span>{strings.fieldEmail}</span>
                  <input
                    type="email"
                    inputMode="email"
                    value={resume.personal?.email ?? ''}
                    onChange={(event) => updatePersonal('email', event.target.value)}
                  />
                </label>
                <label className="m0-field">
                  <span>{strings.fieldPhone}</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={resume.personal?.phone ?? ''}
                    onChange={(event) => updatePersonal('phone', event.target.value)}
                  />
                </label>
                <label className="m0-field m0-field-wide">
                  <span>{strings.fieldSummary}</span>
                  <textarea
                    rows={4}
                    value={resume.personal?.summary ?? ''}
                    onChange={(event) => updatePersonal('summary', event.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="m0-entry-grid">
              <button
                type="button"
                className="m0-entry-card"
                data-m0-entry="templates"
                onClick={() => openManagement('templates')}
              >
                <span className="m0-entry-icon">Aa</span>
                <span>
                  <strong>{strings.currentTemplate}</strong>
                  <small>
                    {template.name} · {strings.openTemplates}
                  </small>
                </span>
                <Icon name="chevron" />
              </button>
              <button
                type="button"
                className="m0-entry-card"
                data-m0-entry="modules"
                onClick={() => openManagement('modules')}
              >
                <span className="m0-entry-icon">☷</span>
                <span>
                  <strong>{strings.modules}</strong>
                  <small>
                    {strings.activeCount.replace('{count}', String(activeSections.length))} ·{' '}
                    {strings.openModules}
                  </small>
                </span>
                <Icon name="chevron" />
              </button>
            </div>
            <section className="m0-section-card">
              <div className="m0-section-title">
                <div>
                  <span className="m0-eyebrow">02 / {strings.content}</span>
                  <h2>{strings.experience}</h2>
                </div>
                <span className="m0-state-pill">{strings.saved}</span>
              </div>
              <label className="m0-field">
                <span>{strings.company}</span>
                <input
                  value={resume.experience?.[0]?.company ?? ''}
                  onChange={(event) =>
                    setResume((current) => ({
                      ...current,
                      experience: current.experience?.map((item, index) =>
                        index === 0 ? { ...item, company: event.target.value } : item,
                      ),
                    }))
                  }
                />
              </label>
              <label className="m0-field">
                <span>{strings.role}</span>
                <input
                  value={resume.experience?.[0]?.role ?? ''}
                  onChange={(event) =>
                    setResume((current) => ({
                      ...current,
                      experience: current.experience?.map((item, index) =>
                        index === 0 ? { ...item, role: event.target.value } : item,
                      ),
                    }))
                  }
                />
              </label>
              <label className="m0-field">
                <span>{strings.highlights}</span>
                <textarea
                  rows={4}
                  value={resume.experience?.[0]?.highlights?.[0] ?? ''}
                  onChange={(event) =>
                    setResume((current) => ({
                      ...current,
                      experience: current.experience?.map((item, index) =>
                        index === 0
                          ? {
                              ...item,
                              highlights: [
                                event.target.value,
                                ...(item.highlights?.slice(1) ?? []),
                              ],
                            }
                          : item,
                      ),
                    }))
                  }
                />
              </label>
            </section>
            {keyboardSimulation && (
              <div className="m0-keyboard-sim" aria-label={strings.keyboardLabel}>
                <div className="m0-keyboard-handle" />
                {Array.from({ length: 3 }, (_, row) => (
                  <div className="m0-key-row" key={row}>
                    {Array.from({ length: row === 1 ? 9 : 10 }, (_, key) => (
                      <i key={key} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {screen === 'workspace' && view === 'preview' && (
          <section className="m0-preview-screen" aria-label={strings.previewTitle}>
            <div className="m0-preview-tools">
              <div className="m0-length-toggle" role="group" aria-label={strings.previewLength}>
                <button
                  type="button"
                  aria-pressed={resumeLength === 'single'}
                  onClick={() => changeLength('single')}
                >
                  {strings.onePage}
                </button>
                <button
                  type="button"
                  aria-pressed={resumeLength === 'long'}
                  onClick={() => changeLength('long')}
                >
                  {strings.threePage}
                </button>
              </div>
              <label className="m0-preview-select">
                {strings.previewMode}
                <select
                  value={previewMode}
                  onChange={(event) => {
                    setPreviewMode(event.target.value as PreviewMode);
                    setZoomed(false);
                  }}
                >
                  <option value="responsive">{strings.modeA}</option>
                  <option value="fixed">{strings.modeB}</option>
                  <option value="reader">{strings.modeC}</option>
                </select>
              </label>
            </div>
            <p className="m0-experiment-note">
              {strings.previewSynthetic} ·{' '}
              {previewMode === 'responsive'
                ? strings.modeADesc
                : previewMode === 'fixed'
                  ? strings.modeBDesc
                  : strings.modeCDesc}
            </p>
            <div
              ref={previewViewportRef}
              className={`m0-paper-viewport mode-${previewMode}`}
              data-testid="m0-paper-viewport"
              data-preview-mode={previewMode}
            >
              <div
                className="m0-paper-measure"
                style={{
                  width: previewMode === 'fixed' ? `${794 * scale}px` : '100%',
                  height:
                    previewMode === 'fixed'
                      ? `${previewHeight * scale}px`
                      : previewMode === 'reader' && zoomed
                        ? `${previewHeight * scale}px`
                        : undefined,
                }}
              >
                <div
                  className="m0-paper-scale"
                  style={{
                    width:
                      previewMode === 'fixed'
                        ? '794px'
                        : previewMode === 'reader' && zoomed
                          ? `${100 / scale}%`
                          : '100%',
                    transform: `scale(${scale})`,
                  }}
                >
                  <div
                    className="m0-paper"
                    style={{ width: previewMode === 'fixed' ? '794px' : '100%' }}
                  >
                    <div className="m0-preview-content" ref={previewContentRef}>
                      <ResumePreview
                        resume={resume}
                        templateStyle={template.previewStyle}
                        accentColor={template.accentColor}
                        activeSections={activeSections}
                        theme={template.theme}
                        registerSectionRef={registerPreviewSection}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="m0-preview-foot">
              <span className="m0-experiment-tag">{strings.paperStyleOnly}</span>
              {previewMode === 'reader' && (
                <button type="button" onClick={() => setZoomed((value) => !value)}>
                  {zoomed ? strings.zoomOut : strings.zoomIn}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const section = document.querySelector('[data-m0-section="experience"]');
                  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {strings.locateExperience}
              </button>
            </div>
          </section>
        )}

        {screen === 'templates' && (
          <section className="m0-management-screen">
            <button type="button" className="m0-back-button" onClick={openEdit}>
              <Icon name="back" />
              {strings.backToEdit}
            </button>
            <div className="m0-current-template">
              <span className="m0-template-swatch" style={{ background: template.accentColor }} />
              <div>
                <small>{strings.currentTemplate}</small>
                <strong>{template.name}</strong>
              </div>
              <span className="m0-selected-check" aria-label="selected">
                ✓
              </span>
            </div>
            <p className="m0-note">{strings.templateLiveNote}</p>
            {templatesView}
          </section>
        )}

        {screen === 'modules' && (
          <section className="m0-management-screen">
            <button type="button" className="m0-back-button" onClick={openEdit}>
              <Icon name="back" />
              {strings.backToEdit}
            </button>
            <div className="m0-section-card">
              <div className="m0-section-title">
                <div>
                  <span className="m0-eyebrow">03 / {strings.editor}</span>
                  <h2>{strings.moduleManagement}</h2>
                </div>
              </div>
              <p className="m0-note">{strings.moduleNote}</p>
              <SectionManager
                activeSections={activeSections}
                onToggleSection={sectionToggle}
                customSections={allCustomSections}
                onAddCustomSection={() => {
                  const id = `m0-proof-${Date.now()}`;
                  const section: ResumeCustomSection = {
                    id,
                    title: locale === 'en' ? 'New demo section' : '新的演示模块',
                    mode: 'text',
                    text: locale === 'en' ? 'Synthetic custom content.' : '合成自定义内容。',
                    items: [],
                    fields: [],
                  };
                  setResume((current) => ({
                    ...current,
                    customSections: [...(current.customSections ?? []), section],
                  }));
                  setActiveSections((current) => [...current, `custom:${id}`]);
                  say(strings.customAdded);
                }}
                onRemoveCustomSection={(id) => {
                  setResume((current) => ({
                    ...current,
                    customSections: current.customSections?.filter((item) => item.id !== id),
                  }));
                  setActiveSections((current) => current.filter((key) => key !== `custom:${id}`));
                }}
                isOpen
                onReorderSections={reorderSections}
              />
            </div>
            <button type="button" className="m0-primary-button" onClick={jumpToExperience}>
              {strings.jumpToExperience}
            </button>
          </section>
        )}
      </main>

      <nav className="m0-dock" aria-label={strings.editor} data-testid="m0-dock">
        <button
          type="button"
          className={view === 'edit' && screen === 'workspace' ? 'is-selected' : ''}
          aria-current={view === 'edit' && screen === 'workspace' ? 'page' : undefined}
          onClick={openEdit}
        >
          <Icon name="edit" />
          <span>{strings.editor}</span>
        </button>
        <button
          type="button"
          className={view === 'preview' && screen === 'workspace' ? 'is-selected' : ''}
          aria-current={view === 'preview' && screen === 'workspace' ? 'page' : undefined}
          onClick={openPreview}
        >
          <Icon name="preview" />
          <span>{strings.preview}</span>
        </button>
      </nav>

      <dialog
        ref={actionDialogRef}
        className="m0-action-dialog"
        aria-label={strings.actions}
        onCancel={(event) => {
          event.preventDefault();
          setActionOpen(false);
        }}
        onClose={() => {
          if (actionOpen) setActionOpen(false);
          requestAnimationFrame(() => previousFocus.current?.focus());
        }}
      >
        <div className="m0-sheet-grabber" aria-hidden="true" />
        <header className="m0-sheet-header">
          <div>
            <span className="m0-eyebrow">{strings.brand}</span>
            <h2>{strings.actions}</h2>
          </div>
          <button
            type="button"
            className="m0-sheet-close"
            aria-label={strings.close}
            onClick={() => setActionOpen(false)}
          >
            ×
          </button>
        </header>
        <div className="m0-sheet-scroll">
          <section className="m0-action-group">
            <h3>{strings.fileGroup}</h3>
            <button data-action-first type="button" onClick={() => handleAction('import')}>
              <span>{strings.import}</span>
              <small>{strings.importDesc}</small>
            </button>
            <div className="m0-action-row">
              <button type="button" onClick={() => handleAction('json')}>
                {strings.exportJson}
              </button>
              <button type="button" onClick={() => handleAction('workspace')}>
                {strings.exportWorkspace}
              </button>
              <button type="button" onClick={() => handleAction('markdown')}>
                {strings.exportMarkdown}
              </button>
            </div>
            <button type="button" onClick={() => handleAction('print')}>
              <span>{strings.printPdf}</span>
              <small>{strings.noExport}</small>
            </button>
          </section>
          <section className="m0-action-group">
            <h3>{strings.aiGroup}</h3>
            <button type="button" onClick={() => handleAction('ai')}>
              {strings.aiCreate}
              <small>{strings.demoNoAi}</small>
            </button>
            <button type="button" onClick={() => handleAction('provider')}>
              {strings.aiSettings}
              <small>{strings.demoNoProvider}</small>
            </button>
          </section>
          <section className="m0-action-group">
            <h3>{strings.toolsGroup}</h3>
            <button type="button" onClick={() => handleAction('sample')}>
              {strings.loadSample}
              <small>{strings.templateLoadedNote}</small>
            </button>
            <button
              className="m0-danger-action"
              type="button"
              onClick={() => handleAction('clear')}
            >
              {strings.clearResume}
              <small>{strings.clearDescription}</small>
            </button>
          </section>
          <section className="m0-action-group">
            <h3>{strings.preferences}</h3>
            <div className="m0-action-row">
              <button type="button" onClick={() => handleAction('theme')}>
                {strings.theme}: {dark ? strings.dark : strings.light}
              </button>
              <button type="button" onClick={() => handleAction('language')}>
                {strings.language}: {locale === 'en' ? 'English' : '中文'}
              </button>
            </div>
            <a href="https://github.com/kokoiiiiiiii/inkless-cat" target="_blank" rel="noreferrer">
              {strings.github}
            </a>
          </section>
        </div>
        <p className="m0-sheet-footer">
          {strings.demoLabel} · {strings.noExport}
        </p>
      </dialog>

      <dialog
        ref={confirmDialogRef}
        role="alertdialog"
        aria-labelledby="m0-clear-title"
        aria-describedby="m0-clear-desc"
        className="m0-confirm-dialog"
        onCancel={(event) => {
          event.preventDefault();
          setConfirmClear(false);
        }}
        onClose={() => requestAnimationFrame(() => clearReturnFocus.current?.focus())}
      >
        <h2 id="m0-clear-title">{strings.clearTitle}</h2>
        <p id="m0-clear-desc">{strings.clearDescription}</p>
        <div>
          <button type="button" data-dialog-autofocus onClick={() => setConfirmClear(false)}>
            {strings.cancel}
          </button>
          <button
            type="button"
            className="m0-danger-button"
            onClick={() => {
              setResume(createM0Resume(locale));
              setResumeLength('single');
              setActiveSections([...M0_ACTIVE_SECTIONS]);
              setConfirmClear(false);
              say(strings.clearDone);
            }}
          >
            {strings.clearConfirm}
          </button>
        </div>
      </dialog>
      <dialog
        ref={deleteTemplateDialogRef}
        role="alertdialog"
        aria-labelledby="m0-template-delete-title"
        aria-describedby="m0-template-delete-desc"
        className="m0-confirm-dialog"
        onCancel={(event) => {
          event.preventDefault();
          setPendingTemplateDelete(null);
        }}
        onClose={() =>
          requestAnimationFrame(() => {
            if (deleteTemplateConfirmed.current) {
              deleteTemplateConfirmed.current = false;
              document
                .querySelector<HTMLElement>('.m0-management-screen input[type="radio"]:checked')
                ?.focus();
            } else {
              deleteTemplateReturnFocus.current?.focus();
            }
          })
        }
      >
        <h2 id="m0-template-delete-title">{strings.templateDeleteTitle}</h2>
        <p id="m0-template-delete-desc">
          {pendingTemplateDelete
            ? `${pendingTemplateDelete.name}. ${strings.templateDeleteDescription}`
            : strings.templateDeleteDescription}
        </p>
        <div>
          <button
            type="button"
            data-dialog-autofocus
            onClick={() => setPendingTemplateDelete(null)}
          >
            {strings.cancel}
          </button>
          <button
            type="button"
            className="m0-danger-button"
            onClick={() => {
              if (!pendingTemplateDelete) return;
              deleteTemplateConfirmed.current = true;
              const deletingActive = pendingTemplateDelete.id === template.id;
              setTemplates((current) => ({
                ...current,
                customTemplates: current.customTemplates.filter(
                  (item) => item.id !== pendingTemplateDelete.id,
                ),
              }));
              if (deletingActive) setTemplate(firstBuiltInTemplate(locale, resume));
              setPendingTemplateDelete(null);
              say(strings.templateDeleted);
            }}
          >
            {strings.templateDeleteConfirm}
          </button>
        </div>
      </dialog>
      {toast && (
        <div className="m0-toast" role="status">
          {toast}
        </div>
      )}
      <footer className="m0-page-footer">
        M0 · {strings.previewSynthetic} · {strings.demoNoPrint}
      </footer>
    </div>
  );
};

const MobileCompactDesignPage = () => (
  <I18nProvider
    initialLocale={prototypeQuery.get('locale') === 'en' ? 'en' : 'zh-CN'}
    persistLocale={false}
  >
    <M0Experience />
  </I18nProvider>
);

export default MobileCompactDesignPage;
