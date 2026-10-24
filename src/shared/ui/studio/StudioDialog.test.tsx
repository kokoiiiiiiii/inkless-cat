import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioDialog } from './StudioDialog';

const showModalDescriptor = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const closeDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

const restoreMethod = (name: 'showModal' | 'close', descriptor: PropertyDescriptor | undefined) => {
  if (descriptor) {
    Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
  } else {
    Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
};

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    return globalThis.setTimeout(() => callback(globalThis.performance.now()), 0);
  });
});

afterEach(() => {
  restoreMethod('showModal', showModalDescriptor);
  restoreMethod('close', closeDescriptor);
  vi.unstubAllGlobals();
});

describe('StudioDialog', () => {
  it('uses unique title ids and gives each mounted dialog its own accessible name', () => {
    render(
      <StrictMode>
        <StudioDialog onClose={() => {}} open title="First dialog">
          <p>First body</p>
        </StudioDialog>
        <StudioDialog onClose={() => {}} open title="Second dialog">
          <p>Second body</p>
        </StudioDialog>
      </StrictMode>,
    );

    const first = screen.getByRole('dialog', { name: 'First dialog' });
    const second = screen.getByRole('dialog', { name: 'Second dialog' });
    const titleIds = [
      first.getAttribute('aria-labelledby'),
      second.getAttribute('aria-labelledby'),
    ];
    const [firstTitle, secondTitle] = document.querySelectorAll('h2');

    expect(titleIds[0]).toBeTruthy();
    expect(titleIds[1]).toBeTruthy();
    expect(new Set(titleIds).size).toBe(2);
    expect(firstTitle?.id).toBe(titleIds[0]);
    expect(secondTitle?.id).toBe(titleIds[1]);
    expect(firstTitle?.textContent).toBe('First dialog');
    expect(secondTitle?.textContent).toBe('Second dialog');
  });

  it('moves focus into the dialog, closes with Escape or its close button, and restores focus', async () => {
    const DialogHarness = () => {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            Open information
          </button>
          <StudioDialog onClose={() => setOpen(false)} open={open} title="Studio information">
            <button data-dialog-autofocus type="button">
              Continue
            </button>
          </StudioDialog>
        </>
      );
    };

    render(<DialogHarness />);
    const trigger = screen.getByRole('button', { name: 'Open information' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'Studio information' });
    const dialogElement = dialog as HTMLDialogElement;
    const autofocusButton = screen.getByRole('button', { name: 'Continue' });
    expect(document.activeElement).toBe(autofocusButton);

    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    await waitFor(() => expect(dialogElement.open).toBe(false));
    await waitFor(() => expect(document.activeElement).toBe(trigger));

    trigger.focus();
    fireEvent.click(trigger);
    const reopenedDialog = await screen.findByRole('dialog', { name: 'Studio information' });
    fireEvent.click(screen.getByRole('button', { name: '关闭弹窗' }));

    await waitFor(() => expect((reopenedDialog as HTMLDialogElement).open).toBe(false));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
