import { useResumeSelector, useResumeState, useResumeStore } from '@entities/resume';
import { useUIState } from '@entities/ui';
import { RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY } from '@shared/lib/storage';
import { useEffect, useState } from 'react';

export type LocalSaveStatus = 'checking' | 'ready' | 'saving' | 'saved' | 'error';

const matchesPersistedState = (key: string, expected: Record<string, unknown>): boolean => {
  const raw = globalThis.localStorage.getItem(key);
  if (!raw) return false;
  const envelope = JSON.parse(raw) as { state?: unknown };
  if (!envelope.state || typeof envelope.state !== 'object') return false;
  const state = envelope.state as Record<string, unknown>;
  return Object.entries(expected).every(([field, value]) => {
    return JSON.stringify(state[field]) === JSON.stringify(value);
  });
};

export const useLocalSaveStatus = (): LocalSaveStatus => {
  const { resume, activeSections, hasResumeChanges } = useResumeState();
  const revision = useResumeSelector((state) => state.workspaceRevision);
  const { theme, templateId, customTemplates } = useUIState();
  const [status, setStatus] = useState<LocalSaveStatus>('checking');

  useEffect(() => {
    const isHydrated = useResumeStore.persist?.hasHydrated() ?? true;
    if (!isHydrated) {
      setStatus('checking');
      return;
    }

    if (revision > 0) setStatus('saving');
    const timer = globalThis.setTimeout(() => {
      try {
        const resumeHasPersistedState = Boolean(
          globalThis.localStorage.getItem(RESUME_STORE_PERSIST_KEY),
        );
        const resumeMatches = matchesPersistedState(RESUME_STORE_PERSIST_KEY, {
          resume,
          activeSections,
        });
        const uiMatches = matchesPersistedState(UI_STORE_PERSIST_KEY, {
          theme,
          templateId,
          customTemplates,
        });

        if (resumeMatches && uiMatches) {
          setStatus('saved');
          return;
        }

        if (!resumeHasPersistedState && !hasResumeChanges && revision === 0 && uiMatches) {
          setStatus('ready');
          return;
        }

        const hasPersistedWorkspace = Boolean(
          globalThis.localStorage.getItem(RESUME_STORE_PERSIST_KEY) ||
            globalThis.localStorage.getItem(UI_STORE_PERSIST_KEY),
        );
        setStatus(revision > 0 || hasResumeChanges || hasPersistedWorkspace ? 'error' : 'ready');
      } catch {
        setStatus('error');
      }
    }, 80);

    return () => globalThis.clearTimeout(timer);
  }, [activeSections, customTemplates, hasResumeChanges, resume, revision, templateId, theme]);

  useEffect(() => {
    const finishHydration = useResumeStore.persist?.onFinishHydration(() => {
      setStatus('ready');
    });
    return finishHydration;
  }, []);

  return status;
};
