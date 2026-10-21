import { fireEvent, render, screen } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSectionDragController } from './useSectionDragController';
import type { SectionReorderHandler } from './useSectionManager';

const originalSetPointerCapture = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'setPointerCapture',
);
const originalReleasePointerCapture = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'releasePointerCapture',
);
let setPointerCaptureMock = vi.fn();
let releasePointerCaptureMock = vi.fn();

type PointerInit = {
  pointerId?: number;
  pointerType?: string;
  button?: number;
  clientX?: number;
  clientY?: number;
  isPrimary?: boolean;
};

const createPointerEvent = (type: string, init: PointerInit = {}) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const values = {
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? 'mouse',
    button: init.button ?? 0,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    isPrimary: init.isPrimary ?? true,
  };
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(event, key, { configurable: true, value });
  }
  return event;
};

const setRect = (element: Element, top: number, bottom: number) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ top, bottom, height: bottom - top }) as DOMRect,
  });
};

const DragHarness = ({ onReorder }: { onReorder: SectionReorderHandler }) => {
  const [sections, setSections] = useState(['a', 'b']);
  const handleReorder = useCallback<SectionReorderHandler>(
    (order) => {
      onReorder(order);
      setSections(order);
    },
    [onReorder],
  );
  const controller = useSectionDragController({
    resolvedActiveSections: sections,
    onReorderSections: handleReorder,
  });

  return (
    <>
      <ul ref={controller.dragListRef} data-testid="drag-list">
        {controller.displayOrder.map((key) => (
          <li key={key} data-section-key={key}>
            <span
              data-testid={`handle-${key}`}
              onPointerDown={(event) => controller.handlePointerDown(event, key)}
            />
          </li>
        ))}
      </ul>
      <button type="button" data-testid="remove-a" onClick={() => setSections(['b'])}>
        Remove active section
      </button>
      <output data-testid="drag-active">{controller.dragState.active ?? ''}</output>
    </>
  );
};

