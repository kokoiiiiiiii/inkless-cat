import { isBrowser } from '@shared/lib/storage';
import { useCallback, useEffect, useRef } from 'react';

type SectionRefMap = Map<string, HTMLElement>;

type UseScrollSyncParams = {
  activeSections: string[];
};

export const useScrollSync = ({ activeSections }: UseScrollSyncParams) => {
  const editorScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previewScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previewRefs = useRef<SectionRefMap>(new Map());
  const editorSectionRefs = useRef<SectionRefMap>(new Map());

  useEffect(() => {
    const editorEl = editorScrollContainerRef.current;
    const previewEl = previewScrollContainerRef.current;
    if (!editorEl || !previewEl) return;

    let pendingFrame: number | null = null;

    const syncScroll = () => {
      const editor = editorScrollContainerRef.current;
      const preview = previewScrollContainerRef.current;
      if (!editor || !preview) {
        return;
      }

      const editorMaxScroll = Math.max(editor.scrollHeight - editor.clientHeight, 0);
      const previewMaxScroll = Math.max(preview.scrollHeight - preview.clientHeight, 0);

      if (editorMaxScroll === 0) {
        if (preview.scrollTop !== 0) {
          preview.scrollTo({ top: 0, behavior: 'auto' });
        }
        return;
      }

      const isEditorAtBottom = editor.scrollTop >= editorMaxScroll - 4;
      if (isEditorAtBottom) {
        preview.scrollTo({ top: previewMaxScroll, behavior: 'auto' });
        return;
      }

      const orderedKeys = ['personal', ...activeSections];
      const sectionKeys = orderedKeys.filter(
        (key) =>
          editorSectionRefs.current.has(key) && previewRefs.current.has(`${key}:__section__`),
      );

      if (sectionKeys.length === 0) {
        const ratio = editorMaxScroll > 0 ? editor.scrollTop / editorMaxScroll : 0;
        const target = previewMaxScroll > 0 ? ratio * previewMaxScroll : 0;
        preview.scrollTo({ top: target, behavior: 'auto' });
        return;
      }

      const editorStarts: number[] = [];
      const previewStarts: number[] = [];
      const editorHeights: number[] = [];
      const previewHeights: number[] = [];

      for (const key of sectionKeys) {
        const editorNode = editorSectionRefs.current.get(key);
        const previewNode = previewRefs.current.get(`${key}:__section__`);
        editorStarts.push(editorNode ? editorNode.offsetTop : 0);
        previewStarts.push(previewNode ? previewNode.offsetTop : 0);
        editorHeights.push(editorNode ? editorNode.offsetHeight : 0);
        previewHeights.push(previewNode ? previewNode.offsetHeight : 0);
      }

      const editorScrollTop = editor.scrollTop;
      let targetTop = 0;

      for (let index = 0; index < sectionKeys.length; index += 1) {
        const sectionStart = editorStarts[index];
        const editorHeight = editorHeights[index];
        const previewStart = previewStarts[index];
        const previewHeight = previewHeights[index];

        if (
          sectionStart === undefined ||
          editorHeight === undefined ||
          previewStart === undefined ||
          previewHeight === undefined
        ) {
          continue;
        }

        const sectionEnd = sectionStart + editorHeight;

        if (editorScrollTop < sectionEnd || index === sectionKeys.length - 1) {
          const sectionProgress =
            editorHeight > 0 ? (editorScrollTop - sectionStart) / editorHeight : 0;
          targetTop = previewStart + sectionProgress * previewHeight;
          break;
        }
      }

      preview.scrollTo({ top: targetTop, behavior: 'auto' });
    };

    const handleScroll = () => {
      if (pendingFrame === null) {
        pendingFrame = globalThis.requestAnimationFrame(() => {
          pendingFrame = null;
          syncScroll();
        });
      }
    };

    editorEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      editorEl.removeEventListener('scroll', handleScroll);
      if (pendingFrame !== null) {
        globalThis.cancelAnimationFrame(pendingFrame);
        pendingFrame = null;
      }
    };
  }, [activeSections]);

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
