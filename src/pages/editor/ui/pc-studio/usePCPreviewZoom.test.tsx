import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  calculatePCPreviewFitWidthScale,
  PC_PREVIEW_A4_HEIGHT,
  PC_PREVIEW_A4_WIDTH,
  usePCPreviewZoom,
} from './usePCPreviewZoom';

class MockResizeObserver {
  static observers: MockResizeObserver[] = [];

  readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.observers.push(this);
  }

  observe() {}

  unobserve() {}

  disconnect() {}

  trigger() {
    this.callback([], this);
  }
}

const ZoomHarness = () => {
  const zoom = usePCPreviewZoom();

  return (
    <>
      <div data-testid="preview-scroll" ref={zoom.scrollRef} style={{ overflow: 'auto' }}>
        <div
          data-testid="preview-stage"
          ref={zoom.stageRef}
          style={{
            width: `${PC_PREVIEW_A4_WIDTH * zoom.zoom.scale}px`,
            height: `${zoom.naturalHeight * zoom.zoom.scale}px`,
          }}
        >
          <div
            data-testid="preview-paper"
            ref={zoom.paperRef}
            style={{ width: PC_PREVIEW_A4_WIDTH, minHeight: PC_PREVIEW_A4_HEIGHT }}
          />
        </div>
      </div>
      <output data-testid="zoom-value">{zoom.zoomPercent}%</output>
      <output data-testid="zoom-mode">{zoom.zoom.mode}</output>
      <button type="button" onClick={zoom.zoomIn}>
        Zoom in
      </button>
      <button type="button" onClick={zoom.zoomOut}>
        Zoom out
      </button>
      <button type="button" onClick={() => zoom.setManualZoom(0.25)}>
        Set below minimum
      </button>
      <button type="button" onClick={() => zoom.setManualZoom(3)}>
        Set above maximum
      </button>
      <button type="button" onClick={() => zoom.setManualZoom(1)}>
        Set 100 percent
      </button>
      <button type="button" onClick={zoom.setFitWidth}>
        Fit width
      </button>
    </>
  );
};

const setDimension = (element: HTMLElement, key: 'clientWidth' | 'clientHeight', value: number) => {
  Object.defineProperty(element, key, { configurable: true, value });
};

const setScrollLimit = (
  element: HTMLElement,
  key: 'scrollWidth' | 'scrollHeight',
  value: number,
) => {
  Object.defineProperty(element, key, { configurable: true, value, writable: true });
};

const setRect = (
  element: HTMLElement,
  getRect: () => Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => {
      const rect = getRect();
      return {
        ...rect,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        x: rect.left,
        y: rect.top,
        toJSON: () => rect,
      } as DOMRect;
    },
  });
};

const triggerResize = () => {
  act(() => MockResizeObserver.observers.at(-1)?.trigger());
};

const originalResizeObserver = globalThis.ResizeObserver;

beforeEach(() => {
  MockResizeObserver.observers = [];
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: MockResizeObserver,
  });
});

afterEach(() => {
  cleanup();
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: originalResizeObserver,
  });
});

describe('calculatePCPreviewFitWidthScale', () => {
  it('fits the A4 paper inside the measured scroll width', () => {
    expect(calculatePCPreviewFitWidthScale(806)).toBe(1);
    expect(calculatePCPreviewFitWidthScale(640)).toBe(0.79);
  });

  it('keeps fit width inside the supported zoom range', () => {
    expect(calculatePCPreviewFitWidthScale(320)).toBe(0.5);
    expect(calculatePCPreviewFitWidthScale(5000)).toBe(2);
  });

  it('uses a safe provisional scale for an unmeasured container', () => {
    expect(calculatePCPreviewFitWidthScale(0)).toBe(0.62);
    expect(calculatePCPreviewFitWidthScale(Number.NaN)).toBe(0.62);
  });
});

describe('usePCPreviewZoom', () => {
  it('clamps manual zoom to 50%–200% and steps by 5%', () => {
    render(<ZoomHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Set below minimum' }));
    expect(screen.getByTestId('zoom-value').textContent).toBe('50%');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(screen.getByTestId('zoom-value').textContent).toBe('50%');

    fireEvent.click(screen.getByRole('button', { name: 'Set above maximum' }));
    expect(screen.getByTestId('zoom-value').textContent).toBe('200%');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByTestId('zoom-value').textContent).toBe('200%');
  });

  it('recalculates Fit Width when the container resizes and leaves manual zoom unchanged', () => {
    render(<ZoomHarness />);
    const scroll = screen.getByTestId('preview-scroll');
    setDimension(scroll, 'clientWidth', 806);
    setDimension(scroll, 'clientHeight', 500);
    triggerResize();
    expect(screen.getByTestId('zoom-value').textContent).toBe('100%');

    setDimension(scroll, 'clientWidth', 646);
    triggerResize();
    expect(screen.getByTestId('zoom-value').textContent).toBe('79%');
    expect(screen.getByTestId('zoom-mode').textContent).toBe('FIT_WIDTH');

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByTestId('zoom-value').textContent).toBe('84%');
    expect(screen.getByTestId('zoom-mode').textContent).toBe('MANUAL');

    setDimension(scroll, 'clientWidth', 500);
    triggerResize();
    expect(screen.getByTestId('zoom-value').textContent).toBe('84%');
  });

  it('keeps the reading point centered when zoom changes', () => {
    render(<ZoomHarness />);
    const scroll = screen.getByTestId('preview-scroll');
    const stage = screen.getByTestId('preview-stage');
    setDimension(scroll, 'clientWidth', 400);
    setDimension(scroll, 'clientHeight', 200);
    setScrollLimit(scroll, 'scrollWidth', 2000);
    setScrollLimit(scroll, 'scrollHeight', 2000);
    setRect(scroll, () => ({ left: 0, top: 0, width: 400, height: 200 }));
    setRect(stage, () => ({
      left: -scroll.scrollLeft,
      top: -scroll.scrollTop,
      width: 794,
      height: 1123,
    }));
    triggerResize();

    fireEvent.click(screen.getByRole('button', { name: 'Set 100 percent' }));
    scroll.scrollLeft = 300;
    scroll.scrollTop = 200;

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));

    expect(screen.getByTestId('zoom-value').textContent).toBe('105%');
    expect(scroll.scrollLeft).toBeCloseTo(325, 0);
    expect(scroll.scrollTop).toBeCloseTo(215, 0);
  });
});
