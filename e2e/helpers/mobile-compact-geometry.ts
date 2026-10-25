import type { Page } from '@playwright/test';

export const measureM0Page = async (page: Page, scenario: string) =>
  page.evaluate((label) => {
    type Rect = {
      x: number;
      y: number;
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    };
    const round = (value: number) => Math.round(value * 100) / 100;
    const rect = (value: DOMRect): Rect => ({
      x: round(value.x),
      y: round(value.y),
      left: round(value.left),
      top: round(value.top),
      right: round(value.right),
      bottom: round(value.bottom),
      width: round(value.width),
      height: round(value.height),
    });
    const box = (selector: string): Rect | null => {
      const element = document.querySelector<HTMLElement>(selector);
      return element ? rect(element.getBoundingClientRect()) : null;
    };
    const intersection = (a: Rect, b: Rect): Rect | null => {
      const left = Math.max(a.left, b.left);
      const top = Math.max(a.top, b.top);
      const right = Math.min(a.right, b.right);
      const bottom = Math.min(a.bottom, b.bottom);
      if (right <= left || bottom <= top) return null;
      return {
        x: round(left),
        y: round(top),
        left: round(left),
        top: round(top),
        right: round(right),
        bottom: round(bottom),
        width: round(right - left),
        height: round(bottom - top),
      };
    };
    const area = (value: Rect | null) => (value ? value.width * value.height : 0);
    const unionArea = (values: Rect[]) => {
      if (values.length === 0) return 0;
      const xs = [...new Set(values.flatMap((value) => [value.left, value.right]))].sort(
        (a, b) => a - b,
      );
      const ys = [...new Set(values.flatMap((value) => [value.top, value.bottom]))].sort(
        (a, b) => a - b,
      );
      let result = 0;
      for (let x = 0; x < xs.length - 1; x += 1) {
        for (let y = 0; y < ys.length - 1; y += 1) {
          const centerX = (xs[x]! + xs[x + 1]!) / 2;
          const centerY = (ys[y]! + ys[y + 1]!) / 2;
          if (
            values.some(
              (value) =>
                centerX >= value.left &&
                centerX < value.right &&
                centerY >= value.top &&
                centerY < value.bottom,
            )
          ) {
            result += (xs[x + 1]! - xs[x]!) * (ys[y + 1]! - ys[y]!);
          }
        }
      }
      return result;
    };
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const viewportRect: Rect = {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: viewport.width,
      bottom: viewport.height,
      width: viewport.width,
      height: viewport.height,
    };
    const main = document.querySelector<HTMLElement>('.m0-main');
    const mainRect = main ? rect(main.getBoundingClientRect()) : viewportRect;
    const mainClientRect: Rect = main
      ? {
          x: round(mainRect.left + main.clientLeft),
          y: round(mainRect.top + main.clientTop),
          left: round(mainRect.left + main.clientLeft),
          top: round(mainRect.top + main.clientTop),
          right: round(mainRect.left + main.clientLeft + main.clientWidth),
          bottom: round(mainRect.top + main.clientTop + main.clientHeight),
          width: main.clientWidth,
          height: main.clientHeight,
        }
      : viewportRect;
    const overflowY = main ? getComputedStyle(main).overflowY : 'visible';
    const editorClip = intersection(
      overflowY === 'visible' ? viewportRect : mainClientRect,
      viewportRect,
    );
    const occluderSelectors = [
      ['header', '.m0-header'],
      ['dock', '.m0-dock'],
      ['keyboardSimulation', '.m0-keyboard-sim'],
      ['toast', '.m0-toast'],
      ['labControls', '.m0-lab-controls'],
      ['dialog', 'dialog[open]'],
    ] as const;
    const occluders = occluderSelectors.flatMap(([name, selector]) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return [];
      const style = getComputedStyle(element);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        (style.position !== 'fixed' &&
          style.position !== 'sticky' &&
          style.position !== 'absolute' &&
          element.tagName !== 'DIALOG')
      ) {
        return [];
      }
      const visibleRect = intersection(rect(element.getBoundingClientRect()), viewportRect);
      return visibleRect ? [{ name, rect: visibleRect }] : [];
    });
    const fields = [
      ...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        '.m0-field input, .m0-field textarea',
      ),
    ].flatMap((field) => {
      const fieldRect = rect(field.getBoundingClientRect());
      if (fieldRect.width <= 0 || fieldRect.height <= 0) return [];
      const clippedRect = editorClip ? intersection(fieldRect, editorClip) : null;
      const blockerRects = occluders.flatMap(({ rect: blocker }) => {
        const overlap = clippedRect ? intersection(clippedRect, blocker) : null;
        return overlap ? [overlap] : [];
      });
      const blockedArea = unionArea(blockerRects);
      const visibleArea = Math.max(0, area(clippedRect) - blockedArea);
      const withinClip =
        Boolean(editorClip) &&
        fieldRect.left >= editorClip!.left - 1 &&
        fieldRect.top >= editorClip!.top - 1 &&
        fieldRect.right <= editorClip!.right + 1 &&
        fieldRect.bottom <= editorClip!.bottom + 1;
      const complete = withinClip && blockedArea <= 1;
      const visibleHeight = clippedRect?.height ?? 0;
      const centerX = fieldRect.left + fieldRect.width / 2;
      const centerY = fieldRect.top + fieldRect.height / 2;
      const centerPointWithinVisibleRegion = Boolean(
        editorClip &&
          centerX >= editorClip.left &&
          centerX <= editorClip.right &&
          centerY >= editorClip.top &&
          centerY <= editorClip.bottom,
      );
      const hit =
        centerX >= 0 && centerX < viewport.width && centerY >= 0 && centerY < viewport.height
          ? document.elementFromPoint(centerX, centerY)
          : null;
      const labelText =
        field.closest<HTMLElement>('.m0-field')?.querySelector('span')?.textContent?.trim() ??
        field.getAttribute('aria-label') ??
        field.tagName.toLowerCase();
      return [
        {
          label: labelText,
          rect: fieldRect,
          visibleHeightRatio: round(visibleHeight / fieldRect.height),
          visibleAreaRatio: round(visibleArea / area(fieldRect)),
          complete,
          partial: visibleArea > 1 && !complete,
          obscuredBy: occluders
            .filter(
              ({ rect: blocker }) =>
                area(clippedRect ? intersection(clippedRect, blocker) : null) > 1,
            )
            .map(({ name }) => name),
          centerPointWithinVisibleRegion,
          centerHitTest: Boolean(hit && (hit === field || field.contains(hit))),
          centerHitTarget: hit
            ? { tag: hit.tagName.toLowerCase(), className: (hit as HTMLElement).className }
            : null,
        },
      ];
    });
    const firstEditableField = fields[0] ?? null;
    const documentElement = document.documentElement;
    const scrollContainer =
      overflowY === 'visible'
        ? documentElement.scrollHeight > window.innerHeight
          ? 'document'
          : 'none'
        : '.m0-main';
    const sheetScroll = document.querySelector<HTMLElement>('.m0-sheet-scroll');
    const mainMetrics = main
      ? {
          rect: mainRect,
          clientHeight: main.clientHeight,
          scrollHeight: main.scrollHeight,
          scrollTop: round(main.scrollTop),
          overflowY,
        }
      : null;
    const header = box('.m0-header');
    const dock = box('.m0-dock');
    return {
      scenario: label,
      viewport,
      visualViewport: window.visualViewport
        ? {
            width: round(window.visualViewport.width),
            height: round(window.visualViewport.height),
            scale: round(window.visualViewport.scale),
            offsetTop: round(window.visualViewport.offsetTop),
          }
        : null,
      document: {
        clientWidth: documentElement.clientWidth,
        scrollWidth: documentElement.scrollWidth,
        horizontalOverflow: Math.max(0, documentElement.scrollWidth - viewport.width),
        scrollHeight: documentElement.scrollHeight,
        scrollTop: round(document.documentElement.scrollTop || document.body.scrollTop),
      },
      header,
      dock,
      main: mainMetrics,
      visibleEditorRegion: editorClip,
      actualScrollContainer: scrollContainer,
      completeVisibleFieldCount: fields.filter((field) => field.complete).length,
      partialVisibleFieldCount: fields.filter((field) => field.partial).length,
      obscuredFieldCount: fields.filter((field) => field.obscuredBy.length > 0).length,
      firstEditableField: firstEditableField
        ? {
            label: firstEditableField.label,
            topY: firstEditableField.rect.top,
            bottomY: firstEditableField.rect.bottom,
            relativeToHeaderPx: round(firstEditableField.rect.top - (header?.bottom ?? 0)),
            complete: firstEditableField.complete,
            visibleHeightRatio: firstEditableField.visibleHeightRatio,
            visibleAreaRatio: firstEditableField.visibleAreaRatio,
            obscuredBy: firstEditableField.obscuredBy,
            centerHitTest: firstEditableField.centerHitTest,
            centerHitTarget: firstEditableField.centerHitTarget,
          }
        : null,
      fields,
      lab: {
        trigger: box('.m0-lab-trigger'),
        controls: box('.m0-lab-controls'),
        screen: box('.m0-lab-screen'),
        controlRects: [
          ...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
            '.m0-lab-controls input, .m0-lab-controls select',
          ),
        ].map((control) => {
          const controlRect = rect(control.getBoundingClientRect());
          const centerX = controlRect.left + controlRect.width / 2;
          const centerY = controlRect.top + controlRect.height / 2;
          const centerWithinViewport =
            centerX >= 0 && centerX < viewport.width && centerY >= 0 && centerY < viewport.height;
          const visibleMainRect = intersection(mainClientRect, viewportRect);
          const centerWithinVisibleRegion = Boolean(
            visibleMainRect &&
              centerX >= visibleMainRect.left &&
              centerX <= visibleMainRect.right &&
              centerY >= visibleMainRect.top &&
              centerY <= visibleMainRect.bottom,
          );
          const hit = centerWithinViewport ? document.elementFromPoint(centerX, centerY) : null;
          return {
            label: control.closest('label')?.textContent?.trim() ?? control.tagName.toLowerCase(),
            rect: controlRect,
            centerWithinViewport,
            centerWithinVisibleRegion,
            centerHitTest: Boolean(hit && (hit === control || control.contains(hit))),
            centerHitTarget: hit
              ? { tag: hit.tagName.toLowerCase(), className: (hit as HTMLElement).className }
              : null,
          };
        }),
        expanded: document.querySelector('.m0-lab')?.hasAttribute('open') ?? null,
      },
      actionSheet: {
        rect: box('.m0-action-dialog'),
        scrollTop: sheetScroll ? round(sheetScroll.scrollTop) : null,
        scrollHeight: sheetScroll?.scrollHeight ?? null,
        clientHeight: sheetScroll?.clientHeight ?? null,
      },
      editor: box('.m0-summary-card'),
      paperViewport: box('.m0-paper-viewport'),
      paperCanvas: box('.m0-paper-measure'),
      paperLayout: box('.m0-paper-scale'),
      paper: box('.m0-paper'),
      previewContentHeight:
        document.querySelector<HTMLElement>('.m0-preview-content')?.scrollHeight ?? null,
      sectionExperience: box('[data-m0-section="experience"]'),
      selectedMode:
        document.querySelector<HTMLElement>('[data-preview-mode]')?.dataset.previewMode ?? null,
      paperScroll: document.querySelector<HTMLElement>('.m0-paper-viewport')
        ? {
            top: round(document.querySelector<HTMLElement>('.m0-paper-viewport')?.scrollTop ?? 0),
            scrollWidth:
              document.querySelector<HTMLElement>('.m0-paper-viewport')?.scrollWidth ?? 0,
            scrollHeight:
              document.querySelector<HTMLElement>('.m0-paper-viewport')?.scrollHeight ?? 0,
            clientWidth:
              document.querySelector<HTMLElement>('.m0-paper-viewport')?.clientWidth ?? 0,
            clientHeight:
              document.querySelector<HTMLElement>('.m0-paper-viewport')?.clientHeight ?? 0,
          }
        : null,
      experienceLayout: document.querySelector<HTMLElement>('[data-m0-section="experience"]')
        ? {
            offsetTop: document.querySelector<HTMLElement>('[data-m0-section="experience"]')
              ?.offsetTop,
            offsetHeight: document.querySelector<HTMLElement>('[data-m0-section="experience"]')
              ?.offsetHeight,
          }
        : null,
      theme: document.querySelector('.m0-app')?.className ?? null,
      fontScale: document.querySelector('.m0-app')?.getAttribute('data-font-scale') ?? null,
      activeElement: document.activeElement?.tagName.toLowerCase() ?? null,
    };
  }, scenario);
