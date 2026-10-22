import {
  type ActiveSectionKey,
  deriveSectionsFromResume,
  type ResumeData,
  resumeSchema,
  useResumeStore,
} from '@entities/resume';
import { ResumePreview } from '@features/resume-preview';
import { type TranslationKey, useI18n } from '@shared/i18n';
import { clone } from '@shared/lib';
import { useMemo, useState } from 'react';

import type { ResumeFact } from '../model/facts';
import {
  buildResumeDraftFromFacts,
  getCurrentConfirmedFacts,
  getResumeDraftBasisKey,
} from '../model/resumeGeneration';
import type { AIInterviewProviderClient, InterviewSession } from '../model/types';

type ResumeGenerationPanelProps = {
  session: InterviewSession | null;
  facts: ResumeFact[];
  provider: AIInterviewProviderClient;
};

type GeneratedDraft = {
  basisKey: string;
  providerStreamComplete: AIInterviewProviderClient['streamComplete'];
  resume: ResumeData;
  includedFactIds: string[];
};

type ResumeSnapshot = {
  resume: ResumeData;
  activeSections: ActiveSectionKey[];
  workspaceGeneration: number;
};

const inputClass =
  'min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
const textAreaClass = `${inputClass} min-h-20 resize-y leading-6`;
const buttonClass =
  'inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 motion-reduce:transition-none';
const primaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:text-slate-950 motion-reduce:transition-none';

const snapshotMatches = (current: ResumeSnapshot, snapshot: ResumeSnapshot) =>
  current.workspaceGeneration === snapshot.workspaceGeneration &&
  JSON.stringify(current.resume) === JSON.stringify(snapshot.resume) &&
  JSON.stringify(current.activeSections) === JSON.stringify(snapshot.activeSections);

const getCurrentStoreSnapshot = (): ResumeSnapshot => {
  const state = useResumeStore.getState();
  return {
    resume: clone(state.resume),
    activeSections: clone(state.activeSections),
    workspaceGeneration: state.workspaceGeneration,
  };
};

