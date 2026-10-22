import type { TranslationKey } from '@shared/i18n';
import { useI18n } from '@shared/i18n';
import { useMemo, useState } from 'react';

import { localizeInterviewQuestion } from '../lib/interviewRules';
import type { FactKind, ResumeFact } from '../model/facts';
import {
  factCandidateSchema,
  getAnswerId,
  getFactSource,
  isFactCurrent,
  selectFactExtractionInput,
} from '../model/facts';
import type { AIInterviewProviderClient, InterviewSession } from '../model/types';
import type { ResumeFactsController } from '../model/useResumeFacts';
import FactEntityAssociationPanel from './FactEntityAssociationPanel';

type FactField = {
  key: string;
  label: TranslationKey;
  multiline?: boolean;
  list?: boolean;
};

const getQuestionDisplay = (
  session: InterviewSession,
  questionId: string,
  translate: (key: string) => string,
) => {
  const question = session.questions.find((item) => item.id === questionId);
  return question ? localizeInterviewQuestion(question, translate).content : questionId;
};

const factFields: Record<FactKind, FactField[]> = {
  targetRole: [{ key: 'value', label: 'aiInterview.facts.fields.targetRole' }],
  personal: [
    { key: 'fullName', label: 'aiInterview.facts.fields.fullName' },
    { key: 'email', label: 'aiInterview.facts.fields.email' },
    { key: 'phone', label: 'aiInterview.facts.fields.phone' },
    { key: 'location', label: 'aiInterview.facts.fields.location' },
    { key: 'summary', label: 'aiInterview.facts.fields.summary', multiline: true },
  ],
  experience: [
    { key: 'company', label: 'aiInterview.facts.fields.company' },
    { key: 'role', label: 'aiInterview.facts.fields.role' },
    { key: 'location', label: 'aiInterview.facts.fields.location' },
    { key: 'startDate', label: 'aiInterview.facts.fields.startDate' },
    { key: 'endDate', label: 'aiInterview.facts.fields.endDate' },
    {
      key: 'responsibilities',
      label: 'aiInterview.facts.fields.responsibilities',
      multiline: true,
      list: true,
    },
    {
      key: 'individualResponsibilities',
      label: 'aiInterview.facts.fields.individualResponsibilities',
      multiline: true,
      list: true,
    },
    {
      key: 'teamResponsibilities',
      label: 'aiInterview.facts.fields.teamResponsibilities',
      multiline: true,
      list: true,
    },
    {
      key: 'achievements',
      label: 'aiInterview.facts.fields.achievements',
      multiline: true,
      list: true,
    },
  ],
  project: [
    { key: 'name', label: 'aiInterview.facts.fields.projectName' },
    { key: 'role', label: 'aiInterview.facts.fields.role' },
    { key: 'summary', label: 'aiInterview.facts.fields.summary', multiline: true },
    { key: 'link', label: 'aiInterview.facts.fields.link' },
    {
      key: 'responsibilities',
      label: 'aiInterview.facts.fields.responsibilities',
      multiline: true,
      list: true,
    },
    {
      key: 'individualResponsibilities',
      label: 'aiInterview.facts.fields.individualResponsibilities',
      multiline: true,
      list: true,
    },
    {
      key: 'teamResponsibilities',
      label: 'aiInterview.facts.fields.teamResponsibilities',
      multiline: true,
      list: true,
    },
    {
      key: 'achievements',
      label: 'aiInterview.facts.fields.achievements',
      multiline: true,
      list: true,
    },
  ],
  education: [
    { key: 'school', label: 'aiInterview.facts.fields.school' },
    { key: 'degree', label: 'aiInterview.facts.fields.degree' },
    { key: 'startDate', label: 'aiInterview.facts.fields.startDate' },
    { key: 'endDate', label: 'aiInterview.facts.fields.endDate' },
    { key: 'details', label: 'aiInterview.facts.fields.details', multiline: true },
  ],
  skill: [{ key: 'value', label: 'aiInterview.facts.fields.skill' }],
};

