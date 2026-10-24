import type { ResumeTemplate } from '@entities/template';
import {
  createDefaultWorkspace,
  ensureLegacyStorageMigration,
  reportPersistenceIssue,
  sanitizePersistedUIStoreState,
  UI_STORE_PERSIST_VERSION,
} from '@entities/workspace';
import { createStoreLogger } from '@shared/lib/logger';
import { isBrowser, StorageIssueError, UI_STORE_PERSIST_KEY } from '@shared/lib/storage';
import {
  createBrowserStorage,
  resolveSetStateAction,
  StateSetter,
  withStoreErrorBoundary,
} from '@shared/lib/store';
import type { ReactNode } from 'react';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import type { MobileView, ThemeMode } from './types';

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
  toggleWorkspacePanel: (panel: 'templates' | 'modules') => boolean;
  setMobileView: StateSetter<MobileView>;
  resetPanels: () => void;
};

type UIStore = UIStoreState & UIStoreActions;

const logger = createStoreLogger('ui');
const reportUIStorageIssue = (error: StorageIssueError) => reportPersistenceIssue(error);
const legacyMigrationSucceeded = ensureLegacyStorageMigration(reportUIStorageIssue);
const uiStorage = createBrowserStorage(
  logger,
  'ui',
  reportUIStorageIssue,
  () => legacyMigrationSucceeded,
);

const syncDocumentTheme = (theme: ThemeMode) => {
  if (!isBrowser) return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.dataset.theme = theme;
};

const createInitialState = (): UIStoreState => {
  const defaults = createDefaultWorkspace();

  syncDocumentTheme(defaults.theme);

  return {
    theme: defaults.theme,
    templateId: defaults.templateId,
    customTemplates: defaults.customTemplates,
    templatePanelOpen: false,
    modulePanelOpen: false,
    mobileView: 'editor',
  };
};

export const useUIStore = createWithEqualityFn<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
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
              (state) => {
                const templatePanelOpen = resolveSetStateAction(value, state.templatePanelOpen);
                return {
                  templatePanelOpen,
                  ...(templatePanelOpen ? { modulePanelOpen: false } : {}),
                };
              },
              false,
              'ui/setTemplatePanelOpen',
            ),
          ),
        setModulePanelOpen: (value) =>
          withStoreErrorBoundary(logger, 'setModulePanelOpen', () =>
            set(
              (state) => {
                const modulePanelOpen = resolveSetStateAction(value, state.modulePanelOpen);
                return {
                  modulePanelOpen,
                  ...(modulePanelOpen ? { templatePanelOpen: false } : {}),
                };
              },
              false,
              'ui/setModulePanelOpen',
            ),
          ),
        toggleWorkspacePanel: (panel): boolean => {
          withStoreErrorBoundary(logger, 'toggleWorkspacePanel', () =>
            set(
              (state) => {
                const isOpen =
                  panel === 'templates' ? state.templatePanelOpen : state.modulePanelOpen;
                const nextOpen = !isOpen;
                return panel === 'templates'
                  ? { templatePanelOpen: nextOpen, modulePanelOpen: false }
                  : { modulePanelOpen: nextOpen, templatePanelOpen: false };
              },
              false,
              `ui/toggleWorkspacePanel/${panel}`,
            ),
          );
          return panel === 'templates' ? get().templatePanelOpen : get().modulePanelOpen;
        },
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
        version: UI_STORE_PERSIST_VERSION,
        storage: createJSONStorage(() => uiStorage),
        migrate: (persistedState) =>
          sanitizePersistedUIStoreState(persistedState, (error) => {
            uiStorage.preserveExistingBeforeNextWrite();
            reportUIStorageIssue(error);
          }),
        merge: (persistedState, currentState) => {
          if (persistedState === undefined) return currentState;
          try {
            return {
              ...currentState,
              ...sanitizePersistedUIStoreState(persistedState, (error) => {
                uiStorage.preserveExistingBeforeNextWrite();
                reportUIStorageIssue(error);
              }),
            };
          } catch (error) {
            uiStorage.blockWrites();
            throw error;
          }
        },
        partialize: ({ theme, templateId, customTemplates }) => ({
          theme,
          templateId,
          customTemplates,
        }),
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            logger.error('UI store rehydration failed', error);
            uiStorage.blockWrites();
            reportUIStorageIssue(
              error instanceof StorageIssueError
                ? error
                : new StorageIssueError('corrupt', 'UI store rehydration failed.', {
                    cause: error,
                  }),
            );
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
      toggleWorkspacePanel: state.toggleWorkspacePanel,
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
