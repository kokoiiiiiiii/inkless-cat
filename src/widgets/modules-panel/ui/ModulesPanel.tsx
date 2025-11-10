import {
  extractCustomSectionId,
  isCustomSectionKey,
  sectionOrder,
  type StandardSectionKey,
} from '@entities/module';
import type { ResumeData } from '@entities/resume';
import type { ResumeSectionItem } from '@features/edit-module';
import type {
  SectionReorderHandler,
  SectionToggleHandler,
  UseModulesPanelControllerResult,
} from '@features/modules-panel';
import { SectionManager } from '@features/section-manager';

import CustomSectionEditor from './CustomSectionEditor';
import PersonalSection from './PersonalSection';
import ResumeSection from './ResumeSection';

type ModulesPanelProps = {
  resume: ResumeData;
  controller: UseModulesPanelControllerResult;
  activeSections: string[];
  onSectionToggle: SectionToggleHandler;
  onSectionReorder: SectionReorderHandler;
  onAddCustomSection: () => void;
  onRemoveCustomSection: (sectionId: string) => void;
  modulePanelOpen: boolean;
  onToggleModulePanel: () => void;
};

const ModulesPanel = ({
  resume,
  activeSections,
  controller,
  onSectionToggle,
  onSectionReorder,
  onAddCustomSection,
  onRemoveCustomSection,
  modulePanelOpen,
  onToggleModulePanel,
}: ModulesPanelProps) => {
  const {
    personalSettings,
    availableCustomSections,
    resolvedActiveSections,
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
    notifyFocus,
    getSectionRef,
    handleDeleteCustomSection,
  } = controller;

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
