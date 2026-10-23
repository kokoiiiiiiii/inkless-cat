/* eslint tailwindcss/no-custom-classname: off */

import './LiquidGlassPrototype.css';

import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from 'react';

import inklessCatLogo from '../../../assets/inkless-cat-256.webp';

type Direction = 'frosted' | 'spatial' | 'aurora';
type Panel = 'editor' | 'modules' | 'templates' | 'interview';
type MobileView = 'edit' | 'preview';
type DialogKind = 'provider' | 'clear' | null;
type SectionId = 'experience' | 'education' | 'projects' | 'skills';
type IconName =
  | 'edit'
  | 'layers'
  | 'palette'
  | 'sparkle'
  | 'settings'
  | 'moon'
  | 'sun'
  | 'check'
  | 'arrow-up'
  | 'arrow-down'
  | 'plus'
  | 'export'
  | 'more'
  | 'close'
  | 'mail'
  | 'pin'
  | 'briefcase'
  | 'graduation'
  | 'folder'
  | 'shield'
  | 'chevron'
  | 'download'
  | 'send';

type ResumeDraft = {
  name: string;
  role: string;
  email: string;
  location: string;
  summary: string;
};

type ModuleItem = {
  id: SectionId;
  label: string;
  detail: string;
  icon: IconName;
  enabled: boolean;
};

const INITIAL_RESUME: ResumeDraft = {
  name: '林映岚',
  role: '产品设计师 · 体验策略',
  email: 'lin.yinglan@example.com',
  location: '上海，中国',
  summary: '关注复杂工具的清晰表达与可持续体验。擅长将用户研究、产品策略和细致的界面设计连接起来。',
};

const INITIAL_MODULES: ModuleItem[] = [
  {
    id: 'experience',
    label: '工作经历',
    detail: '澄明科技 · 2022 — 至今',
    icon: 'briefcase',
    enabled: true,
  },
  {
    id: 'education',
    label: '教育经历',
    detail: '同济大学 · 设计学硕士',
    icon: 'graduation',
    enabled: true,
  },
  { id: 'projects', label: '精选项目', detail: '3 个项目', icon: 'folder', enabled: true },
  {
    id: 'skills',
    label: '专业技能',
    detail: '研究 · 原型 · 设计系统',
    icon: 'layers',
    enabled: true,
  },
];

const TEMPLATE_OPTIONS = [
  { id: 'clarity', name: '清晰', detail: '结构优先 · 蓝灰', accent: '#486a87', tone: 'clarity' },
  {
    id: 'editorial',
    name: '编辑感',
    detail: '优雅留白 · 石墨',
    accent: '#3b5f58',
    tone: 'editorial',
  },
  { id: 'warm', name: '温暖', detail: '柔和对比 · 陶土', accent: '#a45c47', tone: 'warm' },
] as const;

const INTERVIEW_QUESTIONS = [
  '最近一次让你感到自豪的工作成果是什么？你具体负责了哪些部分？',
  '这个成果带来了什么可观察的变化？可以分享一个数字或具体例子吗？',
  '如果把这段经历写进简历，你最希望读者记住什么？',
];

const PANEL_TITLES: Record<Panel, string> = {
  editor: '个人资料',
  modules: '简历模块',
  templates: '模板与风格',
  interview: 'AI 简历访谈',
};

