import './m01-profile-slice.css';

import type { ActiveSectionKey, ResumeData, ResumePersonal } from '@entities/resume';
import type { TemplateTheme } from '@entities/template';
import type { UseModuleEditorResult } from '@features/edit-module';
import { ResumePreview } from '@features/resume-preview';
import { useI18n } from '@shared/i18n';
import { GlassSurface, StudioCard, StudioInput, StudioTextarea } from '@shared/ui/studio';
import { useId } from 'react';

type PersonalField = 'fullName' | 'title' | 'email' | 'phone' | 'location' | 'summary';

type PersonalTextField = Exclude<PersonalField, 'summary'>;

type TextFieldDefinition = {
  field: PersonalTextField;
  type: 'text' | 'email' | 'tel';
  autoComplete?: string;
};

const textFields: TextFieldDefinition[] = [
  { field: 'fullName', type: 'text', autoComplete: 'name' },
  { field: 'title', type: 'text', autoComplete: 'organization-title' },
  { field: 'email', type: 'email', autoComplete: 'email' },
  { field: 'phone', type: 'tel', autoComplete: 'tel' },
  { field: 'location', type: 'text' },
];

export type M01ProfilePageProps = {
  personal: ResumePersonal;
  previewResume: ResumeData;
  activeSections: ActiveSectionKey[];
  templateStyle?: string;
  accentColor?: string;
  theme?: TemplateTheme;
  themeMode?: 'light' | 'dark';
  onPersonalChange: UseModuleEditorResult['handlePersonalChange'];
};

export const M01ProfilePage = ({
  personal,
  previewResume,
  activeSections,
  templateStyle,
  accentColor,
  theme,
  themeMode,
  onPersonalChange,
}: M01ProfilePageProps) => {
  const { t } = useI18n();
  const pageHeadingId = useId();
  const formHeadingId = useId();
  const previewHeadingId = useId();

  return (
    <div
      className="studio-root m01-profile-slice"
      data-theme={themeMode}
      data-testid="m01-profile-slice"
    >
      <main className="m01-profile-slice__main" aria-labelledby={pageHeadingId}>
        <GlassSurface as="header" className="m01-profile-slice__header" tone="strong">
          <div>
            <p className="m01-profile-slice__eyebrow">M01 · D1</p>
            <h1 className="m01-profile-slice__title" id={pageHeadingId}>
              {t('modules.personal.title')}
            </h1>
          </div>
        </GlassSurface>

        <div className="m01-profile-slice__workspace">
          <StudioCard
            as="section"
            className="m01-profile-slice__card"
            aria-labelledby={formHeadingId}
          >
            <div className="m01-profile-slice__section-heading">
              <h2 className="m01-profile-slice__section-title" id={formHeadingId}>
                {t('modules.personal.title')}
              </h2>
            </div>

            <div className="m01-profile-slice__fields">
              {textFields.map(({ field, type, autoComplete }) => (
                <StudioInput
                  key={field}
                  autoComplete={autoComplete}
                  label={t(`modules.personal.fields.${field}.label`)}
                  name={field}
                  placeholder={t(`modules.personal.fields.${field}.placeholder`)}
                  type={type}
                  value={personal[field] ?? ''}
                  onValueChange={(value) => onPersonalChange(field, value)}
                />
              ))}

              <StudioTextarea
                className="m01-profile-slice__summary"
                label={t('modules.personal.fields.summary.label')}
                name="summary"
                placeholder={t('modules.personal.fields.summary.placeholder')}
                rows={5}
                value={personal.summary ?? ''}
                onValueChange={(value) => onPersonalChange('summary', value)}
              />
            </div>
          </StudioCard>

          <StudioCard
            as="section"
            className="m01-profile-slice__card m01-profile-slice__preview-card"
            aria-labelledby={previewHeadingId}
          >
            <div className="m01-profile-slice__section-heading">
              <h2 className="m01-profile-slice__section-title" id={previewHeadingId}>
                {t('preview.title')}
              </h2>
            </div>
            <div className="m01-profile-slice__preview">
              <ResumePreview
                resume={previewResume}
                activeSections={activeSections}
                templateStyle={templateStyle}
                accentColor={accentColor}
                theme={theme}
              />
            </div>
          </StudioCard>
        </div>
      </main>
    </div>
  );
};

export default M01ProfilePage;
