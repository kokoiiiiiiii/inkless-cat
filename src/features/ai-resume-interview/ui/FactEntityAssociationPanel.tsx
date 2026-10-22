import type { TranslationKey } from '@shared/i18n';
import { useI18n } from '@shared/i18n';
import { useMemo, useState } from 'react';

import {
  type FactEntityKind,
  getFactEntityAmbiguities,
  mergeCompatibleFactValues,
} from '../model/factEntityLinks';
import type { ResumeFact } from '../model/facts';
import { getFactSource, isFactCurrent } from '../model/facts';
import type { InterviewSession } from '../model/types';
import type { ResumeFactsController } from '../model/useResumeFacts';

type FactEntityAssociationPanelProps = {
  session: InterviewSession | null;
  controller: ResumeFactsController;
};

const entityKinds = new Set<FactEntityKind>(['experience', 'project', 'education']);

const factLabel = (
  fact: ResumeFact,
  t: (key: TranslationKey, vars?: Record<string, string | number | boolean>) => string,
) => {
  const value =
    fact.value && typeof fact.value === 'object' ? (fact.value as Record<string, unknown>) : {};
  const keys =
    fact.kind === 'experience'
      ? ['company', 'role', 'startDate', 'endDate']
      : fact.kind === 'project'
        ? ['name', 'role', 'link']
        : ['school', 'degree', 'startDate', 'endDate'];
  const parts = keys
    .map((key) => value[key])
    .filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()));
  return `${t(`aiInterview.facts.kinds.${fact.kind}` as TranslationKey)}: ${parts.join(' · ') || fact.id}`;
};

