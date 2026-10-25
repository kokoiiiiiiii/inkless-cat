import { type IconName, StudioButton, StudioDialog, StudioField, StudioIcon } from '@shared/ui';
import { motion, MotionConfig, useReducedMotion } from 'motion/react';
import {
  type FocusEvent as ReactFocusEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { copy, type CopyKey, formatCopy, localized } from '../model/copy';
import {
  createDemoModules,
  createDemoResume,
  type DemoModule,
  type DemoResume,
  type Direction,
  type Locale,
  type LocalizedText,
  type ResumeLength,
  type SectionId,
  type StudioMode,
} from '../model/fixtures';
import { ResumePaper } from './ResumePaper';
import { type AssistTarget, SectionEditor } from './SectionEditor';
import styles from './studio-v3.module.css';

type ThemeMode = 'light' | 'dark';
type TemplateOption = { id: string; title: LocalizedText; description: LocalizedText };
type DialogState =
  | { kind: 'editor'; section: SectionId }
  | { kind: 'ai'; target: AssistTarget; status: 'idle' | 'loading' | 'ready' | 'error' | 'applied' }
  | { kind: 'info'; title: CopyKey; description: CopyKey }
  | { kind: 'command' }
  | { kind: 'add-module' }
  | { kind: 'add-template' }
  | null;

const DEFAULT_TEMPLATES: TemplateOption[] = [
  {
    id: 'editorial',
    title: { zh: '留白叙事', en: 'Editorial' },
    description: {
      zh: '克制的标题与分隔线，适合产品与设计岗位。',
      en: 'Quiet type and rules for product and design roles.',
    },
  },
  {
    id: 'columns',
    title: { zh: '清晰分栏', en: 'Clear columns' },
    description: {
      zh: '信息层级更紧凑，适合内容较长的履历。',
      en: 'Compact hierarchy for longer work histories.',
    },
  },
  {
    id: 'signal',
    title: { zh: '重点标记', en: 'Signal accents' },
    description: {
      zh: '用单一强调色标出项目成果和关键信息。',
      en: 'One restrained accent for outcomes and key details.',
    },
  },
];

const SECTION_LABELS: Partial<Record<SectionId, CopyKey>> = {
  profile: 'profile',
  experience: 'experience',
  projects: 'projects',
  education: 'education',
  skills: 'skills',
  languages: 'languages',
  awards: 'awards',
  interests: 'interests',
};

const SECTION_ICONS: Record<string, IconName> = {
  profile: 'user',
  experience: 'briefcase',
  projects: 'book',
  education: 'book',
  skills: 'spark',
  languages: 'globe',
  awards: 'award',
  interests: 'layers',
};

function initialDirection(): Direction {
  return new URLSearchParams(globalThis.location.search).get('direction') === 'b'
    ? 'pageboard'
    : 'draftbook';
}

function defaultMode(direction: Direction): StudioMode {
  return direction === 'draftbook' ? 'edit' : 'canvas';
}

function sectionLabel(section: SectionId, modules: DemoModule[], locale: Locale): string {
  const key = SECTION_LABELS[section];
  if (key) return copy(locale, key);
  const module = modules.find((item) => item.id === section);
  return module ? localized(module.title, locale) : copy(locale, 'modules');
}

function FocusedMode({
  children,
  id,
  reducedMotion,
}: {
  children: ReactNode;
  id: string;
  reducedMotion: boolean;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={styles.modeTransition}
      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
      key={id}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function StudioV3D0Page() {
  const reducedMotion = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dialogReturnFocusRef = useRef<HTMLElement | null>(null);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const composingRef = useRef(false);
  const sectionScrollPositions = useRef(new Map<SectionId, number>());
  const savedCanvasScroll = useRef(0);
  const moduleSequence = useRef(1);
  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [mode, setMode] = useState<StudioMode>(() => defaultMode(initialDirection()));
  const [locale, setLocale] = useState<Locale>('zh');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [length, setLength] = useState<ResumeLength>('long');
  const [resume, setResume] = useState<DemoResume>(() => createDemoResume('long'));
  const [modules, setModules] = useState<DemoModule[]>(() => createDemoModules('long'));
  const [templates, setTemplates] = useState<TemplateOption[]>(DEFAULT_TEMPLATES);
  const [templateId, setTemplateId] = useState('editorial');
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [experienceIndex, setExperienceIndex] = useState(0);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [moduleDraft, setModuleDraft] = useState('');
  const [templateDraft, setTemplateDraft] = useState('');
  const [commandQuery, setCommandQuery] = useState('');
  const [notice, setNotice] = useState('');

  const sectionOrder: SectionId[] = ['profile', ...modules.map((item) => item.id)];

  useEffect(() => {
    if (!notice) return;
    const timer = globalThis.setTimeout(() => setNotice(''), 2600);
    return () => globalThis.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (dialog?.kind !== 'ai' || dialog.status !== 'loading') return;
    const timer = globalThis.setTimeout(() => {
      setDialog((current) =>
        current?.kind === 'ai' && current.status === 'loading'
          ? { ...current, status: 'ready' }
          : current,
      );
    }, 520);
    return () => globalThis.clearTimeout(timer);
  }, [dialog]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k' &&
        !event.isComposing &&
        !composingRef.current
      ) {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          (target.isContentEditable || target.matches('input, textarea, select'))
        )
          return;
        event.preventDefault();
        const activeElement = document.activeElement;
        dialogReturnFocusRef.current =
          activeElement instanceof HTMLElement &&
          activeElement.matches('button, a[href], summary, [tabindex]:not([tabindex="-1"])')
            ? activeElement
            : null;
        setCommandQuery('');
        setDialog({ kind: 'command' });
      }
    };
    globalThis.addEventListener('keydown', handleShortcut);
    return () => globalThis.removeEventListener('keydown', handleShortcut);
  }, []);

  useLayoutEffect(() => {
    if (mode === 'edit' && editorScrollRef.current) {
      editorScrollRef.current.scrollTop = sectionScrollPositions.current.get(activeSection) ?? 0;
    }
    if (mode === 'canvas' && canvasScrollRef.current) {
      canvasScrollRef.current.scrollTop = savedCanvasScroll.current;
    }
  }, [activeSection, mode]);

  const setViewMode = (next: StudioMode) => {
    if (mode === 'edit' && next !== 'edit' && editorScrollRef.current) {
      sectionScrollPositions.current.set(activeSection, editorScrollRef.current.scrollTop);
    }
    if (mode === 'canvas' && next !== 'canvas' && canvasScrollRef.current) {
      savedCanvasScroll.current = canvasScrollRef.current.scrollTop;
    }
    setMode(next);
  };

  const chooseDirection = (next: Direction) => {
    if (next === direction) return;
    if (mode === 'edit' && editorScrollRef.current)
      sectionScrollPositions.current.set(activeSection, editorScrollRef.current.scrollTop);
    if (mode === 'canvas' && canvasScrollRef.current)
      savedCanvasScroll.current = canvasScrollRef.current.scrollTop;
    setDirection(next);
    setMode(defaultMode(next));
    const query = next === 'pageboard' ? '?direction=b' : '?direction=a';
    globalThis.history.replaceState(null, '', `${globalThis.location.pathname}${query}`);
  };

  const chooseSection = (section: SectionId) => {
    if (editorScrollRef.current)
      sectionScrollPositions.current.set(activeSection, editorScrollRef.current.scrollTop);
    setActiveSection(section);
  };

  const showEditDialog = (section: SectionId) => {
    setActiveSection(section);
    setDialog({ kind: 'editor', section });
  };

  const loadFixture = (next: ResumeLength) => {
    setLength(next);
    setResume(createDemoResume(next));
    setModules(createDemoModules(next));
    setTemplates(DEFAULT_TEMPLATES);
    setTemplateId('editorial');
    setActiveSection('profile');
    setExperienceIndex(0);
    setDialog(null);
    setViewMode(defaultMode(direction));
    setNotice(copy(locale, 'updated'));
  };

  const changeModuleVisibility = (id: SectionId) => {
    setModules((previous) =>
      previous.map((module) =>
        module.id === id ? { ...module, enabled: !module.enabled } : module,
      ),
    );
    setNotice(copy(locale, 'changedModule'));
  };

  const moveModule = (index: number, delta: -1 | 1) => {
    setModules((previous) => {
      const target = index + delta;
      if (target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      const left = next[index];
      const right = next[target];
      if (!left || !right) return previous;
      next[index] = right;
      next[target] = left;
      return next;
    });
    setNotice(copy(locale, 'movedModule'));
  };

  const openAI = (target: AssistTarget) => setDialog({ kind: 'ai', target, status: 'idle' });

  const activeAIText =
    dialog?.kind === 'ai'
      ? dialog.target.type === 'summary'
        ? localized(resume.summary, locale)
        : dialog.target.type === 'experience'
          ? localized(
              resume.experiences[dialog.target.index]?.highlights ?? { zh: '', en: '' },
              locale,
            )
          : localized(
              resume.projects[dialog.target.index]?.description ?? { zh: '', en: '' },
              locale,
            )
      : '';

  const sampleSuggestion =
    dialog?.kind === 'ai'
      ? dialog.target.type === 'summary'
        ? locale === 'zh'
          ? '7 年 B2B 产品设计经验，推动复杂工作流、设计系统与 AI 协作体验落地；善于将研究证据转化为可验证的产品决策。'
          : 'Product designer with 7 years in B2B, turning research into measurable workflow, design system, and AI collaboration improvements.'
        : dialog.target.type === 'experience'
          ? locale === 'zh'
            ? '重构企业客户配置流程，首次成功部署率由 61% 提升至 84%。\n牵头设计系统落地，减少跨团队重复界面需求 31%。'
            : 'Redesigned enterprise onboarding, raising successful deployment from 61% to 84%.\nLed design system adoption, reducing repeated UI requests by 31%.'
          : locale === 'zh'
            ? '把访谈证据连接到具体产品决策，帮助分布式团队更快回顾研究发现并采取行动。'
            : 'Connected interview evidence to product decisions so distributed teams could revisit research and act with confidence.'
      : '';

  const applySampleSuggestion = () => {
    if (dialog?.kind !== 'ai') return;
    const target = dialog.target;
    if (target.type === 'summary') {
      setResume((previous) => ({
        ...previous,
        summary: { ...previous.summary, [locale]: sampleSuggestion },
      }));
    } else if (target.type === 'experience') {
      setResume((previous) => ({
        ...previous,
        experiences: previous.experiences.map((entry, index) =>
          index === target.index
            ? { ...entry, highlights: { ...entry.highlights, [locale]: sampleSuggestion } }
            : entry,
        ),
      }));
    } else {
      setResume((previous) => ({
        ...previous,
        projects: previous.projects.map((project, index) =>
          index === target.index
            ? { ...project, description: { ...project.description, [locale]: sampleSuggestion } }
            : project,
        ),
      }));
    }
    setDialog({ ...dialog, status: 'applied' });
    setNotice(copy(locale, 'applied'));
  };

  const addCustomModule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (composingRef.current || !moduleDraft.trim()) return;
    const suffix = moduleSequence.current++;
    const id = `custom-${suffix}`;
    const title = moduleDraft.trim();
    setModules((previous) => [
      ...previous,
      { id: `custom:${id}`, title: { zh: title, en: title }, enabled: true },
    ]);
    setResume((previous) => ({
      ...previous,
      customSections: [
        ...previous.customSections,
        {
          id,
          title: { zh: title, en: title },
          body: {
            zh: copy(locale, 'customContent'),
            en: copy(locale, 'customContentEn'),
          },
        },
      ],
    }));
    const newSection = `custom:${id}` as SectionId;
    setModuleDraft('');
    setDialog(null);
    setNotice(copy(locale, 'moduleCreated'));
    if (direction === 'draftbook') {
      setActiveSection(newSection);
      setViewMode('edit');
    }
  };

  const addCustomTemplate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (composingRef.current || !templateDraft.trim()) return;
    const title = templateDraft.trim();
    const option: TemplateOption = {
      id: `custom-template-${moduleSequence.current++}`,
      title: { zh: title, en: title },
      description: {
        zh: '当前页面内的自定义版式演示。',
        en: 'A custom layout demo held on this page only.',
      },
    };
    setTemplates((previous) => [...previous, option]);
    setTemplateId(option.id);
    setTemplateDraft('');
    setDialog(null);
    setNotice(copy(locale, 'templateCreated'));
  };

  const handleRootKeyDownCapture = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && composingRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const rememberDialogReturnTarget = (target: EventTarget | null) => {
    if (dialog || !(target instanceof HTMLElement)) return;
    const candidate = target.closest<HTMLElement>(
      'button, a[href], summary, input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );
    if (candidate) dialogReturnFocusRef.current = candidate;
  };

  const handleRootFocusCapture = (event: ReactFocusEvent<HTMLDivElement>) => {
    rememberDialogReturnTarget(event.target);
  };

  const handleRootPointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    rememberDialogReturnTarget(event.target);
  };

  const navItems: { mode: StudioMode; label: CopyKey; icon: IconName }[] =
    direction === 'draftbook'
      ? [
          { mode: 'edit', label: 'writing', icon: 'book' },
          { mode: 'modules', label: 'modules', icon: 'layers' },
          { mode: 'templates', label: 'templates', icon: 'award' },
          { mode: 'preview', label: 'preview', icon: 'eye' },
        ]
      : [
          { mode: 'canvas', label: 'canvas', icon: 'eye' },
          { mode: 'modules', label: 'structure', icon: 'layers' },
          { mode: 'templates', label: 'layout', icon: 'award' },
        ];

  const dialogTitle =
    dialog?.kind === 'editor'
      ? `${copy(locale, 'editorDialog')} · ${sectionLabel(dialog.section, modules, locale)}`
      : dialog?.kind === 'ai'
        ? copy(locale, 'aiTitle')
        : dialog?.kind === 'info'
          ? copy(locale, dialog.title)
          : dialog?.kind === 'command'
            ? copy(locale, 'commandTitle')
            : dialog?.kind === 'add-module'
              ? copy(locale, 'addModule')
              : dialog?.kind === 'add-template'
                ? copy(locale, 'newCustomTemplate')
                : '';
  const dialogDescription =
    dialog?.kind === 'editor'
      ? copy(locale, 'sectionSavedPosition')
      : dialog?.kind === 'ai'
        ? copy(locale, 'aiDisclosure')
        : dialog?.kind === 'info'
          ? copy(locale, dialog.description)
          : dialog?.kind === 'command'
            ? copy(locale, 'commandDescription')
            : dialog?.kind === 'add-module'
              ? copy(locale, 'moduleHint')
              : dialog?.kind === 'add-template'
                ? copy(locale, 'templateHint')
                : '';

  const commandItems = useMemo(() => {
    const base = [
      ...sectionOrder.map((section) => ({
        id: `section:${section}`,
        label: sectionLabel(section, modules, locale),
        icon: SECTION_ICONS[section.split(':')[0] ?? ''] ?? 'layers',
        action: () => {
          if (direction === 'draftbook') {
            chooseSection(section);
            setViewMode('edit');
          } else {
            showEditDialog(section);
          }
        },
      })),
      {
        id: 'view:modules',
        label: copy(locale, 'modules'),
        icon: 'layers' as IconName,
        action: () => setViewMode('modules'),
      },
      {
        id: 'view:templates',
        label: copy(locale, 'templates'),
        icon: 'award' as IconName,
        action: () => setViewMode('templates'),
      },
      {
        id: 'view:preview',
        label: copy(locale, 'openPreview'),
        icon: 'eye' as IconName,
        action: () => setViewMode(direction === 'draftbook' ? 'preview' : 'canvas'),
      },
    ];
    return base.filter((item) =>
      item.label.toLocaleLowerCase().includes(commandQuery.trim().toLocaleLowerCase()),
    );
    // The current command list is intentionally derived from page-local fixture state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandQuery, direction, locale, modules, sectionOrder]);

  const switchFixture = (next: ResumeLength, element: HTMLElement) => {
    element.closest('details')?.removeAttribute('open');
    if (next === length) return;
    loadFixture(next);
  };

  const sectionScroller = editorScrollRef;
  const activeSectionTitle = sectionLabel(activeSection, modules, locale);
  const sectionNumber = Math.max(1, sectionOrder.indexOf(activeSection) + 1);

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={styles.root}
        data-direction={direction}
        data-studio-v3=""
        data-theme={theme}
        onCompositionEndCapture={() => {
          composingRef.current = false;
        }}
        onCompositionStartCapture={() => {
          composingRef.current = true;
        }}
        onFocusCapture={handleRootFocusCapture}
        onKeyDownCapture={handleRootKeyDownCapture}
        onPointerDownCapture={handleRootPointerDownCapture}
        ref={rootRef}
      >
        <header className={styles.topbar}>
          <div className={styles.brandBlock}>
            <div aria-hidden="true" className={styles.brandMark}>
              ic
            </div>
            <div className={styles.brandWords}>
              <span className={styles.brandName}>{copy(locale, 'brand')}</span>
              <span className={styles.brandSubtitle}>{copy(locale, 'studio')}</span>
            </div>
            <div className={styles.documentContext}>
              <span className={styles.contextSlash}>/</span>
              <span>{copy(locale, 'documentName')}</span>
              <span className={styles.demoBadge} title={copy(locale, 'notSaved')}>
                <span aria-hidden="true" className={styles.demoDot} />
                {copy(locale, 'demo')}
              </span>
            </div>
          </div>

          <div
            aria-label={copy(locale, 'switchDirection')}
            className={styles.directionSwitch}
            role="group"
          >
            <button
              aria-pressed={direction === 'draftbook'}
              className={styles.directionButton}
              onClick={() => chooseDirection('draftbook')}
              type="button"
            >
              {copy(locale, 'directionA')}
            </button>
            <button
              aria-pressed={direction === 'pageboard'}
              className={styles.directionButton}
              onClick={() => chooseDirection('pageboard')}
              type="button"
            >
              {copy(locale, 'directionB')}
            </button>
          </div>

          <div className={styles.topbarTools}>
            <StudioButton
              aria-label={
                locale === 'zh' ? copy(locale, 'switchToEnglish') : copy(locale, 'switchToChinese')
              }
              className={styles.toolButton}
              onClick={() => setLocale((previous) => (previous === 'zh' ? 'en' : 'zh'))}
              title={
                locale === 'zh' ? copy(locale, 'switchToEnglish') : copy(locale, 'switchToChinese')
              }
              variant="quiet"
            >
              <StudioIcon name="globe" size={17} />
              <span>{locale === 'zh' ? 'EN' : '中'}</span>
            </StudioButton>
            <StudioButton
              aria-label={copy(locale, 'switchTheme')}
              aria-pressed={theme === 'dark'}
              className={styles.toolButton}
              onClick={() => setTheme((previous) => (previous === 'light' ? 'dark' : 'light'))}
              title={theme === 'light' ? copy(locale, 'dark') : copy(locale, 'light')}
              variant="quiet"
            >
              <StudioIcon name={theme === 'light' ? 'moon' : 'sun'} size={17} />
              <span className={styles.toolText}>
                {theme === 'light' ? copy(locale, 'dark') : copy(locale, 'light')}
              </span>
            </StudioButton>
            <StudioButton
              aria-label={copy(locale, 'openCommand')}
              className={`${styles.toolButton} ${styles.commandShortcut}`}
              onClick={() => {
                setCommandQuery('');
                setDialog({ kind: 'command' });
              }}
              title={copy(locale, 'commandShortcut')}
              variant="quiet"
            >
              <StudioIcon name="command" size={17} />
              <span className={styles.toolText}>⌘K</span>
            </StudioButton>
            <details className={styles.moreMenu}>
              <summary aria-label={copy(locale, 'more')} className={styles.moreSummary}>
                <span className={styles.moreIcon}>
                  <span />
                  <span />
                  <span />
                </span>
                <span className={styles.toolText}>{copy(locale, 'more')}</span>
              </summary>
              <div className={styles.morePopover}>
                <p className={styles.menuKicker}>{copy(locale, 'activeResume')}</p>
                <button
                  onClick={(event) => switchFixture('short', event.currentTarget)}
                  type="button"
                >
                  {copy(locale, 'loadShort')}
                </button>
                <button
                  onClick={(event) => switchFixture('long', event.currentTarget)}
                  type="button"
                >
                  {copy(locale, 'loadLong')}
                </button>
                <span className={styles.menuDivider} />
                <button
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open');
                    setLocale((previous) => (previous === 'zh' ? 'en' : 'zh'));
                  }}
                  type="button"
                >
                  {locale === 'zh'
                    ? copy(locale, 'switchToEnglish')
                    : copy(locale, 'switchToChinese')}
                </button>
                <button
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open');
                    setTheme((previous) => (previous === 'light' ? 'dark' : 'light'));
                  }}
                  type="button"
                >
                  {theme === 'light' ? copy(locale, 'dark') : copy(locale, 'light')}
                </button>
                <span className={styles.menuDivider} />
                <button
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open');
                    setDialog({ kind: 'info', title: 'importTitle', description: 'importBody' });
                  }}
                  type="button"
                >
                  {copy(locale, 'importDemo')}
                </button>
                <button
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open');
                    setDialog({ kind: 'info', title: 'printTitle', description: 'printBody' });
                  }}
                  type="button"
                >
                  {copy(locale, 'printTitle')}
                </button>
              </div>
            </details>
          </div>
        </header>

        <nav aria-label={copy(locale, 'studio')} className={styles.modeNavigation}>
          {navItems.map((item) => (
            <button
              aria-current={mode === item.mode ? 'page' : undefined}
              className={styles.modeButton}
              key={item.mode}
              onClick={() => setViewMode(item.mode)}
              type="button"
            >
              <StudioIcon name={item.icon} size={17} />
              <span>{copy(locale, item.label)}</span>
            </button>
          ))}
        </nav>

        {notice && (
          <div className={styles.noticeBar} role="status">
            {notice}
          </div>
        )}

        <main className={styles.workSurface}>
          <FocusedMode id={`${direction}-${mode}`} reducedMotion={reducedMotion}>
            {direction === 'draftbook' && mode === 'edit' && (
              <div className={styles.draftbookWorkspace}>
                <aside className={styles.chapterRail}>
                  <div className={styles.railIntro}>
                    <p className={styles.microLabel}>{copy(locale, 'resumeSections')}</p>
                    <strong>
                      {formatCopy(locale, 'sectionCount', { count: sectionOrder.length })}
                    </strong>
                  </div>
                  <nav aria-label={copy(locale, 'resumeSections')} className={styles.chapterList}>
                    {sectionOrder.map((section, index) => (
                      <button
                        aria-current={activeSection === section ? 'step' : undefined}
                        className={styles.chapterButton}
                        key={section}
                        onClick={() => chooseSection(section)}
                        type="button"
                      >
                        <span className={styles.chapterIndex}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className={styles.chapterLabel}>
                          {sectionLabel(section, modules, locale)}
                        </span>
                        <StudioIcon
                          name={SECTION_ICONS[section.split(':')[0] ?? ''] ?? 'layers'}
                          size={16}
                        />
                      </button>
                    ))}
                  </nav>
                  <button
                    className={styles.railAIButton}
                    onClick={() => openAI({ type: 'summary' })}
                    type="button"
                  >
                    <StudioIcon name="spark" size={17} />
                    <span>{copy(locale, 'aiAssist')}</span>
                    <span className={styles.demoMiniTag}>Demo</span>
                  </button>
                </aside>

                <div className={styles.editorColumn}>
                  <details className={styles.mobileChapterPicker}>
                    <summary>
                      <span>{copy(locale, 'currentSection')}</span>
                      <strong>{activeSectionTitle}</strong>
                      <StudioIcon name="chevron-down" size={16} />
                    </summary>
                    <nav aria-label={copy(locale, 'resumeSections')}>
                      {sectionOrder.map((section, index) => (
                        <button
                          aria-current={activeSection === section ? 'step' : undefined}
                          key={section}
                          onClick={(event) => {
                            event.currentTarget.closest('details')?.removeAttribute('open');
                            chooseSection(section);
                          }}
                          type="button"
                        >
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          {sectionLabel(section, modules, locale)}
                        </button>
                      ))}
                    </nav>
                  </details>

                  <div className={styles.editorScroll} ref={sectionScroller}>
                    <div className={styles.editorContent}>
                      <div className={styles.pageHeading}>
                        <p className={styles.pageKicker}>
                          {copy(locale, 'writing')}{' '}
                          <span>· {String(sectionNumber).padStart(2, '0')}</span>
                        </p>
                        <h1>{activeSectionTitle}</h1>
                        <p>{copy(locale, 'sectionHint')}</p>
                      </div>
                      <SectionEditor
                        experienceIndex={experienceIndex}
                        locale={locale}
                        onOpenAI={openAI}
                        section={activeSection}
                        setExperienceIndex={setExperienceIndex}
                        setResume={setResume}
                        resume={resume}
                      />
                      <div className={styles.sectionFooter}>
                        <button
                          className={styles.previousNextButton}
                          disabled={sectionOrder.indexOf(activeSection) <= 0}
                          onClick={() => {
                            const index = sectionOrder.indexOf(activeSection);
                            const previous = sectionOrder[index - 1];
                            if (index > 0 && previous) chooseSection(previous);
                          }}
                          type="button"
                        >
                          <StudioIcon name="arrow-left" size={16} />
                          <span>{copy(locale, 'writing')}</span>
                        </button>
                        <span className={styles.positionHint}>
                          {copy(locale, 'sectionSavedPosition')}
                        </span>
                        <button
                          className={`${styles.previousNextButton} ${styles.nextSectionButton}`}
                          disabled={sectionOrder.indexOf(activeSection) >= sectionOrder.length - 1}
                          onClick={() => {
                            const index = sectionOrder.indexOf(activeSection);
                            const next = sectionOrder[index + 1];
                            if (index < sectionOrder.length - 1 && next) chooseSection(next);
                          }}
                          type="button"
                        >
                          <span>
                            {sectionLabel(
                              sectionOrder[
                                Math.min(
                                  sectionOrder.length - 1,
                                  sectionOrder.indexOf(activeSection) + 1,
                                )
                              ] ?? activeSection,
                              modules,
                              locale,
                            )}
                          </span>
                          <StudioIcon name="arrow-right" size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mode === 'modules' && (
              <ModuleStudio
                locale={locale}
                modules={modules}
                onAdd={() => {
                  setModuleDraft('');
                  setDialog({ kind: 'add-module' });
                }}
                onMove={moveModule}
                onToggle={changeModuleVisibility}
              />
            )}

            {mode === 'templates' && (
              <TemplateStudio
                locale={locale}
                onAdd={() => {
                  setTemplateDraft('');
                  setDialog({ kind: 'add-template' });
                }}
                onSelect={(nextId) => {
                  setTemplateId(nextId);
                  setNotice(copy(locale, 'changedTemplate'));
                }}
                selected={templateId}
                templates={templates}
              />
            )}

            {direction === 'draftbook' && mode === 'preview' && (
              <section className={styles.proofWorkspace}>
                <div className={styles.proofToolbar}>
                  <div className={styles.proofContext}>
                    <p className={styles.microLabel}>{copy(locale, 'pageLabel')}</p>
                    <strong>{localized(resume.fullName, locale)}</strong>
                    <span>{copy(locale, 'previewHint')}</span>
                  </div>
                  <div className={styles.proofActions}>
                    <StudioButton onClick={() => setViewMode('edit')} variant="secondary">
                      <StudioIcon name="arrow-left" size={16} />
                      {copy(locale, 'backToWriting')}
                    </StudioButton>
                    <StudioButton
                      onClick={() =>
                        setDialog({ kind: 'info', title: 'exportTitle', description: 'exportBody' })
                      }
                      variant="primary"
                    >
                      <StudioIcon name="download" size={16} />
                      {copy(locale, 'export')}
                    </StudioButton>
                  </div>
                </div>
                <div className={styles.proofScroll}>
                  <ResumePaper
                    direction={direction}
                    locale={locale}
                    modules={modules}
                    presentation="a4"
                    resume={resume}
                    templateId={templateId}
                  />
                </div>
              </section>
            )}

            {direction === 'pageboard' && mode === 'canvas' && (
              <section className={styles.canvasWorkspace}>
                <div className={styles.canvasTopline}>
                  <div>
                    <p className={styles.pageKicker}>
                      {copy(locale, 'canvas')} <span>· {copy(locale, 'demoOnly')}</span>
                    </p>
                    <h1>{copy(locale, 'pageLabel')}</h1>
                    <p>{copy(locale, 'pageboardHint')}</p>
                  </div>
                  <div className={styles.canvasActions}>
                    <StudioButton
                      onClick={() => setDialog({ kind: 'command' })}
                      variant="secondary"
                    >
                      <StudioIcon name="command" size={16} />
                      <span className={styles.canvasShortcutText}>
                        {copy(locale, 'openCommand')}
                      </span>
                    </StudioButton>
                    <StudioButton
                      onClick={() =>
                        setDialog({ kind: 'info', title: 'exportTitle', description: 'exportBody' })
                      }
                      variant="primary"
                    >
                      <StudioIcon name="download" size={16} />
                      {copy(locale, 'export')}
                    </StudioButton>
                  </div>
                </div>
                <nav aria-label={copy(locale, 'resumeSections')} className={styles.canvasIndex}>
                  <button onClick={() => jumpToSection('resume-profile')} type="button">
                    <StudioIcon name="user" size={16} />
                    {copy(locale, 'profile')}
                  </button>
                  {modules
                    .filter((item) => item.enabled)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => jumpToSection(`resume-${item.id}`)}
                        type="button"
                      >
                        <StudioIcon
                          name={SECTION_ICONS[item.id.split(':')[0] ?? ''] ?? 'layers'}
                          size={16}
                        />
                        {localized(item.title, locale)}
                      </button>
                    ))}
                </nav>
                <div className={styles.canvasScroll} ref={canvasScrollRef}>
                  <ResumePaper
                    direction={direction}
                    locale={locale}
                    modules={modules}
                    onEdit={showEditDialog}
                    presentation="canvas"
                    resume={resume}
                    templateId={templateId}
                  />
                </div>
              </section>
            )}
          </FocusedMode>
        </main>

        <div
          aria-live="polite"
          className={notice ? styles.noticeVisible : styles.srOnly}
          role="status"
        >
          {notice || copy(locale, 'statusRegion')}
        </div>

        <StudioDialog
          closeLabel={copy(locale, 'close')}
          container={rootRef.current}
          description={dialogDescription}
          kind={
            dialog?.kind === 'editor'
              ? 'editor'
              : dialog?.kind === 'command'
                ? 'command'
                : 'standard'
          }
          onOpenChange={(open) => {
            if (!open && !composingRef.current) setDialog(null);
          }}
          open={Boolean(dialog)}
          finalFocus={() => {
            const target = dialogReturnFocusRef.current;
            dialogReturnFocusRef.current = null;
            return target?.isConnected ? target : true;
          }}
          title={dialogTitle}
        >
          {dialog?.kind === 'editor' && (
            <div className={styles.dialogEditorContent}>
              <div className={styles.dialogEditorKicker}>
                <span>{copy(locale, 'currentSection')}</span>
                <strong>{sectionLabel(dialog.section, modules, locale)}</strong>
              </div>
              <SectionEditor
                experienceIndex={experienceIndex}
                locale={locale}
                onOpenAI={openAI}
                section={dialog.section}
                setExperienceIndex={setExperienceIndex}
                setResume={setResume}
                resume={resume}
              />
            </div>
          )}

          {dialog?.kind === 'ai' && (
            <div className={styles.aiDialogContent}>
              <div className={styles.aiDemoBanner}>
                <span className={styles.demoMiniTag}>Demo</span>
                <span>{copy(locale, 'aiDisclosure')}</span>
              </div>
              {dialog.status === 'idle' && (
                <div className={styles.aiStartState}>
                  <div className={styles.aiSampleMark}>
                    <StudioIcon name="spark" size={23} />
                  </div>
                  <h3>{copy(locale, 'sampleSuggestion')}</h3>
                  <p>{activeAIText || copy(locale, 'aiTip')}</p>
                  <StudioButton
                    onClick={() => setDialog({ ...dialog, status: 'loading' })}
                    variant="primary"
                  >
                    <StudioIcon name="spark" size={16} />
                    {copy(locale, 'generateSample')}
                  </StudioButton>
                  <StudioButton
                    onClick={() => setDialog({ ...dialog, status: 'error' })}
                    variant="quiet"
                  >
                    {copy(locale, 'showError')}
                  </StudioButton>
                </div>
              )}
              {dialog.status === 'loading' && (
                <div aria-live="polite" className={styles.aiLoading} role="status">
                  <span className={styles.loadingMark} />
                  <span>{copy(locale, 'generating')}</span>
                  <StudioButton onClick={() => setDialog(null)} variant="quiet">
                    {copy(locale, 'cancel')}
                  </StudioButton>
                </div>
              )}
              {dialog.status === 'ready' && (
                <div className={styles.aiSuggestionState}>
                  <p className={styles.microLabel}>{copy(locale, 'sampleSuggestion')}</p>
                  <blockquote>{sampleSuggestion}</blockquote>
                  <p className={styles.aiTip}>{copy(locale, 'aiTip')}</p>
                  <div className={styles.dialogActions}>
                    <StudioButton
                      onClick={() => setDialog({ ...dialog, status: 'idle' })}
                      variant="secondary"
                    >
                      {copy(locale, 'retry')}
                    </StudioButton>
                    <StudioButton onClick={applySampleSuggestion} variant="primary">
                      {copy(locale, 'applySuggestion')}
                    </StudioButton>
                  </div>
                </div>
              )}
              {dialog.status === 'error' && (
                <div className={styles.aiErrorState} role="alert">
                  <h3>{copy(locale, 'errorTitle')}</h3>
                  <p>{copy(locale, 'errorBody')}</p>
                  <StudioButton
                    onClick={() => setDialog({ ...dialog, status: 'loading' })}
                    variant="primary"
                  >
                    {copy(locale, 'retry')}
                  </StudioButton>
                </div>
              )}
              {dialog.status === 'applied' && (
                <div className={styles.aiAppliedState} role="status">
                  <span className={styles.successMark}>
                    <StudioIcon name="check" size={18} />
                  </span>
                  <p>{copy(locale, 'applied')}</p>
                  <StudioButton onClick={() => setDialog(null)} variant="primary">
                    {copy(locale, 'close')}
                  </StudioButton>
                </div>
              )}
            </div>
          )}

          {dialog?.kind === 'info' && (
            <div className={styles.infoDialogContent}>
              <span className={styles.demoMiniTag}>Demo</span>
              <p>{copy(locale, dialog.description)}</p>
              <StudioButton onClick={() => setDialog(null)} variant="primary">
                {copy(locale, 'close')}
              </StudioButton>
            </div>
          )}

          {dialog?.kind === 'command' && (
            <div className={styles.commandContent}>
              <StudioField
                autoComplete="off"
                label={copy(locale, 'commandTitle')}
                onChange={setCommandQuery}
                placeholder={copy(locale, 'commandPlaceholder')}
                value={commandQuery}
              />
              <nav aria-label={copy(locale, 'commandTitle')} className={styles.commandResults}>
                {commandItems.map((item) => (
                  <button
                    className={styles.commandItem}
                    key={item.id}
                    onClick={() => {
                      item.action();
                      setDialog(null);
                    }}
                    type="button"
                  >
                    <StudioIcon name={item.icon} size={17} />
                    <span>{item.label}</span>
                    <StudioIcon name="arrow-right" size={15} />
                  </button>
                ))}
                {commandItems.length === 0 && (
                  <p className={styles.commandEmpty}>{copy(locale, 'noResults')}</p>
                )}
              </nav>
            </div>
          )}

          {dialog?.kind === 'add-module' && (
            <form className={styles.createForm} onSubmit={addCustomModule}>
              <StudioField
                label={copy(locale, 'moduleName')}
                onChange={setModuleDraft}
                required
                value={moduleDraft}
              />
              <div className={styles.dialogActions}>
                <StudioButton onClick={() => setDialog(null)} variant="secondary">
                  {copy(locale, 'cancel')}
                </StudioButton>
                <StudioButton disabled={!moduleDraft.trim()} type="submit" variant="primary">
                  {copy(locale, 'add')}
                </StudioButton>
              </div>
            </form>
          )}

          {dialog?.kind === 'add-template' && (
            <form className={styles.createForm} onSubmit={addCustomTemplate}>
              <StudioField
                label={copy(locale, 'templateName')}
                onChange={setTemplateDraft}
                required
                value={templateDraft}
              />
              <div className={styles.dialogActions}>
                <StudioButton onClick={() => setDialog(null)} variant="secondary">
                  {copy(locale, 'cancel')}
                </StudioButton>
                <StudioButton disabled={!templateDraft.trim()} type="submit" variant="primary">
                  {copy(locale, 'create')}
                </StudioButton>
              </div>
            </form>
          )}
        </StudioDialog>
      </div>
    </MotionConfig>
  );

  function jumpToSection(id: string) {
    const target = canvasScrollRef.current?.querySelector<HTMLElement>(`[id="${id}"]`);
    if (target && canvasScrollRef.current?.contains(target)) {
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }
}

