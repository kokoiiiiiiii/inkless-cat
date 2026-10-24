import type { SVGProps } from 'react';

export type StudioIconName =
  | 'file'
  | 'layers'
  | 'palette'
  | 'sparkles'
  | 'settings'
  | 'moon'
  | 'sun'
  | 'arrow-up'
  | 'arrow-down'
  | 'check'
  | 'close'
  | 'plus'
  | 'minus'
  | 'chevron-down'
  | 'menu'
  | 'eye'
  | 'shield'
  | 'info';

type StudioIconProps = SVGProps<SVGSVGElement> & {
  name: StudioIconName;
};

const paths: Record<StudioIconName, string> = {
  file: 'M7 3.75h6l4.25 4.25v12.25H7z M13 3.75V8h4.25 M9.5 12h5 M9.5 15h5',
  layers: 'm12 3.5 8 4.25-8 4.25-8-4.25z M4 11.5l8 4.25 8-4.25 M4 15.5l8 4.25 8-4.25',
  palette:
    'M12 3.5a8.5 8.5 0 1 0 0 17h1.2a2.3 2.3 0 0 0 1.7-3.8 1.6 1.6 0 0 1 1.2-2.7h.8a3.6 3.6 0 0 0 3.6-3.6A8.5 8.5 0 0 0 12 3.5z M8 10h.01 M11.5 7.5h.01 M15.5 9h.01 M8.5 14.5h.01',
  sparkles:
    'm12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3z M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z M5 3l.6 2L7.5 5.5l-1.9.6L5 8l-.6-1.9-1.9-.6L4.4 5z',
  settings:
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M19.2 13.8a7.3 7.3 0 0 0 0-3.6l2-1.2-2-3.4-2.2 1a7.6 7.6 0 0 0-3.1-1.8L13.5 2h-4l-.4 2.8A7.6 7.6 0 0 0 6 6.6l-2.2-1-2 3.4 2 1.2a7.3 7.3 0 0 0 0 3.6l-2 1.2 2 3.4 2.2-1a7.6 7.6 0 0 0 3.1 1.8l.4 2.8h4l.4-2.8a7.6 7.6 0 0 0 3.1-1.8l2.2 1 2-3.4z',
  moon: 'M20 15.3A8.5 8.5 0 0 1 8.7 4 8.5 8.5 0 1 0 20 15.3z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2.5v2 M12 19.5v2 M4.5 12h-2 M21.5 12h-2 M5.3 5.3l1.4 1.4 M17.3 17.3l1.4 1.4 M18.7 5.3l-1.4 1.4 M6.7 17.3l-1.4 1.4',
  'arrow-up': 'm7 13 5-5 5 5 M12 8v11',
  'arrow-down': 'm7 11 5 5 5-5 M12 16V5',
  check: 'm5 12.5 4.2 4.2L19 7',
  close: 'm6 6 12 12M18 6 6 18',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  'chevron-down': 'm6 9 6 6 6-6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  eye: 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  shield: 'M12 3 19 6v5c0 4.7-3 8-7 10-4-2-7-5.3-7-10V6z M9 12l2 2 4-4',
  info: 'M12 11v5 M12 8h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
};

export const StudioIcon = ({ name, ...props }: StudioIconProps) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height="20"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.65"
    viewBox="0 0 24 24"
    width="20"
    {...props}
  >
    <path d={paths[name]} />
  </svg>
);
