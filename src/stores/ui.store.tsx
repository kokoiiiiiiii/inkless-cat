import type { ResumeTemplate } from '@entities/template';
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useMemo,
  useState,
} from 'react';

export type ThemeMode = 'light' | 'dark';

type MobileView = 'editor' | 'preview';

type UIStoreState = {
  theme: ThemeMode;
  templateId: string;
  customTemplates: ResumeTemplate[];
  templatePanelOpen: boolean;
  modulePanelOpen: boolean;
  mobileView: MobileView;
};

type UIStoreContextValue = UIStoreState & {
  setTheme: Dispatch<SetStateAction<ThemeMode>>;
  setTemplateId: Dispatch<SetStateAction<string>>;
  setCustomTemplates: Dispatch<SetStateAction<ResumeTemplate[]>>;
  setTemplatePanelOpen: Dispatch<SetStateAction<boolean>>;
  setModulePanelOpen: Dispatch<SetStateAction<boolean>>;
  setMobileView: Dispatch<SetStateAction<MobileView>>;
};

const UIStoreContext = createContext<UIStoreContextValue | undefined>(undefined);

type UIStoreProviderProps = {
  children: ReactNode;
  initialTheme?: ThemeMode;
  initialTemplateId?: string;
  initialTemplates?: ResumeTemplate[];
};

export const UIStoreProvider = ({
  children,
  initialTheme = 'light',
  initialTemplateId = '',
  initialTemplates = [],
}: UIStoreProviderProps) => {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [templateId, setTemplateId] = useState<string>(initialTemplateId);
  const [customTemplates, setCustomTemplates] = useState<ResumeTemplate[]>(initialTemplates);
  const [templatePanelOpen, setTemplatePanelOpen] = useState<boolean>(false);
  const [modulePanelOpen, setModulePanelOpen] = useState<boolean>(false);
  const [mobileView, setMobileView] = useState<MobileView>('editor');

  const contextValue = useMemo<UIStoreContextValue>(
    () => ({
      theme,
      templateId,
      customTemplates,
      templatePanelOpen,
      modulePanelOpen,
      mobileView,
      setTheme,
      setTemplateId,
      setCustomTemplates,
      setTemplatePanelOpen,
      setModulePanelOpen,
      setMobileView,
    }),
    [
      theme,
      templateId,
      customTemplates,
      templatePanelOpen,
      modulePanelOpen,
      mobileView,
    ],
  );

  return <UIStoreContext.Provider value={contextValue}>{children}</UIStoreContext.Provider>;
};

const useUIStoreContext = (): UIStoreContextValue => {
  const context = useContext(UIStoreContext);
  if (!context) {
    throw new Error('useUIStore 必须在 UIStoreProvider 内部使用');
  }
  return context;
};

export const useUIState = () => {
  const { theme, templateId, customTemplates, templatePanelOpen, modulePanelOpen, mobileView } =
    useUIStoreContext();
  return { theme, templateId, customTemplates, templatePanelOpen, modulePanelOpen, mobileView };
};

export const useUIActions = () => {
  const {
    setTheme,
    setTemplateId,
    setCustomTemplates,
    setTemplatePanelOpen,
    setModulePanelOpen,
    setMobileView,
  } = useUIStoreContext();
  return {
    setTheme,
    setTemplateId,
    setCustomTemplates,
    setTemplatePanelOpen,
    setModulePanelOpen,
    setMobileView,
  };
};