describe('useSectionDragController pointer lifecycle', () => {
  beforeEach(() => {
    setPointerCaptureMock = vi.fn();
    releasePointerCaptureMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: setPointerCaptureMock,
    });
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCaptureMock,
    });
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    document.body.style.overflow = '';
    document.body.style.userSelect = '';
    document.documentElement.style.overscrollBehavior = '';
  });

  afterEach(() => {
    if (originalSetPointerCapture) {
      Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', originalSetPointerCapture);
    } else {
      delete (HTMLElement.prototype as Partial<HTMLElement>).setPointerCapture;
    }
    if (originalReleasePointerCapture) {
      Object.defineProperty(
        HTMLElement.prototype,
        'releasePointerCapture',
        originalReleasePointerCapture,
      );
    } else {
      delete (HTMLElement.prototype as Partial<HTMLElement>).releasePointerCapture;
    }
    vi.unstubAllGlobals();
    document.body.style.overflow = '';
    document.body.style.userSelect = '';
    document.documentElement.style.overscrollBehavior = '';
  });

  it('waits for the movement threshold and commits the latest drag position', () => {
    const onReorder = vi.fn();
    render(<DragHarness onReorder={onReorder} />);
    const handle = screen.getByTestId('handle-a');
    const items = screen.getAllByRole('listitem');
    setRect(items[0]!, 0, 40);
    setRect(items[1]!, 50, 90);

    fireEvent(handle, createPointerEvent('pointerdown', { clientX: 4, clientY: 10 }));
    expect(setPointerCaptureMock.mock.contexts[0]).toBe(screen.getByTestId('drag-list'));
    fireEvent(document, createPointerEvent('pointermove', { clientX: 6, clientY: 12 }));
    expect(document.body.style.overflow).toBe('');
    expect(screen.getByTestId('drag-active').textContent).toBe('');
    fireEvent(document, createPointerEvent('pointerup', { clientX: 6, clientY: 12 }));
    expect(onReorder).not.toHaveBeenCalled();

    fireEvent(handle, createPointerEvent('pointerdown', { clientX: 4, clientY: 10 }));
    fireEvent(document, createPointerEvent('pointermove', { clientX: 4, clientY: 70 }));
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByTestId('drag-active').textContent).toBe('a');
    fireEvent(document, createPointerEvent('pointerup', { clientX: 4, clientY: 70 }));

    expect(onReorder).toHaveBeenCalledWith(['b', 'a']);
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.userSelect).toBe('');
    expect(screen.getByTestId('drag-active').textContent).toBe('');
    expect(setPointerCaptureMock).toHaveBeenCalledTimes(2);
    expect(releasePointerCaptureMock).toHaveBeenCalledTimes(2);
  });

  it('starts dragging when movement reaches exactly six pixels', () => {
    const onReorder = vi.fn();
    render(<DragHarness onReorder={onReorder} />);
    const handle = screen.getByTestId('handle-a');

    fireEvent(handle, createPointerEvent('pointerdown', { clientX: 4, clientY: 10 }));
    fireEvent(document, createPointerEvent('pointermove', { clientX: 10, clientY: 10 }));

    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByTestId('drag-active').textContent).toBe('a');

    fireEvent(document, createPointerEvent('pointercancel'));

    expect(document.body.style.overflow).toBe('');
    expect(onReorder).not.toHaveBeenCalled();
    expect(releasePointerCaptureMock).toHaveBeenCalledTimes(1);
  });

  it('cancels an active drag when the section snapshot changes', () => {
    const onReorder = vi.fn();
    render(<DragHarness onReorder={onReorder} />);
    fireEvent(screen.getByTestId('handle-a'), createPointerEvent('pointerdown'));
    fireEvent(document, createPointerEvent('pointermove', { clientY: 10 }));
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByTestId('drag-active').textContent).toBe('a');

    fireEvent.click(screen.getByTestId('remove-a'));

    expect(screen.queryByTestId('handle-a')).toBeNull();
    expect(
      [...screen.getByTestId('drag-list').querySelectorAll('[data-section-key]')].map(
        (element) => (element as HTMLElement).dataset.sectionKey,
      ),
    ).toEqual(['b']);
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.userSelect).toBe('');
    expect(screen.getByTestId('drag-active').textContent).toBe('');
    expect(releasePointerCaptureMock).toHaveBeenCalledTimes(1);

    fireEvent(document, createPointerEvent('pointerup', { clientY: 80 }));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it.each(['pointercancel', 'lostpointercapture'] as const)(
    'releases the scroll lock and capture after %s',
    (eventType) => {
      const onReorder = vi.fn();
      render(<DragHarness onReorder={onReorder} />);
      fireEvent(screen.getByTestId('handle-a'), createPointerEvent('pointerdown'));
      fireEvent(document, createPointerEvent('pointermove', { clientY: 10 }));
      expect(document.body.style.overflow).toBe('hidden');

      fireEvent(document, createPointerEvent(eventType));

      expect(document.body.style.overflow).toBe('');
      expect(document.body.style.userSelect).toBe('');
      expect(screen.getByTestId('drag-active').textContent).toBe('');
      expect(onReorder).not.toHaveBeenCalled();
      expect(releasePointerCaptureMock).toHaveBeenCalledTimes(1);
      expect(vi.mocked(globalThis.cancelAnimationFrame)).toHaveBeenCalled();

      fireEvent(document, createPointerEvent('pointermove', { clientY: 80 }));
      fireEvent(document, createPointerEvent('pointerup', { clientY: 80 }));
      expect(onReorder).not.toHaveBeenCalled();
    },
  );

  it('cleans up listeners, capture, and scroll locking when unmounted mid-drag', () => {
    const onReorder = vi.fn();
    const { unmount } = render(<DragHarness onReorder={onReorder} />);
    fireEvent(screen.getByTestId('handle-a'), createPointerEvent('pointerdown'));
    fireEvent(document, createPointerEvent('pointermove', { clientY: 10 }));
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    fireEvent(document, createPointerEvent('pointerup', { clientY: 80 }));

    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.userSelect).toBe('');
    expect(onReorder).not.toHaveBeenCalled();
    expect(releasePointerCaptureMock).toHaveBeenCalledTimes(1);
  });
});
