import type { HTMLAttributes, ReactNode } from 'react';

type StudioCardProps = HTMLAttributes<HTMLElement> & {
  as?: 'article' | 'section' | 'div';
  children: ReactNode;
  inset?: 'comfortable' | 'compact';
};

export const StudioCard = ({
  as: Component = 'section',
  children,
  className = '',
  inset = 'comfortable',
  ...props
}: StudioCardProps) => (
  <Component className={`studio-card studio-card--${inset} ${className}`.trim()} {...props}>
    {children}
  </Component>
);
