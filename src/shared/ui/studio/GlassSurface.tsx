import type { HTMLAttributes } from 'react';

type GlassSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  as?: 'div' | 'header' | 'aside' | 'section' | 'nav';
  tone?: 'soft' | 'strong';
};

export const GlassSurface = ({
  as: Component = 'div',
  className = '',
  tone = 'soft',
  ...props
}: GlassSurfaceProps) => (
  <Component
    className={`studio-glass studio-glass--${tone} ${className}`.trim()}
    data-glass-layer="true"
    {...props}
  />
);
