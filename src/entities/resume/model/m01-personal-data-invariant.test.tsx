import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { createEmptyResume, type ResumeData, resumeSchema } from '@entities/resume';
import { useUIStore } from '@entities/ui';
import { useModuleEditor } from '@features/edit-module';
import { I18nProvider } from '@shared/i18n';
import { RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY } from '@shared/lib/storage';
import { FeedbackProvider, useFeedbackStore } from '@shared/ui/feedback';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ActiveSectionKey, deriveSectionsFromResume } from '../selectors';
import { useResumeStore } from './resume.store';

const TEST_SECTIONS: ActiveSectionKey[] = ['projects', 'experience', 'socials'];
const TEST_THEME = 'dark' as const;
const TEST_TEMPLATE_ID = 'dark-contrast';
const EVIDENCE_PATH = path.resolve('test-results/d1-domain/m01-s0-s3-data-invariant.json');

const createSyntheticResume = (): ResumeData => {
  const resume = createEmptyResume();
  resume.personal = {
    fullName: 'Synthetic Baseline Name',
    title: 'Synthetic Baseline Role',
    email: 'baseline@d1.example.test',
    emailLabel: 'Synthetic email label',
    phone: '+1-202-555-0101',
    phoneLabel: 'Synthetic phone label',
    location: 'Synthetic location marker',
    locationLabel: 'Synthetic location label',
    photo: 'data:image/png;base64,AA==',
    summary: 'Synthetic baseline summary, for isolated M01 data checks only.',
    extras: [
      {
        id: 'd1-personal-extra-1',
        label: 'Synthetic portfolio label',
        value: 'https://portfolio.example.test',
      },
      {
        id: 'd1-personal-extra-2',
        label: 'Synthetic secondary label',
        value: 'https://secondary.example.test',
      },
    ],
  };
  resume.socials = [
    { id: 'd1-social-1', label: 'Synthetic network', url: 'https://social.example.test' },
  ];
  resume.experience = [
    {
      id: 'd1-experience-1',
      company: 'Synthetic Example Organization',
      role: 'Synthetic Analyst',
      location: 'Example City',
      startDate: '2020',
      endDate: '2024',
      highlights: ['Synthetic experience detail A', 'Synthetic experience detail B'],
    },
  ];
  resume.projects = [
    {
      id: 'd1-project-1',
      name: 'Synthetic Project',
      role: 'Synthetic Project Role',
      summary: 'Synthetic project summary',
      link: 'https://project.example.test',
      highlights: ['Synthetic project outcome'],
    },
  ];
  resume.education = [
    {
      id: 'd1-education-1',
      school: 'Synthetic College',
      degree: 'Synthetic Degree',
      startDate: '2016',
      endDate: '2020',
      details: 'Synthetic education details',
    },
  ];
  resume.skills = [
    {
      id: 'd1-skill-1',
      title: 'Synthetic skill group',
      items: ['Synthetic skill A', 'Synthetic skill B'],
    },
  ];
  resume.languages = [
    { id: 'd1-language-1', name: 'Synthetic language', level: 'Synthetic level' },
  ];
  resume.interests = [{ id: 'd1-interest-1', name: 'Synthetic interest' }];
  resume.awards = [
    { id: 'd1-award-1', name: 'Synthetic award', issuer: 'Synthetic issuer', year: '2023' },
  ];
  resume.customSections = [
    {
      id: 'd1-custom-section-1',
      title: 'Synthetic custom section',
      mode: 'fields',
      items: [],
      fields: [
        { id: 'd1-custom-field-1', label: 'Synthetic field', value: 'Synthetic field value' },
      ],
      text: '',
    },
  ];
  resume.settings = {
    personal: { showPhoto: false, photoSize: 144, photoPosition: 'left' },
  };

  return resumeSchema.parse(resume);
};

type BusinessSnapshot = {
  resume: ResumeData;
  activeSections: ActiveSectionKey[];
  ui: { theme: string; templateId: string };
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const takeMemorySnapshot = (): BusinessSnapshot => ({
  resume: clone(useResumeStore.getState().resume),
  activeSections: clone(useResumeStore.getState().activeSections),
  ui: {
    theme: useUIStore.getState().theme,
    templateId: useUIStore.getState().templateId,
  },
});

const flatten = (value: unknown, path: string, output: Map<string, unknown>) => {
  if (Array.isArray(value)) {
    output.set(`${path}.$length`, value.length);
    for (const [index, item] of value.entries()) flatten(item, `${path}[${index}]`, output);
    return;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) output.set(path, value);
    for (const [key, item] of entries) flatten(item, path ? `${path}.${key}` : key, output);
    return;
  }
  output.set(path, value);
};

