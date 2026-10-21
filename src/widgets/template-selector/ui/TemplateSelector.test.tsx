import { createEmptyResume } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import { templates } from '@entities/template';
import { I18nProvider } from '@shared/i18n';
import { LOCALE_KEY } from '@shared/i18n/config';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Profiler, type ReactNode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TemplateSelector from './TemplateSelector';
import { areTemplateThumbnailPropsEqual, TemplateThumbnail } from './TemplateThumbnail';

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

const customTemplate: ResumeTemplate = {
  id: 'custom-template',
  name: 'Portfolio Layout',
  description: 'Saved for a separate visual direction.',
  accentColor: '#6d28d9',
  previewStyle: 'custom',
  theme: { accent: '#6d28d9', heading: '#312e81' },
  sample: {
    ...createEmptyResume(),
    personal: {
      ...createEmptyResume().personal,
      fullName: 'PRIVATE RESUME CONTENT',
    },
  },
};

const StatefulSelector = ({
  initialActiveId = templates[0]!.id,
  onStyleChange = vi.fn(),
  onLoadSample = vi.fn(),
  onDeleteTemplate = vi.fn(),
}: {
  initialActiveId?: string;
  onStyleChange?: (template: ResumeTemplate) => void;
  onLoadSample?: (template: ResumeTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
}) => {
  const [activeId, setActiveId] = useState(initialActiveId);
  const [customTemplates, setCustomTemplates] = useState([customTemplate]);

  return (
    <TemplateSelector
      builtInTemplates={templates}
      customTemplates={customTemplates}
      activeId={activeId}
      onStyleChange={(template) => {
        onStyleChange(template);
        setActiveId(template.id);
      }}
      onLoadSample={onLoadSample}
      onDeleteTemplate={(templateId) => {
        onDeleteTemplate(templateId);
        setCustomTemplates((current) => current.filter((template) => template.id !== templateId));
        if (activeId === templateId) setActiveId(templates[0]!.id);
      }}
      onUpdateTemplate={vi.fn()}
    />
  );
};

const ProfiledThumbnail = ({
  onRender,
}: {
  onRender: (
    id: string,
    phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number,
  ) => void;
}) => {
  const [resumeName, setResumeName] = useState('Initial resume');
  const [theme, setTheme] = useState({ heading: '#312e81' });

  return (
    <>
      <input
        aria-label="Resume name"
        value={resumeName}
        onChange={(event) => setResumeName(event.target.value)}
      />
      <button type="button" onClick={() => setTheme({ heading: '#7c3aed' })}>
        Change template theme
      </button>
      <Profiler id="template-thumbnail" onRender={onRender}>
        <TemplateThumbnail previewStyle="custom" accentColor="#6d28d9" theme={theme} />
      </Profiler>
    </>
  );
};

const MultiTemplateSelector = ({
  initialActiveId = templates[0]!.id,
}: {
  initialActiveId?: string;
}) => {
  const [activeId, setActiveId] = useState(initialActiveId);
  const [customTemplates, setCustomTemplates] = useState<ResumeTemplate[]>([
    { ...customTemplate, id: 'custom-first', name: 'First custom' },
    { ...customTemplate, id: 'custom-middle', name: 'Middle custom' },
    { ...customTemplate, id: 'custom-last', name: 'Last custom' },
  ]);

  return (
    <TemplateSelector
      builtInTemplates={templates}
      customTemplates={customTemplates}
      activeId={activeId}
      onStyleChange={(template) => setActiveId(template.id)}
      onLoadSample={vi.fn()}
      onSaveTemplate={vi.fn()}
      onDeleteTemplate={(templateId) => {
        setCustomTemplates((previous) => previous.filter((template) => template.id !== templateId));
        if (activeId === templateId) setActiveId(templates[0]!.id);
      }}
      onUpdateTemplate={vi.fn()}
    />
  );
};

afterEach(() => localStorage.removeItem(LOCALE_KEY));

describe('TemplateSelector', () => {
  it('uses one native radio group across system and custom templates', () => {
    render(<StatefulSelector />, { wrapper });

    const radios = screen.getAllByRole<HTMLInputElement>('radio');
    expect(radios).toHaveLength(5);
    expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '现代蓝' }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '暗黑质感' }).checked).toBe(false);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '现代蓝' }).tabIndex).toBe(0);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '暗黑质感' }).tabIndex).toBe(-1);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Portfolio Layout' }).checked).toBe(
      false,
    );
    expect(
      screen.getByRole('radio', { name: '现代蓝' }).getAttribute('aria-describedby'),
    ).toBeTruthy();
  });

  it('selects with the template name and calls the style callback once', () => {
    const onStyleChange = vi.fn();
    const view = render(<StatefulSelector onStyleChange={onStyleChange} />, { wrapper });
    const target = screen.getByText('暗黑质感');

    fireEvent.click(target);

    expect(screen.getByRole<HTMLInputElement>('radio', { name: '暗黑质感' }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '现代蓝' }).checked).toBe(false);
    expect(onStyleChange).toHaveBeenCalledTimes(1);
    expect(onStyleChange).toHaveBeenCalledWith(templates[1]);
    expect(view.container.querySelectorAll('input[type="radio"]:checked')).toHaveLength(1);
  });

  it('enters the radio group at the selected option and keeps one Tab stop', () => {
    render(<StatefulSelector />, { wrapper });

    const modernRadio = screen.getByRole<HTMLInputElement>('radio', { name: '现代蓝' });
    const darkRadio = screen.getByRole<HTMLInputElement>('radio', { name: '暗黑质感' });

    expect(modernRadio.tabIndex).toBe(0);
    expect(darkRadio.tabIndex).toBe(-1);
  });

  it('keeps the sample action outside template selection and omits stored resume content', () => {
    const onLoadSample = vi.fn();
    render(<StatefulSelector onLoadSample={onLoadSample} />, { wrapper });

    fireEvent.click(screen.getAllByRole('button', { name: '填充示例' })[1]!);

    expect(onLoadSample).toHaveBeenCalledTimes(1);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '现代蓝' }).checked).toBe(true);
    expect(screen.queryByText('PRIVATE RESUME CONTENT')).toBeNull();
  });

  it('renders the real renderer with each system variant and the custom accent', () => {
    const { container } = render(
      <TemplateSelector
        builtInTemplates={templates}
        activeId={templates[0]!.id}
        onStyleChange={vi.fn()}
        onLoadSample={vi.fn()}
      />,
      { wrapper },
    );

    const previews = [
      ...container.querySelectorAll<HTMLElement>(
        '[data-testid="template-thumbnail"] .resume-preview',
      ),
    ];
    expect(previews).toHaveLength(4);
    expect(previews[0]?.classList.contains('bg-white/90')).toBe(true);
    expect(previews[1]?.classList.contains('bg-slate-950')).toBe(true);
    expect(previews[2]?.classList.contains('bg-gradient-to-br')).toBe(true);
    expect(previews[3]?.classList.contains('bg-white/95')).toBe(true);
    expect(previews[3]?.style.background).toBe('rgb(248, 250, 252)');
  });

  it('does not rebuild a static thumbnail when the resume editor parent updates', () => {
    const template = templates[0]!;
    const stableProps = {
      previewStyle: template.previewStyle,
      accentColor: template.accentColor,
      theme: template.theme,
    };

    expect(areTemplateThumbnailPropsEqual(stableProps, { ...stableProps })).toBe(true);
    expect(
      areTemplateThumbnailPropsEqual(stableProps, { ...stableProps, accentColor: '#7c3aed' }),
    ).toBe(false);
    expect(
      areTemplateThumbnailPropsEqual(stableProps, {
        ...stableProps,
        theme: { heading: '#312e81' },
      }),
    ).toBe(false);
  });

  it('keeps a non-empty localized accessible name while the custom name draft is blank', () => {
    const onUpdateTemplate = vi.fn();
    const { container } = render(
      <TemplateSelector
        builtInTemplates={templates}
        customTemplates={[customTemplate]}
        activeId={customTemplate.id}
        onStyleChange={vi.fn()}
        onLoadSample={vi.fn()}
        onUpdateTemplate={onUpdateTemplate}
      />,
      { wrapper },
    );
    const customCard = container.querySelector(`article[data-template-id="${customTemplate.id}"]`);
    const radio = customCard?.querySelector<HTMLInputElement>('input[type="radio"]');
    const nameInput = within(customCard as HTMLElement).getByRole('textbox', { name: '模板名称' });

    fireEvent.change(nameInput, { target: { value: '' } });

    expect(screen.getByRole('radio', { name: 'Portfolio Layout' })).toBe(radio);
    expect(onUpdateTemplate).not.toHaveBeenCalled();
    const labelId = radio?.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const referencedLabel = [...document.querySelectorAll('[id]')].find(
      (element) => element.id === labelId,
    );
    expect(referencedLabel?.textContent?.trim()).toBe('Portfolio Layout');

    fireEvent.blur(nameInput);

    expect(screen.getByRole('alert').textContent).toContain('模板名称不能为空');
    expect((nameInput as HTMLInputElement).value).toBe('Portfolio Layout');
    expect(onUpdateTemplate).not.toHaveBeenCalled();

    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.blur(nameInput);
    expect(screen.getByRole('alert').textContent).toContain('模板名称不能为空');
    expect(screen.getByRole('radio', { name: 'Portfolio Layout' })).toBe(radio);
  });

  it('commits a valid trimmed custom name and cancels or rejects invalid drafts', () => {
    const onUpdateTemplate = vi.fn();
    const { container } = render(
      <TemplateSelector
        builtInTemplates={templates}
        customTemplates={[customTemplate]}
        activeId={customTemplate.id}
        onStyleChange={vi.fn()}
        onLoadSample={vi.fn()}
        onUpdateTemplate={onUpdateTemplate}
      />,
      { wrapper },
    );
    const customCard = container.querySelector(
      `article[data-template-id="${customTemplate.id}"]`,
    ) as HTMLElement;
    const nameInput = within(customCard).getByRole('textbox', { name: '模板名称' });

    fireEvent.change(nameInput, { target: { value: `${'x'.repeat(121)}` } });
    fireEvent.blur(nameInput);
    expect(screen.getByRole('alert').textContent).toContain('120 个字符');
    expect((nameInput as HTMLInputElement).value).toBe('Portfolio Layout');
    expect(onUpdateTemplate).not.toHaveBeenCalled();

    fireEvent.change(nameInput, { target: { value: 'Uncommitted Name' } });
    fireEvent.keyDown(nameInput, { key: 'Escape' });
    expect((nameInput as HTMLInputElement).value).toBe('Portfolio Layout');
    expect(onUpdateTemplate).not.toHaveBeenCalled();

    fireEvent.change(nameInput, { target: { value: '  Updated Portfolio  ' } });
    fireEvent.blur(nameInput);
    expect(onUpdateTemplate).toHaveBeenCalledWith(customTemplate.id, {
      name: 'Updated Portfolio',
    });
  });

  it('uses an English fallback accessible name for a blank custom template', () => {
    localStorage.setItem(LOCALE_KEY, 'en');
    render(
      <TemplateSelector
        builtInTemplates={templates}
        customTemplates={[{ ...customTemplate, name: '   ' }]}
        activeId={customTemplate.id}
        onStyleChange={vi.fn()}
        onLoadSample={vi.fn()}
        onUpdateTemplate={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByRole('radio', { name: 'Unnamed template' })).toBeTruthy();
  });

  it('measures real thumbnail renders: skips parent resume updates and responds to theme changes', () => {
    const profileDurations: number[] = [];
    const onRender = (
      _id: string,
      _phase: 'mount' | 'update' | 'nested-update',
      actualDuration: number,
    ) => profileDurations.push(actualDuration);
    render(<ProfiledThumbnail onRender={onRender} />, { wrapper });

    expect(profileDurations).toHaveLength(1);
    fireEvent.change(screen.getByRole('textbox', { name: 'Resume name' }), {
      target: { value: 'Edited synthetic resume' },
    });
    expect(profileDurations).toHaveLength(2);
    expect(profileDurations[1]).toBeLessThan(0.05);

    fireEvent.click(screen.getByRole('button', { name: 'Change template theme' }));
    expect(profileDurations).toHaveLength(3);
    expect(profileDurations[2]).toBeGreaterThan(0.05);
  });

  it('moves focus to the selected fallback after deleting the selected custom template', async () => {
    const onDeleteTemplate = vi.fn();
    render(
      <StatefulSelector initialActiveId={customTemplate.id} onDeleteTemplate={onDeleteTemplate} />,
      { wrapper },
    );

    const customCard = screen.getByRole('radio', { name: 'Portfolio Layout' }).closest('article');
    fireEvent.click(within(customCard!).getByRole('button', { name: '删除' }));

    expect(onDeleteTemplate).toHaveBeenCalledWith(customTemplate.id);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('radio', { name: '现代蓝' })),
    );
    expect(screen.queryByRole('radio', { name: 'Portfolio Layout' })).toBeNull();
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '现代蓝' }).checked).toBe(true);
  });

  it.each([
    { id: 'custom-first', nextId: 'custom-middle' },
    { id: 'custom-middle', nextId: 'custom-last' },
    { id: 'custom-last', nextId: 'custom-middle' },
  ])('keeps deletion focus on a neighboring delete action for $id', async ({ id, nextId }) => {
    render(<MultiTemplateSelector />, { wrapper });
    const selectedRadio = screen.getByRole<HTMLInputElement>('radio', { name: '现代蓝' });
    const targetButton = document
      .querySelector<HTMLElement>(`article[data-template-id="${id}"]`)
      ?.querySelector<HTMLButtonElement>('button[data-template-delete]');
    const nextButton = () =>
      document
        .querySelector<HTMLElement>(`article[data-template-id="${nextId}"]`)
        ?.querySelector<HTMLButtonElement>('button[data-template-delete]');

    expect(targetButton).toBeTruthy();
    targetButton?.focus();
    fireEvent.click(targetButton!);

    await waitFor(() => expect(document.activeElement).toBe(nextButton()));
    expect(selectedRadio.checked).toBe(true);
    expect(document.activeElement).not.toHaveProperty('type', 'radio');
    expect(document.querySelector(`article[data-template-id="${id}"]`)).toBeNull();
  });

  it('moves focus to the custom-template form when deleting the last custom template', async () => {
    const SingleCustomSelector = () => {
      const [customTemplates, setCustomTemplates] = useState([customTemplate]);
      return (
        <TemplateSelector
          builtInTemplates={templates}
          customTemplates={customTemplates}
          activeId={templates[0]!.id}
          onStyleChange={vi.fn()}
          onLoadSample={vi.fn()}
          onSaveTemplate={vi.fn()}
          onDeleteTemplate={(id) =>
            setCustomTemplates((previous) => previous.filter((template) => template.id !== id))
          }
          onUpdateTemplate={vi.fn()}
        />
      );
    };
    render(<SingleCustomSelector />, { wrapper });
    const deleteButton = document
      .querySelector<HTMLElement>(`article[data-template-id="${customTemplate.id}"]`)
      ?.querySelector<HTMLButtonElement>('button[data-template-delete]');
    deleteButton?.focus();
    fireEvent.click(deleteButton!);

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: '模板名称' })),
    );
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '现代蓝' }).checked).toBe(true);
  });
});