const kindLabels: Record<FactKind, TranslationKey> = {
  targetRole: 'aiInterview.facts.kinds.targetRole',
  personal: 'aiInterview.facts.kinds.personal',
  experience: 'aiInterview.facts.kinds.experience',
  project: 'aiInterview.facts.kinds.project',
  education: 'aiInterview.facts.kinds.education',
  skill: 'aiInterview.facts.kinds.skill',
};

const blankFactValue = (kind: FactKind): unknown => {
  switch (kind) {
    case 'targetRole':
    case 'skill': {
      return '';
    }
    case 'personal':
    case 'education': {
      return {};
    }
    case 'experience':
    case 'project': {
      return { responsibilities: [], achievements: [] };
    }
  }
};

const getFieldText = (value: unknown, key: string): string => {
  if (key === 'value') return typeof value === 'string' ? value : '';
  if (!value || typeof value !== 'object') return '';
  const fieldValue = (value as Record<string, unknown>)[key];
  if (Array.isArray(fieldValue)) return fieldValue.join('\n');
  return typeof fieldValue === 'string' ? fieldValue : '';
};

const setFieldText = (value: unknown, key: string, text: string, list = false): unknown => {
  if (key === 'value') return text;
  const next = value && typeof value === 'object' ? { ...(value as Record<string, unknown>) } : {};
  if (list) {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    next[key] = lines.length > 0 ? lines : undefined;
  } else {
    next[key] = text.trim() ? text : undefined;
  }
  return next;
};

const describeFact = (fact: ResumeFact, t: (key: TranslationKey) => string): string => {
  if ((fact.kind === 'targetRole' || fact.kind === 'skill') && typeof fact.value === 'string') {
    return fact.value;
  }
  if (!fact.value || typeof fact.value !== 'object') return '';
  const value = fact.value as Record<string, unknown>;
  const preferred =
    fact.kind === 'personal'
      ? ['fullName', 'email', 'phone', 'location', 'summary']
      : fact.kind === 'experience'
        ? ['company', 'role', 'startDate', 'endDate', 'location']
        : fact.kind === 'project'
          ? ['name', 'role']
          : ['school', 'degree', 'startDate', 'endDate'];
  const main = preferred
    .map((key) => value[key])
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
  const bullets = [
    'individualResponsibilities',
    'teamResponsibilities',
    'responsibilities',
    'achievements',
  ]
    .flatMap((key) => (Array.isArray(value[key]) ? value[key] : []))
    .filter((item): item is string => typeof item === 'string');
  const details = typeof value.summary === 'string' ? [value.summary] : [];
  const extraDetails = typeof value.details === 'string' ? [value.details] : [];
  return [...main, ...details, ...extraDetails, ...bullets].join(' · ') || t(kindLabels[fact.kind]);
};

const statusLabel = (status: ResumeFact['status'], t: (key: TranslationKey) => string) =>
  t(`aiInterview.facts.status.${status}` as TranslationKey);

type FactEditorProps = {
  kind: FactKind;
  value: unknown;
  onChange: (value: unknown) => void;
  idPrefix: string;
};

const FactValueEditor = ({ kind, value, onChange, idPrefix }: FactEditorProps) => {
  const { t } = useI18n();
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      {factFields[kind].map((field) => {
        const fieldId = `${idPrefix}-${field.key}`;
        const fieldText = getFieldText(value, field.key);
        return (
          <label
            key={field.key}
            htmlFor={fieldId}
            className={`min-w-0 text-xs font-medium text-slate-700 dark:text-slate-200 ${field.multiline ? 'sm:col-span-2' : ''}`}
          >
            {t(field.label)}
            {field.multiline ? (
              <textarea
                id={fieldId}
                className="mt-1 min-h-20 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-5 text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={fieldText}
                onChange={(event) =>
                  onChange(setFieldText(value, field.key, event.currentTarget.value, field.list))
                }
              />
            ) : (
              <input
                id={fieldId}
                className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={fieldText}
                onChange={(event) =>
                  onChange(setFieldText(value, field.key, event.currentTarget.value))
                }
              />
            )}
          </label>
        );
      })}
    </div>
  );
};