const diffPaths = (before: unknown, after: unknown) => {
  const beforeLeaves = new Map<string, unknown>();
  const afterLeaves = new Map<string, unknown>();
  flatten(before, '', beforeLeaves);
  flatten(after, '', afterLeaves);
  const paths = new Set([...beforeLeaves.keys(), ...afterLeaves.keys()]);
  return [...paths]
    .filter(
      (path) => JSON.stringify(beforeLeaves.get(path)) !== JSON.stringify(afterLeaves.get(path)),
    )
    .sort()
    .map((path) => ({
      path,
      before: beforeLeaves.get(path),
      after: afterLeaves.get(path),
    }));
};

const parsePersisted = (raw: string | null) => {
  if (!raw) throw new Error('Expected an isolated synthetic persistence payload.');
  return JSON.parse(raw) as {
    state: { resume: ResumeData; activeSections: ActiveSectionKey[] };
    version: number;
  };
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider>
    <FeedbackProvider>{children}</FeedbackProvider>
  </I18nProvider>
);

const resetStores = () => {
  localStorage.removeItem(RESUME_STORE_PERSIST_KEY);
  localStorage.removeItem(UI_STORE_PERSIST_KEY);
  useResumeStore.persist?.clearStorage();
  useUIStore.persist?.clearStorage();
  useFeedbackStore.getState().clearFeedback();

  const resume = createSyntheticResume();
  useResumeStore.setState({
    resume: clone(resume),
    activeSections: [...TEST_SECTIONS],
    hasResumeChanges: false,
    workspaceGeneration: 0,
    workspaceRevision: 0,
  });
  useUIStore.setState({
    theme: TEST_THEME,
    templateId: TEST_TEMPLATE_ID,
    customTemplates: [],
    templatePanelOpen: false,
    modulePanelOpen: false,
    mobileView: 'editor',
  });
};

const evidenceDir = path.dirname(EVIDENCE_PATH);

