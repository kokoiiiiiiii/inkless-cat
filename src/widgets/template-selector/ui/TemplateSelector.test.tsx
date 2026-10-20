import { createEmptyResume } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import { templates } from '@entities/template';
import { I18nProvider } from '@shared/i18n';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import TemplateSelector from './TemplateSelector';
import { areTemplateThumbnailPropsEqual } from './TemplateThumbnail';

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
});
