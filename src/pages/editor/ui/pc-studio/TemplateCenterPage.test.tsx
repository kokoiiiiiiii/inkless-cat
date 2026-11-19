import type { ActiveSectionKey, ResumeData } from '@entities/resume';
import { createEmptyResume, useResumeStore } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import { useUIStore } from '@entities/ui';
import { I18nProvider } from '@shared/i18n';
import { LOCALE_KEY } from '@shared/i18n/config';
import { RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY } from '@shared/lib/storage';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TemplateCenterPage from './TemplateCenterPage';

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

const makeTemplate = (
  id: string,
  name: string,
  description: string,
  previewStyle: string = 'modern',
): ResumeTemplate => ({
  id,
  name,
  description,
  accentColor: '#315cff',
  previewStyle,
  sample: createEmptyResume(),
});

const builtInTemplates = [
  makeTemplate('builtin-one', 'Brisk Product', 'Distinctive roles for product teams.'),
  makeTemplate('builtin-two', 'Quiet Editorial', 'A compact editorial layout.'),
  makeTemplate('builtin-three', 'Modern Archive', 'A third fictional built-in template.'),
  makeTemplate('builtin-four', 'Blue Meridian', 'A fourth fictional built-in template.'),
];

const createCustomTemplates = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const ordinal = String(index + 1).padStart(2, '0');
    return makeTemplate(
      `custom-${ordinal}`,
      `Portfolio ${ordinal}`,
      `Fictional custom template description ${ordinal}.`,
    );
  });

const renderPage = ({
  builtIns = builtInTemplates,
  custom = [],
  resume = createEmptyResume(),
  activeSections = [],
  currentTemplateId = 'builtin-one',
  displayedFallbackTemplateName = 'Display fallback',
  onBackToWorkspace = vi.fn(),
  onManageTemplates = vi.fn(),
}: {
  builtIns?: ResumeTemplate[];
  custom?: ResumeTemplate[];
  resume?: ResumeData;
  activeSections?: ActiveSectionKey[];
  currentTemplateId?: string;
  displayedFallbackTemplateName?: string;
  onBackToWorkspace?: () => void;
  onManageTemplates?: () => void;
} = {}) =>
  render(
    <TemplateCenterPage
      builtInTemplates={builtIns}
      customTemplates={custom}
      resume={resume}
      activeSections={activeSections}
      currentTemplateId={currentTemplateId}
      displayedFallbackTemplateName={displayedFallbackTemplateName}
      onBackToWorkspace={onBackToWorkspace}
      onManageTemplates={onManageTemplates}
    />,
    { wrapper },
  );

beforeEach(() => {
  localStorage.setItem(LOCALE_KEY, 'en');
});

afterEach(() => {
  localStorage.removeItem(LOCALE_KEY);
});