type FactCardProps = {
  fact: ResumeFact;
  session: InterviewSession;
  controller: ResumeFactsController;
};

const FactCard = ({ fact, session, controller }: FactCardProps) => {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState<unknown>(fact.value);
  const [validationError, setValidationError] = useState(false);
  const source = getFactSource(session, fact);
  const conflictFieldLabels = (fact.conflictFields ?? [])
    .map((key) => factFields[fact.kind].find((field) => field.key === key))
    .filter((field): field is FactField => field !== undefined)
    .map((field) => t(field.label));

  const saveEdit = () => {
    const parsed = factCandidateSchema.safeParse({
      kind: fact.kind,
      sourceQuestionId: fact.sourceQuestionId,
      sourceAnswerId: fact.sourceAnswerId,
      value: draftValue,
    });
    if (!parsed.success) {
      setValidationError(true);
      return;
    }
    controller.updateFact(fact.id, parsed.data.value);
    setValidationError(false);
    setEditing(false);
  };

  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t(kindLabels[fact.kind])}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
            {t(
              fact.origin === 'ai'
                ? 'aiInterview.facts.originAi'
                : 'aiInterview.facts.originManual',
            )}
            {' · '}
            {t(
              isFactCurrent(session, fact)
                ? 'aiInterview.facts.sourceLinked'
                : 'aiInterview.facts.sourceChanged',
            )}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${fact.status === 'confirmed' ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' : fact.status === 'conflict' || fact.status === 'stale' ? 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100' : fact.status === 'rejected' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'dark:bg-brand-950 bg-brand-50 text-brand-900 dark:text-brand-200'}`}
        >
          {statusLabel(fact.status, t)}
        </span>
      </div>
      <dl className="mt-3 space-y-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 dark:bg-slate-900">
        {factFields[fact.kind].map((field) => {
          const fieldText = getFieldText(fact.value, field.key);
          if (!fieldText.trim()) return null;
          return (
            <div key={field.key} className="min-w-0 break-words">
              <dt className="inline font-semibold text-slate-700 dark:text-slate-200">
                {t(field.label)}:{' '}
              </dt>
              <dd className="inline whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                {fieldText}
              </dd>
            </div>
          );
        })}
      </dl>
      {editing && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          {t('aiInterview.facts.editing')}
        </p>
      )}
      {fact.status === 'conflict' && (
        <p
          className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          {t('aiInterview.facts.conflictNotice')}
          {conflictFieldLabels.length > 0 && (
            <span className="mt-1 block">
              <strong>{t('aiInterview.facts.conflictFields')}:</strong>{' '}
              {conflictFieldLabels.join(', ')}
            </span>
          )}
        </p>
      )}
      {fact.status === 'stale' && (
        <p
          className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          {t('aiInterview.facts.staleNotice')}
        </p>
      )}
      <details className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 dark:bg-slate-900">
        <summary className="cursor-pointer font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-slate-200">
          {t('aiInterview.facts.viewSource')}
        </summary>
        {source ? (
          <div className="mt-2 space-y-2 break-words text-slate-600 dark:text-slate-300">
            <p>
              <strong>{t('aiInterview.facts.sourceQuestion')}:</strong>{' '}
              {getQuestionDisplay(session, fact.sourceQuestionId, (key) =>
                t(key as TranslationKey),
              )}
            </p>
            <p>
              <strong>{t('aiInterview.facts.sourceAnswer')}:</strong> {source.answer.text}
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              {t('aiInterview.facts.sourceIds', {
                questionId: fact.sourceQuestionId,
                answerId: fact.sourceAnswerId,
              })}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-amber-800 dark:text-amber-200">
            {t('aiInterview.facts.sourceUnavailable')}
          </p>
        )}
      </details>
      {editing && (
        <div className="mt-3 space-y-3">
          <FactValueEditor
            kind={fact.kind}
            value={draftValue}
            onChange={(value) => {
              setDraftValue(value);
              setValidationError(false);
            }}
            idPrefix={`fact-${fact.id}`}
          />
          {validationError && (
            <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
              {t('aiInterview.facts.invalidFact')}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={smallPrimaryClass} onClick={saveEdit}>
              {t('aiInterview.facts.saveEdit')}
            </button>
            <button
              type="button"
              className={smallSecondaryClass}
              onClick={() => {
                setDraftValue(fact.value);
                setValidationError(false);
                setEditing(false);
              }}
            >
              {t('aiInterview.facts.cancelEdit')}
            </button>
          </div>
        </div>
      )}
      {!editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={smallSecondaryClass}
            disabled={fact.status === 'stale' && !source}
            onClick={() => {
              setDraftValue(fact.value);
              setEditing(true);
            }}
          >
            {t('aiInterview.facts.edit')}
          </button>
          {(fact.status === 'pending' || fact.status === 'conflict') && (
            <button
              type="button"
              className={smallPrimaryClass}
              onClick={() => controller.confirmFact(fact.id)}
            >
              {t('aiInterview.facts.confirmReviewed')}
            </button>
          )}
          {fact.status !== 'rejected' && fact.status !== 'stale' && (
            <button
              type="button"
              className={smallSecondaryClass}
              onClick={() => controller.rejectFact(fact.id)}
            >
              {t('aiInterview.facts.reject')}
            </button>
          )}
        </div>
      )}
    </article>
  );
};

const smallPrimaryClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:text-slate-950';
const smallSecondaryClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

type FactVerificationPanelProps = {
  session: InterviewSession | null;
  provider: AIInterviewProviderClient;
  controller: ResumeFactsController;
  onOpenProviderSettings: () => void;
};

const FactVerificationPanel = ({
  session,
  provider,
  controller,
  onOpenProviderSettings,
}: FactVerificationPanelProps) => {
  const { t } = useI18n();
  const [showConsent, setShowConsent] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualKind, setManualKind] = useState<FactKind>('targetRole');
  const [manualValue, setManualValue] = useState<unknown>(() => blankFactValue('targetRole'));
  const [manualSourceId, setManualSourceId] = useState('');
  const [manualError, setManualError] = useState(false);

  const extractionInput = useMemo(() => {
    if (!session) return null;
    try {
      return selectFactExtractionInput(session);
    } catch {
      return null;
    }
  }, [session]);

  const canManualAdd = Boolean(session && manualSourceId);
  const addManualFact = () => {
    if (!session || !manualSourceId) {
      setManualError(true);
      return;
    }
    const answer = session.answers.find((item) => getAnswerId(item) === manualSourceId);
    if (!answer) {
      setManualError(true);
      return;
    }
    const parsed = factCandidateSchema.safeParse({
      kind: manualKind,
      sourceQuestionId: answer.questionId,
      sourceAnswerId: getAnswerId(answer),
      value: manualValue,
    });
    if (!parsed.success) {
      setManualError(true);
      return;
    }
    controller.addManualFact(parsed.data);
    setShowManualForm(false);
    setManualError(false);
    setManualKind('targetRole');
    setManualValue(blankFactValue('targetRole'));
  };

  const errorMessageKey: TranslationKey | null = controller.errorCode
    ? controller.errorCode === 'timeout'
      ? 'aiInterview.facts.errors.timeout'
      : controller.errorCode === 'cancelled'
        ? 'aiInterview.facts.errors.cancelled'
        : controller.errorCode === 'provider_changed'
          ? 'aiInterview.facts.errors.providerChanged'
          : controller.errorCode === 'source_changed'
            ? 'aiInterview.facts.errors.sourceChanged'
            : controller.errorCode === 'provider_not_configured'
              ? 'aiInterview.facts.errors.providerNotConfigured'
              : controller.errorCode === 'no_answers'
                ? 'aiInterview.facts.errors.noAnswers'
                : controller.errorCode === 'input_too_long' ||
                    controller.errorCode === 'too_many_answers'
                  ? 'aiInterview.facts.errors.inputTooLong'
                  : [
                        'invalid_json',
                        'invalid_schema',
                        'unknown_source',
                        'ungrounded_value',
                      ].includes(controller.errorCode)
                    ? 'aiInterview.facts.errors.invalidOutput'
                    : 'aiInterview.facts.errors.providerError'
    : null;
  const errorMessage = errorMessageKey ? t(errorMessageKey) : '';

  return (
    <section
      className="dark:bg-brand-950/20 min-w-0 rounded-2xl border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-900 sm:p-4"
      aria-labelledby="resume-fact-verification-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4
            id="resume-fact-verification-heading"
            className="text-sm font-semibold text-slate-900 dark:text-white"
          >
            {t('aiInterview.facts.title')}
          </h4>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
            {t('aiInterview.facts.description')}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
            {t('aiInterview.facts.semanticReviewNotice')}
          </p>
        </div>
        <p
          className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200"
          aria-live="polite"
        >
          {t('aiInterview.facts.pendingCount', {
            count: controller.pendingCount + controller.conflictCount,
          })}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        <span>{t('aiInterview.facts.confirmedCount', { count: controller.confirmedCount })}</span>
        <span>
          {t('aiInterview.facts.unconfirmedCount', {
            count: controller.pendingCount + controller.conflictCount,
          })}
        </span>
        {controller.staleCount > 0 && (
          <span>{t('aiInterview.facts.staleCount', { count: controller.staleCount })}</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={smallPrimaryClass}
          disabled={
            !provider.isConfigured ||
            !extractionInput ||
            controller.extractionState === 'extracting'
          }
          onClick={() => setShowConsent((visible) => !visible)}
        >
          {controller.extractionState === 'extracting'
            ? t('aiInterview.facts.extracting')
            : controller.extractionState === 'failed' || controller.extractionState === 'timeout'
              ? t('aiInterview.facts.retryExtraction')
              : t('aiInterview.facts.extract')}
        </button>
        <button
          type="button"
          className={smallSecondaryClass}
          onClick={() => setShowManualForm((visible) => !visible)}
        >
          {showManualForm ? t('aiInterview.facts.closeManual') : t('aiInterview.facts.addManually')}
        </button>
        {!provider.isConfigured && (
          <button type="button" className={smallSecondaryClass} onClick={onOpenProviderSettings}>
            {t('aiInterview.configureProvider')}
          </button>
        )}
      </div>

      {!provider.isConfigured && (
        <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300" role="status">
          {t('aiInterview.facts.manualWithoutProvider')}
        </p>
      )}

      {showConsent && extractionInput && provider.configuration && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <h5 className="font-semibold">{t('aiInterview.facts.consentTitle')}</h5>
          <p className="mt-1">
            {t('aiInterview.facts.consentBody', {
              model: provider.configuration.model,
              endpoint: provider.configuration.baseUrl,
              count: extractionInput.includedAnswers.length,
              characters: extractionInput.totalCodeUnits,
            })}
          </p>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-lg bg-white/70 p-2 dark:bg-black/20">
            {extractionInput.includedAnswers.map((answer) => {
              return (
                <li key={getAnswerId(answer)} className="break-words">
                  <p>
                    <strong>
                      {session
                        ? getQuestionDisplay(session, answer.questionId, (key) =>
                            t(key as TranslationKey),
                          )
                        : answer.questionId}
                    </strong>
                  </p>
                  <p>{answer.text}</p>
                </li>
              );
            })}
          </ul>
          {extractionInput.omittedAnswerCount > 0 && (
            <p className="mt-2">
              {t('aiInterview.facts.omittedAnswers', { count: extractionInput.omittedAnswerCount })}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={smallPrimaryClass}
              onClick={() => {
                setShowConsent(false);
                void controller.extract();
              }}
            >
              {t('aiInterview.facts.sendAndExtract')}
            </button>
            <button
              type="button"
              className={smallSecondaryClass}
              onClick={() => setShowConsent(false)}
            >
              {t('aiInterview.facts.cancel')}
            </button>
          </div>
        </div>
      )}

      {controller.extractionState === 'extracting' && (
        <div
          className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300"
          role="status"
          aria-live="polite"
        >
          <span>{t('aiInterview.facts.extractingStatus')}</span>
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={controller.cancelExtraction}
          >
            {t('aiInterview.facts.cancelRequest')}
          </button>
        </div>
      )}
      {errorMessage && (
        <div
          className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          role={controller.extractionState === 'cancelled' ? 'status' : 'alert'}
        >
          {errorMessage}
          <button
            type="button"
            className="ml-2 font-semibold underline"
            onClick={() => setShowConsent(true)}
          >
            {t('aiInterview.facts.retryExtraction')}
          </button>
        </div>
      )}

      {showManualForm && session && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
          <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('aiInterview.facts.manualTitle')}
          </h5>
          <div className="mt-3 grid gap-3">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {t('aiInterview.facts.factType')}
              <select
                className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                value={manualKind}
                onChange={(event) => {
                  const nextKind = event.currentTarget.value as FactKind;
                  setManualKind(nextKind);
                  setManualValue(blankFactValue(nextKind));
                  setManualError(false);
                }}
              >
                {(Object.keys(kindLabels) as FactKind[]).map((kind) => (
                  <option key={kind} value={kind}>
                    {t(kindLabels[kind])}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {t('aiInterview.facts.sourceAnswer')}
              <select
                className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                value={manualSourceId}
                onChange={(event) => setManualSourceId(event.currentTarget.value)}
              >
                <option value="">{t('aiInterview.facts.chooseSource')}</option>
                {session.answers
                  .filter((answer) => !answer.skipped && answer.text.trim())
                  .map((answer) => {
                    return (
                      <option key={getAnswerId(answer)} value={getAnswerId(answer)}>
                        {getQuestionDisplay(session, answer.questionId, (key) =>
                          t(key as TranslationKey),
                        )}
                      </option>
                    );
                  })}
              </select>
            </label>
            <FactValueEditor
              kind={manualKind}
              value={manualValue}
              onChange={(value) => {
                setManualValue(value);
                setManualError(false);
              }}
              idPrefix="manual-fact"
            />
            {manualError && (
              <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
                {t('aiInterview.facts.invalidFact')}
              </p>
            )}
            <button
              type="button"
              className={smallPrimaryClass}
              disabled={!canManualAdd}
              onClick={addManualFact}
            >
              {t('aiInterview.facts.addFact')}
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-3">
        {controller.facts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {t('aiInterview.facts.empty')}
          </p>
        ) : (
          session &&
          controller.facts.map((fact) => (
            <FactCard key={fact.id} fact={fact} session={session} controller={controller} />
          ))
        )}
      </div>

      <FactEntityAssociationPanel session={session} controller={controller} />

      {controller.confirmedCount > 0 && (
        <details className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <summary className="cursor-pointer text-xs font-semibold text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-100">
            {t('aiInterview.facts.confirmedSummary', { count: controller.confirmedCount })}
          </summary>
          <ul className="mt-2 space-y-2 text-xs leading-5 text-emerald-950 dark:text-emerald-100">
            {controller.facts
              .filter((fact) => fact.status === 'confirmed')
              .map((fact) => (
                <li key={fact.id} className="break-words">
                  {t(kindLabels[fact.kind])}: {describeFact(fact, t)}
                </li>
              ))}
          </ul>
        </details>
      )}
    </section>
  );
};

export default FactVerificationPanel;
