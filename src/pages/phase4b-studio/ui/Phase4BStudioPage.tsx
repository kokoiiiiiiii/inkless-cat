import {
  DemoInterview,
  DemoModuleManager,
  DemoProviderSettings,
  DemoResumeEditor,
  DemoTemplateSelector,
  useDemoStudio,
} from '@features/studio-demo';
import { type StudioPanel, StudioPreviewPanel, StudioShell } from '@widgets/studio-shell';
import { useState } from 'react';

const templateLabels = {
  mist: '清晰留白',
  folio: '作品叙事',
  column: '轻量分栏',
} as const;

export const Phase4BStudioPage = () => {
  const [panel, setPanel] = useState<StudioPanel>('profile');
  const [notice, setNotice] = useState<string | null>(null);
  const demo = useDemoStudio();

  const currentPanel = (() => {
    switch (panel) {
      case 'profile': {
        return (
          <DemoResumeEditor
            onStartInterview={() => {
              setPanel('interview');
              setNotice('AI 访谈入口只展示演示界面，不会调用模型。');
            }}
            onUpdate={demo.updateResume}
            resume={demo.resume}
          />
        );
      }
      case 'modules': {
        return (
          <DemoModuleManager
            announcement={demo.announcement}
            modules={demo.modules}
            onMove={demo.moveModule}
            onNotice={setNotice}
            onToggle={demo.toggleModule}
          />
        );
      }
      case 'templates': {
        return (
          <DemoTemplateSelector
            onChange={(nextTemplate) => {
              demo.setTemplate(nextTemplate);
              setNotice(`已切换到「${templateLabels[nextTemplate]}」演示模板。`);
            }}
            selected={demo.template}
          />
        );
      }
      case 'interview': {
        return <DemoInterview onNotice={setNotice} />;
      }
      case 'settings': {
        return <DemoProviderSettings />;
      }
    }
  })();

  return (
    <StudioShell
      notice={notice}
      onDismissNotice={() => setNotice(null)}
      onPanelChange={setPanel}
      panel={panel}
      preview={
        <StudioPreviewPanel modules={demo.modules} resume={demo.resume} template={demo.template} />
      }
    >
      {currentPanel}
    </StudioShell>
  );
};

export default Phase4BStudioPage;
