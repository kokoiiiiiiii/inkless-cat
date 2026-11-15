import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export const PC_PREVIEW_A4_WIDTH = 794;
export const PC_PREVIEW_A4_HEIGHT = 1123;
export const PC_PREVIEW_MIN_ZOOM = 50;
export const PC_PREVIEW_MAX_ZOOM = 200;
export const PC_PREVIEW_ZOOM_STEP = 5;

export type PCPreviewZoomMode = 'MANUAL' | 'FIT_WIDTH';

export type PCPreviewZoomState = {
  mode: PCPreviewZoomMode;
  scale: number;
};

type ReadingAnchor = {
  x: number;
  y: number;
};

type ContainerSize = {
  width: number;
  height: number;
};

const DEFAULT_SCALE = 0.62;
const PREVIEW_HORIZONTAL_PADDING = 12;

const clampScale = (scale: number) =>
  Math.round(
    Math.max(PC_PREVIEW_MIN_ZOOM / 100, Math.min(PC_PREVIEW_MAX_ZOOM / 100, scale)) * 100,
  ) / 100;

export const calculatePCPreviewFitWidthScale = (containerWidth: number) => {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return DEFAULT_SCALE;
  const availableWidth = Math.max(0, containerWidth - PREVIEW_HORIZONTAL_PADDING);
  const fitScale = Math.floor((availableWidth / PC_PREVIEW_A4_WIDTH) * 100) / 100;
  return clampScale(fitScale);
};

const getElementStart = (element: HTMLElement, container: HTMLElement, axis: 'x' | 'y') => {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return axis === 'x'
    ? elementRect.left - containerRect.left - container.clientLeft + container.scrollLeft
    : elementRect.top - containerRect.top - container.clientTop + container.scrollTop;
};

const captureReadingAnchor = (
  scrollContainer: HTMLDivElement | null,
  stage: HTMLDivElement | null,
  scale: number,
): ReadingAnchor | null => {
  if (!scrollContainer || !stage || scale <= 0) return null;

  const centerX = scrollContainer.scrollLeft + scrollContainer.clientWidth / 2;
  const centerY = scrollContainer.scrollTop + scrollContainer.clientHeight / 2;

  return {
    x: Math.max(0, (centerX - getElementStart(stage, scrollContainer, 'x')) / scale),
    y: Math.max(0, (centerY - getElementStart(stage, scrollContainer, 'y')) / scale),
  };
};

export const usePCPreviewZoom = () => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<PCPreviewZoomState>({ mode: 'FIT_WIDTH', scale: DEFAULT_SCALE });
  const zoomRef = useRef(zoom);
  const [naturalHeight, setNaturalHeight] = useState(PC_PREVIEW_A4_HEIGHT);
  const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 0, height: 0 });
  const containerSizeRef = useRef(containerSize);
  const hasMeasuredContainerRef = useRef(false);
  const pendingAnchorRef = useRef<ReadingAnchor | null>(null);

  const updateZoom = useCallback(
    (mode: PCPreviewZoomMode, scale: number, preserveAnchor = true) => {
      const nextState = { mode, scale: clampScale(scale) };
      const currentState = zoomRef.current;

      if (Math.abs(nextState.scale - currentState.scale) >= 0.005) {
        pendingAnchorRef.current = preserveAnchor
          ? captureReadingAnchor(scrollRef.current, stageRef.current, currentState.scale)
          : null;
      }

      if (nextState.mode === currentState.mode && nextState.scale === currentState.scale) return;
      zoomRef.current = nextState;
      setZoom(nextState);
    },
    [],
  );

  const setManualZoom = useCallback((scale: number) => updateZoom('MANUAL', scale), [updateZoom]);

  const zoomIn = useCallback(
    () => setManualZoom(zoomRef.current.scale + PC_PREVIEW_ZOOM_STEP / 100),
    [setManualZoom],
  );

  const zoomOut = useCallback(
    () => setManualZoom(zoomRef.current.scale - PC_PREVIEW_ZOOM_STEP / 100),
    [setManualZoom],
  );

  const setFitWidth = useCallback(() => {
    const width = containerSizeRef.current.width || scrollRef.current?.clientWidth || 0;
    const nextScale = width > 0 ? calculatePCPreviewFitWidthScale(width) : zoomRef.current.scale;
    updateZoom('FIT_WIDTH', nextScale);
  }, [updateZoom]);

  useLayoutEffect(() => {
    const anchor = pendingAnchorRef.current;
    pendingAnchorRef.current = null;

    const scrollContainer = scrollRef.current;
    const stage = stageRef.current;
    if (!anchor || !scrollContainer || !stage) return;

    const nextLeft =
      getElementStart(stage, scrollContainer, 'x') +
      anchor.x * zoom.scale -
      scrollContainer.clientWidth / 2;
    const nextTop =
      getElementStart(stage, scrollContainer, 'y') +
      anchor.y * zoom.scale -
      scrollContainer.clientHeight / 2;

    scrollContainer.scrollLeft = Math.max(
      0,
      Math.min(nextLeft, scrollContainer.scrollWidth - scrollContainer.clientWidth),
    );
    scrollContainer.scrollTop = Math.max(
      0,
      Math.min(nextTop, scrollContainer.scrollHeight - scrollContainer.clientHeight),
    );
  }, [zoom.scale]);

  useLayoutEffect(() => {
    const scrollContainer = scrollRef.current;
    const paper = paperRef.current;
    if (!scrollContainer || !paper || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      const width = Math.round(scrollContainer.clientWidth);
      const height = Math.round(scrollContainer.clientHeight);
      const previousSize = containerSizeRef.current;

      if (
        Math.abs(previousSize.width - width) >= 1 ||
        Math.abs(previousSize.height - height) >= 1
      ) {
        const nextSize = { width, height };
        containerSizeRef.current = nextSize;
        setContainerSize(nextSize);
      }

      if (width > 0 && zoomRef.current.mode === 'FIT_WIDTH') {
        const nextScale = calculatePCPreviewFitWidthScale(width);
        updateZoom('FIT_WIDTH', nextScale, hasMeasuredContainerRef.current);
      }

      if (width > 0) hasMeasuredContainerRef.current = true;

      const nextHeight = Math.max(PC_PREVIEW_A4_HEIGHT, paper.scrollHeight);
      setNaturalHeight((currentHeight) =>
        Math.abs(currentHeight - nextHeight) >= 1 ? nextHeight : currentHeight,
      );
    });

    observer.observe(scrollContainer);
    observer.observe(paper);
    return () => observer.disconnect();
  }, [updateZoom]);

  return {
    zoom,
    zoomPercent: Math.round(zoom.scale * 100),
    naturalHeight,
    containerSize,
    scrollRef,
    stageRef,
    paperRef,
    zoomIn,
    zoomOut,
    setManualZoom,
    setFitWidth,
  };
};