const FactEntityAssociationPanel = ({ session, controller }: FactEntityAssociationPanelProps) => {
  const { t } = useI18n();
  const [selectedFactIds, setSelectedFactIds] = useState<string[]>([]);
  const [message, setMessage] = useState<{
    key: string;
    values?: Record<string, string | number | boolean>;
    error?: boolean;
  } | null>(null);
  const eligibleFacts = useMemo(
    () =>
      controller.facts.filter(
        (fact) =>
          entityKinds.has(fact.kind as FactEntityKind) &&
          fact.status === 'confirmed' &&
          session !== null &&
          isFactCurrent(session, fact),
      ),
    [controller.facts, session],
  );
  const ambiguities = useMemo(
    () =>
      getFactEntityAmbiguities(
        session,
        controller.facts,
        controller.entityLinks,
        controller.entitySeparations,
      ),
    [controller.entityLinks, controller.entitySeparations, controller.facts, session],
  );

  if (eligibleFacts.length === 0 && controller.entityLinks.length === 0) return null;

  const getSelectedFacts = () => eligibleFacts.filter((fact) => selectedFactIds.includes(fact.id));

  const handleAssociate = () => {
    const result = controller.linkEntityFacts(selectedFactIds);
    if (!result.ok) {
      const reasonKey = {
        'invalid-count': 'invalidCount',
        'missing-fact': 'missingFact',
        'kind-mismatch': 'kindMismatch',
        'fact-not-current': 'factNotCurrent',
        'already-linked': 'alreadyLinked',
        'field-conflict': 'fieldConflict',
      }[result.reason];
      const conflictFields = (result.conflictFields ?? []).map((field) =>
        t(`aiInterview.facts.fields.${field}` as TranslationKey),
      );
      setMessage({
        key: `aiInterview.entities.errors.${reasonKey}`,
        ...(conflictFields.length > 0 ? { values: { fields: conflictFields.join(', ') } } : {}),
        error: true,
      });
      return;
    }
    setSelectedFactIds([]);
    setMessage({ key: 'aiInterview.entities.linkCreated' });
  };

  const handleKeepSeparate = (factIds: string[]) => {
    if (!controller.keepEntityFactsSeparate(factIds)) {
      setMessage({ key: 'aiInterview.entities.errors.factNotCurrent', error: true });
      return;
    }
    setSelectedFactIds((current) => current.filter((id) => !factIds.includes(id)));
    setMessage({ key: 'aiInterview.entities.separateSaved' });
  };

  const selectedFacts = getSelectedFacts();
  const hasMixedKinds = new Set(selectedFacts.map((fact) => fact.kind)).size > 1;

  return (
    <section
      className="mt-4 min-w-0 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/20"
      aria-labelledby="resume-entity-associations-heading"
    >
      <h5
        id="resume-entity-associations-heading"
        className="text-sm font-semibold text-slate-900 dark:text-white"
      >
        {t('aiInterview.entities.title')}
      </h5>
      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
        {t('aiInterview.entities.description')}
      </p>

      {eligibleFacts.length > 0 && (
        <fieldset className="mt-3 space-y-2">
          <legend className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            {t('aiInterview.entities.selectFacts')}
          </legend>
          {eligibleFacts.map((fact) => {
            const link = controller.entityLinks.find((item) => item.factIds.includes(fact.id));
            const source = session ? getFactSource(session, fact) : null;
            const checked = selectedFactIds.includes(fact.id);
            return (
              <label
                key={fact.id}
                className="flex min-w-0 items-start gap-2 rounded-lg bg-white/80 px-3 py-2 text-xs leading-5 text-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  checked={checked}
                  disabled={Boolean(link)}
                  onChange={() => {
                    setSelectedFactIds((current) =>
                      checked ? current.filter((id) => id !== fact.id) : [...current, fact.id],
                    );
                    setMessage(null);
                  }}
                />
                <span className="min-w-0 break-words">
                  <span className="block">{factLabel(fact, t)}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    {t('aiInterview.entities.sourceFact', {
                      factId: fact.id,
                      answerId: fact.sourceAnswerId,
                    })}
                  </span>
                  {!source && (
                    <span className="block text-[11px] text-amber-700 dark:text-amber-300">
                      {t('aiInterview.facts.sourceUnavailable')}
                    </span>
                  )}
                  {link && (
                    <span className="block font-medium text-indigo-700 dark:text-indigo-300">
                      {t('aiInterview.entities.linked')}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-600 dark:text-slate-300" aria-live="polite">
              {t('aiInterview.entities.selectedCount', { count: selectedFactIds.length })}
            </span>
            <button
              type="button"
              className="inline-flex min-h-10 items-center rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-400 dark:text-slate-950"
              disabled={selectedFactIds.length < 2 || hasMixedKinds}
              onClick={handleAssociate}
            >
              {t('aiInterview.entities.associateSelected')}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              disabled={selectedFactIds.length < 2 || hasMixedKinds}
              onClick={() => handleKeepSeparate(selectedFactIds)}
            >
              {t('aiInterview.entities.keepSeparateSelected')}
            </button>
            {hasMixedKinds && (
              <p className="basis-full text-xs text-amber-800 dark:text-amber-200" role="status">
                {t('aiInterview.entities.errors.kindMismatch')}
              </p>
            )}
          </div>
        </fieldset>
      )}

      {message && (
        <p
          className="mt-2 text-xs leading-5 text-slate-700 dark:text-slate-200"
          role={message.error ? 'alert' : 'status'}
        >
          {t(message.key as TranslationKey, message.values)}
        </p>
      )}

      {ambiguities.length > 0 && (
        <div className="mt-3 space-y-2">
          <h6 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            {t('aiInterview.entities.ambiguitiesTitle', { count: ambiguities.length })}
          </h6>
          <ul className="space-y-2">
            {ambiguities.map((warning) => {
              const pair = warning.factIds
                .map((factId) => eligibleFacts.find((fact) => fact.id === factId))
                .filter((fact): fact is ResumeFact => fact !== undefined);
              if (pair.length !== 2) return null;
              return (
                <li
                  key={`${warning.kind}:${warning.factIds.join('|')}`}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 dark:border-amber-900 dark:bg-amber-950/30"
                >
                  <p className="text-amber-950 dark:text-amber-100">
                    {t(
                      warning.reason === 'field-conflict'
                        ? 'aiInterview.entities.ambiguityConflictBody'
                        : 'aiInterview.entities.ambiguityBody',
                    )}
                  </p>
                  <ul className="mt-1 space-y-1 text-slate-700 dark:text-slate-200">
                    {pair.map((fact) => (
                      <li key={fact.id} className="break-words">
                        {factLabel(fact, t)}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center rounded-lg bg-indigo-700 px-3 py-2 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:bg-indigo-400 dark:text-slate-950"
                      onClick={() => {
                        setSelectedFactIds(warning.factIds);
                        setMessage({ key: 'aiInterview.entities.chooseAssociateAction' });
                      }}
                    >
                      {t('aiInterview.entities.reviewAssociation')}
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      onClick={() => handleKeepSeparate(warning.factIds)}
                    >
                      {t('aiInterview.entities.keepSeparate')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {controller.entityLinks.length > 0 && (
        <div className="mt-3 space-y-2">
          <h6 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            {t('aiInterview.entities.savedLinks', { count: controller.entityLinks.length })}
          </h6>
          {controller.entityLinks.map((link) => {
            const linkedFacts = link.factIds.map((factId) =>
              controller.facts.find((fact) => fact.id === factId),
            );
            const completeFacts = linkedFacts.filter(
              (fact): fact is ResumeFact => fact !== undefined,
            );
            const isCurrent =
              completeFacts.length === link.factIds.length &&
              completeFacts.every(
                (fact) =>
                  fact.status === 'confirmed' && session !== null && isFactCurrent(session, fact),
              );
            const merged = mergeCompatibleFactValues(completeFacts);
            const canConfirm = link.status === 'needs-review' && isCurrent && merged.ok;
            return (
              <div
                key={link.entityId}
                className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs leading-5 dark:border-slate-700 dark:bg-slate-900/80"
              >
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {t(
                    `aiInterview.entities.status.${link.status === 'needs-review' ? 'needsReview' : link.status}` as TranslationKey,
                  )}{' '}
                  · {t(`aiInterview.facts.kinds.${link.kind}` as TranslationKey)}
                </p>
                <ul className="mt-1 space-y-1 text-slate-700 dark:text-slate-200">
                  {link.factIds.map((factId, index) => (
                    <li key={`${factId}-${index}`} className="break-words">
                      {completeFacts[index] ? factLabel(completeFacts[index], t) : factId}
                    </li>
                  ))}
                </ul>
                {link.status !== 'active' && (
                  <p className="mt-1 text-amber-800 dark:text-amber-200" role="status">
                    {t('aiInterview.entities.linkUnavailable')}
                    {!merged.ok && merged.conflictFields.length > 0 && (
                      <span className="block">
                        {t('aiInterview.entities.conflictingFields', {
                          fields: merged.conflictFields
                            .map((field) =>
                              t(`aiInterview.facts.fields.${field}` as TranslationKey),
                            )
                            .join(', '),
                        })}
                      </span>
                    )}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {canConfirm && (
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center rounded-lg bg-indigo-700 px-3 py-2 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:bg-indigo-400 dark:text-slate-950"
                      onClick={() => {
                        setMessage(
                          controller.confirmEntityLink(link.entityId)
                            ? { key: 'aiInterview.entities.linkConfirmed' }
                            : { key: 'aiInterview.entities.errors.factNotCurrent', error: true },
                        );
                      }}
                    >
                      {t('aiInterview.entities.confirmLink')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    onClick={() => {
                      controller.unlinkEntityFacts(link.entityId);
                      setMessage({ key: 'aiInterview.entities.linkRemoved' });
                    }}
                  >
                    {t(
                      link.status === 'invalid'
                        ? 'aiInterview.entities.removeInvalidLink'
                        : 'aiInterview.entities.unlink',
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default FactEntityAssociationPanel;
