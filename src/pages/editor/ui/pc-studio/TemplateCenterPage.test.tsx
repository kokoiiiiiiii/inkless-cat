import { createEmptyResume } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import { I18nProvider } from '@shared/i18n';
import { LOCALE_KEY } from '@shared/i18n/config';
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
  currentTemplateId = 'builtin-one',
  displayedFallbackTemplateName = 'Display fallback',
  onBackToWorkspace = vi.fn(),
  onManageTemplates = vi.fn(),
}: {
  builtIns?: ResumeTemplate[];
  custom?: ResumeTemplate[];
  currentTemplateId?: string;
  displayedFallbackTemplateName?: string;
  onBackToWorkspace?: () => void;
  onManageTemplates?: () => void;
} = {}) =>
  render(
    <TemplateCenterPage
      builtInTemplates={builtIns}
      customTemplates={custom}
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
    expect(screen.queryByRole('button', { name: /Apply|Live Preview/u })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Gallery' }));
    expect(screen.getByRole('heading', { name: 'Template Gallery', level: 1 })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getAllByRole('button', { name: 'View Details' })[0]);
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
    fireEvent.click(screen.getByRole('button', { name: 'Remove fixture' }));

    expect(screen.getByRole('alert').textContent).toContain('Template unavailable');
    fireEvent.click(screen.getAllByRole('button', { name: 'Back to Gallery' })[1]!);
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Template Gallery', level: 1 }),
    );
  });
});