const ResumeGenerationPanel = ({ session, facts, provider }: ResumeGenerationPanelProps) => {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
  const [replacementSnapshot, setReplacementSnapshot] = useState<ResumeSnapshot | null>(null);
  const [replacementAcknowledged, setReplacementAcknowledged] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<ResumeSnapshot | null>(null);
  const [appliedSnapshot, setAppliedSnapshot] = useState<ResumeSnapshot | null>(null);

  const currentFacts = useMemo(() => getCurrentConfirmedFacts(session, facts), [facts, session]);
  const basisKey = getResumeDraftBasisKey(session, facts, {
    configuration: provider.configuration,
    isConfigured: provider.isConfigured,
    connectionStatus: provider.connectionStatus,
  });
  const isDraftCurrent = Boolean(
    draft &&
      draft.basisKey === basisKey &&
      draft.providerStreamComplete === provider.streamComplete,
  );
  const validation = draft ? resumeSchema.safeParse(draft.resume) : null;
  const missingFields = draft
    ? getMissingFields(draft.resume, (key) =>
        t(`aiInterview.generation.missing.${key}` as TranslationKey),
      )
    : [];
  const unresolvedConflicts = facts.filter(
    (fact) => fact.status === 'conflict' && fact.conflictFields && fact.conflictFields.length > 0,
  );

  const buildDraft = () => {
    const result = buildResumeDraftFromFacts(session, facts, locale);
    setDraft({
      basisKey,
      providerStreamComplete: provider.streamComplete,
      resume: result.resume,
      includedFactIds: result.includedFactIds,
    });
    setReplacementSnapshot(null);
    setReplacementAcknowledged(false);
    setUndoSnapshot(null);
    setAppliedSnapshot(null);
    setMessage(result.validationError ? t('aiInterview.generation.schemaError') : null);
  };

  const updateDraft = (updater: (resume: ResumeData) => ResumeData) => {
    setDraft((current) => (current ? { ...current, resume: updater(current.resume) } : current));
  };

  const setPersonalField = (
    key: 'fullName' | 'title' | 'email' | 'phone' | 'location' | 'summary',
    value: string,
  ) => updateDraft((resume) => ({ ...resume, personal: { ...resume.personal, [key]: value } }));

  const setExperienceField = (
    index: number,
    key: 'company' | 'role' | 'location' | 'startDate' | 'endDate' | 'highlights',
    value: string,
  ) =>
    updateDraft((resume) => ({
      ...resume,
      experience: resume.experience.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [key]: key === 'highlights' ? splitLines(value) : value }
          : item,
      ),
    }));

  const setProjectField = (
    index: number,
    key: 'name' | 'role' | 'summary' | 'link' | 'highlights',
    value: string,
  ) =>
    updateDraft((resume) => ({
      ...resume,
      projects: resume.projects.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [key]: key === 'highlights' ? splitLines(value) : value }
          : item,
      ),
    }));

  const setEducationField = (
    index: number,
    key: 'school' | 'degree' | 'startDate' | 'endDate' | 'details',
    value: string,
  ) =>
    updateDraft((resume) => ({
      ...resume,
      education: resume.education.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));

  const setSkills = (value: string) =>
    updateDraft((resume) => ({
      ...resume,
      skills: value.trim()
        ? [{ id: resume.skills[0]?.id ?? 'generated-skills', items: splitLines(value) }]
        : [],
    }));

  const openReplacementConfirmation = () => {
    if (!draft || !isDraftCurrent || !validation?.success) return;
    setReplacementSnapshot(getCurrentStoreSnapshot());
    setReplacementAcknowledged(false);
    setMessage(null);
  };

  const applyDraft = () => {
    if (!draft || !replacementSnapshot || !isDraftCurrent || !validation?.success) return;
    const current = getCurrentStoreSnapshot();
    if (!snapshotMatches(current, replacementSnapshot)) {
      setReplacementSnapshot(null);
      setReplacementAcknowledged(false);
      setMessage(t('aiInterview.generation.resumeChanged'));
      return;
    }
    const parsed = resumeSchema.safeParse(draft.resume);
    if (!parsed.success) {
      setMessage(t('aiInterview.generation.schemaError'));
      return;
    }
    setUndoSnapshot(current);
    useResumeStore.getState().replaceState(parsed.data, deriveSectionsFromResume(parsed.data));
    setAppliedSnapshot(getCurrentStoreSnapshot());
    setReplacementSnapshot(null);
    setReplacementAcknowledged(false);
    setMessage(t('aiInterview.generation.applied'));
  };

  const undoApply = () => {
    if (!undoSnapshot || !appliedSnapshot) return;
    const current = getCurrentStoreSnapshot();
    if (!snapshotMatches(current, appliedSnapshot)) {
      setMessage(t('aiInterview.generation.undoUnavailable'));
      setUndoSnapshot(null);
      setAppliedSnapshot(null);
      return;
    }
    useResumeStore.getState().replaceState(undoSnapshot.resume, undoSnapshot.activeSections);
    setUndoSnapshot(null);
    setAppliedSnapshot(null);
    setMessage(t('aiInterview.generation.undone'));
  };

  const cancelReplacement = () => {
    setReplacementSnapshot(null);
    setReplacementAcknowledged(false);
  };

  const editField = (
    label: string,
    value: string | undefined,
    onChange: (value: string) => void,
    multiline = false,
    description?: string,
  ) => (
    <label className="grid min-w-0 gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      {description && <span className="text-[11px] font-normal text-slate-500">{description}</span>}
      {multiline ? (
        <textarea
          className={textAreaClass}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={inputClass}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );

  return (
    <section
      className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5"
      aria-labelledby="resume-generation-heading"
      data-testid="resume-generation-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4
            id="resume-generation-heading"
            className="text-base font-semibold text-slate-900 dark:text-white"
          >
            {t('aiInterview.generation.title')}
          </h4>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 dark:text-slate-300">
            {t('aiInterview.generation.description')}
          </p>
        </div>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={currentFacts.length === 0}
          onClick={buildDraft}
        >
          {draft ? t('aiInterview.generation.rebuild') : t('aiInterview.generation.build')}
        </button>
      </div>

      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        {t('aiInterview.generation.deterministicNotice', { count: currentFacts.length })}
      </p>

      {unresolvedConflicts.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <h5 className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            {t('aiInterview.generation.conflictsTitle', { count: unresolvedConflicts.length })}
          </h5>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-950 dark:text-amber-100">
            {unresolvedConflicts.map((fact) => (
              <li key={fact.id}>
                {t(`aiInterview.facts.kinds.${fact.kind}` as TranslationKey)}:{' '}
                {fact.conflictFields
                  ?.map((field) =>
                    fact.kind === 'targetRole' && field === 'value'
                      ? t('aiInterview.facts.fields.targetRole')
                      : t(
                          `aiInterview.facts.fields.${fact.kind === 'project' && field === 'name' ? 'projectName' : field}` as TranslationKey,
                        ),
                  )
                  .join(', ')}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-5 text-amber-900 dark:text-amber-200">
            {t('aiInterview.generation.conflictsExcluded')}
          </p>
        </div>
      )}

      {!draft && currentFacts.length === 0 && (
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {t('aiInterview.generation.noConfirmedFacts')}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {message}
        </p>
      )}

      {draft && (
        <div className="mt-4 space-y-4" data-testid="generated-resume-draft">
          {!isDraftCurrent && (
            <p
              role="alert"
              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
            >
              {t('aiInterview.generation.staleDraft')}
            </p>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
            <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('aiInterview.generation.missingTitle', { count: missingFields.length })}
            </h5>
            {missingFields.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {missingFields.map((field) => (
                  <li
                    key={field}
                    className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"
                  >
                    {field}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-300">
                {t('aiInterview.generation.noMissing')}
              </p>
            )}
          </div>

          {!validation?.success && (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {t('aiInterview.generation.schemaError')}
            </p>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-950/50">
            <h5 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
              {t('aiInterview.generation.previewTitle')}
            </h5>
            <div className="max-h-[420px] overflow-auto rounded-lg bg-white p-2 shadow-inner dark:bg-slate-900">
              <ResumePreview
                resume={draft.resume}
                activeSections={deriveSectionsFromResume(draft.resume)}
                templateStyle="modern"
              />
            </div>
          </div>

          <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-white">
              {t('aiInterview.generation.editTitle')}
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {editField(
                t('aiInterview.generation.fields.name'),
                draft.resume.personal.fullName,
                (value) => setPersonalField('fullName', value),
              )}
              {editField(
                t('aiInterview.generation.fields.title'),
                draft.resume.personal.title,
                (value) => setPersonalField('title', value),
              )}
              {editField(
                t('aiInterview.generation.fields.email'),
                draft.resume.personal.email,
                (value) => setPersonalField('email', value),
              )}
              {editField(
                t('aiInterview.generation.fields.phone'),
                draft.resume.personal.phone,
                (value) => setPersonalField('phone', value),
              )}
              {editField(
                t('aiInterview.generation.fields.location'),
                draft.resume.personal.location,
                (value) => setPersonalField('location', value),
              )}
              {editField(
                t('aiInterview.generation.fields.summary'),
                draft.resume.personal.summary,
                (value) => setPersonalField('summary', value),
                true,
              )}
            </div>
            {draft.resume.experience.map((item, index) => (
              <fieldset
                key={item.id}
                className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2"
              >
                <legend className="px-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t('aiInterview.generation.experience', { index: index + 1 })}
                </legend>
                {editField(t('aiInterview.generation.fields.company'), item.company, (value) =>
                  setExperienceField(index, 'company', value),
                )}
                {editField(t('aiInterview.generation.fields.role'), item.role, (value) =>
                  setExperienceField(index, 'role', value),
                )}
                {editField(t('aiInterview.generation.fields.location'), item.location, (value) =>
                  setExperienceField(index, 'location', value),
                )}
                {editField(t('aiInterview.generation.fields.startDate'), item.startDate, (value) =>
                  setExperienceField(index, 'startDate', value),
                )}
                {editField(t('aiInterview.generation.fields.endDate'), item.endDate, (value) =>
                  setExperienceField(index, 'endDate', value),
                )}
                {editField(
                  t('aiInterview.generation.fields.highlights'),
                  item.highlights.join('\n'),
                  (value) => setExperienceField(index, 'highlights', value),
                  true,
                  t('aiInterview.generation.responsibilityBoundary'),
                )}
              </fieldset>
            ))}
            {draft.resume.projects.map((item, index) => (
              <fieldset
                key={item.id}
                className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2"
              >
                <legend className="px-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t('aiInterview.generation.project', { index: index + 1 })}
                </legend>
                {editField(t('aiInterview.generation.fields.project'), item.name, (value) =>
                  setProjectField(index, 'name', value),
                )}
                {editField(t('aiInterview.generation.fields.role'), item.role, (value) =>
                  setProjectField(index, 'role', value),
                )}
                {editField(t('aiInterview.generation.fields.link'), item.link, (value) =>
                  setProjectField(index, 'link', value),
                )}
                {editField(
                  t('aiInterview.generation.fields.summary'),
                  item.summary,
                  (value) => setProjectField(index, 'summary', value),
                  true,
                )}
                {editField(
                  t('aiInterview.generation.fields.highlights'),
                  item.highlights.join('\n'),
                  (value) => setProjectField(index, 'highlights', value),
                  true,
                  t('aiInterview.generation.responsibilityBoundary'),
                )}
              </fieldset>
            ))}
            {draft.resume.education.map((item, index) => (
              <fieldset
                key={item.id}
                className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2"
              >
                <legend className="px-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t('aiInterview.generation.education', { index: index + 1 })}
                </legend>
                {editField(t('aiInterview.generation.fields.school'), item.school, (value) =>
                  setEducationField(index, 'school', value),
                )}
                {editField(t('aiInterview.generation.fields.degree'), item.degree, (value) =>
                  setEducationField(index, 'degree', value),
                )}
                {editField(t('aiInterview.generation.fields.startDate'), item.startDate, (value) =>
                  setEducationField(index, 'startDate', value),
                )}
                {editField(t('aiInterview.generation.fields.endDate'), item.endDate, (value) =>
                  setEducationField(index, 'endDate', value),
                )}
                {editField(
                  t('aiInterview.generation.fields.details'),
                  item.details,
                  (value) => setEducationField(index, 'details', value),
                  true,
                )}
              </fieldset>
            ))}
            {editField(
              t('aiInterview.generation.fields.skills'),
              draft.resume.skills.flatMap((group) => group.items).join('\n'),
              setSkills,
              true,
            )}
          </details>

          {replacementSnapshot ? (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/30">
              <h5 className="text-sm font-semibold text-rose-950 dark:text-rose-100">
                {t('aiInterview.generation.replaceTitle')}
              </h5>
              <p className="mt-1 text-xs leading-5 text-rose-900 dark:text-rose-200">
                {t('aiInterview.generation.replaceNotice')}
              </p>
              <label className="mt-3 flex min-h-11 items-start gap-3 text-sm leading-5 text-rose-950 dark:text-rose-100">
                <input
                  type="checkbox"
                  className="mt-1 size-4 rounded border-rose-400 accent-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  checked={replacementAcknowledged}
                  onChange={(event) => setReplacementAcknowledged(event.target.checked)}
                />
                <span>{t('aiInterview.generation.replaceAcknowledgement')}</span>
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={buttonClass} onClick={cancelReplacement}>
                  {t('aiInterview.generation.cancel')}
                </button>
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={!replacementAcknowledged || !isDraftCurrent || !validation?.success}
                  onClick={applyDraft}
                >
                  {t('aiInterview.generation.confirmReplace')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={primaryButtonClass}
                disabled={!isDraftCurrent || !validation?.success}
                onClick={openReplacementConfirmation}
              >
                {t('aiInterview.generation.prepareReplace')}
              </button>
              {undoSnapshot && (
                <button type="button" className={buttonClass} onClick={undoApply}>
                  {t('aiInterview.generation.undo')}
                </button>
              )}
            </div>
          )}
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {t('aiInterview.generation.includedFacts', { count: draft.includedFactIds.length })}
          </p>
        </div>
      )}
    </section>
  );
};

const splitLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const getMissingFields = (resume: ResumeData, translate: (key: string) => string): string[] => {
  const missing: string[] = [];
  if (!resume.personal.fullName?.trim()) missing.push(translate('name'));
  if (!resume.personal.title?.trim()) missing.push(translate('title'));
  if (!resume.personal.email?.trim() && !resume.personal.phone?.trim())
    missing.push(translate('contact'));
  if (!resume.personal.summary?.trim()) missing.push(translate('summary'));
  if (resume.experience.length === 0) missing.push(translate('experience'));
  else {
    if (resume.experience.some((item) => !item.company?.trim()))
      missing.push(translate('experienceCompany'));
    if (resume.experience.some((item) => !item.role?.trim()))
      missing.push(translate('experienceRole'));
    if (resume.experience.some((item) => !item.startDate?.trim() && !item.endDate?.trim()))
      missing.push(translate('experienceDates'));
  }
  if (resume.projects.length === 0) missing.push(translate('projects'));
  else if (resume.projects.some((item) => !item.name?.trim()))
    missing.push(translate('projectName'));
  if (resume.education.length === 0) missing.push(translate('education'));
  else {
    if (resume.education.some((item) => !item.school?.trim()))
      missing.push(translate('educationSchool'));
    if (resume.education.some((item) => !item.degree?.trim()))
      missing.push(translate('educationDegree'));
  }
  if (resume.skills.every((group) => group.items.length === 0)) missing.push(translate('skills'));
  return missing;
};

export default ResumeGenerationPanel;
