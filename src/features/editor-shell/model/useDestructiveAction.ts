import { useResumeStore } from '@entities/resume';
import { useUIStore } from '@entities/ui';
import {
  sanitizePersistedResumeStoreState,
  sanitizePersistedUIStoreState,
} from '@entities/workspace';
import { useI18n } from '@shared/i18n';
import { confirmDestructiveOperation } from '@shared/lib/confirm';
import { toAppError } from '@shared/lib/errors';
import { getPersistedValueSizeBytes, MAX_PERSISTED_ITEM_SIZE_BYTES } from '@shared/lib/storage';
import { useAppFeedback } from '@shared/ui/feedback';
import { useCallback, useEffect } from 'react';

const UNDO_STORAGE_KEY = 'inkless-cat/pending-destructive-undo';
const UNDO_WINDOW_MS = 12_000;

type ResumeState = ReturnType<typeof useResumeStore.getState>;
type UIState = ReturnType<typeof useUIStore.getState>;
type ResumeSnapshot = Pick<ResumeState, 'resume' | 'activeSections' | 'hasResumeChanges'>;
type ResumeDocumentSnapshot = Pick<ResumeState, 'resume' | 'activeSections'>;
type UISnapshot = Pick<UIState, 'theme' | 'templateId' | 'customTemplates'>;

type PendingUndo = {
  version: 1;
  expiresAt: number;
  before: { resume: ResumeSnapshot; ui: UISnapshot };
  expected: { resume: ResumeDocumentSnapshot; ui: UISnapshot };
};

let expiryTimer: ReturnType<typeof setTimeout> | null = null;
let undoAlreadyShownUntil = 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const getSessionStorage = (): Storage | null => {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
};

const clearPendingUndo = () => {
  if (expiryTimer !== null) {
    globalThis.clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  undoAlreadyShownUntil = 0;
  try {
    getSessionStorage()?.removeItem(UNDO_STORAGE_KEY);
  } catch {
    // The in-memory undo remains available even if session storage is unavailable.
  }
};

const scheduleUndoExpiry = (expiresAt: number) => {
  if (expiryTimer !== null) globalThis.clearTimeout(expiryTimer);
  expiryTimer = globalThis.setTimeout(
    () => {
      const storage = getSessionStorage();
      try {
        const raw = storage?.getItem(UNDO_STORAGE_KEY);
        if (!raw) return;
        const value: unknown = JSON.parse(raw);
        if (isRecord(value) && value.expiresAt === expiresAt) {
          storage?.removeItem(UNDO_STORAGE_KEY);
        }
      } catch {
        // Expired recovery data is ignored on the next load if cleanup is unavailable.
      } finally {
        expiryTimer = null;
        if (undoAlreadyShownUntil === expiresAt) undoAlreadyShownUntil = 0;
      }
    },
    Math.max(0, expiresAt - Date.now()),
  );
};

const takeResumeSnapshot = (state: ResumeState): ResumeSnapshot => ({
  resume: state.resume,
  activeSections: state.activeSections,
  hasResumeChanges: state.hasResumeChanges,
});

const takeResumeDocumentSnapshot = (state: ResumeState): ResumeDocumentSnapshot => ({
  resume: state.resume,
  activeSections: state.activeSections,
});

const takeUISnapshot = (state: UIState): UISnapshot => ({
  theme: state.theme,
  templateId: state.templateId,
  customTemplates: state.customTemplates,
});

const areSnapshotsEqual = (left: unknown, right: unknown): boolean => {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

const clearUndoSnapshot = (resume: ResumeSnapshot, ui: UISnapshot) => {
  useResumeStore.setState({
    resume: resume.resume,
    activeSections: resume.activeSections,
    hasResumeChanges: resume.hasResumeChanges,
  });
  useUIStore.setState({
    theme: ui.theme,
    templateId: ui.templateId,
    customTemplates: ui.customTemplates,
  });
  try {
    document.documentElement.classList.toggle('dark', ui.theme === 'dark');
    document.documentElement.dataset.theme = ui.theme;
  } catch {
    // State restoration also works in non-DOM test environments.
  }
};

const persistPendingUndo = (
  beforeResume: ResumeSnapshot,
  beforeUI: UISnapshot,
  afterResume: ResumeState,
  afterUI: UIState,
): boolean => {
  clearPendingUndo();
  const storage = getSessionStorage();
  if (!storage) return false;

  const expiresAt = Date.now() + UNDO_WINDOW_MS;
  const pending: PendingUndo = {
    version: 1,
    expiresAt,
    before: {
      resume: beforeResume,
      ui: beforeUI,
    },
    expected: {
      resume: takeResumeDocumentSnapshot(afterResume),
      ui: takeUISnapshot(afterUI),
    },
  };

  try {
    const serialized = JSON.stringify(pending);
    if (getPersistedValueSizeBytes(serialized) > MAX_PERSISTED_ITEM_SIZE_BYTES) return false;
    storage.setItem(UNDO_STORAGE_KEY, serialized);
    undoAlreadyShownUntil = expiresAt;
    scheduleUndoExpiry(expiresAt);
    return true;
  } catch {
    return false;
  }
};

const readPendingUndo = (): PendingUndo | null => {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(UNDO_STORAGE_KEY);
    if (!raw || getPersistedValueSizeBytes(raw) > MAX_PERSISTED_ITEM_SIZE_BYTES) return null;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || typeof value.expiresAt !== 'number') return null;
    if (!isRecord(value.before) || !isRecord(value.expected)) return null;
    if (!isRecord(value.before.resume) || !isRecord(value.before.ui)) return null;
    if (!isRecord(value.expected.resume) || !isRecord(value.expected.ui)) return null;

    const beforeResume = sanitizePersistedResumeStoreState(value.before.resume);
    const expectedResume = sanitizePersistedResumeStoreState(value.expected.resume);
    const beforeUI = sanitizePersistedUIStoreState(value.before.ui);
    const expectedUI = sanitizePersistedUIStoreState(value.expected.ui);

    return {
      version: 1,
      expiresAt: value.expiresAt,
      before: {
        resume: {
          ...beforeResume,
          hasResumeChanges: value.before.resume.hasResumeChanges === true,
        },
        ui: beforeUI,
      },
      expected: { resume: expectedResume, ui: expectedUI },
    };
  } catch {
    return null;
  }
};

