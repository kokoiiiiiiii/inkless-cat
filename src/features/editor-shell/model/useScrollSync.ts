import type { ResumeData } from '@entities/resume';
import { isBrowser } from '@shared/lib/storage';
import { useCallback, useEffect, useRef } from 'react';

type SectionRefMap = Map<string, HTMLElement>;

type UseScrollSyncParams = {
  activeSections: string[];
  resume: ResumeData;
};

export const useScrollSync = ({ activeSections, resume }: UseScrollSyncParams) => {
  const editorScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previewScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previewRefs = useRef<SectionRefMap>(new Map());
  const editorSectionRefs = useRef<SectionRefMap>(new Map());

  useEffect(() => {
    const editorEl = editorScrollContainerRef.current;
    const previewEl = previewScrollContainerRef.current;
    if (!editorEl || !previewEl) return;

    let ticking = false;

    const syncScroll = () => {
      const editor = editorScrollContainerRef.current;
      const preview = previewScrollContainerRef.current;
      if (!editor || !preview) {
        ticking = false;
        return;
      }

      const orderedKeys = ['personal', ...activeSections];
      const sectionKeys = orderedKeys.filter(
        (key) =>
          editorSectionRefs.current.has(key) && previewRefs.current.has(`${key}:__section__`),
      );

      if (sectionKeys.length === 0) {
        const editorScrollable = editor.scrollHeight - editor.clientHeight;
        const previewScrollable = preview.scrollHeight - preview.clientHeight;
        const ratio = editorScrollable > 0 ? editor.scrollTop / editorScrollable : 0;
        const target = previewScrollable > 0 ? ratio * previewScrollable : 0;
        preview.scrollTo({ top: target, behavior: 'auto' });
        ticking = false;
        return;
      }

      const editorHeights: number[] = [];
      const previewHeights: number[] = [];

      for (const key of sectionKeys) {
        const editorNode = editorSectionRefs.current.get(key);
        const previewNode = previewRefs.current.get(`${key}:__section__`);
        editorHeights.push(editorNode ? editorNode.offsetHeight : 0);
        previewHeights.push(previewNode ? previewNode.offsetHeight : 0);
      }

      let editorAccum = 0;
      let previewAccum = 0;
      const editorScrollTop = editor.scrollTop;
      let targetTop = 0;

      for (let index = 0; index < sectionKeys.length; index += 1) {
        const editorHeight = editorHeights[index];
        const previewHeight = previewHeights[index];
        const sectionStart = editorAccum;
        const sectionEnd = sectionStart + editorHeight;
        if (editorScrollTop < sectionEnd || index === sectionKeys.length - 1) {
          const sectionProgress =
            editorHeight > 0 ? (editorScrollTop - sectionStart) / editorHeight : 0;
          targetTop = previewAccum + sectionProgress * previewHeight;
          break;
        }
        editorAccum += editorHeight;
        previewAccum += previewHeight;
      }

      preview.scrollTo({ top: targetTop, behavior: 'auto' });
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        globalThis.requestAnimationFrame(syncScroll);
        ticking = true;
      }
    };

    editorEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      editorEl.removeEventListener('scroll', handleScroll);
    };
  }, [resume, activeSections]);

  const registerPreviewRef = useCallback(
    (sectionKey: string, itemKey: string, node: HTMLElement | null) => {
      const key = `${sectionKey}:${itemKey}`;
      if (node) {
        previewRefs.current.set(key, node);
      } else {
        previewRefs.current.delete(key);
      }
    },
    [],
  );

  const registerEditorSectionRef = useCallback((sectionKey: string, node: HTMLElement | null) => {
    if (node) {
      editorSectionRefs.current.set(sectionKey, node);
    } else {
      editorSectionRefs.current.delete(sectionKey);
    }
  }, []);

  const handleFieldFocus = useCallback((sectionKey: string, itemKey: string) => {
    if (!isBrowser) return;
    const keysToTry = [];
    if (itemKey) {
      keysToTry.push(`${sectionKey}:${itemKey}`);
    }
    keysToTry.push(`${sectionKey}:__section__`);
    const targetNode = keysToTry.map((key) => previewRefs.current.get(key)).find(Boolean);
    if (!targetNode) return;
    globalThis.requestAnimationFrame(() => {
      if (typeof targetNode.scrollIntoView === 'function') {
        targetNode.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
      const toolbarHeight = 96;
      const targetTop = targetNode.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(targetTop - toolbarHeight, 0),
        behavior: 'smooth',
      });
    });
  }, []);

  return {
    editorScrollContainerRef,
    previewScrollContainerRef,
    registerPreviewRef,
    registerEditorSectionRef,
    handleFieldFocus,
  };
};
