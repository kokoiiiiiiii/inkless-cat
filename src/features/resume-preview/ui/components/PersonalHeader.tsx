import type { ResumeData } from '@entities/resume';
import { useI18n } from '@shared/i18n';
import { normalizePhotoDataUrl } from '@shared/lib/urls';
import type { CSSProperties } from 'react';

import { cn } from '../../lib/cn';
import type { ThemeStyles, VariantConfig } from '../../lib/variants';
import type { RegisterSectionRef } from '../../model/useResumePreviewState';
import { SectionContainer } from './SectionContainer';

type ContactItem = {
  id: string;
  label: string;
  value: string;
};

type PersonalSettingsState = {
  showPhoto: boolean;
  photoSize: number;
  photoPosition: 'left' | 'right';
  shouldShowPhoto: boolean;
};

type PersonalHeaderProps = {
  personal: NonNullable<ResumeData['personal']>;
  contactItems: ContactItem[];
  personalSettings: PersonalSettingsState;
  variant: VariantConfig;
  themeStyles: ThemeStyles;
  accentStyle?: CSSProperties;
  resolvedAccent?: string;
  registerSectionRef?: RegisterSectionRef;
};

export const PersonalHeader = ({
  personal,
  contactItems,
  personalSettings,
  variant,
  themeStyles,
  accentStyle,
  resolvedAccent,
  registerSectionRef,
}: PersonalHeaderProps) => {
  const { t } = useI18n();
  const { photoSize, photoPosition, shouldShowPhoto } = personalSettings;
  const photoSource = normalizePhotoDataUrl(personal.photo);

  return (
    <div className={cn('flex flex-col gap-6 pb-6', variant.divider)} style={themeStyles.divider}>
      <div className="flex flex-col gap-6">
        <div
          className={cn(
            'flex flex-col gap-4 sm:gap-6 sm:items-center sm:justify-between print:items-center print:justify-between',
            shouldShowPhoto
              ? photoPosition === 'left'
                ? 'sm:flex-row-reverse print:flex-row-reverse'
                : 'sm:flex-row print:flex-row'
              : 'sm:flex-row print:flex-row',
          )}
        >
          <div className="space-y-2 sm:flex-1">
            <h1
              className={cn('text-3xl font-semibold tracking-tight', variant.heading)}
              style={themeStyles.heading}
            >
              {personal.fullName || t('preview.nameFallback')}
            </h1>
            <p
              className={cn('text-base font-medium', variant.subheading)}
              style={themeStyles.subheading}
            >
              {personal.title || t('preview.titleFallback')}
            </p>
          </div>
          {shouldShowPhoto && photoSource && (
            <img
              src={photoSource}
              alt={t('preview.candidatePhoto')}
              className="shrink-0 rounded-3xl object-cover shadow-lg shadow-slate-300/30 ring-4 ring-slate-200/50 dark:ring-slate-700/40"
              style={{
                width: `${photoSize}px`,
                height: `${photoSize}px`,
                boxShadow:
                  accentStyle && resolvedAccent ? `0 18px 40px -22px ${resolvedAccent}` : undefined,
              }}
            />
          )}
        </div>
        {contactItems.length > 0 && (
          <div className={cn('text-sm', variant.metaWrapper)} style={themeStyles.muted}>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 print:grid-cols-2">
              {contactItems.map((item) => (
                <div key={item.id} className="grid grid-cols-[auto_1fr] items-baseline gap-x-2">
                  <dt className={cn('font-medium', variant.metaLabel)} style={themeStyles.heading}>
                    {item.label}
                  </dt>
                  <dd className={cn('break-words', variant.metaValue)} style={themeStyles.text}>
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
      {personal.summary && (
        <SectionContainer
          title={t('preview.personalSummary')}
          sectionKey="summary"
          registerSectionRef={registerSectionRef}
          accentStyle={accentStyle}
          variant={variant}
          headingStyle={themeStyles.heading}
        >
          <p className={cn('text-base leading-7', variant.metaValue)} style={themeStyles.text}>
            {personal.summary}
          </p>
        </SectionContainer>
      )}
    </div>
  );
};
