import type { ResumeTemplate } from '@entities/template';
import { createStoreLogger } from '@shared/lib/logger';
import {
  CUSTOM_TEMPLATES_KEY,
  getStoredValue,
  isBrowser,
  LEGACY_KEYS,
  readStoredJson,
  TEMPLATE_KEY,
  THEME_KEY,
  UI_STORE_PERSIST_KEY,
} from '@shared/lib/storage';
import {
  createBrowserStorage,
  resolveSetStateAction,
  StateSetter,
  withStoreErrorBoundary,
} from '@shared/lib/store';
import type { ReactNode } from 'react';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

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

type UIStoreActions = {
  setTheme: StateSetter<ThemeMode>;
  setTemplateId: StateSetter<string>;
  setCustomTemplates: StateSetter<ResumeTemplate[]>;
  setTemplatePanelOpen: StateSetter<boolean>;
  setModulePanelOpen: StateSetter<boolean>;
  setMobileView: StateSetter<MobileView>;
  resetPanels: () => void;
};

type UIStore = UIStoreState & UIStoreActions;

const logger = createStoreLogger('ui');

const syncDocumentTheme = (theme: ThemeMode) => {
  if (!isBrowser) return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.dataset.theme = theme;
};

const createInitialState = (): UIStoreState => {
  const theme = getStoredValue(THEME_KEY, LEGACY_KEYS.theme) === 'dark' ? 'dark' : 'light';
  const templateId = getStoredValue(TEMPLATE_KEY, LEGACY_KEYS.template) ?? '';
  const customTemplates =
    readStoredJson<ResumeTemplate[]>(CUSTOM_TEMPLATES_KEY, LEGACY_KEYS.customTemplates)?.filter(
      (item): item is ResumeTemplate => Boolean(item?.id),
    ) ?? [];

  syncDocumentTheme(theme);

  return {
    theme,
    templateId,
    customTemplates,
    templatePanelOpen: false,
    modulePanelOpen: false,
    mobileView: 'editor',
  };
};

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        ...createInitialState(),
        setTheme: (value) =>
          withStoreErrorBoundary(logger, 'setTheme', () =>
            set(
              (state) => {
                const next = resolveSetStateAction(value, state.theme);
                syncDocumentTheme(next);
                return { theme: next };
              },
              false,
              'ui/setTheme',
            ),
          ),
        setTemplateId: (value) =>
          withStoreErrorBoundary(logger, 'setTemplateId', () =>
            set(
              (state) => ({ templateId: resolveSetStateAction(value, state.templateId) }),
              false,
              'ui/setTemplateId',
            ),
          ),
        setCustomTemplates: (value) =>
          withStoreErrorBoundary(logger, 'setCustomTemplates', () =>
            set(
              (state) => ({ customTemplates: resolveSetStateAction(value, state.customTemplates) }),
              false,
              'ui/setCustomTemplates',
            ),
          ),
        setTemplatePanelOpen: (value) =>
          withStoreErrorBoundary(logger, 'setTemplatePanelOpen', () =>
            set(
              (state) => ({
                templatePanelOpen: resolveSetStateAction(value, state.templatePanelOpen),
              }),
              false,
              'ui/setTemplatePanelOpen',
            ),
          ),
        setModulePanelOpen: (value) =>
          withStoreErrorBoundary(logger, 'setModulePanelOpen', () =>
            set(
              (state) => ({ modulePanelOpen: resolveSetStateAction(value, state.modulePanelOpen) }),
              false,
              'ui/setModulePanelOpen',
            ),
          ),
        setMobileView: (value) =>
          withStoreErrorBoundary(logger, 'setMobileView', () =>
            set(
              (state) => ({ mobileView: resolveSetStateAction(value, state.mobileView) }),
              false,
              'ui/setMobileView',
            ),
          ),
        resetPanels: () =>
          withStoreErrorBoundary(logger, 'resetPanels', () =>
            set(
              () => ({
                templatePanelOpen: false,
                modulePanelOpen: false,
              }),
              false,
              'ui/resetPanels',
            ),
          ),
      }),
      {
        name: UI_STORE_PERSIST_KEY,
        storage: createJSONStorage(() => createBrowserStorage(logger, 'ui')),
        partialize: ({
          theme,
          templateId,
          customTemplates,
          templatePanelOpen,
          modulePanelOpen,
          mobileView,
        }) => ({
          theme,
          templateId,
          customTemplates,
          templatePanelOpen,
          modulePanelOpen,
          mobileView,
        }),
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            logger.error('UI store rehydration failed', error);
            return;
          }
          if (state) {
            syncDocumentTheme(state.theme);
          }
          logger.info('UI store rehydrated');
        },
      },
    ),
    { name: 'ui-store' },
  ),
);

export const useUIState = () =>
  useUIStore(
    (state) => ({
      theme: state.theme,
      templateId: state.templateId,
      customTemplates: state.customTemplates,
      templatePanelOpen: state.templatePanelOpen,
      modulePanelOpen: state.modulePanelOpen,
      mobileView: state.mobileView,
    }),
    shallow,
  );

export const useUIActions = () =>
  useUIStore(
    (state) => ({
      setTheme: state.setTheme,
      setTemplateId: state.setTemplateId,
      setCustomTemplates: state.setCustomTemplates,
      setTemplatePanelOpen: state.setTemplatePanelOpen,
      setModulePanelOpen: state.setModulePanelOpen,
      setMobileView: state.setMobileView,
      resetPanels: state.resetPanels,
    }),
    shallow,
  );

export const useUISelector = <T,>(selector: (state: UIStoreState) => T) => useUIStore(selector);

type UIStoreProviderProps = {
  children: ReactNode;
};

export const UIStoreProvider = ({ children }: UIStoreProviderProps) => children;
