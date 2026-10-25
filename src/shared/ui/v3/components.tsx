import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { Dialog } from '@base-ui/react/dialog';
import { type CSSProperties, type ReactNode, useId } from 'react';

import styles from './components.module.css';

export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'award'
  | 'book'
  | 'briefcase'
  | 'check'
  | 'chevron-down'
  | 'close'
  | 'command'
  | 'download'
  | 'eye'
  | 'globe'
  | 'layers'
  | 'moon'
  | 'move-down'
  | 'move-up'
  | 'plus'
  | 'spark'
  | 'sun'
  | 'user';

const iconPaths: Record<IconName, ReactNode> = {
  'arrow-left': <path d="m14 18-6-6 6-6M8 12h12" />,
  'arrow-right': <path d="M4 12h12m-6-6 6 6-6 6" />,
  award: (
    <>
      <circle cx="12" cy="8" r="6" />
      <path d="m8.2 13-1.1 8 4.9-2.7 4.9 2.7-1.1-8" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z" />
      <path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  close: <path d="m18 6-12 12M6 6l12 12" />,
  command: (
    <>
      <path d="M9 8V5a2.5 2.5 0 1 0-2.5 2.5H9Zm0 0v8m0-8h6m-6 8v3a2.5 2.5 0 1 1-2.5-2.5H9Zm6-8V5a2.5 2.5 0 1 1 2.5 2.5H15Zm0 0v8m0 0v3a2.5 2.5 0 1 0 2.5-2.5H15Zm0 0H9" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5" />
      <path d="M5 17v3h14v-3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20m0-20a15 15 0 0 0 0 20" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />,
  'move-down': (
    <>
      <path d="M12 3v14m-6-6 6 6 6-6" />
      <path d="M5 21h14" />
    </>
  ),
  'move-up': (
    <>
      <path d="M12 21V7m6 6-6-6-6 6" />
      <path d="M5 3h14" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  spark: (
    <>
      <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
      <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

export function StudioIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name]}
    </svg>
  );
}

export function StudioButton({
  className = '',
  variant = 'secondary',
  type = 'button',
  ...props
}: ButtonPrimitive.Props & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
}) {
  const buttonClassName = (state: ButtonPrimitive.State) =>
    `${styles.button} ${styles[variant]} ${
      typeof className === 'function' ? (className(state) ?? '') : className
    }`.trim();

  return <ButtonPrimitive className={buttonClassName} data-slot="button" type={type} {...props} />;
}

interface StudioFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  as?: 'input' | 'textarea';
  type?: 'text' | 'email' | 'url';
  rows?: number;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
}

export function StudioField({
  label,
  value,
  onChange,
  as = 'input',
  type = 'text',
  rows = 5,
  required = false,
  error,
  hint,
  placeholder,
  autoComplete,
  className = '',
}: StudioFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ');

  return (
    <div className={`${styles.field} ${className}`.trim()}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
        {required && <span className={styles.requiredMark}>*</span>}
      </label>
      {as === 'textarea' ? (
        <textarea
          aria-describedby={describedBy || undefined}
          aria-invalid={Boolean(error)}
          className={styles.control}
          id={id}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          value={value}
        />
      ) : (
        <input
          aria-describedby={describedBy || undefined}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className={styles.control}
          id={id}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={placeholder}
          required={required}
          type={type}
          value={value}
        />
      )}
      {hint && (
        <span className={styles.fieldHint} id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className={styles.fieldError} id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

interface StudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  closeLabel: string;
  kind?: 'standard' | 'editor' | 'command';
  container: HTMLElement | null;
  children: ReactNode;
  style?: CSSProperties;
  labelledBy?: string;
  finalFocus: () => HTMLElement | true;
}

export function StudioDialog({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  kind = 'standard',
  container,
  children,
  style,
  finalFocus,
}: StudioDialogProps) {
  const titleId = useId();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop className={styles.dialogBackdrop} />
        <Dialog.Viewport className={styles.dialogViewport} data-kind={kind}>
          <Dialog.Popup
            aria-modal="true"
            finalFocus={finalFocus}
            aria-labelledby={titleId}
            className={styles.dialogPopup}
            data-kind={kind}
            style={style}
          >
            <header className={styles.dialogHeader}>
              <div>
                <Dialog.Title className={styles.dialogTitle} id={titleId}>
                  {title}
                </Dialog.Title>
                <Dialog.Description className={styles.dialogDescription}>
                  {description}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label={closeLabel} className={styles.dialogClose}>
                <StudioIcon name="close" />
              </Dialog.Close>
            </header>
            <div className={styles.dialogBody}>{children}</div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
