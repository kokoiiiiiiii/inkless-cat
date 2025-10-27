import {
  extractCustomSectionId,
  getCustomSectionKey,
  isCustomSectionKey,
  sectionOrder,
  type StandardSectionKey,
} from '@entities/module';
import type { ResumeCustomSection, ResumeData } from '@entities/resume';
import { type PersonalSettings, type ResumeSectionItem,useModuleEditor } from '@features/edit-module';
import { SectionManager } from '@features/sort-modules';
import { useCallback, useEffect, useRef } from 'react';

import CustomSectionEditor from './CustomSectionEditor';
import PersonalSection from './PersonalSection';
import ResumeSection from './ResumeSection';
import type {
  RegisterSectionRef,
  SectionFocusHandler,
  SectionReorderHandler,
  SectionToggleHandler,
} from './types';

type ModulesPanelProps = {
  resume: ResumeData;
  onChange: (updater: (draft: ResumeData) => void) => void;
  onFieldFocus?: SectionFocusHandler;
  activeSections: string[];
  onSectionToggle: SectionToggleHandler;
  onSectionReorder: SectionReorderHandler;
  customSections: ResumeCustomSection[];
  onAddCustomSection: () => void;
  onRemoveCustomSection: (sectionId: string) => void;
  modulePanelOpen: boolean;
  onToggleModulePanel: () => void;
  registerSectionRef?: RegisterSectionRef;
};

const ModulesPanel = ({
  resume,
  onChange,
  onFieldFocus,
  activeSections,
  onSectionToggle,
  onSectionReorder,
  customSections,
  onAddCustomSection,
  onRemoveCustomSection,
  modulePanelOpen,
  onToggleModulePanel,
  registerSectionRef,
}: ModulesPanelProps) => {
  const notifyFocus = useCallback<SectionFocusHandler>(
    (sectionKey, itemKey) => {
      if (typeof onFieldFocus === 'function') {
        onFieldFocus(sectionKey, itemKey);
      }
    },
    [onFieldFocus],
  );

  const {
    personalSettings,
    availableCustomSections: editorCustomSections,
    handlePersonalChange,
    handleArrayFieldChange,
    handleArrayListChange,
    handleAddSectionItem,
    handleRemoveSectionItem,
    handleCustomTitleChange,
    handleCustomItemsChange,
    handleCustomModeChange,
    handleCustomFieldChange,
    handleCustomFieldAdd,
    handleCustomFieldRemove,
    handleCustomTextChange,
    handlePersonalExtraAdd,
    handlePersonalExtraChange,
    handlePersonalExtraRemove,
    handlePersonalSettingChange,
  } = useModuleEditor({ resume, onChange });

  const handleDeleteCustomSection = useCallback(
    (sectionId: string) => {
      onRemoveCustomSection?.(sectionId);
    },
    [onRemoveCustomSection],
  );

  const resolvedActiveSections = Array.isArray(activeSections) ? activeSections : [...sectionOrder];
  const availableCustomSections: ResumeCustomSection[] = Array.isArray(customSections)
    ? customSections
    : editorCustomSections;

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

  return (
    <div className="space-y-10 pb-10">
      <SectionManager
        activeSections={activeSections}
        onToggleSection={onSectionToggle}
        customSections={availableCustomSections}
        onAddCustomSection={onAddCustomSection}
        onRemoveCustomSection={onRemoveCustomSection}
        isOpen={modulePanelOpen}
        onToggle={onToggleModulePanel}
        onReorderSections={onSectionReorder}
      />
      <PersonalSection
        personal={resume.personal}
        settings={personalSettings}
        onChange={handlePersonalChange}
        notifyFocus={notifyFocus}
        sectionRef={getSectionRef('personal')}
        onExtraAdd={handlePersonalExtraAdd}
        onExtraChange={handlePersonalExtraChange}
        onExtraRemove={handlePersonalExtraRemove}
        onSettingChange={handlePersonalSettingChange}
      />
      {resolvedActiveSections.map((sectionKey) => {
        if (sectionOrder.includes(sectionKey as StandardSectionKey)) {
          const standardKey = sectionKey as StandardSectionKey;
          const sectionItems = Array.isArray(resume[standardKey])
            ? (resume[standardKey] as ResumeSectionItem[])
            : [];
          return (
            <ResumeSection
              key={standardKey}
              sectionKey={standardKey}
              items={sectionItems}
              onAddItem={handleAddSectionItem}
              onRemoveItem={handleRemoveSectionItem}
              onFieldChange={handleArrayFieldChange}
              onListChange={handleArrayListChange}
              notifyFocus={notifyFocus}
              sectionRef={getSectionRef(standardKey)}
            />
          );
        }
        if (isCustomSectionKey(sectionKey)) {
          const customId = extractCustomSectionId(sectionKey);
          const customSection =
            customId && availableCustomSections.find((item) => item.id === customId);
          if (!customSection) return null;
          return (
            <CustomSectionEditor
              key={sectionKey}
              sectionKey={sectionKey}
              section={customSection}
              onTitleChange={handleCustomTitleChange}
              onModeChange={handleCustomModeChange}
              onItemsChange={handleCustomItemsChange}
              onFieldChange={handleCustomFieldChange}
              onFieldAdd={handleCustomFieldAdd}
              onFieldRemove={handleCustomFieldRemove}
              onTextChange={handleCustomTextChange}
              onRemove={handleDeleteCustomSection}
              notifyFocus={notifyFocus}
              sectionRef={getSectionRef(sectionKey)}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

export default ModulesPanel;