function ModuleStudio({
  locale,
  modules,
  onAdd,
  onMove,
  onToggle,
}: {
  locale: Locale;
  modules: DemoModule[];
  onAdd: () => void;
  onMove: (index: number, delta: -1 | 1) => void;
  onToggle: (id: SectionId) => void;
}) {
  const activeCount = modules.filter((item) => item.enabled).length;

  return (
    <section className={styles.managementWorkspace}>
      <div className={styles.managementHeading}>
        <div>
          <p className={styles.pageKicker}>
            {copy(locale, 'structure')}{' '}
            <span>· {formatCopy(locale, 'sectionCount', { count: activeCount })}</span>
          </p>
          <h1>{copy(locale, 'moduleTitle')}</h1>
          <p>{copy(locale, 'moduleHint')}</p>
        </div>
        <StudioButton onClick={onAdd} variant="primary">
          <StudioIcon name="plus" size={16} />
          {copy(locale, 'addModule')}
        </StudioButton>
      </div>
      <ol className={styles.moduleList}>
        {modules.map((module, index) => (
          <li className={styles.moduleRow} key={module.id}>
            <div className={styles.modulePosition}>{String(index + 1).padStart(2, '0')}</div>
            <div className={styles.moduleNameBlock}>
              <span className={styles.moduleName}>{localized(module.title, locale)}</span>
              <span className={styles.moduleMeta}>
                {module.id.startsWith('custom:')
                  ? copy(locale, 'demoOnly')
                  : copy(locale, 'resumeFixture')}
              </span>
            </div>
            <button
              aria-label={`${module.enabled ? copy(locale, 'visible') : copy(locale, 'hidden')}: ${localized(module.title, locale)}`}
              aria-pressed={module.enabled}
              className={`${styles.visibilityButton} ${module.enabled ? styles.visibilityOn : ''}`}
              onClick={() => onToggle(module.id)}
              type="button"
            >
              <span className={styles.visibilityDot} />
              {module.enabled ? copy(locale, 'visible') : copy(locale, 'hidden')}
            </button>
            <div aria-label={copy(locale, 'sectionActions')} className={styles.reorderButtons}>
              <StudioButton
                aria-label={`${copy(locale, 'moveUp')}: ${localized(module.title, locale)}`}
                disabled={index === 0}
                onClick={() => onMove(index, -1)}
                variant="quiet"
              >
                <StudioIcon name="move-up" size={17} />
              </StudioButton>
              <StudioButton
                aria-label={`${copy(locale, 'moveDown')}: ${localized(module.title, locale)}`}
                disabled={index === modules.length - 1}
                onClick={() => onMove(index, 1)}
                variant="quiet"
              >
                <StudioIcon name="move-down" size={17} />
              </StudioButton>
            </div>
          </li>
        ))}
      </ol>
      <p className={styles.managementFootnote}>{copy(locale, 'notSaved')}</p>
    </section>
  );
}

