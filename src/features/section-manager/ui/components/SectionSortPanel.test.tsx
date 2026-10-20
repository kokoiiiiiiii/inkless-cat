import { I18nProvider } from '@shared/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SectionSortPanel } from './SectionSortPanel';

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

describe('SectionSortPanel keyboard controls', () => {
  it('reorders modules with accessible move buttons', () => {
    const onReorderSections = vi.fn();
    const dragListRef = { current: null };
    render(
      <SectionSortPanel
        resolvedActiveSections={['projects', 'experience']}
        displayOrder={['projects', 'experience']}
        dragState={{ active: null, over: null, position: null }}
        dragListRef={dragListRef}
        getSectionTitle={(key) => key}
        handlePointerDown={vi.fn()}
        canRestore={false}
        canUndo={false}
        onRestore={vi.fn()}
        onUndo={vi.fn()}
        onReorderSections={onReorderSections}
      />,
      { wrapper },
    );

    const moveUpButton = screen.getAllByRole('button', { name: /experience/u })[0];
    expect(moveUpButton).toBeDefined();
    fireEvent.click(moveUpButton!);

    expect(onReorderSections).toHaveBeenCalledWith(['experience', 'projects']);
  });

  it('disables move buttons at the respective list boundaries', () => {
    render(
      <SectionSortPanel
        resolvedActiveSections={['projects', 'experience']}
        displayOrder={['projects', 'experience']}
        dragState={{ active: null, over: null, position: null }}
        dragListRef={{ current: null }}
        getSectionTitle={(key) => key}
        handlePointerDown={vi.fn()}
        canRestore={false}
        canUndo={false}
        onRestore={vi.fn()}
        onUndo={vi.fn()}
        onReorderSections={vi.fn()}
      />,
      { wrapper },
    );

    const projectsButtons = screen.getAllByRole('button', { name: /projects/u });
    const experienceButtons = screen.getAllByRole('button', { name: /experience/u });
    expect(projectsButtons[0]?.hasAttribute('disabled')).toBe(true);
    expect(experienceButtons[1]?.hasAttribute('disabled')).toBe(true);
  });
});
