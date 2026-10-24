import type { MobileView } from '@entities/ui';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

type Destination = 'editor' | 'modules' | 'templates' | 'preview';
type Panel = 'modules' | 'templates';

type UseEditorWorkspaceNavigationOptions = {
  isLargeScreen: boolean;
  modulePanelOpen: boolean;
  templatePanelOpen: boolean;
  mobileView: MobileView;
  toggleWorkspacePanel: (panel: Panel) => boolean;
  resetPanels: () => void;
  setMobileView: (view: MobileView) => void;
  editorScrollContainerRef: RefObject<HTMLDivElement | null>;
  previewScrollContainerRef: RefObject<HTMLDivElement | null>;
};

const prefersReducedMotion = () =>
  typeof globalThis.matchMedia === 'function' &&
  globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useEditorWorkspaceNavigation = ({
  isLargeScreen,
  modulePanelOpen,
  templatePanelOpen,
  mobileView,
  toggleWorkspacePanel,
  resetPanels,
  setMobileView,
  editorScrollContainerRef,
  previewScrollContainerRef,
}: UseEditorWorkspaceNavigationOptions) => {
  const [activePane, setActivePane] = useState<'editor' | 'preview'>('editor');
  const requestVersion = useRef(0);
  const pendingFrame = useRef<number | null>(null);
  const pendingTemplateVersion = useRef<number | null>(null);

  useEffect(
    () => () => {
      requestVersion.current += 1;
      pendingTemplateVersion.current = null;
      if (pendingFrame.current !== null) {
        globalThis.cancelAnimationFrame(pendingFrame.current);
        pendingFrame.current = null;
      }
    },
    [],
  );

  const beginNavigation = useCallback(() => {
    requestVersion.current += 1;
    pendingTemplateVersion.current = null;
    if (pendingFrame.current !== null) {
      globalThis.cancelAnimationFrame(pendingFrame.current);
      pendingFrame.current = null;
    }
    return requestVersion.current;
  }, []);

  const focusAndReveal = useCallback(
    (id: string, version: number) => {
      if (pendingFrame.current !== null) globalThis.cancelAnimationFrame(pendingFrame.current);
      pendingFrame.current = globalThis.requestAnimationFrame(() => {
        pendingFrame.current = null;
        if (version !== requestVersion.current) return;
        const target = document.querySelector<HTMLElement>(`#${id}`);
        if (!target || !target.isConnected || target.getClientRects().length === 0) return;

        const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
        if (id === 'production-preview-pane' && isLargeScreen) {
          target.focus({ preventScroll: true });
          return;
        }
        const editorRoot = target.closest('.production-editor-pane');
        const editorScroll = editorRoot ? editorScrollContainerRef.current : null;
        const hasInternalScroll =
          editorScroll !== null && editorScroll.scrollHeight > editorScroll.clientHeight + 1;

        target.focus({ preventScroll: true });
        if (hasInternalScroll && editorScroll) {
          const targetTop = target.getBoundingClientRect().top;
          const scrollTop = editorScroll.getBoundingClientRect().top + editorScroll.clientTop;
          editorScroll.scrollTo({
            top: Math.max(0, editorScroll.scrollTop + targetTop - scrollTop),
            behavior,
          });
          return;
        }

        const topbar = document.querySelector<HTMLElement>('.production-topbar');
        const topbarBottom = topbar ? Math.max(topbar.getBoundingClientRect().bottom, 0) : 0;
        const visibleTop = topbarBottom + 12;
        const targetTop = target.getBoundingClientRect().top + globalThis.scrollY;
        globalThis.scrollTo({ top: Math.max(0, targetTop - visibleTop), behavior });
      });
    },
    [editorScrollContainerRef, isLargeScreen],
  );

  const navigateToEditor = useCallback(() => {
    const version = beginNavigation();
    resetPanels();
    setActivePane('editor');
    if (!isLargeScreen) setMobileView('editor');
    focusAndReveal('production-personal-section', version);
  }, [beginNavigation, focusAndReveal, isLargeScreen, resetPanels, setMobileView]);

  const toggleModulesFromNavigation = useCallback(() => {
    const version = beginNavigation();
    const isOpen = toggleWorkspacePanel('modules');
    setActivePane('editor');
    if (!isLargeScreen) setMobileView('editor');
    if (isOpen) focusAndReveal('production-modules-navigation-target', version);
  }, [beginNavigation, focusAndReveal, isLargeScreen, setMobileView, toggleWorkspacePanel]);

  const toggleTemplatesFromNavigation = useCallback(() => {
    const version = beginNavigation();
    const isOpen = toggleWorkspacePanel('templates');
    setActivePane('editor');
    if (!isLargeScreen) setMobileView('editor');
    if (isOpen) pendingTemplateVersion.current = version;
  }, [beginNavigation, isLargeScreen, setMobileView, toggleWorkspacePanel]);

  const handleTemplatePanelReady = useCallback(() => {
    const version = pendingTemplateVersion.current;
    if (version === null || version !== requestVersion.current || !templatePanelOpen) {
      return;
    }
    pendingTemplateVersion.current = null;
    focusAndReveal('production-template-panel', version);
  }, [focusAndReveal, templatePanelOpen]);

  const navigateToPreview = useCallback(() => {
    const version = beginNavigation();
    if (!isLargeScreen) {
      setMobileView('preview');
      pendingFrame.current = globalThis.requestAnimationFrame(() => {
        pendingFrame.current = null;
        if (version !== requestVersion.current) return;
        globalThis.scrollTo({
          top: 0,
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
      });
      return;
    }

    resetPanels();
    setActivePane('preview');
    const frame = globalThis.requestAnimationFrame(() => {
      pendingFrame.current = null;
      if (version !== requestVersion.current) return;
      previewScrollContainerRef.current?.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
      focusAndReveal('production-preview-pane', version);
    });
    pendingFrame.current = frame;
  }, [
    beginNavigation,
    focusAndReveal,
    isLargeScreen,
    previewScrollContainerRef,
    resetPanels,
    setMobileView,
  ]);

  const returnToMobileEditor = useCallback(() => {
    const version = beginNavigation();
    if (isLargeScreen) {
      resetPanels();
      setActivePane('editor');
      focusAndReveal('production-personal-section', version);
      return;
    }

    setMobileView('editor');
    pendingFrame.current = globalThis.requestAnimationFrame(() => {
      pendingFrame.current = null;
      if (version !== requestVersion.current) return;
      globalThis.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    });
  }, [beginNavigation, focusAndReveal, isLargeScreen, resetPanels, setMobileView]);

  let currentDestination: Destination = activePane;
  if (isLargeScreen) {
    if (modulePanelOpen) currentDestination = 'modules';
    else if (templatePanelOpen) currentDestination = 'templates';
  } else if (mobileView === 'preview') {
    currentDestination = 'preview';
  } else if (modulePanelOpen) {
    currentDestination = 'modules';
  } else if (templatePanelOpen) {
    currentDestination = 'templates';
  } else {
    currentDestination = 'editor';
  }

  return {
    currentDestination,
    navigateToEditor,
    toggleModulesFromNavigation,
    toggleTemplatesFromNavigation,
    navigateToPreview,
    returnToMobileEditor,
    handleTemplatePanelReady,
  };
};

export type UseEditorWorkspaceNavigationResult = ReturnType<typeof useEditorWorkspaceNavigation>;