function TemplateStudio({
  locale,
  templates,
  selected,
  onSelect,
  onAdd,
}: {
  locale: Locale;
  templates: TemplateOption[];
  selected: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <section className={styles.managementWorkspace}>
      <div className={styles.managementHeading}>
        <div>
          <p className={styles.pageKicker}>
            {copy(locale, 'templates')} <span>· {copy(locale, 'demoOnly')}</span>
          </p>
          <h1>{copy(locale, 'templateTitle')}</h1>
          <p>{copy(locale, 'templateHint')}</p>
        </div>
        <StudioButton onClick={onAdd} variant="secondary">
          <StudioIcon name="plus" size={16} />
          {copy(locale, 'addTemplate')}
        </StudioButton>
      </div>
      <div className={styles.templateGrid}>
        {templates.map((template) => {
          const isSelected = template.id === selected;
          return (
            <article className={styles.templateCard} data-selected={isSelected} key={template.id}>
              <button
                aria-pressed={isSelected}
                className={styles.templateSelect}
                onClick={() => onSelect(template.id)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={styles.templateThumb}
                  data-template={template.id}
                >
                  <span className={styles.thumbHeader} />
                  <span className={styles.thumbTitle} />
                  <span className={styles.thumbRule} />
                  <span className={styles.thumbLine} />
                  <span className={styles.thumbLine} />
                  <span className={styles.thumbBlock} />
                  <span className={styles.thumbLine} />
                  <span className={styles.thumbLineShort} />
                </span>
                <span className={styles.templateCardTitle}>
                  <strong>{localized(template.title, locale)}</strong>
                  {isSelected && <span>{copy(locale, 'selected')}</span>}
                </span>
                <span className={styles.templateDescription}>
                  {localized(template.description, locale)}
                </span>
                <span className={styles.templateChooseLabel}>
                  <StudioIcon name={isSelected ? 'check' : 'arrow-right'} size={16} />
                  {isSelected ? copy(locale, 'selected') : copy(locale, 'useTemplate')}
                </span>
              </button>
            </article>
          );
        })}
      </div>
      <p className={styles.managementFootnote}>{copy(locale, 'notSaved')}</p>
    </section>
  );
}
