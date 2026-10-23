import { StudioButton, StudioDialog, StudioToast } from '@shared/ui/studio';
import { type FocusEvent, type ReactNode, useEffect, useRef, useState } from 'react';

import type { StudioMobileView, StudioPanel, StudioTheme } from '../model/types';
import { StudioEditorPanel } from './StudioEditorPanel';
import { StudioHeader } from './StudioHeader';
import { StudioMobileNavigation } from './StudioMobileNavigation';
import { StudioSidebar } from './StudioSidebar';
import { StudioWorkspace } from './StudioWorkspace';

type StudioShellProps = {
  children: ReactNode;
  notice: string | null;
  onDismissNotice: () => void;
  panel: StudioPanel;
  onPanelChange: (panel: StudioPanel) => void;
  preview: ReactNode;
};

const panelOrder: StudioPanel[] = ['profile', 'modules', 'templates', 'interview', 'settings'];

export const StudioShell = ({
  children,
  notice,
  onDismissNotice,
  panel,
  onPanelChange,
  preview,
}: StudioShellProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = useState<StudioTheme>('light');
  const [mobileView, setMobileView] = useState<StudioMobileView>('edit');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [textEntryFocused, setTextEntryFocused] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const previousLanguage = document.documentElement.lang;
    document.documentElement.lang = 'zh-CN';
    return () => {
      document.documentElement.lang = previousLanguage;
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardState = () => {
      setKeyboardOpen(textEntryFocused && window.innerHeight - viewport.height > 120);
    };

    viewport.addEventListener('resize', updateKeyboardState);
    window.addEventListener('resize', updateKeyboardState);
    updateKeyboardState();

    return () => {
      viewport.removeEventListener('resize', updateKeyboardState);
      window.removeEventListener('resize', updateKeyboardState);
    };
  }, [textEntryFocused]);

  const handleFocusCapture = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    const textEntry =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement;
    setTextEntryFocused(textEntry);
  };

  const selectPanel = (nextPanel: StudioPanel) => {
    onPanelChange(nextPanel);
    setMobileView('edit');
  };

  const showDemoInfo = () => setDialogOpen(true);

  return (
    <div
      className="studio-root"
      data-keyboard-open={keyboardOpen ? 'true' : 'false'}
      data-theme={theme}
      onFocusCapture={handleFocusCapture}
      ref={rootRef}
    >
      <StudioHeader
        onShowDemoInfo={showDemoInfo}
        onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        theme={theme}
      />
      <div className="studio-layout">
        <StudioSidebar activePanel={panel} onSelect={selectPanel} />
        <div className="studio-content-area">
          <nav aria-label="工作区快速导航" className="studio-compact-nav">
            {panelOrder.map((destination) => (
              <StudioButton
                aria-current={panel === destination ? 'page' : undefined}
                className={panel === destination ? 'is-active' : ''}
                key={destination}
                onClick={() => selectPanel(destination)}
                variant="quiet"
              >
                {destination === 'profile'
                  ? '编辑'
                  : destination === 'modules'
                    ? '模块'
                    : destination === 'templates'
                      ? '模板'
                      : destination === 'interview'
                        ? 'AI 演示'
                        : '设置'}
              </StudioButton>
            ))}
          </nav>
          <StudioWorkspace
            editor={<StudioEditorPanel panel={panel}>{children}</StudioEditorPanel>}
            preview={preview}
            view={mobileView}
          />
        </div>
      </div>
      <StudioMobileNavigation
        activePanel={panel}
        onChangePanel={selectPanel}
        onChangeView={setMobileView}
        view={mobileView}
      />
      <StudioDialog
        onClose={() => setDialogOpen(false)}
        open={dialogOpen}
        title="Phase 4B 设计演示"
      >
        <p>
          这是独立的 Liquid Glass
          工作台原型。表单、模块和模板仅使用当前页面中的合成内容，不连接正式简历、云端存储或 AI
          服务。
        </p>
        <ul>
          <li>预览用于展示编辑布局，不代表正式 A4 打印输出。</li>
          <li>所有演示操作都会明确说明，不会伪装成已保存或已导出的结果。</li>
        </ul>
        <div className="studio-dialog__actions">
          <StudioButton
            data-dialog-autofocus
            onClick={() => setDialogOpen(false)}
            variant="primary"
          >
            明白了
          </StudioButton>
        </div>
      </StudioDialog>
      {notice ? <StudioToast message={notice} onDismiss={onDismissNotice} /> : null}
    </div>
  );
};