const matchesExpectedState = (pending: PendingUndo): boolean =>
  areSnapshotsEqual(
    takeResumeDocumentSnapshot(useResumeStore.getState()),
    pending.expected.resume,
  ) && areSnapshotsEqual(takeUISnapshot(useUIStore.getState()), pending.expected.ui);

type DestructiveAction = () => boolean | void;

export const useDestructiveAction = () => {
  const { t } = useI18n();
  const { showError, showInfo, showSuccess, showUndo } = useAppFeedback();

  useEffect(() => {
    const pending = readPendingUndo();
    if (!pending) {
      clearPendingUndo();
      return;
    }
    if (pending.expiresAt <= Date.now() || !matchesExpectedState(pending)) {
      clearPendingUndo();
      return;
    }
    if (undoAlreadyShownUntil === pending.expiresAt) return;

    const remainingMs = pending.expiresAt - Date.now();
    undoAlreadyShownUntil = pending.expiresAt;
    scheduleUndoExpiry(pending.expiresAt);
    showUndo(
      t('common.feedback.undoLastChange'),
      () => {
        if (!matchesExpectedState(pending)) {
          clearPendingUndo();
          showInfo(t('common.feedback.undoUnavailable'));
          return;
        }
        clearPendingUndo();
        clearUndoSnapshot(pending.before.resume, pending.before.ui);
        showSuccess(t('common.feedback.undoComplete'));
      },
      remainingMs,
    );
  }, [showInfo, showSuccess, showUndo, t]);

  const runDestructiveAction = useCallback(
    (confirmMessage: string, action: DestructiveAction, alreadyConfirmed = false): boolean => {
      if (!alreadyConfirmed && !confirmDestructiveOperation(confirmMessage)) return false;

      const resumeState = useResumeStore.getState();
      const uiState = useUIStore.getState();
      const previousResume = takeResumeSnapshot(resumeState);
      const previousUI = takeUISnapshot(uiState);
      let completed: boolean | void;
      try {
        completed = action();
      } catch (error) {
        clearUndoSnapshot(previousResume, previousUI);
        showError(
          toAppError(
            error,
            'OPERATION_FAILED',
            'The action failed and previous data was restored.',
          ),
        );
        return false;
      }
      if (completed === false) return false;

      const committedResumeState = useResumeStore.getState();
      const committedUIState = useUIStore.getState();
      const persisted = persistPendingUndo(
        previousResume,
        previousUI,
        committedResumeState,
        committedUIState,
      );

      showUndo(
        t(persisted ? 'common.feedback.undoLastChange' : 'common.feedback.undoThisSessionOnly'),
        () => {
          const currentResumeState = useResumeStore.getState();
          const currentUIState = useUIStore.getState();
          if (
            currentResumeState.resume !== committedResumeState.resume ||
            currentResumeState.activeSections !== committedResumeState.activeSections ||
            currentResumeState.hasResumeChanges !== committedResumeState.hasResumeChanges ||
            currentUIState.theme !== committedUIState.theme ||
            currentUIState.templateId !== committedUIState.templateId ||
            currentUIState.customTemplates !== committedUIState.customTemplates
          ) {
            clearPendingUndo();
            showInfo(t('common.feedback.undoUnavailable'));
            return;
          }

          clearPendingUndo();
          clearUndoSnapshot(previousResume, previousUI);
          showSuccess(t('common.feedback.undoComplete'));
        },
      );
      return true;
    },
    [showError, showInfo, showSuccess, showUndo, t],
  );

  return runDestructiveAction;
};
