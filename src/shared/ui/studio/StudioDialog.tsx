import { type ReactNode, useEffect, useRef } from 'react';

import { StudioIcon } from './StudioIcon';

type StudioDialogProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export const StudioDialog = ({ children, onClose, open, title }: StudioDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-dialog-autofocus]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      aria-labelledby="studio-dialog-title"
      className="studio-dialog studio-glass"
      data-glass-layer="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
        requestAnimationFrame(() => returnFocusRef.current?.focus());
      }}
      ref={dialogRef}
    >
      <div className="studio-dialog__heading">
        <span className="studio-dialog__eyebrow">INKLESS CAT STUDIO</span>
        <button
          aria-label="关闭弹窗"
          className="studio-icon-button"
          onClick={onClose}
          type="button"
        >
          <StudioIcon name="close" />
        </button>
      </div>
      <h2 id="studio-dialog-title">{title}</h2>
      <div className="studio-dialog__body">{children}</div>
    </dialog>
  );
};
