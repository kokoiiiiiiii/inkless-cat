import { sectionOrder } from '@entities/module';
import type { ResumeCustomSection, ResumeData } from '@entities/resume';
import { useModuleEditor } from '@features/edit-module';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { RegisterSectionRef, SectionFocusHandler } from './types';

type UseModulesPanelControllerOptions = {
  resume: ResumeData;
  onChange: (updater: (draft: ResumeData) => void) => void;
  activeSections?: string[];
  customSections?: ResumeCustomSection[];
  onFieldFocus?: SectionFocusHandler;
  onRemoveCustomSection?: (sectionId: string) => void;
  registerSectionRef?: RegisterSectionRef;
};

export const useModulesPanelController = ({
  resume,
  onChange,
  activeSections,
  customSections,
  onFieldFocus,
  onRemoveCustomSection,
  registerSectionRef,
}: UseModulesPanelControllerOptions) => {
  const notifyFocus = useCallback<SectionFocusHandler>(
    (sectionKey, itemKey) => {
      onFieldFocus?.(sectionKey, itemKey);
    },
    [onFieldFocus],
  );

  const moduleEditor = useModuleEditor({ resume, onChange });

  const resolvedActiveSections = useMemo(
    () =>
      Array.isArray(activeSections) && activeSections.length > 0
        ? activeSections
        : [...sectionOrder],
    [activeSections],
  );

  const availableCustomSections = useMemo<ResumeCustomSection[]>(() => {
    if (Array.isArray(customSections)) {
      return customSections;
    }
    return moduleEditor.availableCustomSections;
  }, [customSections, moduleEditor.availableCustomSections]);

  const sectionRefCallbacks = useRef<Map<string, (node: HTMLElement | null) => void>>(new Map());

  useEffect(() => {
    sectionRefCallbacks.current.clear();
  }, [registerSectionRef]);

  const getSectionRef = useCallback(
    (key: string) => {
      const existing = sectionRefCallbacks.current.get(key);
      if (existing) {
        return existing;
      }
      const callback = (node: HTMLElement | null) => {
        registerSectionRef?.(key, node);
      };
      sectionRefCallbacks.current.set(key, callback);
      return callback;
    },
    [registerSectionRef],
  );

  const handleDeleteCustomSection = useCallback(
    (sectionId: string) => {
      onRemoveCustomSection?.(sectionId);
    },
    [onRemoveCustomSection],
  );

  return {
    ...moduleEditor,
    resolvedActiveSections,
    availableCustomSections,
    notifyFocus,
    getSectionRef,
    handleDeleteCustomSection,
  };
};

export type UseModulesPanelControllerResult = ReturnType<typeof useModulesPanelController>;
