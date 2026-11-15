import { getCustomSectionKey, sectionOrder } from '@entities/module';
import { useResumeStore, type ActiveSectionKey } from '@entities/resume';
import { useI18n } from '@shared/i18n';
import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { UseEditorPageControllerResult } from '../useEditorPageController';
import {
  createStudioFieldContext,
  type StudioFieldContextData,
  type StudioFieldIdentity,
  type StudioModuleKey,
  type StudioSelectionRange,
} from './fieldContext';

export type { StudioModuleKey } from './fieldContext';

export type StudioFieldContext = StudioFieldContextData & { fieldLabel: string };

const readSelectionRange = (target: EventTarget | null): StudioSelectionRange | null => {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return null;

  try {
    const { selectionStart, selectionEnd, selectionDirection } = target;
    if (selectionStart === null || selectionEnd === null) return null;
    return {
      start: selectionStart,
      end: selectionEnd,
      direction: selectionDirection ?? 'none',
    };
  } catch {
    return null;
  }
};

const isSelectionField = (
  element: HTMLElement,
): element is HTMLInputElement | HTMLTextAreaElement =>
  element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement;

const getModuleKey = (sectionKey: string): StudioModuleKey | null => {
  if (sectionKey === 'summary') return 'personal';
  if (
    sectionKey === 'personal' ||
    sectionOrder.includes(sectionKey as (typeof sectionOrder)[number])
  ) {
    return sectionKey as StudioModuleKey;
  }
  if (sectionKey.startsWith('custom:')) return sectionKey as ActiveSectionKey;
  return null;
};