describe('TemplateCenterPage', () => {
  it('shows the supplied built-in templates and a real empty custom group', () => {
    renderPage();

    const builtInSection = screen.getByRole('region', { name: 'Built-in' });
    expect(within(builtInSection).getAllByRole('article')).toHaveLength(4);
    expect(screen.getByRole('region', { name: 'Custom' }).textContent).toContain(
      'No custom templates yet.',
    );
    expect(screen.queryByRole('button', { name: /^Custom$/u })).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Template Gallery', level: 1 }),
    );
  });

  it.each([1, 20])('keeps %i custom templates available and correctly grouped', (count) => {
    renderPage({ custom: createCustomTemplates(count) });

    const customFilter = screen.getByRole('button', { name: /^Custom$/u });
    expect(customFilter.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(customFilter);
    expect(customFilter.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('article')).toHaveLength(count);
    expect(
      screen.getByRole('heading', { name: `Portfolio ${String(count).padStart(2, '0')}` }),
    ).toBeTruthy();
  });

  it('searches only the supplied name and description fields', () => {
    renderPage({
      custom: [makeTemplate('custom-special', 'Harbor Notes', 'Designed for quiet research work.')],
    });
    const search = screen.getByRole('searchbox', { name: 'Search templates' });

    fireEvent.change(search, { target: { value: 'brisk product' } });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Brisk Product' })).toBeTruthy();

    fireEvent.change(search, { target: { value: 'quiet research' } });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Harbor Notes' })).toBeTruthy();
  });

  it('announces no matches and clears the search back to the full gallery', () => {
    renderPage();
    const search = screen.getByTestId('pc-template-search');

    fireEvent.change(search, { target: { value: 'not-a-template' } });
    expect(screen.getByRole('status').textContent).toContain(
      'No template name or description matches',
    );
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect((search as HTMLInputElement).value).toBe('');
    expect(screen.getAllByRole('article')).toHaveLength(4);
  });

  it('opens details, describes the fixed thumbnail accurately, and restores focus to the card action', () => {
    renderPage();

    const detailsButton = screen.getAllByRole('button', { name: 'View Details' })[0]!;
    fireEvent.click(detailsButton);

    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Template Details', level: 1 }),
    );
    expect(screen.getByRole('heading', { name: 'Brisk Product', level: 2 })).toBeTruthy();
    expect(screen.getByText('Distinctive roles for product teams.')).toBeTruthy();
    expect(
      screen.getByText(
        'This thumbnail uses fixed sample content to illustrate the layout. It does not show your resume.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Currently applied')).toBeTruthy();
    expect(screen.getByTestId('template-thumbnail')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Live Preview' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Apply/u })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Gallery' }));
    expect(screen.getByRole('heading', { name: 'Template Gallery', level: 1 })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getAllByRole('button', { name: 'View Details' })[0]);
  });

  it('renders the canonical resume with the exact selected instance when template IDs repeat', () => {
    const resume = createEmptyResume();
    resume.personal.fullName = 'Canonical Candidate';
    resume.personal.summary = 'Canonical resume content for the live preview.';
    const firstDuplicate = makeTemplate(
      'duplicate-id',
      'Classic Duplicate',
      'First instance.',
      'classic',
    );
    const secondDuplicate = makeTemplate(
      'duplicate-id',
      'Creative Duplicate',
      'Second instance.',
      'creative',
    );
    secondDuplicate.sample.personal.fullName = 'Template sample must not appear';
    secondDuplicate.sample.personal.summary = 'Template sample snapshot only.';
    renderPage({ custom: [firstDuplicate, secondDuplicate], resume });

    const duplicateCards = screen
      .getAllByRole('article')
      .filter((card) => card.dataset.templateId === 'duplicate-id');
    expect(duplicateCards).toHaveLength(2);
    fireEvent.click(within(duplicateCards[1]!).getByRole('button', { name: 'View Details' }));
    expect(screen.getByRole('heading', { name: 'Creative Duplicate', level: 2 })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Live Preview' }));

    const preview = screen.getByTestId('pc-template-live-preview');
    expect(preview.dataset.templateId).toBe('duplicate-id');
    expect(preview.dataset.templateSource).toBe('custom');
    expect(preview.dataset.previewStyle).toBe('creative');
    expect(preview.querySelector('.resume-preview')?.className).toContain('border-rose-100');
    expect(screen.getByText('Canonical Candidate')).toBeTruthy();
    expect(screen.getByText('Canonical resume content for the live preview.')).toBeTruthy();
    expect(screen.queryByText('Template sample must not appear')).toBeNull();
    expect(screen.queryByText('Template sample snapshot only.')).toBeNull();
    expect(screen.getByText('Preview only')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Apply/u })).toBeNull();

    const candidateKey = preview.dataset.templateInstanceKey;
    fireEvent.click(screen.getByRole('button', { name: 'Back to Gallery' }));
    expect(screen.queryByTestId('pc-template-live-preview')).toBeNull();
    expect(document.activeElement).toBe(
      screen
        .getAllByRole('button', { name: 'View Details' })
        .find((button) => button.dataset.templateDetailTrigger === candidateKey),
    );
  });

  it('keeps preview, switching and navigation out of the resume and UI stores and persistence', () => {
    const canonicalResume = createEmptyResume();
    canonicalResume.personal.fullName = 'Store-backed Candidate';
    canonicalResume.personal.summary = 'Canonical store summary.';
    const customTemplates = createCustomTemplates(2);
    customTemplates[0]!.sample.personal.fullName = 'Custom sample must not replace current data';

    useResumeStore.getState().replaceState(canonicalResume, []);
    useUIStore.getState().setTemplateId('builtin-one');
    useUIStore.getState().setCustomTemplates(customTemplates);

    const runtimeBefore = {
      resume: structuredClone(useResumeStore.getState().resume),
      activeSections: [...useResumeStore.getState().activeSections],
      templateId: useUIStore.getState().templateId,
      customTemplates: structuredClone(useUIStore.getState().customTemplates),
    };
    const persistedBefore = {
      resume: localStorage.getItem(RESUME_STORE_PERSIST_KEY),
      ui: localStorage.getItem(UI_STORE_PERSIST_KEY),
    };
    const setItemSpy = vi.spyOn(localStorage, 'setItem');

    try {
      renderPage({
        custom: useUIStore.getState().customTemplates,
        resume: useResumeStore.getState().resume,
        activeSections: useResumeStore.getState().activeSections,
        currentTemplateId: useUIStore.getState().templateId,
      });

      const openFirstCustom = () => {
        fireEvent.click(screen.getByRole('button', { name: /^Custom$/u }));
        const firstCustomCard = screen
          .getAllByRole('article')
          .find((card) => card.dataset.templateId === 'custom-01');
        if (!firstCustomCard) throw new Error('The custom template fixture is missing.');
        fireEvent.click(within(firstCustomCard).getByRole('button', { name: 'View Details' }));
        fireEvent.click(screen.getByRole('button', { name: 'Live Preview' }));
      };

      openFirstCustom();
      expect(screen.getByText('Store-backed Candidate')).toBeTruthy();
      expect(screen.queryByText('Custom sample must not replace current data')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Back to Gallery' }));
      expect(screen.queryByTestId('pc-template-live-preview')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Back to Workspace' }));
      expect(screen.queryByTestId('pc-template-live-preview')).toBeNull();
      expect(screen.getByRole('heading', { name: 'Template Gallery', level: 1 })).toBeTruthy();

      expect(useResumeStore.getState().resume).toEqual(runtimeBefore.resume);
      expect(useResumeStore.getState().activeSections).toEqual(runtimeBefore.activeSections);
      expect(useUIStore.getState().templateId).toBe(runtimeBefore.templateId);
      expect(useUIStore.getState().customTemplates).toEqual(runtimeBefore.customTemplates);
      expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).toBe(persistedBefore.resume);
      expect(localStorage.getItem(UI_STORE_PERSIST_KEY)).toBe(persistedBefore.ui);
      expect(setItemSpy).not.toHaveBeenCalled();
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it('returns to workspace directly from gallery and details', () => {
    const onBackToWorkspace = vi.fn();
    renderPage({ onBackToWorkspace });

    fireEvent.click(screen.getByRole('button', { name: 'Back to Workspace' }));
    expect(onBackToWorkspace).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole('button', { name: 'View Details' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Back to Workspace' }));
    expect(onBackToWorkspace).toHaveBeenCalledTimes(2);
  });

  it('can preview the currently applied template without changing its applied state', () => {
    renderPage({ currentTemplateId: 'builtin-one' });
    const currentCard = screen
      .getAllByRole('article')
      .find((card) => card.dataset.templateId === 'builtin-one');
    if (!currentCard) throw new Error('The current template fixture is missing.');

    fireEvent.click(within(currentCard).getByRole('button', { name: 'View Details' }));
    expect(screen.getByText('Currently applied')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Live Preview' }));
    expect(screen.getByTestId('pc-template-live-preview').dataset.templateId).toBe('builtin-one');
    expect(screen.getByText('Preview only')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Apply/u })).toBeNull();
  });

  it('renders a live preview for an empty resume without substituting template sample data', () => {
    const emptyResume = createEmptyResume();
    renderPage({ resume: emptyResume });
    const currentCard = screen
      .getAllByRole('article')
      .find((card) => card.dataset.templateId === 'builtin-one');
    if (!currentCard) throw new Error('The current template fixture is missing.');

    fireEvent.click(within(currentCard).getByRole('button', { name: 'View Details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Live Preview' }));

    expect(
      screen.getByTestId('pc-template-live-preview').querySelector('.resume-preview'),
    ).toBeTruthy();
    expect(screen.getByText('Preview only')).toBeTruthy();
  });

  it('shows localized live preview labels in Chinese', () => {
    localStorage.setItem(LOCALE_KEY, 'zh-CN');
    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: '查看详情' })[0]!);
    expect(screen.getByRole('heading', { name: '模板详情' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '实时预览' }));

    expect(screen.getByRole('heading', { name: '简历实时预览' })).toBeTruthy();
    expect(screen.getByText('仅预览')).toBeTruthy();
  });

  it('shows a missing template and names the display fallback without marking another card current', () => {
    renderPage({
      currentTemplateId: 'removed-template-id',
      displayedFallbackTemplateName: 'Safe visual fallback',
    });

    const missingState = screen.getByRole('alert');
    expect(missingState.textContent).toContain('removed-template-id');
    expect(missingState.textContent).toContain('Safe visual fallback');
    expect(missingState.textContent).toContain('display fallback only');
    expect(screen.queryByText('Current', { exact: true })).toBeNull();
    expect(screen.getAllByText('Not currently applied')).toHaveLength(4);
  });

  it('keeps an invalid template style visible but does not misrender it as another style', () => {
    renderPage({
      builtIns: [makeTemplate('unknown-style', 'Unknown Style', 'Still searchable.', 'neon')],
    });

    expect(screen.getByRole('heading', { name: 'Unknown Style' })).toBeTruthy();
    expect(
      screen.getAllByRole('img', {
        name: 'Illustrative thumbnail unavailable for this template style.',
      }),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));
    const previewButton = screen.getByRole('button', { name: 'Live preview unavailable' });
    expect((previewButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/unsupported preview style “neon”/u)).toBeTruthy();
    fireEvent.click(previewButton);
    expect(screen.queryByTestId('pc-template-live-preview')).toBeNull();
  });

  it('does not persist candidate selection, candidate switching or navigation', () => {
    const canonicalResume = createEmptyResume();
    canonicalResume.personal.fullName = 'Store-backed Candidate';
    canonicalResume.personal.summary = 'Canonical store summary.';
    canonicalResume.experience = [
      {
        id: 'canonical-role',
        company: 'Canonical Labs',
        role: 'Product Engineer',
        startDate: '2022',
        endDate: 'Present',
        highlights: ['Canonical experience content.'],
      },
    ];
    const customTemplates = createCustomTemplates(2);
    customTemplates[0]!.sample.personal.fullName = 'Custom sample must not replace current data';

    useResumeStore.getState().replaceState(canonicalResume, ['experience']);
    useUIStore.getState().setTemplateId('builtin-one');
    useUIStore.getState().setCustomTemplates(customTemplates);

    const runtimeBefore = {
      resume: structuredClone(useResumeStore.getState().resume),
      activeSections: [...useResumeStore.getState().activeSections],
      templateId: useUIStore.getState().templateId,
      customTemplates: structuredClone(useUIStore.getState().customTemplates),
    };
    const persistedBefore = {
      resume: localStorage.getItem(RESUME_STORE_PERSIST_KEY),
      ui: localStorage.getItem(UI_STORE_PERSIST_KEY),
    };
    const setItemSpy = vi.spyOn(localStorage, 'setItem');

    try {
      renderPage({
        custom: useUIStore.getState().customTemplates,
        resume: useResumeStore.getState().resume,
        activeSections: useResumeStore.getState().activeSections,
        currentTemplateId: useUIStore.getState().templateId,
      });

      fireEvent.click(screen.getByRole('button', { name: /^Custom$/u }));
      const firstCustomCard = screen
        .getAllByRole('article')
        .find((card) => card.dataset.templateId === 'custom-01');
      if (!firstCustomCard) throw new Error('The custom template fixture is missing.');
      fireEvent.click(within(firstCustomCard).getByRole('button', { name: 'View Details' }));
      fireEvent.click(screen.getByRole('button', { name: 'Live Preview' }));
      expect(screen.getByText('Store-backed Candidate')).toBeTruthy();
      expect(screen.getByText('Canonical experience content.')).toBeTruthy();
      expect(screen.queryByText('Custom sample must not replace current data')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Back to Gallery' }));
      expect(screen.queryByTestId('pc-template-live-preview')).toBeNull();

      const secondCustomCard = screen
        .getAllByRole('article')
        .find((card) => card.dataset.templateId === 'custom-02');
      if (!secondCustomCard) throw new Error('The second custom template fixture is missing.');
      fireEvent.click(within(secondCustomCard).getByRole('button', { name: 'View Details' }));
      fireEvent.click(screen.getByRole('button', { name: 'Live Preview' }));
      expect(screen.getByTestId('pc-template-live-preview').dataset.templateId).toBe('custom-02');

      fireEvent.click(screen.getByRole('button', { name: 'Back to Gallery' }));
      fireEvent.click(screen.getByRole('button', { name: 'Back to Workspace' }));
      expect(screen.queryByTestId('pc-template-live-preview')).toBeNull();
      expect(screen.getByRole('heading', { name: 'Template Gallery', level: 1 })).toBeTruthy();

      expect(useResumeStore.getState().resume).toEqual(runtimeBefore.resume);
      expect(useResumeStore.getState().activeSections).toEqual(runtimeBefore.activeSections);
      expect(useUIStore.getState().templateId).toBe(runtimeBefore.templateId);
      expect(useUIStore.getState().customTemplates).toEqual(runtimeBefore.customTemplates);
      expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).toBe(persistedBefore.resume);
      expect(localStorage.getItem(UI_STORE_PERSIST_KEY)).toBe(persistedBefore.ui);
      expect(setItemSpy).not.toHaveBeenCalled();
    } finally {
      setItemSpy.mockRestore();
      useResumeStore.getState().resetState(createEmptyResume());
      useUIStore.getState().setTemplateId('modern-blue');
      useUIStore.getState().setCustomTemplates([]);
      localStorage.removeItem(RESUME_STORE_PERSIST_KEY);
      localStorage.removeItem(UI_STORE_PERSIST_KEY);
    }
  });

  it.each([
    { name: 'three-digit', color: '#abc', rendersThumbnail: true },
    { name: 'four-digit', color: '#abcd', rendersThumbnail: true },
    { name: 'six-digit', color: '#abcdef', rendersThumbnail: true },
    { name: 'eight-digit', color: '#abcdef12', rendersThumbnail: true },
    { name: 'five-digit', color: '#abcde', rendersThumbnail: false },
    { name: 'seven-digit', color: '#abcdefg', rendersThumbnail: false },
    { name: 'invalid characters', color: '#12xz', rendersThumbnail: false },
    { name: 'missing', color: undefined, rendersThumbnail: false },
  ])('uses a safe thumbnail fallback for a $name accent color', ({ color, rendersThumbnail }) => {
    const template = {
      ...makeTemplate('color-check', 'Color Check', 'A fictional color validation fixture.'),
      accentColor: color,
    };
    renderPage({ builtIns: [template] });

    if (rendersThumbnail) {
      expect(screen.getByTestId('template-thumbnail')).toBeTruthy();
      expect(
        screen.queryByRole('img', {
          name: 'Illustrative thumbnail unavailable for this template style.',
        }),
      ).toBeNull();
      return;
    }

    expect(screen.queryByTestId('template-thumbnail')).toBeNull();
    expect(
      screen.getByRole('img', {
        name: 'Illustrative thumbnail unavailable for this template style.',
      }),
    ).toBeTruthy();
  });

  it('reports a detail target that disappeared instead of showing a fallback template', () => {
    const target = makeTemplate('custom-temporary', 'Temporary custom', 'A deletable fixture.');
    const StatefulPage = () => {
      const [customTemplates, setCustomTemplates] = useState([target]);
      return (
        <>
          <TemplateCenterPage
            builtInTemplates={builtInTemplates}
            customTemplates={customTemplates}
            resume={createEmptyResume()}
            activeSections={[]}
            currentTemplateId="builtin-one"
            displayedFallbackTemplateName="Brisk Product"
            onBackToWorkspace={vi.fn()}
            onManageTemplates={vi.fn()}
          />
          <button type="button" onClick={() => setCustomTemplates([])}>
            Remove fixture
          </button>
        </>
      );
    };

    render(<StatefulPage />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /^Custom$/u }));
    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Live Preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove fixture' }));

    expect(screen.getByRole('alert').textContent).toContain('Live preview unavailable');
    expect(screen.queryByTestId('pc-template-live-preview')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Back to Gallery' })[1]!);
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Template Gallery', level: 1 }),
    );
  });
});
