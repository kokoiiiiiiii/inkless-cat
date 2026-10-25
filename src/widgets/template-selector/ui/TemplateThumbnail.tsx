import type { ResumeData } from '@entities/resume';
import { createEmptyResume } from '@entities/resume-factory';
import type { ResumeTemplate } from '@entities/template';
import { ResumePreview } from '@features/resume-preview';
import { useI18n } from '@shared/i18n';
import { memo } from 'react';

const emptyResume = createEmptyResume();

// Thumbnails use the real preview renderer with a small, fixed illustrative resume.
// Keeping this fixture module scoped avoids subscribing the selector to user resume edits.
const thumbnailResume: ResumeData = {
  ...emptyResume,
  personal: {
    ...emptyResume.personal,
    fullName: 'Sample Candidate',
    title: 'Product Designer',
    summary: 'Clear structure and focused detail.',
  },
  experience: [
    {
      id: 'template-thumbnail-experience',
      company: 'Northstar Studio',
      role: 'Product Designer',
      location: '',
      startDate: '2022',
      endDate: 'Now',
      highlights: ['Built useful, consistent products.'],
    },
  ],
  education: [
    {
      id: 'template-thumbnail-education',
      school: 'City University',
      degree: 'Design',
      startDate: '2018',
      endDate: '2022',
      details: '',
    },
  ],
  skills: [
    {
      id: 'template-thumbnail-skills',
      title: 'Skills',
      items: ['Research', 'Systems', 'Prototyping'],
    },
  ],
  settings: {
    ...emptyResume.settings,
    personal: {
      ...emptyResume.settings?.personal,
      showPhoto: false,
    },
  },
};

const thumbnailSections = ['experience', 'education', 'skills'];

type TemplateThumbnailProps = Pick<ResumeTemplate, 'previewStyle' | 'accentColor' | 'theme'>;

export const areTemplateThumbnailPropsEqual = (
  previous: TemplateThumbnailProps,
  next: TemplateThumbnailProps,
) =>
  previous.previewStyle === next.previewStyle &&
  previous.accentColor === next.accentColor &&
  previous.theme === next.theme;

const TemplateThumbnailComponent = ({
  previewStyle,
  accentColor,
  theme,
}: TemplateThumbnailProps) => {
  const { t } = useI18n();

  return (
    <div
      className="flex w-14 shrink-0 flex-col items-center gap-1"
      aria-hidden="true"
      data-testid="template-thumbnail"
    >
      <div className="relative h-20 w-14 overflow-hidden rounded-xs border border-slate-200 bg-white shadow-xs dark:border-slate-600">
        <div className="pointer-events-none absolute top-0 left-0 h-[800px] w-[560px] origin-top-left scale-[0.1]">
          <ResumePreview
            resume={thumbnailResume}
            activeSections={thumbnailSections}
            templateStyle={previewStyle}
            accentColor={accentColor}
            theme={theme}
          />
        </div>
      </div>
      <span className="text-center text-[9px] leading-3 text-slate-500 dark:text-slate-400">
        {t('template.thumbnailLabel')}
      </span>
    </div>
  );
};

export const TemplateThumbnail = memo(TemplateThumbnailComponent, areTemplateThumbnailPropsEqual);