beforeEach(() => {
  resetStores();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('M01 canonical Resume data invariant', () => {
  it('captures S0–S3 and preserves every non-target field through Controller, Store, persistence and rehydration', async () => {
    const baseline = createSyntheticResume();
    expect(resumeSchema.safeParse(baseline).success).toBe(true);

    const { result, unmount } = renderHook(
      () => {
        const resume = useResumeStore((state) => state.resume);
        const updateResume = useResumeStore((state) => state.updateResume);
        const controller = useModuleEditor({ resume, onChange: updateResume });
        return { resume, controller };
      },
      { wrapper },
    );

    const s0 = takeMemorySnapshot();
    expect(s0.resume).toEqual(baseline);
    expect(s0.activeSections).toEqual(TEST_SECTIONS);
    expect(s0.ui).toEqual({ theme: TEST_THEME, templateId: TEST_TEMPLATE_ID });
    const persistedS0 = localStorage.getItem(RESUME_STORE_PERSIST_KEY);
    const persistedUiS0 = localStorage.getItem(UI_STORE_PERSIST_KEY);
    expect(persistedS0).not.toBeNull();
    expect(persistedUiS0).not.toBeNull();
    const persistedResumeS0 = parsePersisted(persistedS0);
    const persistedUIS0 = JSON.parse(persistedUiS0 ?? 'null') as {
      state: { theme: string; templateId: string; customTemplates: unknown[] };
      version: number;
    };
    expect(persistedResumeS0.state).toMatchObject({
      resume: s0.resume,
      activeSections: s0.activeSections,
    });
    expect(persistedUIS0.state).toMatchObject({ theme: TEST_THEME, templateId: TEST_TEMPLATE_ID });

    const edits = {
      fullName: 'Synthetic Edited Name',
      title: 'Synthetic Edited Role',
      email: 'edited@d1.example.test',
      phone: '+1-202-555-0102',
      location: 'Synthetic edited location',
      summary: 'Synthetic edited summary, for isolated M01 data checks only.',
    } as const;
    act(() => {
      for (const [field, value] of Object.entries(edits)) {
        result.current.controller.handlePersonalChange(field as keyof typeof edits, value);
      }
    });

    const s1 = takeMemorySnapshot();
    const diffS0ToS1 = diffPaths(s0, s1);
    const expectedTargetPaths = Object.keys(edits)
      .map((field) => `resume.personal.${field}`)
      .sort();
    expect(diffS0ToS1.map(({ path }) => path)).toEqual(expectedTargetPaths);
    expect(s1.resume.personal).toMatchObject(edits);
    expect(resumeSchema.safeParse(s1.resume).success).toBe(true);

    const resumeS2Raw = localStorage.getItem(RESUME_STORE_PERSIST_KEY);
    const uiS2Raw = localStorage.getItem(UI_STORE_PERSIST_KEY);
    const persistedS2 = parsePersisted(resumeS2Raw);
    const persistedUiS2 = JSON.parse(uiS2Raw ?? 'null') as {
      state: { theme: string; templateId: string; customTemplates: unknown[] };
      version: number;
    };
    const s2: BusinessSnapshot = {
      resume: clone(persistedS2.state.resume),
      activeSections: clone(persistedS2.state.activeSections),
      ui: { theme: persistedUiS2.state.theme, templateId: persistedUiS2.state.templateId },
    };
    expect(s2).toEqual(s1);
    expect(persistedS2.state).not.toHaveProperty('workspaceRevision');
    expect(persistedS2.state).not.toHaveProperty('workspaceGeneration');
    expect(persistedUiS2.state).toMatchObject({ theme: TEST_THEME, templateId: TEST_TEMPLATE_ID });

    unmount();
    await act(async () => {
      useResumeStore.setState({
        resume: createEmptyResume(),
        activeSections: deriveSectionsFromResume(createEmptyResume()),
      });
      localStorage.setItem(RESUME_STORE_PERSIST_KEY, resumeS2Raw ?? '');
      await useResumeStore.persist?.rehydrate();

      useUIStore.setState({ theme: 'light', templateId: 'modern-blue' });
      localStorage.setItem(UI_STORE_PERSIST_KEY, uiS2Raw ?? '');
      await useUIStore.persist?.rehydrate();
    });

    const s3 = takeMemorySnapshot();
    expect(s3).toEqual(s2);
    expect(resumeSchema.safeParse(s3.resume).success).toBe(true);
    const diffS2ToS3 = diffPaths(s2, s3);
    expect(diffS2ToS3).toEqual([]);

    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      EVIDENCE_PATH,
      `${JSON.stringify(
        {
          source: 'synthetic Schema v1 test fixture only; no real user data',
          persistKeys: { resume: RESUME_STORE_PERSIST_KEY, ui: UI_STORE_PERSIST_KEY },
          snapshots: { S0: s0, S1: s1, S2: s2, S3: s3 },
          persistedPayloads: {
            S0: { resume: persistedResumeS0.state, ui: persistedUIS0.state },
            S2: { resume: persistedS2.state, ui: persistedUiS2.state },
          },
          structuredDiffs: {
            'S0-to-S1': diffS0ToS1,
            'S1-to-S2': diffPaths(s1, s2),
            'S2-to-S3': diffS2ToS3,
          },
          persistedVersions: { resume: persistedS2.version, ui: persistedUiS2.version },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  });

  it('keeps the memory update on failed storage write and exposes the existing persistence alert without overwriting S0', () => {
    const storedBefore = localStorage.getItem(RESUME_STORE_PERSIST_KEY);
    expect(storedBefore).not.toBeNull();
    const baseline = takeMemorySnapshot();
    const { result } = renderHook(
      () => {
        const resume = useResumeStore((state) => state.resume);
        const updateResume = useResumeStore((state) => state.updateResume);
        const controller = useModuleEditor({ resume, onChange: updateResume });
        return { controller };
      },
      { wrapper },
    );

    const originalSetItem = localStorage.setItem.bind(localStorage);
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === RESUME_STORE_PERSIST_KEY) {
        throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      }
      return originalSetItem(key, value);
    });

    act(() => {
      result.current.controller.handlePersonalChange('summary', 'Synthetic memory-only edit');
    });

    const memoryAfter = takeMemorySnapshot();
    const alerts = useFeedbackStore.getState().items;
    const persistenceAlert = alerts.find(
      ({ tone, message }) => tone === 'error' && /未能保存|could not be saved/u.test(message),
    );

    expect(memoryAfter.resume.personal.summary).toBe('Synthetic memory-only edit');
    expect(diffPaths(baseline, memoryAfter).map(({ path }) => path)).toEqual([
      'resume.personal.summary',
    ]);
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).toBe(storedBefore);
    expect(setItemSpy).toHaveBeenCalledWith(RESUME_STORE_PERSIST_KEY, expect.any(String));
    expect(persistenceAlert).toMatchObject({ tone: 'error' });
    expect(persistenceAlert?.message).toMatch(/未能保存|could not be saved/u);
    expect(alerts.some(({ tone }) => tone === 'success')).toBe(false);

    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      path.resolve(evidenceDir, 'm01-storage-write-failure.json'),
      `${JSON.stringify(
        {
          source: 'synthetic Schema v1 test fixture only; no real user data',
          persistedBaseline: parsePersisted(storedBefore).state,
          memoryAfter: {
            resume: memoryAfter.resume,
            activeSections: memoryAfter.activeSections,
            ui: memoryAfter.ui,
          },
          persistedAfter: parsePersisted(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).state,
          errorFeedback: { tone: persistenceAlert?.tone, message: persistenceAlert?.message },
          changedMemoryPaths: diffPaths(baseline, memoryAfter).map(({ path }) => path),
          persistedPayloadUnchanged:
            localStorage.getItem(RESUME_STORE_PERSIST_KEY) === storedBefore,
          semantics:
            'The in-memory value remains updated; the failed write leaves the last durable value in storage and shows an error alert.',
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  });
});
