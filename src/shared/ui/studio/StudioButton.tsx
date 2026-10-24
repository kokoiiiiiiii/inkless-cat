import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type StudioButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

type StudioButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: StudioButtonVariant;
};

export const StudioButton = ({
  children,
  className = '',
  type = 'button',
  variant = 'secondary',
  ...props
}: StudioButtonProps) => (
  <button
    className={`studio-button studio-button--${variant} ${className}`.trim()}
    type={type}
    {...props}
  >
    {children}
  </button>
);

type StudioIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

export const StudioIconButton = ({
  children,
  className = '',
  label,
  type = 'button',
  ...props
}: StudioIconButtonProps) => (
  <button
    aria-label={label}
    className={`studio-icon-button ${className}`.trim()}
    title={label}
    type={type}
    {...props}
  >
    {children}
  </button>
);
