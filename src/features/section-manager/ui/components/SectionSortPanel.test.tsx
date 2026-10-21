import { I18nProvider } from '@shared/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SectionSortPanel } from './SectionSortPanel';

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

const ControlledPanel = ({ initialOrder }: { initialOrder: string[] }) => {
  const [order, setOrder] = useState(initialOrder);
  const [undoOrder, setUndoOrder] = useState<string[] | null>(null);
  const handleReorder = (nextOrder: string[]) => {
    setUndoOrder(order);
    setOrder(nextOrder);
  };

  return (
    <SectionSortPanel
      resolvedActiveSections={order}
      displayOrder={order}
      dragState={{ active: null, over: null, position: null }}
      dragCompletion={null}
      dragListRef={{ current: null }}
      getSectionTitle={(key) => key}
      handlePointerDown={vi.fn()}
      canRestore={order.some((key, index) => key !== initialOrder[index])}
      canUndo={Boolean(undoOrder)}
      onRestore={() => {
        if (!order.some((key, index) => key !== initialOrder[index])) return false;
        setUndoOrder(order);
        setOrder(initialOrder);
        return true;
      }}
      onUndo={() => {
        if (!undoOrder) return false;
        setOrder(undoOrder);
        setUndoOrder(null);
        return true;
      }}
      onReorderSections={handleReorder}
    />
  );
};

describe('SectionSortPanel keyboard controls', () => {
  it('reorders with move buttons, preserves focus, and announces the new position', () => {
    render(<ControlledPanel initialOrder={['projects', 'experience', 'education']} />, { wrapper });

    const experienceButtons = screen.getAllByRole('button', { name: /experience/u });
    const moveUpButton = experienceButtons[0];
    expect(moveUpButton).toBeDefined();
    moveUpButton?.focus();
    fireEvent.click(moveUpButton!);

    expect(
      screen
        .getByTestId('section-sort-list')
        .querySelectorAll('[data-section-key]')[0]
        ?.getAttribute('data-section-key'),
    ).toBe('experience');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /experience.*下移/u }));
    expect(screen.getByRole('status').textContent).toContain('experience移动到第 1 项');
  });

  it('disables movement at the first and last positions while keeping middle moves available', () => {
    render(<ControlledPanel initialOrder={['projects', 'experience', 'education']} />, { wrapper });

    expect(screen.getByRole('button', { name: /projects.*上移/u }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.getByRole('button', { name: /education.*下移/u }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.getByRole('button', { name: /experience.*上移/u }).hasAttribute('disabled')).toBe(
      false,
    );
    expect(screen.getByRole('button', { name: /experience.*下移/u }).hasAttribute('disabled')).toBe(
      false,
    );
  });

  it('moves focus to an enabled control after Undo and Reset', () => {
    render(<ControlledPanel initialOrder={['projects', 'experience', 'education']} />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: /experience.*上移/u }));
    const undo = screen.getByRole<HTMLButtonElement>('button', { name: '撤销' });
    undo.focus();
    fireEvent.click(undo);

    expect(undo.disabled).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /projects.*下移/u }));
    expect((document.activeElement as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /experience.*上移/u }));
    const restore = screen.getByRole<HTMLButtonElement>('button', { name: '复原' });
    restore.focus();
    fireEvent.click(restore);

    expect(restore.disabled).toBe(true);
    expect(undo.disabled).toBe(false);
    expect(document.activeElement).toBe(undo);
  });

  it('uses the dedicated touch drag handle and keeps the rest of the row scrollable', () => {
    const handlePointerDown = vi.fn();
    render(
      <SectionSortPanel
        resolvedActiveSections={['projects', 'experience']}
        displayOrder={['projects', 'experience']}
        dragState={{ active: null, over: null, position: null }}
        dragCompletion={null}
        dragListRef={{ current: null }}
        getSectionTitle={(key) => key}
        handlePointerDown={handlePointerDown}
        canRestore={false}
        canUndo={false}
        onRestore={() => true}
        onUndo={() => true}
        onReorderSections={vi.fn()}
      />,
      { wrapper },
    );

    const handle = screen.getAllByTestId('section-drag-handle')[0];
    const firstRow = screen.getAllByTestId('section-sort-list')[0]?.querySelector('li');
    expect(handle?.className).toContain('touch-none');
    expect(firstRow?.style.touchAction).toBeUndefined();

    fireEvent.pointerDown(firstRow!, { pointerId: 1, pointerType: 'touch', button: 0 });
    expect(handlePointerDown).not.toHaveBeenCalled();
    fireEvent.pointerDown(handle!, { pointerId: 2, pointerType: 'touch', button: 0 });
    expect(handlePointerDown).toHaveBeenCalledTimes(1);
  });

  it('announces a completed drag even when pointer state is batched', () => {
    render(
      <SectionSortPanel
        resolvedActiveSections={['projects', 'experience']}
        displayOrder={['experience', 'projects']}
        dragState={{ active: null, over: null, position: null }}
        dragCompletion={{ sectionKey: 'experience', position: 1, total: 2 }}
        dragListRef={{ current: null }}
        getSectionTitle={(key) => key}
        handlePointerDown={vi.fn()}
        canRestore={true}
        canUndo={true}
        onRestore={() => true}
        onUndo={() => true}
        onReorderSections={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByRole('status').textContent).toContain('experience移动到第 1 项');
  });

  it('provides English move-button names', () => {
    globalThis.localStorage.setItem('inkless-cat-locale', 'en');
    render(<ControlledPanel initialOrder={['projects', 'experience']} />, { wrapper });

    expect(screen.getByRole('button', { name: 'Move projects up' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(
      screen.getByRole('button', { name: 'Move experience down' }).hasAttribute('disabled'),
    ).toBe(true);
  });
});
