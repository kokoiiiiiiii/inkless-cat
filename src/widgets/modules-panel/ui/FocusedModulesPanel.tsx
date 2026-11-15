import { extractCustomSectionId, isCustomSectionKey, sectionOrder } from '@entities/module';
import type { ActiveSectionKey, ResumeData } from '@entities/resume';
import type { ResumeSectionItem } from '@features/edit-module';
import type { UseModulesPanelControllerResult } from '@features/modules-panel';

import CustomSectionEditor from './CustomSectionEditor';
import PCStudioPersonalSection from './PCStudioPersonalSection';
import PersonalSection from './PersonalSection';
import ResumeSection from './ResumeSection';

type FocusedModulesPanelProps = {
  selectedKey: ActiveSectionKey | 'personal';
  resume: ResumeData;
  controller: UseModulesPanelControllerResult;
  personalPresentation?: 'standard' | 'pc-studio';
};

export const FocusedModulesPanel = ({
  selectedKey,
  resume,
  controller,
  personalPresentation = 'standard',
}: FocusedModulesPanelProps) => {
  const {
    personalSettings,
    availableCustomSections,
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
  const stableFieldIdentity = personalPresentation === 'pc-studio';

  if (selectedKey === 'personal') {
    if (personalPresentation === 'pc-studio') {
      return (
        <PCStudioPersonalSection
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
      );
    }

    return (
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
        validateStudioFields
      />
    );
  }

  if (sectionOrder.includes(selectedKey as (typeof sectionOrder)[number])) {
    const sectionKey = selectedKey as (typeof sectionOrder)[number];
    const items = Array.isArray(resume[sectionKey])
      ? (resume[sectionKey] as ResumeSectionItem[])
      : [];

    return (
      <ResumeSection
        sectionKey={sectionKey}
        items={items}
        onAddItem={handleAddSectionItem}
        onRemoveItem={handleRemoveSectionItem}
        onFieldChange={handleArrayFieldChange}
        onListChange={handleArrayListChange}
        notifyFocus={notifyFocus}
        stableFieldIdentity={stableFieldIdentity}
        sectionRef={getSectionRef(sectionKey)}
      />
    );
  }

  if (isCustomSectionKey(selectedKey)) {
    const customId = extractCustomSectionId(selectedKey);
    const section = availableCustomSections.find((item) => item.id === customId);
    if (!section) return null;

    return (
      <CustomSectionEditor
        sectionKey={selectedKey}
        section={section}
        onTitleChange={handleCustomTitleChange}
        onModeChange={handleCustomModeChange}
        onItemsChange={handleCustomItemsChange}
        onFieldChange={handleCustomFieldChange}
        onFieldAdd={handleCustomFieldAdd}
        onFieldRemove={handleCustomFieldRemove}
        onTextChange={handleCustomTextChange}
        onRemove={handleDeleteCustomSection}
        notifyFocus={notifyFocus}
        stableFieldIdentity={stableFieldIdentity}
        sectionRef={getSectionRef(selectedKey)}
      />
    );
  }

  return null;
};
