import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StudioPopover } from './StudioPopover';

const renderPopover = (onFirstAction = vi.fn()) => {
  const result = render(
    <>
      <button type="button">Before menu</button>
      <StudioPopover icon="menu" label="Actions">
        <button onClick={onFirstAction} role="menuitem" type="button">
          First action
        </button>
        <button role="menuitem" type="button">
          Second action
        </button>
        <button aria-disabled="true" role="menuitem" type="button">
          Unavailable action
        </button>
        <button role="menuitem" type="button">
          Last action
        </button>
      </StudioPopover>
      <button type="button">After menu</button>
    </>,
  );

  return {
    ...result,
    after: screen.getByRole('button', { name: 'After menu' }),
    before: screen.getByRole('button', { name: 'Before menu' }),
    first: screen.getByRole('menuitem', { hidden: true, name: 'First action' }),
    last: screen.getByRole('menuitem', { hidden: true, name: 'Last action' }),
    second: screen.getByRole('menuitem', { hidden: true, name: 'Second action' }),
    trigger: screen.getByRole('button', { name: 'Actions' }),
  };
};

describe('StudioPopover', () => {
  it('opens with focus on the first available item and supports arrow, Home, and End navigation', () => {
    const { first, last, second, trigger } = renderPopover();

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(second);

    fireEvent.keyDown(second, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(last, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(last, { key: 'Home' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: 'End' });
    expect(document.activeElement).toBe(last);
  });

  it('keeps the popover open when focus returns to its trigger, then lets the click toggle close it', () => {
    const { first, trigger } = renderPopover();
    const menu = document.querySelector('[role="menu"]');

    fireEvent.click(trigger);
    fireEvent.blur(first, { relatedTarget: trigger });

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(menu?.hasAttribute('hidden')).toBe(false);

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(menu?.hasAttribute('hidden')).toBe(true);
  });

  it('closes on Escape and returns focus to the trigger, then opens again cleanly', () => {
    const { first, trigger } = renderPopover();
    const menu = document.querySelector('[role="menu"]');

    fireEvent.click(trigger);
    fireEvent.keyDown(first, { key: 'Escape' });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    expect(menu?.hasAttribute('hidden')).toBe(true);

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(first);
  });

  it('closes when focus leaves in either direction without pulling it back to the trigger', () => {
    const { after, before, first, last, trigger } = renderPopover();

    fireEvent.click(trigger);
    act(() => after.focus());
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(after);

    fireEvent.click(trigger);
    first.focus();
    act(() => before.focus());
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(before);

    fireEvent.click(trigger);
    expect(document.activeElement).toBe(first);
    last.focus();
    expect(document.activeElement).toBe(last);
  });

  it('closes after a menu action and invokes that action once', () => {
    const onFirstAction = vi.fn();
    const { first, trigger } = renderPopover(onFirstAction);

    fireEvent.click(trigger);
    fireEvent.click(first);

    expect(onFirstAction).toHaveBeenCalledTimes(1);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });
});
