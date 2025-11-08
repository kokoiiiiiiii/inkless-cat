import type { ResumeData } from '@entities/resume';
import type { Locale } from '@shared/i18n';

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
  localizedSamples?: Partial<Record<Locale, ResumeData>>;
};

export type TemplateUpdatePayload = Partial<Omit<ResumeTemplate, 'sample'>> & {
  sample?: ResumeData | '__CURRENT__';
};
