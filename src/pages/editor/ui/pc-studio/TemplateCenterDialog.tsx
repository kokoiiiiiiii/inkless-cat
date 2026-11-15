import type { ResumeTemplate, TemplateUpdatePayload } from '@entities/template';
import { useI18n } from '@shared/i18n';
import { TemplateSelector } from '@widgets/template-selector';
import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

type TemplateCenterDialogProps = {
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  builtInTemplates: ResumeTemplate[];
  customTemplates: ResumeTemplate[];
  activeTemplateId: string;
  onClose: () => void;
  onStyleChange: (template: ResumeTemplate) => void;
  onLoadSample: (template: ResumeTemplate) => void;
  onSaveTemplate: (payload: TemplateUpdatePayload) => void;
  onDeleteTemplate: (templateId: string) => void;
  onUpdateTemplate: (templateId: string, updates: TemplateUpdatePayload) => void;
};

const focusableSelector =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const TemplateCenterDialog = ({
  open,
  triggerRef,
  builtInTemplates,
  customTemplates,
  activeTemplateId,
  onClose,
  onStyleChange,
  onLoadSample,
  onSaveTemplate,
  onDeleteTemplate,
  onUpdateTemplate,
}: TemplateCenterDialogProps) => {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing && event.keyCode !== 229) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(
        (element) => element.offsetParent !== null,
      );
      const first = elements[0];
      const last = elements.at(-1);
      if (!first || !last) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [onClose, open, triggerRef]);

  if (!open) return null;

  return (
    <div
      className="pc-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="pc-template-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-template-title"
        aria-describedby="pc-template-description"
      >
        <header className="pc-template-dialog-header">
          <div>
            <span className="pc-eyebrow">{t('editor.pcStudio.template')}</span>
            <h2 id="pc-template-title">{t('editor.pcStudio.templateTitle')}</h2>
            <p id="pc-template-description">
              {t('editor.pcStudio.currentTemplate')}:{' '}
              {[...builtInTemplates, ...customTemplates].find(
                (item) => item.id === activeTemplateId,
              )?.name ?? activeTemplateId}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="pc-panel-close"
            onClick={onClose}
            aria-label={t('editor.pcStudio.close')}
          >
            ×
          </button>
        </header>
        <div className="pc-template-dialog-content">
          <TemplateSelector
            builtInTemplates={builtInTemplates}
            customTemplates={customTemplates}
            activeId={activeTemplateId}
            onStyleChange={onStyleChange}
            onLoadSample={onLoadSample}
            onSaveTemplate={onSaveTemplate}
            onDeleteTemplate={onDeleteTemplate}
            onUpdateTemplate={onUpdateTemplate}
          />
        </div>
      </div>
    </div>
  );
};

export default TemplateCenterDialog;
