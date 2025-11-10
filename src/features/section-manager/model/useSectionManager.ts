import {
  getCustomSectionKey,
  isCustomSectionKey,
  sectionDefinitions,
  sectionOrder,
  type StandardSectionKey,
} from '@entities/module';
import type { ResumeCustomSection } from '@entities/resume';
import { useI18n } from '@shared/i18n';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useMemo } from 'react';

import { type DragState, useSectionDragController } from './useSectionDragController';

export type SectionToggleHandler = (sectionKey: string, enabled: boolean) => void;
export type SectionReorderHandler = (order: string[]) => void;

export type UseSectionManagerOptions = {
  activeSections?: string[];
  customSections?: ResumeCustomSection[];
  onToggleSection?: SectionToggleHandler;
  onReorderSections?: SectionReorderHandler;
};

export type SectionManagerController = {
  resolvedActiveSections: string[];
  customList: ResumeCustomSection[];
  standardAllEnabled: boolean;
  standardAnyEnabled: boolean;
  displayOrder: string[];
  dragState: DragState;
  dragListRef: MutableRefObject<HTMLUListElement | null>;
  getSectionTitle: (key: string) => string;
  handleToggleAllStandard: (nextState: boolean) => void;
  handlePointerDown: (event: ReactPointerEvent<HTMLLIElement>, sectionKey: string) => void;
};

export const useSectionManager = ({
  activeSections,
  customSections,
  onToggleSection,
  onReorderSections,
}: UseSectionManagerOptions): SectionManagerController => {
  const { t } = useI18n();
  const resolvedActiveSections = useMemo(
    () => (Array.isArray(activeSections) ? activeSections : [...sectionOrder]),
    [activeSections],
  );

  const customList = useMemo<ResumeCustomSection[]>(
    () => (Array.isArray(customSections) ? customSections : []),
    [customSections],
  );

  const customTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const section of customList) {
      map.set(getCustomSectionKey(section.id), section.title || '');
    }
    return map;
  }, [customList]);

  const getSectionTitle = useCallback(
    (key: string) => {
      if (sectionOrder.includes(key as StandardSectionKey)) {
        const titleKey = sectionDefinitions[key as StandardSectionKey]?.titleKey;
        if (titleKey) {
          const translated = t(titleKey);
          if (translated !== titleKey) {
            return translated;
          }
        }
        return key;
      }
      if (isCustomSectionKey(key)) {
        const stored = customTitleMap.get(key);
        return stored && stored.trim().length > 0
          ? stored
          : t('modules.customSection.defaultTitle');
      }
      return key;
    },
    [customTitleMap, t],
  );

  const standardAllEnabled = useMemo(
    () => sectionOrder.every((key) => resolvedActiveSections.includes(key)),
    [resolvedActiveSections],
  );

  const standardAnyEnabled = useMemo(
    () => sectionOrder.some((key) => resolvedActiveSections.includes(key)),
    [resolvedActiveSections],
  );

  const handleToggleAllStandard = useCallback(
    (nextState: boolean) => {
      if (typeof onToggleSection !== 'function') {
        return;
      }
      const activeSet = new Set(resolvedActiveSections);
      for (const sectionKey of sectionOrder) {
        const isActive = activeSet.has(sectionKey);
        if (nextState && !isActive) {
          onToggleSection(sectionKey, true);
        } else if (!nextState && isActive) {
          onToggleSection(sectionKey, false);
        }
      }
    },
    [onToggleSection, resolvedActiveSections],
  );

  const { displayOrder, dragState, dragListRef, handlePointerDown } = useSectionDragController({
    resolvedActiveSections,
    onReorderSections,
  });

  return {
    resolvedActiveSections,
    customList,
    standardAllEnabled,
    standardAnyEnabled,
    displayOrder,
    dragState,
    dragListRef,
    getSectionTitle,
    handleToggleAllStandard,
    handlePointerDown,
  };
};
