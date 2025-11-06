import type { StandardSectionKey } from '@entities/module';
import type {
  ResumeCustomField,
  ResumeCustomSection,
  ResumeCustomSectionMode,
  ResumeData,
  ResumePersonalExtra,
} from '@entities/resume';

export type ResumeSectionItem = {
  id?: string;
  [key: string]: unknown;
};

export type PersonalSettings = {
  showPhoto: boolean;
  photoSize: number;
  photoPosition: 'left' | 'right';
};

export type UseModuleEditorOptions = {
  resume: ResumeData;
  onChange: (updater: (draft: ResumeData) => void) => void;
};

export type StandardSectionHandlers = {
  handleArrayFieldChange: (
    section: StandardSectionKey,
    index: number,
    field: string,
    value: string,
  ) => void;
  handleArrayListChange: (
    section: StandardSectionKey,
    index: number,
    field: string,
    value: string,
  ) => void;
  handleAddSectionItem: (section: StandardSectionKey) => void;
  handleRemoveSectionItem: (section: StandardSectionKey, index: number) => void;
};

export type CustomSectionHandlers = {
  availableCustomSections: ResumeCustomSection[];
  handleCustomTitleChange: (sectionId: string, value: string) => void;
  handleCustomItemsChange: (sectionId: string, value: string) => void;
  handleCustomModeChange: (sectionId: string, mode: ResumeCustomSectionMode) => void;
  handleCustomFieldChange: (
    sectionId: string,
    fieldId: string,
    key: keyof ResumeCustomField,
    value: string,
  ) => void;
  handleCustomFieldAdd: (sectionId: string) => void;
  handleCustomFieldRemove: (sectionId: string, fieldId: string) => void;
  handleCustomTextChange: (sectionId: string, value: string) => void;
};

export type PersonalHandlers = {
  personalSettings: PersonalSettings;
  handlePersonalChange: (field: string, value: string) => void;
  handlePersonalExtraAdd: () => void;
  handlePersonalExtraChange: (
    extraId: string,
    field: keyof ResumePersonalExtra,
    value: string,
  ) => void;
  handlePersonalExtraRemove: (extraId: string) => void;
  handlePersonalSettingChange: <Key extends keyof PersonalSettings>(
    key: Key,
    value: PersonalSettings[Key],
  ) => void;
};

export type UseModuleEditorResult = PersonalHandlers &
  StandardSectionHandlers &
  CustomSectionHandlers;
