import type { ResumeFact } from './facts';
import { isFactCurrent } from './facts';
import type { InterviewSession } from './types';

export type FactEntityKind = 'experience' | 'project' | 'education';
export type FactEntityLinkStatus = 'active' | 'needs-review' | 'invalid';

export type FactEntityLink = {
  entityId: string;
  kind: FactEntityKind;
  factIds: string[];
  sourceFactFingerprints: Record<string, string>;
  origin: 'user-confirmed';
  status: FactEntityLinkStatus;
};

export type FactEntitySeparation = {
  kind: FactEntityKind;
  factIds: [string, string];
  sourceFactFingerprints: Record<string, string>;
};

export type FactEntityWarning = {
  kind: FactEntityKind;
  factIds: string[];
  reason: 'identity-ambiguous' | 'field-conflict';
};

export type FactEntityIdentity = {
  kind: FactEntityKind;
  key: string | null;
  weakKey: string | null;
};

export type EntityMergeResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; conflictFields: string[] };

const entityScalarFields: Record<FactEntityKind, string[]> = {
  experience: ['company', 'role', 'location', 'startDate', 'endDate'],
  project: ['name', 'role', 'summary', 'link'],
  education: ['school', 'degree', 'startDate', 'endDate', 'details'],
};

const entityListFields = [
  'responsibilities',
  'individualResponsibilities',
  'teamResponsibilities',
  'achievements',
] as const;

const normalizeText = (value: string): string =>
  value.normalize('NFKC').replaceAll(/\s+/gu, ' ').trim().toLocaleLowerCase('en-US');

const normalizeProjectLink = (value: string): string | null => {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
};

const getRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const getText = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const getTextList = (record: Record<string, unknown>, key: string): string[] => {
  const value = record[key];
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
        .map((item) => item.trim())
    : [];
};

const compareFacts = (left: ResumeFact, right: ResumeFact): number =>
  left.extractedAt - right.extractedAt || left.id.localeCompare(right.id);

const getDistinctScalarValues = (facts: ResumeFact[], field: string): string[] => {
  const values = facts
    .map((fact) => getText(getRecord(fact.value), field))
    .filter((value): value is string => value !== undefined);
  return [...new Set(values.map((value) => normalizeText(value)))];
};

/** A user must explicitly confirm when multiple source facts describe one entity. */
export const mergeCompatibleFactValues = (facts: ResumeFact[]): EntityMergeResult => {
  const first = facts[0];
  if (
    !first ||
    (first.kind !== 'experience' && first.kind !== 'project' && first.kind !== 'education')
  ) {
    return { ok: false, conflictFields: [] };
  }
  const kind = first.kind;
  if (facts.some((fact) => fact.kind !== kind)) return { ok: false, conflictFields: [] };

  const orderedFacts = [...facts].sort(compareFacts);
  const conflictFields = entityScalarFields[kind].filter(
    (field) => getDistinctScalarValues(orderedFacts, field).length > 1,
  );
  if (conflictFields.length > 0) return { ok: false, conflictFields };

  const value: Record<string, unknown> = {};
  for (const field of entityScalarFields[kind]) {
    const chosen = orderedFacts
      .map((fact) => getText(getRecord(fact.value), field))
      .find((item): item is string => item !== undefined);
    if (chosen) value[field] = chosen;
  }
  for (const field of entityListFields) {
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const fact of orderedFacts) {
      for (const item of getTextList(getRecord(fact.value), field)) {
        const key = normalizeText(item);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }
    }
    if (merged.length > 0) value[field] = merged;
  }
  return { ok: true, value };
};

export const resolveFactEntityIdentity = (fact: ResumeFact): FactEntityIdentity | null => {
  if (fact.kind !== 'experience' && fact.kind !== 'project' && fact.kind !== 'education') {
    return null;
  }
  const value = getRecord(fact.value);
  if (fact.kind === 'experience') {
    const company = getText(value, 'company');
    const role = getText(value, 'role');
    const weakKey = company ? `experience:${normalizeText(company)}` : null;
    return {
      kind: fact.kind,
      key: company && role ? `experience:${normalizeText(company)}|${normalizeText(role)}` : null,
      weakKey,
    };
  }
  if (fact.kind === 'education') {
    const school = getText(value, 'school');
    const degree = getText(value, 'degree');
    const weakKey = school ? `education:${normalizeText(school)}` : null;
    return {
      kind: fact.kind,
      key: school && degree ? `education:${normalizeText(school)}|${normalizeText(degree)}` : null,
      weakKey,
    };
  }

  const name = getText(value, 'name');
  const link = getText(value, 'link');
  const normalizedLink = link ? normalizeProjectLink(link) : null;
  return {
    kind: fact.kind,
    key: normalizedLink ? `project:${normalizedLink}` : null,
    weakKey: name ? `project:${normalizeText(name)}` : null,
  };
};

