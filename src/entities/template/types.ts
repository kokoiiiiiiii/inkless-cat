import type { ResumeData } from '@entities/resume';

export type TemplateTheme = {
  accent?: string;
  background?: string;
  heading?: string;
  subheading?: string;
  text?: string;
  muted?: string;
  cardBackground?: string;
  cardBorder?: string;
  divider?: string;
};

export type ResumeTemplate = {
  id: string;
  name: string;
  description?: string;
  accentColor?: string;
  previewStyle?: string;
  theme?: TemplateTheme;
  sample: ResumeData;
};
