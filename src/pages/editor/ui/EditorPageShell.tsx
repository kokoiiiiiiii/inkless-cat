import { useEditorPageController } from '../model/useEditorPageController';
import { ProductionStudioShell } from './ProductionStudioShell';

export const EditorPageShell = () => {
  const controller = useEditorPageController();
  return <ProductionStudioShell controller={controller} />;
};
