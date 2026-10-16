import type { ResumeData, ResumePersonalExtra } from '@entities/resume';
import { useI18n } from '@shared/i18n';
import { createAppError } from '@shared/lib/errors';
import {
  MAX_PHOTO_DATA_URL_LENGTH,
  MAX_RESUME_TEXT_LENGTH,
  MAX_SECTION_ITEMS,
} from '@shared/lib/limits';
import { useAppFeedback } from '@shared/ui/feedback';
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
  const { t } = useI18n();
  const { showError } = useAppFeedback();
  const reportLimitExceeded = useCallback(
    (limit: number) =>
      showError(createAppError('LIMIT_EXCEEDED', t('common.errors.limitExceeded', { limit }))),
    [showError, t],
  );
  const personalSettings = useMemo<PersonalSettings>(
    () => resolvePersonalSettings(resume),
    [resume],
  );

  const handlePersonalChange = useCallback(
    (field: Exclude<keyof ResumeData['personal'], 'extras'>, value: string) => {
      const limit = field === 'photo' ? MAX_PHOTO_DATA_URL_LENGTH : MAX_RESUME_TEXT_LENGTH;
      if (value.length > limit) {
        reportLimitExceeded(limit);
        return;
      }
      updateDraft((draft) => {
        draft.personal[field] = value;
      });
    },
    [reportLimitExceeded, updateDraft],
  );

  const handlePersonalExtraAdd = useCallback(() => {
    if ((resume.personal.extras?.length ?? 0) >= MAX_SECTION_ITEMS) {
      reportLimitExceeded(MAX_SECTION_ITEMS);
      return;
    }
    updateDraft((draft) => {
      const extras = ensureExtrasArray(draft);
      extras.push({
        id: ensureId('extra'),
        label: '',
        value: '',
      });
    });
  }, [reportLimitExceeded, resume.personal.extras?.length, updateDraft]);

  const handlePersonalExtraChange = useCallback(
    (extraId: string, field: keyof ResumePersonalExtra, value: string) => {
      if (value.length > MAX_RESUME_TEXT_LENGTH) {
        reportLimitExceeded(MAX_RESUME_TEXT_LENGTH);
        return;
      }
      updateDraft((draft) => {
        const extras = ensureExtrasArray(draft);
        const target = extras.find((item) => item.id === extraId);
        if (target) {
          target[field] = value;
        }
      });
    },
    [reportLimitExceeded, updateDraft],
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