export const getFactEntityFingerprint = (fact: ResumeFact): string =>
  JSON.stringify({
    kind: fact.kind,
    value: fact.value,
    sourceQuestionId: fact.sourceQuestionId,
    sourceAnswerId: fact.sourceAnswerId,
    sessionId: fact.sessionId,
    sourceAnswerVersion: fact.sourceAnswerVersion,
    sourceFingerprint: fact.sourceFingerprint,
    updatedAt: fact.updatedAt,
  });

const captureFingerprints = (facts: ResumeFact[]): Record<string, string> =>
  Object.fromEntries(facts.map((fact) => [fact.id, getFactEntityFingerprint(fact)]));

const getLinkFacts = (
  facts: ResumeFact[],
  link: FactEntityLink,
): { facts: ResumeFact[]; missing: boolean; invalidKind: boolean } => {
  const byId = new Map(facts.map((fact) => [fact.id, fact]));
  const sourceFacts = link.factIds.map((id) => byId.get(id));
  return {
    facts: sourceFacts.filter((fact): fact is ResumeFact => fact !== undefined),
    missing: sourceFacts.includes(undefined),
    invalidKind: sourceFacts.some((fact) => fact !== undefined && fact.kind !== link.kind),
  };
};

const linkStructuralError = (facts: ResumeFact[], link: FactEntityLink): boolean =>
  link.factIds.length < 2 ||
  new Set(link.factIds).size !== link.factIds.length ||
  facts.length !== link.factIds.length;

const validateLink = (
  session: InterviewSession | null,
  allFacts: ResumeFact[],
  link: FactEntityLink,
): FactEntityLink => {
  const source = getLinkFacts(allFacts, link);
  if (
    link.status === 'invalid' ||
    source.missing ||
    source.invalidKind ||
    linkStructuralError(source.facts, link)
  ) {
    return { ...link, status: 'invalid' };
  }

  const allCurrentAndConfirmed = Boolean(
    session &&
      source.facts.every(
        (fact) =>
          fact.status === 'confirmed' &&
          isFactCurrent(session, fact) &&
          link.sourceFactFingerprints[fact.id] === getFactEntityFingerprint(fact),
      ),
  );
  if (!allCurrentAndConfirmed || link.status === 'needs-review') {
    return { ...link, status: 'needs-review' };
  }

  return mergeCompatibleFactValues(source.facts).ok
    ? { ...link, status: 'active' }
    : { ...link, status: 'needs-review' };
};

export const validateFactEntityLinks = (
  session: InterviewSession | null,
  facts: ResumeFact[],
  links: FactEntityLink[],
): FactEntityLink[] => links.map((link) => validateLink(session, facts, link));

export type CreateFactEntityLinkResult =
  | { ok: true; link: FactEntityLink }
  | {
      ok: false;
      reason:
        | 'invalid-count'
        | 'missing-fact'
        | 'kind-mismatch'
        | 'fact-not-current'
        | 'already-linked'
        | 'field-conflict';
      conflictFields?: string[];
    };

export const createFactEntityLink = (
  session: InterviewSession | null,
  allFacts: ResumeFact[],
  links: FactEntityLink[],
  factIds: string[],
  entityId: string,
): CreateFactEntityLinkResult => {
  const uniqueIds = [...new Set(factIds)].sort();
  if (uniqueIds.length < 2) return { ok: false, reason: 'invalid-count' };
  const byId = new Map(allFacts.map((fact) => [fact.id, fact]));
  const selected = uniqueIds.map((id) => byId.get(id));
  if (selected.some((fact) => !fact)) return { ok: false, reason: 'missing-fact' };
  const selectedFacts = selected.filter((fact): fact is ResumeFact => fact !== undefined);
  const kind = selectedFacts[0]?.kind;
  if (
    !kind ||
    (kind !== 'experience' && kind !== 'project' && kind !== 'education') ||
    selectedFacts.some((fact) => fact.kind !== kind)
  ) {
    return { ok: false, reason: 'kind-mismatch' };
  }
  if (
    !session ||
    selectedFacts.some((fact) => fact.status !== 'confirmed' || !isFactCurrent(session, fact))
  ) {
    return { ok: false, reason: 'fact-not-current' };
  }
  const validatedLinks = validateFactEntityLinks(session, allFacts, links);
  if (
    validatedLinks.some(
      (link) =>
        link.status !== 'invalid' && link.factIds.some((factId) => uniqueIds.includes(factId)),
    )
  ) {
    return { ok: false, reason: 'already-linked' };
  }
  const merged = mergeCompatibleFactValues(selectedFacts);
  if (!merged.ok) {
    return {
      ok: false,
      reason: 'field-conflict',
      conflictFields: merged.conflictFields,
    };
  }
  return {
    ok: true,
    link: {
      entityId,
      kind,
      factIds: uniqueIds,
      sourceFactFingerprints: captureFingerprints(selectedFacts),
      origin: 'user-confirmed',
      status: 'active',
    },
  };
};

export type ConfirmFactEntityLinkResult =
  | { ok: true; link: FactEntityLink }
  | {
      ok: false;
      reason: 'missing-link' | 'invalid-link' | 'fact-not-current' | 'field-conflict';
      conflictFields?: string[];
    };