export const usePCStudioController = (editor: UseEditorPageControllerResult) => {
  const { t } = useI18n();
  const [activeModule, setActiveModule] = useState<StudioModuleKey>('personal');
  const [focusedField, setFocusedField] = useState<StudioFieldIdentity | null>(null);
  const [aiOpen, setAIopen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [previewFocus, setPreviewFocus] = useState(false);
  const [compactMode, setCompactMode] = useState<'edit' | 'preview'>('edit');
  const [selectionRange, setSelectionRange] = useState<StudioSelectionRange | null>(null);
  const sourceRevision = useResumeStore((state) => state.workspaceRevision);
  const workspaceGeneration = useResumeStore((state) => state.workspaceGeneration);
  const selectionRangeRef = useRef<StudioSelectionRange | null>(null);
  const focusedFieldRef = useRef<StudioFieldIdentity | null>(null);
  const editorScrollSnapshotRef = useRef<{ top: number; left: number } | null>(null);
  const pendingFocusRestoreRef = useRef(false);

  const updateSelectionRange = useCallback((next: StudioSelectionRange | null) => {
    selectionRangeRef.current = next;
    setSelectionRange(next);
  }, []);

  const moduleTitle = useCallback(
    (key: StudioModuleKey) => {
      if (key === 'personal') return t('modules.personal.title');
      if (key.startsWith('custom:')) {
        const id = key.slice('custom:'.length);
        return (
          editor.resume.customSections?.find((item) => item.id === id)?.title ||
          t('modules.customSection.defaultTitle')
        );
      }
      return t(`modules.sections.${key}`);
    },
    [editor.resume.customSections, t],
  );

  const fieldLabelFor = useCallback(
    (sectionKey: string, fieldId: string) => {
      if (fieldId === 'personal.summary') return t('modules.personal.fields.summary.label');
      if (fieldId === 'personal.title') return t('editor.pcStudio.targetRole');
      if (fieldId === 'personal.fullName') return t('modules.personal.fields.fullName.label');
      if (fieldId === 'personal.email') return t('modules.personal.fields.email.label');
      if (fieldId === 'personal.phone') return t('modules.personal.fields.phone.label');
      if (fieldId === 'personal.location') return t('modules.personal.fields.location.label');
      if (fieldId.startsWith('personal.extras.')) {
        return fieldId.endsWith('.label')
          ? t('modules.personal.extras.label.label')
          : t('modules.personal.extras.value.label');
      }

      const fieldName = fieldId.split('.').at(-1) ?? fieldId;
      if (fieldName === 'highlights') {
        return sectionKey === 'projects'
          ? t('editor.pcStudio.projectHighlights')
          : t('editor.pcStudio.experienceHighlights');
      }
      if (sectionKey === 'projects' && fieldName === 'summary') {
        return t('editor.pcStudio.projectSummary');
      }
      const labelKey = `modules.resume.labels.${fieldName}`;
      const resolvedLabel = t(labelKey);
      return resolvedLabel === labelKey ? fieldName : resolvedLabel;
    },
    [t],
  );

  const fieldContext = useMemo<StudioFieldContext | null>(() => {
    if (!focusedField) return null;
    const context = createStudioFieldContext(editor.resume, focusedField, {
      sourceRevision,
      workspaceGeneration,
      selectionRange,
    });
    return {
      ...context,
      fieldLabel: fieldLabelFor(context.sectionKey, context.fieldId),
    };
  }, [
    editor.resume,
    fieldLabelFor,
    focusedField,
    selectionRange,
    sourceRevision,
    workspaceGeneration,
  ]);

  const modules = useMemo(
    () => [
      { key: 'personal' as const, label: moduleTitle('personal'), count: 0 },
      ...sectionOrder.map((key) => ({
        key,
        label: moduleTitle(key),
        count: Array.isArray(editor.resume[key]) ? editor.resume[key].length : 0,
      })),
      ...(editor.resume.customSections ?? []).map((section) => ({
        key: getCustomSectionKey(section.id),
        label: section.title || t('modules.customSection.defaultTitle'),
        count:
          section.mode === 'fields'
            ? (section.fields?.length ?? 0)
            : section.mode === 'list'
              ? (section.items?.length ?? 0)
              : Number(Boolean(section.text)),
      })),
    ],
    [editor.resume, moduleTitle, t],
  );

  const handleFieldFocus = useCallback(
    (sectionKey: string, itemKey: string, fieldPath?: string) => {
      editor.modulesPanelController.notifyFocus(sectionKey, itemKey, fieldPath);
      const moduleKey = getModuleKey(sectionKey);
      if (!moduleKey) return;

      const nextField: StudioFieldIdentity = {
        moduleKey,
        sectionKey,
        fieldId:
          fieldPath ?? (sectionKey === 'summary' ? 'personal.summary' : sectionKey + '.' + itemKey),
        itemKey: sectionKey === 'summary' ? 'personal' : itemKey,
      };
      focusedFieldRef.current = nextField;
      setActiveModule(moduleKey);
      setFocusedField(nextField);
      const range = readSelectionRange(document.activeElement);
      updateSelectionRange(range);
    },
    [editor.modulesPanelController, updateSelectionRange],
  );

  const captureEditorSelection = useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      const range = readSelectionRange(event.target);
      if (range) updateSelectionRange(range);
    },
    [updateSelectionRange],
  );

  const restoreEditorFocus = useCallback(() => {
    const scrollContainer = editor.editorScrollContainerRef.current;
    const snapshot = editorScrollSnapshotRef.current;
    if (scrollContainer && snapshot) {
      scrollContainer.scrollTop = snapshot.top;
      scrollContainer.scrollLeft = snapshot.left;
    }
    editorScrollSnapshotRef.current = null;

    const fieldId = focusedFieldRef.current?.fieldId;
    if (!scrollContainer || !fieldId) return;
    const field = [...scrollContainer.querySelectorAll<HTMLElement>('[data-studio-field-id]')].find(
      (candidate) => candidate.dataset.studioFieldId === fieldId,
    );
    if (!field) return;

    field.focus({ preventScroll: true });
    const range = selectionRangeRef.current;
    if (range && isSelectionField(field)) {
      try {
        field.setSelectionRange(range.start, range.end, range.direction);
      } catch {
        // Some input types do not support text selection.
      }
    }
  }, [editor.editorScrollContainerRef]);

  useLayoutEffect(() => {
    if (previewFocus || compactMode === 'preview' || !pendingFocusRestoreRef.current) return;
    pendingFocusRestoreRef.current = false;
    restoreEditorFocus();
  }, [previewFocus, compactMode, focusedField, restoreEditorFocus]);

  const captureEditorReturnState = useCallback(() => {
    const activeRange = readSelectionRange(document.activeElement);
    if (activeRange) updateSelectionRange(activeRange);
    const scrollContainer = editor.editorScrollContainerRef.current;
    if (!scrollContainer) return;
    editorScrollSnapshotRef.current = {
      top: scrollContainer.scrollTop,
      left: scrollContainer.scrollLeft,
    };
    pendingFocusRestoreRef.current = true;
  }, [editor.editorScrollContainerRef, updateSelectionRange]);

  const enterPreviewFocus = useCallback(() => {
    if (previewFocus) return;
    captureEditorReturnState();
    setAIopen(false);
    setCompactMode('preview');
    setPreviewFocus(true);
  }, [captureEditorReturnState, previewFocus]);

  const enterCompactPreview = useCallback(() => {
    captureEditorReturnState();
    setCompactMode('preview');
  }, [captureEditorReturnState]);

  const exitPreviewFocus = useCallback(() => {
    if (!previewFocus) return;
    setCompactMode('edit');
    setPreviewFocus(false);
  }, [previewFocus]);

  useEffect(() => {
    if (!previewFocus) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing || event.keyCode === 229) {
        return;
      }
      event.preventDefault();
      exitPreviewFocus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [exitPreviewFocus, previewFocus]);

  const modulesController = useMemo(
    () => ({ ...editor.modulesPanelController, notifyFocus: handleFieldFocus }),
    [editor.modulesPanelController, handleFieldFocus],
  );

  const selectModule = useCallback(
    (key: StudioModuleKey) => {
      pendingFocusRestoreRef.current = false;
      focusedFieldRef.current = null;
      setActiveModule(key);
      setFocusedField(null);
      updateSelectionRange(null);
      setCompactMode('edit');
      setPreviewFocus(false);
    },
    [updateSelectionRange],
  );

  const openAI = useCallback(() => {
    if (previewFocus || compactMode === 'preview') pendingFocusRestoreRef.current = true;
    setPreviewFocus(false);
    setCompactMode('edit');
    setAIopen(true);
  }, [compactMode, previewFocus]);

  const closeAI = useCallback((returnToPreview = false) => {
    setAIopen(false);
    if (returnToPreview) setCompactMode('preview');
  }, []);

  return {
    ...editor,
    activeModule,
    fieldContext,
    modules,
    moduleTitle,
    modulesController,
    selectModule,
    captureEditorSelection,
    aiOpen,
    openAI,
    closeAI,
    templateOpen,
    setTemplateOpen,
    previewFocus,
    enterPreviewFocus,
    exitPreviewFocus,
    enterCompactPreview,
    selectionRange,
    compactMode,
    setCompactMode,
  };
};
