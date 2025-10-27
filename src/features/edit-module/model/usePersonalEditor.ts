import type { ResumeData, ResumePersonalExtra } from '@entities/resume';
import { useCallback, useMemo } from 'react';

import { clampPhotoSize, DEFAULT_PERSONAL_SETTINGS, ensureId } from '../lib';
import type { PersonalHandlers, PersonalSettings } from './types';

type UpdateDraft = (mutator: (draft: ResumeData) => void) => void;

const resolvePersonalSettings = (resume: ResumeData): PersonalSettings => {
  const personalOverrides = resume.settings?.personal;
  const rawSettings = personalOverrides
    ? { ...DEFAULT_PERSONAL_SETTINGS, ...personalOverrides }
    : { ...DEFAULT_PERSONAL_SETTINGS };
  const sizeCandidate = Number(rawSettings.photoSize);
  const photoSize = Number.isFinite(sizeCandidate)
    ? clampPhotoSize(sizeCandidate)
    : DEFAULT_PERSONAL_SETTINGS.photoSize;
  return {
    showPhoto: rawSettings.showPhoto !== false,
    photoSize,
    photoPosition: rawSettings.photoPosition === 'left' ? 'left' : 'right',
  };
};

const ensureExtrasArray = (draft: ResumeData): ResumePersonalExtra[] => {
  const extras = draft.personal.extras;
  if (Array.isArray(extras)) {
    return extras;
  }
  const next: ResumePersonalExtra[] = [];
  draft.personal.extras = next;
  return next;
};

export const usePersonalEditor = (
  resume: ResumeData,
  updateDraft: UpdateDraft,
): PersonalHandlers => {
  const personalSettings = useMemo<PersonalSettings>(
    () => resolvePersonalSettings(resume),
    [resume],
  );

  const handlePersonalChange = useCallback(
    (field: string, value: string) => {
      updateDraft((draft) => {
        draft.personal[field] = value;
      });
    },
    [updateDraft],
  );

  const handlePersonalExtraAdd = useCallback(() => {
    updateDraft((draft) => {
      const extras = ensureExtrasArray(draft);
      extras.push({
        id: ensureId('extra'),
        label: '',
        value: '',
      });
    });
  }, [updateDraft]);

  const handlePersonalExtraChange = useCallback(
    (extraId: string, field: keyof ResumePersonalExtra, value: string) => {
      updateDraft((draft) => {
        const extras = ensureExtrasArray(draft);
        const target = extras.find((item) => item.id === extraId);
        if (target) {
          target[field] = value;
        }
      });
    },
    [updateDraft],
  );

  const handlePersonalExtraRemove = useCallback(
    (extraId: string) => {
      updateDraft((draft) => {
        const extras = ensureExtrasArray(draft);
        draft.personal.extras = extras.filter((item) => item.id !== extraId);
      });
    },
    [updateDraft],
  );

  const handlePersonalSettingChange = useCallback(
    <Key extends keyof PersonalSettings>(key: Key, value: PersonalSettings[Key]) => {
      updateDraft((draft) => {
        if (!draft.settings) {
          draft.settings = {};
        }
        if (!draft.settings.personal) {
          draft.settings.personal = { ...DEFAULT_PERSONAL_SETTINGS };
        }
        (draft.settings.personal as PersonalSettings)[key] = value;
      });
    },
    [updateDraft],
  );

  return {
    personalSettings,
    handlePersonalChange,
    handlePersonalExtraAdd,
    handlePersonalExtraChange,
    handlePersonalExtraRemove,
    handlePersonalSettingChange,
  };
};