function Icon({ name, className }: { name: IconName; className?: string }) {
  const shapes: Record<IconName, ReactNode> = {
    edit: (
      <>
        <path d="m4 16.5-.8 4.3 4.3-.8L19.6 8a2.4 2.4 0 0 0-3.4-3.4L4 16.5Z" />
        <path d="m14.8 6 3.2 3.2M4 20h16" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    palette: (
      <>
        <path d="M12 3a9 9 0 1 0 0 18h1.1a2 2 0 0 0 1.4-3.4 1.7 1.7 0 0 1 1.2-2.9H18a3 3 0 0 0 3-3C21 7 17 3 12 3Z" />
        <path d="M7.5 12h.01M9 7.5h.01M14.5 7.5h.01M17 11h.01" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
        <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path
          d="m19.4 15 .1.1 1.1.9-1.1 1.9-1.4-.5a7.8 7.8 0 0 1-1.4.8l-.3 1.5h-2.2l-.3-1.5a7.8 7.8 0 0 1-1.4-.8l-1.4.5-1.1-1.9 1.1-.9a7.8 7.8 0 0 1 0-1.6l-1.1-.9 1.1-1.9 1.4.5a7.8 7.8 0 0 1 1.4-.8l.3-1.5h2.2l.3 1.5a7.8 7.8 0 0 1 1.4.8l1.4-.5 1.1 1.9-1.1.9a7.8 7.8 0 0 1-.1 1.5Z"
          transform="translate(-1 -1)"
        />
      </>
    ),
    moon: <path d="M20.3 15.4A8.5 8.5 0 0 1 8.6 3.7 8.8 8.8 0 1 0 20.3 15.4Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    check: <path d="m5 12 4.5 4.5L19 7" />,
    'arrow-up': (
      <>
        <path d="m6 13 6-6 6 6" />
        <path d="M12 7v11" />
      </>
    ),
    'arrow-down': (
      <>
        <path d="m6 11 6 6 6-6" />
        <path d="M12 17V6" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    export: (
      <>
        <path d="M12 15V3m0 0L8 7m4-4 4 4" />
        <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-13 5h18m-11-2v4h4v-4" />
      </>
    ),
    graduation: (
      <>
        <path d="m2 9 10-5 10 5-10 5L2 9Z" />
        <path d="M6 11v5c3.5 3 8.5 3 12 0v-5m4-2v6" />
      </>
    ),
    folder: (
      <>
        <path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />
        <path d="M3 9h18" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    download: (
      <>
        <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
        <path d="M4 17v3h16v-3" />
      </>
    ),
    send: (
      <>
        <path d="m21 3-7.5 18-3.8-7.7L2 9.5 21 3Z" />
        <path d="m9.7 13.3 5.1-5.1" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {shapes[name]}
    </svg>
  );
}

function ResumePaper({
  resume,
  modules,
  accent,
  zoom,
}: {
  resume: ResumeDraft;
  modules: ModuleItem[];
  accent: string;
  zoom: number;
}) {
  const paperStyle = { '--resume-accent': accent, '--paper-scale': String(zoom) } as CSSProperties;

  return (
    <div className="studio-paper-zoom" style={paperStyle}>
      <article aria-label="A4 简历预览，合成示例数据" className="studio-paper">
        <header className="studio-paper-heading">
          <div>
            <p className="studio-paper-eyebrow">简历 · 个人资料</p>
            <h2>{resume.name || '你的姓名'}</h2>
            <p className="studio-paper-role">{resume.role || '目标职位'}</p>
          </div>
          <span className="studio-paper-monogram" aria-hidden="true">
            {(resume.name || '林').slice(0, 1)}
          </span>
        </header>

        <div className="studio-paper-contact">
          <span>
            <Icon name="mail" />
            {resume.email || 'name@example.com'}
          </span>
          <span>
            <Icon name="pin" />
            {resume.location || '城市，国家'}
          </span>
        </div>

        <section className="studio-paper-summary">
          <h3>个人简介</h3>
          <p>{resume.summary}</p>
        </section>

        {modules
          .filter((module) => module.enabled)
          .map((module) => (
            <section className="studio-paper-section" key={module.id}>
              <h3>{module.label}</h3>
              {module.id === 'experience' && (
                <>
                  <div className="studio-paper-row">
                    <strong>资深产品设计师</strong>
                    <time>2022 — 至今</time>
                  </div>
                  <p className="studio-paper-subtitle">澄明科技 · 上海</p>
                  <ul>
                    <li>主导协作工作台的体验重构，帮助 12 人团队更快完成复杂项目交付。</li>
                    <li>建立研究与设计系统流程，让关键页面的一致性和可访问性持续提升。</li>
                  </ul>
                </>
              )}
              {module.id === 'education' && (
                <>
                  <div className="studio-paper-row">
                    <strong>同济大学</strong>
                    <time>2019 — 2022</time>
                  </div>
                  <p className="studio-paper-subtitle">设计学硕士 · 交互与服务设计</p>
                </>
              )}
              {module.id === 'projects' && (
                <>
                  <div className="studio-paper-row">
                    <strong>城市服务体验地图</strong>
                    <time>2024</time>
                  </div>
                  <p className="studio-paper-subtitle">
                    把跨部门服务流程整理为一套更清晰的用户路径。
                  </p>
                </>
              )}
              {module.id === 'skills' && (
                <p className="studio-paper-skills">
                  用户研究　·　产品策略　·　交互原型　·　设计系统　·　可用性测试
                </p>
              )}
            </section>
          ))}
        <footer className="studio-paper-footer">INKLESS CAT · 示例简历</footer>
      </article>
    </div>
  );
}

export function LiquidGlassPrototype() {
  const directionId = useId();
  const templateName = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const dialogReturnFocusRef = useRef<HTMLElement | null>(null);
  const importMenuRef = useRef<HTMLDivElement | null>(null);
  const importTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [direction, setDirection] = useState<Direction>('spatial');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [panel, setPanel] = useState<Panel>('editor');
  const [mobileView, setMobileView] = useState<MobileView>('edit');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [resume, setResume] = useState<ResumeDraft>(INITIAL_RESUME);
  const [modules, setModules] = useState<ModuleItem[]>(INITIAL_MODULES);
  const [selectedTemplate, setSelectedTemplate] =
    useState<(typeof TEMPLATE_OPTIONS)[number]['id']>('clarity');
  const [zoom, setZoom] = useState(1);
  const [interviewStep, setInterviewStep] = useState(0);
  const [interviewAnswer, setInterviewAnswer] = useState('');
  const [interviewDone, setInterviewDone] = useState(false);
  const [notice, setNotice] = useState('');
  const activeTemplate =
    TEMPLATE_OPTIONS.find((template) => template.id === selectedTemplate) ?? TEMPLATE_OPTIONS[0];

  useEffect(() => {
    if (!notice) return;
    const timer = globalThis.setTimeout(() => setNotice(''), 3400);
    return () => globalThis.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;
    if (dialog && !element.open) element.showModal();
    if (!dialog && element.open) element.close();
  }, [dialog]);

  useEffect(() => {
    if (!importMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setImportMenuOpen(false);
      importTriggerRef.current?.focus();
    };
    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [importMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMobileMenuOpen(false);
      mobileMenuTriggerRef.current?.focus();
    };
    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const showNotice = (message: string) => setNotice(message);
  const openDialog = (nextDialog: DialogKind, returnFocus: HTMLElement | null) => {
    dialogReturnFocusRef.current = returnFocus;
    setDialog(nextDialog);
  };
  const closeDialog = () => {
    setDialog(null);
    const element = dialogRef.current;
    if (element?.open) element.close();
    const returnFocus = dialogReturnFocusRef.current;
    dialogReturnFocusRef.current = null;
    const focusTarget = returnFocus?.isConnected
      ? returnFocus
      : (mobileMenuTriggerRef.current ??
        globalThis.document.querySelector<HTMLElement>('#studio-mobile-more'));
    if (focusTarget) {
      globalThis.requestAnimationFrame(() => {
        globalThis.requestAnimationFrame(() => {
          if (focusTarget.isConnected) focusTarget.focus({ preventScroll: true });
        });
      });
    }
  };
  const updateResume = (field: keyof ResumeDraft, value: string) => {
    setResume((current) => ({ ...current, [field]: value }));
  };
  const selectPanel = (nextPanel: Panel) => {
    setPanel(nextPanel);
    setMobileView('edit');
    setMobileMenuOpen(false);
  };
  const openImportMenu = () => {
    setImportMenuOpen((current) => !current);
    setMobileMenuOpen(false);
  };
  const moveModule = (moduleId: SectionId, offset: -1 | 1) => {
    setModules((current) => {
      const from = current.findIndex((module) => module.id === moduleId);
      const to = from + offset;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (!moved) return current;
      next.splice(to, 0, moved);
      return next;
    });
  };
  const toggleModule = (moduleId: SectionId) => {
    setModules((current) =>
      current.map((module) =>
        module.id === moduleId ? { ...module, enabled: !module.enabled } : module,
      ),
    );
  };
  const clearDemoDraft = () => {
    setResume(INITIAL_RESUME);
    setModules(INITIAL_MODULES);
    setInterviewAnswer('');
    setInterviewStep(0);
    setInterviewDone(false);
    closeDialog();
    showNotice('已重置本页的合成演示数据。');
  };
  const runDemoAction = (message: string) => {
    setImportMenuOpen(false);
    setMobileMenuOpen(false);
    showNotice(message);
  };
  const continueInterview = () => {
    if (!interviewAnswer.trim()) {
      showNotice('先写下一句回答，再继续演示。');
      return;
    }
    if (interviewStep >= INTERVIEW_QUESTIONS.length - 1) {
      setInterviewDone(true);
      showNotice('访谈演示已完成；内容没有发送或保存。');
      return;
    }
    setInterviewStep((current) => current + 1);
    setInterviewAnswer('');
  };

  const startInterview = () => {
    setInterviewStep(0);
    setInterviewAnswer('');
    setInterviewDone(false);
    selectPanel('interview');
  };

  const themeButtonLabel = theme === 'light' ? '切换到深色外观' : '切换到浅色外观';
  const mobileNav = [
    { id: 'edit', label: '编辑', icon: 'edit' as const },
    { id: 'preview', label: '预览', icon: 'layers' as const },
    { id: 'templates', label: '模板', icon: 'palette' as const },
    { id: 'more', label: '更多', icon: 'more' as const },
  ];

  return (
    <div
      className="liquid-studio"
      data-direction={direction}
      data-theme={theme}
      data-mobile-view={mobileView}
    >
      <a className="studio-skip-link" href="#studio-content">
        跳到工作区内容
      </a>

      <header className="studio-header">
        <a className="studio-brand" href="/design/phase4a" aria-label="Inkless Cat Studio 原型首页">
          <img src={inklessCatLogo} alt="" />
          <span className="studio-brand-copy">
            <strong>Inkless Cat</strong>
            <small>STUDIO</small>
          </span>
        </a>

        <div className="studio-document-title" aria-label="当前演示简历">
          <span>简历工作台</span>
          <Icon name="chevron" />
          <strong>产品设计师简历</strong>
        </div>

        <div className="studio-header-actions">
          <span className="studio-demo-status">
            <span aria-hidden="true" />
            演示副本
          </span>
          <label className="studio-direction-switch">
            <span className="studio-sr-only">工作区视觉方案</span>
            <select
              aria-label="工作区视觉方案"
              id={directionId}
              value={direction}
              onChange={(event) => setDirection(event.target.value as Direction)}
            >
              <option value="frosted">A · Frosted Studio</option>
              <option value="spatial">B · Spatial Workspace</option>
              <option value="aurora">C · Aurora Glass</option>
            </select>
          </label>
          <button
            aria-label={themeButtonLabel}
            className="studio-icon-button"
            onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
            title={themeButtonLabel}
            type="button"
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} />
          </button>
          <button className="studio-ai-button" onClick={startInterview} type="button">
            <Icon name="sparkle" />
            <span>AI 创建</span>
          </button>
          <div className="studio-menu-anchor" ref={importMenuRef}>
            <button
              aria-expanded={importMenuOpen}
              aria-haspopup="menu"
              className="studio-icon-button studio-import-trigger"
              onClick={openImportMenu}
              ref={importTriggerRef}
              type="button"
            >
              <Icon name="export" />
              <span className="studio-action-label">导入 / 导出</span>
            </button>
            {importMenuOpen && (
              <div
                className="studio-popover"
                id="studio-io-menu"
                role="menu"
                aria-label="导入与导出演示"
              >
                <p className="studio-popover-label">数据操作 · 演示</p>
                <button
                  role="menuitem"
                  onClick={() =>
                    runDemoAction('原型不会读取文件；正式导入仍使用现有数据校验流程。')
                  }
                  type="button"
                >
                  <Icon name="download" />
                  导入简历
                </button>
                <button
                  role="menuitem"
                  onClick={() => runDemoAction('示例 JSON 未导出；正式导出契约保持不变。')}
                  type="button"
                >
                  <Icon name="export" />
                  导出 JSON
                </button>
                <button
                  role="menuitem"
                  onClick={() => runDemoAction('示例 Markdown 未导出；正式导出契约保持不变。')}
                  type="button"
                >
                  <Icon name="export" />
                  导出 Markdown
                </button>
                <button
                  role="menuitem"
                  onClick={() =>
                    runDemoAction('打印 / PDF 为界面示意，本原型不会调用打印或修改打印数据。')
                  }
                  type="button"
                >
                  <Icon name="download" />
                  打印 / PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="studio-layout">
        <nav aria-label="工作区主要导航" className="studio-sidebar">
          <p className="studio-sidebar-caption">工作区</p>
          <button
            aria-current={panel === 'editor' ? 'page' : undefined}
            className={panel === 'editor' ? 'is-active' : ''}
            onClick={() => selectPanel('editor')}
            type="button"
          >
            <span className="studio-nav-icon">
              <Icon name="edit" />
            </span>
            <span>编辑内容</span>
          </button>
          <button
            aria-current={panel === 'modules' ? 'page' : undefined}
            className={panel === 'modules' ? 'is-active' : ''}
            onClick={() => selectPanel('modules')}
            type="button"
          >
            <span className="studio-nav-icon">
              <Icon name="layers" />
            </span>
            <span>模块管理</span>
          </button>
          <button
            aria-current={panel === 'templates' ? 'page' : undefined}
            className={panel === 'templates' ? 'is-active' : ''}
            onClick={() => selectPanel('templates')}
            type="button"
          >
            <span className="studio-nav-icon">
              <Icon name="palette" />
            </span>
            <span>模板样式</span>
          </button>
          <button
            aria-current={panel === 'interview' ? 'page' : undefined}
            className={panel === 'interview' ? 'is-active' : ''}
            onClick={startInterview}
            type="button"
          >
            <span className="studio-nav-icon">
              <Icon name="sparkle" />
            </span>
            <span>AI 访谈</span>
            <span className="studio-nav-badge">演示</span>
          </button>

          <div className="studio-sidebar-spacer" />
          <div className="studio-sidebar-note">
            <Icon name="shield" />
            <span>
              独立演示空间
              <br />
              不连接正式简历
            </span>
          </div>
          <button
            className="studio-sidebar-settings"
            onClick={(event) => openDialog('provider', event.currentTarget)}
            type="button"
          >
            <span className="studio-nav-icon">
              <Icon name="settings" />
            </span>
            <span>AI 服务设置</span>
          </button>
        </nav>

        <main className="studio-main" id="studio-content">
          <section
            aria-labelledby="studio-panel-title"
            className={`studio-editor-column studio-panel-${panel}`}
          >
            <div className="studio-panel-heading">
              <div>
                <p className="studio-overline">
                  INKLESS CAT STUDIO <span>·</span> 设计实验
                </p>
                <h1 id="studio-panel-title">{PANEL_TITLES[panel]}</h1>
                <p className="studio-panel-description">
                  {panel === 'editor' && '让重要内容先被看见，编辑结果即时呈现在右侧纸张。'}
                  {panel === 'modules' && '控制简历的内容层级，排序和显示状态都保持可预期。'}
                  {panel === 'templates' && '比较纸张上的真实层级；切换样式不会改动简历内容。'}
                  {panel === 'interview' && '用循序提问梳理经历，演示答案只保留在当前页面。'}
                </p>
              </div>
              <span className="studio-progress-pill">
                <span className="studio-progress-dot" />
                {panel === 'interview' ? '交互演示' : '本地演示'}
              </span>
            </div>

            {panel === 'editor' && (
              <div className="studio-content-stack">
                <div className="studio-completion-card">
                  <div className="studio-completion-icon">
                    <Icon name="check" />
                  </div>
                  <div className="studio-completion-copy">
                    <strong>内容结构已就绪</strong>
                    <span>补全联系方式，让预览更完整</span>
                  </div>
                  <span className="studio-completion-percent">82%</span>
                  <div aria-label="演示内容完成度 82%" className="studio-progress-track" role="img">
                    <span />
                  </div>
                </div>

                <button className="studio-ai-entry" onClick={startInterview} type="button">
                  <span className="studio-ai-entry-icon">
                    <Icon name="sparkle" />
                  </span>
                  <span>
                    <strong>从经历开始创建</strong>
                    <small>AI 访谈 · 演示流程，不会调用模型</small>
                  </span>
                  <Icon className="studio-ai-entry-chevron" name="chevron" />
                </button>

                <form className="studio-form-card" onSubmit={(event) => event.preventDefault()}>
                  <div className="studio-form-heading">
                    <div>
                      <span className="studio-form-step">01</span>
                      <h2>基本资料</h2>
                    </div>
                    <button
                      aria-label="基本资料已完成"
                      className="studio-small-check"
                      type="button"
                    >
                      <Icon name="check" />
                    </button>
                  </div>
                  <label className="studio-field">
                    <span>姓名</span>
                    <input
                      autoComplete="name"
                      onChange={(event) => updateResume('name', event.target.value)}
                      value={resume.name}
                    />
                  </label>
                  <label className="studio-field">
                    <span>目标职位</span>
                    <input
                      autoComplete="organization-title"
                      onChange={(event) => updateResume('role', event.target.value)}
                      value={resume.role}
                    />
                  </label>
                  <div className="studio-field-row">
                    <label className="studio-field">
                      <span>电子邮箱</span>
                      <input
                        autoComplete="email"
                        inputMode="email"
                        onChange={(event) => updateResume('email', event.target.value)}
                        value={resume.email}
                      />
                    </label>
                    <label className="studio-field">
                      <span>所在城市</span>
                      <input
                        autoComplete="address-level2"
                        onChange={(event) => updateResume('location', event.target.value)}
                        value={resume.location}
                      />
                    </label>
                  </div>
                  <label className="studio-field">
                    <span>个人简介</span>
                    <textarea
                      onChange={(event) => updateResume('summary', event.target.value)}
                      rows={3}
                      value={resume.summary}
                    />
                  </label>
                  <div className="studio-form-footer">
                    <span>
                      <Icon name="check" />
                      即时预览 · 不写入正式数据
                    </span>
                    <button
                      onClick={() => showNotice('草稿保存未连接；输入只保存在当前页面状态中。')}
                      type="button"
                    >
                      保存状态说明
                    </button>
                  </div>
                </form>

                <div className="studio-next-module">
                  <div>
                    <span>接下来</span>
                    <strong>工作经历</strong>
                    <small>添加职责、成果与可验证的影响</small>
                  </div>
                  <button
                    aria-label="打开模块管理"
                    onClick={() => selectPanel('modules')}
                    type="button"
                  >
                    <Icon name="chevron" />
                  </button>
                </div>
              </div>
            )}

            {panel === 'modules' && (
              <div className="studio-modules-card">
                <div className="studio-module-card-heading">
                  <div>
                    <strong>内容模块</strong>
                    <span>
                      {modules.filter((module) => module.enabled).length} / {modules.length} 个显示
                    </span>
                  </div>
                  <button
                    className="studio-quiet-button"
                    onClick={() => showNotice('此原型只演示现有模块；新增模块未连接正式数据。')}
                    type="button"
                  >
                    <Icon name="plus" />
                    新增
                  </button>
                </div>
                <ul className="studio-module-list">
                  {modules.map((module, index) => (
                    <li className={module.enabled ? '' : 'is-disabled'} key={module.id}>
                      <span className="studio-module-symbol">
                        <Icon name={module.icon} />
                      </span>
                      <span className="studio-module-copy">
                        <strong>{module.label}</strong>
                        <small>{module.detail}</small>
                      </span>
                      <div className="studio-module-actions">
                        <button
                          aria-label={`上移${module.label}`}
                          disabled={index === 0}
                          onClick={() => moveModule(module.id, -1)}
                          type="button"
                        >
                          <Icon name="arrow-up" />
                        </button>
                        <button
                          aria-label={`下移${module.label}`}
                          disabled={index === modules.length - 1}
                          onClick={() => moveModule(module.id, 1)}
                          type="button"
                        >
                          <Icon name="arrow-down" />
                        </button>
                        <button
                          aria-checked={module.enabled}
                          aria-label={`${module.enabled ? '隐藏' : '显示'}${module.label}`}
                          className={`studio-switch ${module.enabled ? 'is-on' : ''}`}
                          onClick={() => toggleModule(module.id)}
                          role="switch"
                          type="button"
                        >
                          <span />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="studio-inline-note">
                  <Icon name="shield" />
                  模块显示与排序只影响当前演示预览；正式 Resume Store 未连接。
                </p>
              </div>
            )}

            {panel === 'templates' && (
              <fieldset className="studio-template-fieldset">
                <legend>选择简历视觉样式</legend>
                <p className="studio-template-intro">
                  模板只改变视觉表达。简历正文、顺序和打印语义不会因选择样式而改写。
                </p>
                <div className="studio-template-list">
                  {TEMPLATE_OPTIONS.map((template, index) => (
                    <label
                      className={`studio-template-option ${selectedTemplate === template.id ? 'is-selected' : ''}`}
                      htmlFor={`${templateName}-${template.id}`}
                      key={template.id}
                    >
                      <span className="studio-sr-only">选择模板：</span>
                      <input
                        checked={selectedTemplate === template.id}
                        id={`${templateName}-${template.id}`}
                        name={templateName}
                        onChange={() => setSelectedTemplate(template.id)}
                        type="radio"
                        value={template.id}
                      />
                      <span
                        className={`studio-template-thumb thumb-${template.tone}`}
                        aria-hidden="true"
                      >
                        <i />
                        <i />
                        <i />
                        <i />
                        <b />
                        <em />
                      </span>
                      <span className="studio-template-copy">
                        <strong>{template.name}</strong>
                        <small>{template.detail}</small>
                        <span>
                          {index === 0
                            ? '推荐 · 清晰易读'
                            : index === 1
                              ? '稳重 · 层级克制'
                              : '柔和 · 温暖表达'}
                        </span>
                      </span>
                      <span aria-hidden="true" className="studio-radio-mark" />
                    </label>
                  ))}
                </div>
                <div className="studio-template-footnote">
                  <span
                    className="studio-accent-dot"
                    style={{ background: activeTemplate.accent }}
                  />
                  当前样式：{activeTemplate.name}
                  <span>·</span>纸张预览保持白底
                </div>
              </fieldset>
            )}

            {panel === 'interview' && (
              <div className="studio-interview-card">
                <div className="studio-interview-topline">
                  <span className="studio-interview-orb">
                    <Icon name="sparkle" />
                  </span>
                  <div>
                    <strong>一起梳理一段经历</strong>
                    <small>合成演示 · 不连接服务商</small>
                  </div>
                  <span className="studio-private-chip">
                    <Icon name="shield" />
                    本页保留
                  </span>
                </div>
                <div
                  className="studio-interview-progress"
                  aria-label={`第 ${Math.min(interviewStep + 1, INTERVIEW_QUESTIONS.length)} 步，共 ${INTERVIEW_QUESTIONS.length} 步`}
                >
                  {INTERVIEW_QUESTIONS.map((question, index) => (
                    <span
                      aria-hidden="true"
                      className={index <= interviewStep || interviewDone ? 'is-current' : ''}
                      key={question}
                    />
                  ))}
                </div>
                {interviewDone ? (
                  <div className="studio-interview-finish" role="status">
                    <span className="studio-finish-check">
                      <Icon name="check" />
                    </span>
                    <h2>演示访谈完成</h2>
                    <p>
                      回答没有被提取为事实、发送给模型或写入简历。正式访谈仍需经过事实核对与人工确认。
                    </p>
                    <button
                      className="studio-secondary-button"
                      onClick={() => {
                        setInterviewDone(false);
                        setInterviewStep(0);
                        setInterviewAnswer('');
                      }}
                      type="button"
                    >
                      重新体验
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="studio-question-label">
                      问题 {interviewStep + 1} <span>· 约 1 分钟</span>
                    </div>
                    <h2 className="studio-interview-question">
                      {INTERVIEW_QUESTIONS[interviewStep]}
                    </h2>
                    <label className="studio-field studio-answer-field">
                      <span>
                        你的回答 <small>（虚构演示内容）</small>
                      </span>
                      <textarea
                        onChange={(event) => setInterviewAnswer(event.target.value)}
                        placeholder="例如：我负责重新梳理了团队的项目交接流程……"
                        rows={6}
                        value={interviewAnswer}
                      />
                    </label>
                    <div className="studio-interview-actions">
                      <span>你的回答只用于展示交互状态。</span>
                      <button
                        className="studio-primary-button"
                        onClick={continueInterview}
                        type="button"
                      >
                        {interviewStep === INTERVIEW_QUESTIONS.length - 1 ? '完成演示' : '继续'}
                        <Icon name="chevron" />
                      </button>
                    </div>
                    <p className="studio-ai-disclaimer">
                      <Icon name="shield" />
                      原型不发送内容、不使用 API Key，也不保存访谈答案。
                    </p>
                  </>
                )}
              </div>
            )}
          </section>

          <section aria-label="简历实时预览" className="studio-preview-column">
            <div className="studio-preview-toolbar">
              <div>
                <span className="studio-preview-live-dot" />
                <strong>A4 纸张预览</strong>
                <small>真实比例 · 白纸</small>
              </div>
              <div className="studio-zoom-control" aria-label="预览缩放">
                <button
                  aria-label="缩小预览"
                  disabled={zoom <= 0.85}
                  onClick={() =>
                    setZoom((current) => Math.max(0.85, Number((current - 0.05).toFixed(2))))
                  }
                  type="button"
                >
                  −
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button
                  aria-label="放大预览"
                  disabled={zoom >= 1.1}
                  onClick={() =>
                    setZoom((current) => Math.min(1.1, Number((current + 0.05).toFixed(2))))
                  }
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
            <div className="studio-paper-stage">
              <ResumePaper
                accent={activeTemplate.accent}
                modules={modules}
                resume={resume}
                zoom={zoom}
              />
            </div>
            <div className="studio-preview-footer">
              <span>
                <Icon name="check" />
                预览已更新
              </span>
              <span>内容为合成示例</span>
            </div>
          </section>
        </main>
      </div>

      <nav aria-label="移动端工作区导航" className="studio-mobile-nav">
        {mobileNav.map((item) => {
          const selected =
            item.id === 'preview'
              ? mobileView === 'preview'
              : item.id === 'templates'
                ? panel === 'templates' && mobileView === 'edit'
                : item.id === 'edit'
                  ? mobileView === 'edit' && panel !== 'templates'
                  : mobileMenuOpen;
          return (
            <button
              aria-current={selected && item.id !== 'more' ? 'page' : undefined}
              aria-expanded={item.id === 'more' ? mobileMenuOpen : undefined}
              className={selected ? 'is-active' : ''}
              id={item.id === 'more' ? 'studio-mobile-more' : undefined}
              key={item.id}
              onClick={() => {
                if (item.id === 'preview') {
                  setMobileView('preview');
                  setMobileMenuOpen(false);
                  return;
                }
                if (item.id === 'templates') {
                  setPanel('templates');
                  setMobileView('edit');
                  setMobileMenuOpen(false);
                  return;
                }
                if (item.id === 'more') {
                  setMobileMenuOpen((current) => !current);
                  return;
                }
                setPanel('editor');
                setMobileView('edit');
                setMobileMenuOpen(false);
              }}
              ref={item.id === 'more' ? mobileMenuTriggerRef : undefined}
              type="button"
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {mobileMenuOpen && (
        <div aria-label="更多演示功能" className="studio-mobile-menu" role="group">
          <button onClick={startInterview} type="button">
            <Icon name="sparkle" />
            <span>AI 创建简历</span>
            <small>演示</small>
          </button>
          <button
            onClick={() => {
              openDialog('provider', mobileMenuTriggerRef.current);
              setMobileMenuOpen(false);
            }}
            type="button"
          >
            <Icon name="settings" />
            <span>AI 服务设置</span>
          </button>
          <button
            onClick={() => {
              setTheme((current) => (current === 'light' ? 'dark' : 'light'));
              setMobileMenuOpen(false);
            }}
            type="button"
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} />
            <span>{theme === 'light' ? '深色外观' : '浅色外观'}</span>
          </button>
          <button
            onClick={() => {
              openDialog('clear', mobileMenuTriggerRef.current);
              setMobileMenuOpen(false);
            }}
            type="button"
          >
            <Icon name="close" />
            <span>重置演示草稿</span>
          </button>
          <div aria-label="工作区视觉方案" className="studio-mobile-directions" role="group">
            <span>方案预览</span>
            <div>
              <button
                aria-pressed={direction === 'frosted'}
                onClick={() => setDirection('frosted')}
                type="button"
              >
                A · Frosted
              </button>
              <button
                aria-pressed={direction === 'spatial'}
                onClick={() => setDirection('spatial')}
                type="button"
              >
                B · Spatial
              </button>
              <button
                aria-pressed={direction === 'aurora'}
                onClick={() => setDirection('aurora')}
                type="button"
              >
                C · Aurora
              </button>
            </div>
          </div>
        </div>
      )}

      <dialog
        aria-labelledby="studio-dialog-title"
        className="studio-dialog"
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClose={closeDialog}
        ref={dialogRef}
      >
        {dialog === 'provider' && (
          <div className="studio-dialog-content">
            <div className="studio-dialog-heading">
              <span className="studio-dialog-icon">
                <Icon name="settings" />
              </span>
              <button
                aria-label="关闭 AI 服务设置"
                className="studio-icon-button"
                onClick={closeDialog}
                type="button"
              >
                <Icon name="close" />
              </button>
            </div>
            <p className="studio-overline">AI WORKSPACE</p>
            <h2 id="studio-dialog-title">AI 服务设置</h2>
            <p className="studio-dialog-description">
              连接方式只做视觉示意。此原型不会读取、保存或发送任何凭证。
            </p>
            <label className="studio-field">
              <span>服务提供方</span>
              <select defaultValue="openai-compatible">
                <option value="openai-compatible">OpenAI 兼容服务</option>
                <option value="custom">自定义服务（演示）</option>
              </select>
            </label>
            <label className="studio-field">
              <span>API 地址</span>
              <input disabled value="https://api.example.com/v1" />
            </label>
            <div className="studio-key-placeholder">
              <Icon name="shield" />
              <div>
                <strong>API Key 输入已关闭</strong>
                <span>正式密钥保护流程将在业务 UI 阶段沿用现有规则。</span>
              </div>
            </div>
            <div className="studio-dialog-actions">
              <button className="studio-secondary-button" onClick={closeDialog} type="button">
                关闭
              </button>
              <button
                className="studio-primary-button"
                onClick={() => {
                  closeDialog();
                  showNotice('设置未保存；原型不会创建或读取 API Key。');
                }}
                type="button"
              >
                了解
              </button>
            </div>
          </div>
        )}
        {dialog === 'clear' && (
          <div className="studio-dialog-content">
            <div className="studio-dialog-heading">
              <span className="studio-dialog-icon is-warning">
                <Icon name="close" />
              </span>
              <button
                aria-label="关闭确认弹窗"
                className="studio-icon-button"
                onClick={closeDialog}
                type="button"
              >
                <Icon name="close" />
              </button>
            </div>
            <p className="studio-overline">仅本页合成数据</p>
            <h2 id="studio-dialog-title">重置演示草稿？</h2>
            <p className="studio-dialog-description">
              这会恢复示例姓名、简介和模块开关，不会触碰正式简历、Workspace 或浏览器存储。
            </p>
            <div className="studio-dialog-actions">
              <button className="studio-secondary-button" onClick={closeDialog} type="button">
                保留当前内容
              </button>
              <button className="studio-danger-button" onClick={clearDemoDraft} type="button">
                重置演示
              </button>
            </div>
          </div>
        )}
      </dialog>

      {notice && (
        <div className="studio-toast" role="status" aria-live="polite">
          <Icon name="check" />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
}
