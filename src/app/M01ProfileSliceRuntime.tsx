import { useEditorPageController } from '@pages/editor';
import { M01ProfilePage } from '@pages/m01-profile-slice';

export const M01ProfileSliceRuntime = () => {
  const controller = useEditorPageController();
  const activeTemplate = controller.templatePanel.activeTemplate;

  return (
    <M01ProfilePage
      activeSections={controller.deferredActiveSections}
      accentColor={activeTemplate.accentColor}
      onPersonalChange={controller.modulesPanelController.handlePersonalChange}
      personal={controller.resume.personal}
      previewResume={controller.deferredResume}
      templateStyle={activeTemplate.previewStyle}
      theme={activeTemplate.theme}
      themeMode={controller.panelState.theme}
    />
  );
};

export default M01ProfileSliceRuntime;
