import type { ResumeData } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import { useEffect, useRef } from 'react';

import {
  CUSTOM_TEMPLATES_KEY,
  isBrowser,
  removeStoredValue,
  SECTIONS_KEY,
  STORAGE_KEY,
  TEMPLATE_KEY,
  THEME_KEY,
  writeStoredJson,
  writeStoredString,
} from '../lib/storage';

type UseEditorStorageSyncParams = {
  resume: ResumeData;
  activeSections: string[];
  theme: string;
  templateId?: string;
  customTemplates: ResumeTemplate[];
};

export const useEditorStorageSync = ({
  resume,
  activeSections,
  theme,
  templateId,
  customTemplates,
}: UseEditorStorageSyncParams) => {
  const resumePersistTimeoutRef = useRef<number | null>(null);
  const pendingResumeSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isBrowser) return;
    if (resumePersistTimeoutRef.current !== null) {
      globalThis.clearTimeout(resumePersistTimeoutRef.current);
    }
    const snapshot = JSON.stringify(resume);
    pendingResumeSnapshotRef.current = snapshot;
    resumePersistTimeoutRef.current = globalThis.setTimeout(() => {
      writeStoredString(STORAGE_KEY, snapshot);
      pendingResumeSnapshotRef.current = null;
    }, 400);
    return () => {
      if (resumePersistTimeoutRef.current !== null) {
        globalThis.clearTimeout(resumePersistTimeoutRef.current);
      }
    };
  }, [resume]);

  useEffect(() => {
    if (!isBrowser) return;
    return () => {
      if (pendingResumeSnapshotRef.current) {
        writeStoredString(STORAGE_KEY, pendingResumeSnapshotRef.current);
      }
    };
  }, []);

  useEffect(() => {
    writeStoredJson(SECTIONS_KEY, activeSections);
  }, [activeSections]);

  useEffect(() => {
    writeStoredString(THEME_KEY, theme);
    if (isBrowser) {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  useEffect(() => {
    if (!templateId) return;
    writeStoredString(TEMPLATE_KEY, templateId);
  }, [templateId]);

  useEffect(() => {
    if (customTemplates.length === 0) {
      removeStoredValue(CUSTOM_TEMPLATES_KEY);
      return;
    }
    writeStoredJson(CUSTOM_TEMPLATES_KEY, customTemplates);
  }, [customTemplates]);
};