export const confirmFactEntityLink = (
  session: InterviewSession | null,
  facts: ResumeFact[],
  links: FactEntityLink[],
  entityId: string,
): ConfirmFactEntityLinkResult => {
  const existing = links.find((link) => link.entityId === entityId);
  if (!existing) return { ok: false, reason: 'missing-link' };
  if (existing.status === 'invalid') return { ok: false, reason: 'invalid-link' };
  const source = getLinkFacts(facts, existing);
  if (source.missing || source.invalidKind || linkStructuralError(source.facts, existing)) {
    return { ok: false, reason: 'invalid-link' };
  }
  if (
    !session ||
    source.facts.some((fact) => fact.status !== 'confirmed' || !isFactCurrent(session, fact))
  ) {
    return { ok: false, reason: 'fact-not-current' };
  }
  const merged = mergeCompatibleFactValues(source.facts);
  if (!merged.ok) {
    return { ok: false, reason: 'field-conflict', conflictFields: merged.conflictFields };
  }
  return {
    ok: true,
    link: {
      ...existing,
      sourceFactFingerprints: captureFingerprints(source.facts),
      origin: 'user-confirmed',
      status: 'active',
    },
  };
};

const sortPair = (left: string, right: string): [string, string] =>
  left.localeCompare(right) <= 0 ? [left, right] : [right, left];

export const keepFactEntitiesSeparate = (
  session: InterviewSession | null,
  allFacts: ResumeFact[],
  factIds: string[],
): FactEntitySeparation[] => {
  const byId = new Map(allFacts.map((fact) => [fact.id, fact]));
  const selected = [...new Set(factIds)]
    .map((id) => byId.get(id))
    .filter((fact): fact is ResumeFact => fact !== undefined);
  const kind = selected[0]?.kind;
  if (
    !session ||
    selected.length < 2 ||
    !kind ||
    (kind !== 'experience' && kind !== 'project' && kind !== 'education') ||
    selected.some(
      (fact) => fact.kind !== kind || fact.status !== 'confirmed' || !isFactCurrent(session, fact),
    )
  ) {
    return [];
  }
  const result: FactEntitySeparation[] = [];
  for (let left = 0; left < selected.length; left += 1) {
    for (let right = left + 1; right < selected.length; right += 1) {
      const first = selected[left];
      const second = selected[right];
      if (!first || !second) continue;
      const pair = sortPair(first.id, second.id);
      result.push({
        kind,
        factIds: pair,
        sourceFactFingerprints: captureFingerprints([first, second]),
      });
    }
  }
  return result;
};

const isIdentityCandidatePair = (left: ResumeFact, right: ResumeFact): boolean => {
  const leftIdentity = resolveFactEntityIdentity(left);
  const rightIdentity = resolveFactEntityIdentity(right);
  if (!leftIdentity || !rightIdentity || leftIdentity.kind !== rightIdentity.kind) return false;
  if (leftIdentity.key && rightIdentity.key) return leftIdentity.key === rightIdentity.key;
  return Boolean(leftIdentity.weakKey && leftIdentity.weakKey === rightIdentity.weakKey);
};

const hasCurrentSeparation = (
  left: ResumeFact,
  right: ResumeFact,
  separations: FactEntitySeparation[],
): boolean => {
  const pair = sortPair(left.id, right.id);
  return separations.some(
    (separation) =>
      separation.kind === left.kind &&
      separation.factIds[0] === pair[0] &&
      separation.factIds[1] === pair[1] &&
      separation.sourceFactFingerprints[left.id] === getFactEntityFingerprint(left) &&
      separation.sourceFactFingerprints[right.id] === getFactEntityFingerprint(right),
  );
};

export const getFactEntityAmbiguities = (
  session: InterviewSession | null,
  facts: ResumeFact[],
  links: FactEntityLink[],
  separations: FactEntitySeparation[],
): FactEntityWarning[] => {
  if (!session) return [];
  const candidates = facts
    .filter(
      (fact) =>
        fact.status === 'confirmed' &&
        isFactCurrent(session, fact) &&
        resolveFactEntityIdentity(fact) !== null,
    )
    .sort(compareFacts);
  const validatedLinks = validateFactEntityLinks(session, facts, links);
  const warnings: FactEntityWarning[] = [];
  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      const first = candidates[left];
      const second = candidates[right];
      if (!first || !second || !isIdentityCandidatePair(first, second)) continue;
      const areLinked = validatedLinks.some(
        (link) =>
          link.status === 'active' &&
          link.factIds.includes(first.id) &&
          link.factIds.includes(second.id),
      );
      if (areLinked || hasCurrentSeparation(first, second, separations)) continue;
      const mergeResult = mergeCompatibleFactValues([first, second]);
      warnings.push({
        kind: first.kind as FactEntityKind,
        factIds: [first.id, second.id].sort(),
        reason: mergeResult.ok ? 'identity-ambiguous' : 'field-conflict',
      });
    }
  }
  return warnings;
};
