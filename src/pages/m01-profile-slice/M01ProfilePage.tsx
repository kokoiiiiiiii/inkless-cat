import './m01-profile-slice.css';

import type { ActiveSectionKey, ResumeData, ResumePersonal } from '@entities/resume';
import type { TemplateTheme } from '@entities/template';
import type { UseModuleEditorResult } from '@features/edit-module';
import { ResumePreview } from '@features/resume-preview';
import { useI18n } from '@shared/i18n';
import {
  GlassSurface,
  StudioButton,
  StudioCard,
  StudioIcon,
  StudioInput,
  StudioTextarea,
} from '@shared/ui/studio';
import { useId, useRef } from 'react';

type PersonalField = 'fullName' | 'title' | 'email' | 'phone' | 'location' | 'summary';

type PersonalTextField = Exclude<PersonalField, 'summary'>;

type TextFieldDefinition = {
  field: PersonalTextField;
  type: 'text' | 'email' | 'tel';
  autoComplete?: string;
};

const identityFields: TextFieldDefinition[] = [
  { field: 'fullName', type: 'text', autoComplete: 'name' },
  { field: 'title', type: 'text', autoComplete: 'organization-title' },
];

const contactFields: TextFieldDefinition[] = [
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

const isLocalImage = (photo: string | undefined) => photo?.startsWith('data:image/') ?? false;

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
  const profileHeadingId = useId();
  const previewHeadingId = useId();
  const profileRef = useRef<HTMLElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const displayName = personal.fullName?.trim() || t('preview.nameFallback');
  const profileDetails = [personal.title, personal.location].filter(Boolean).join(' · ');

  const scrollTo = (target: HTMLElement | null) => {
    target?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };

  const renderTextField = ({ field, type, autoComplete }: TextFieldDefinition) => (
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
  );

  return (
    <div
      className="studio-root m01-profile-slice"
      data-theme={themeMode}
      data-testid="m01-profile-slice"
    >
      <main className="m01-profile-slice__main" aria-labelledby={pageHeadingId}>
        <header className="m01-profile-slice__brandbar">
          <span className="m01-profile-slice__brand-name">INKLESS-CAT</span>
          <span className="m01-profile-slice__brand-divider" aria-hidden="true">
            ·
          </span>
          <span className="m01-profile-slice__brand-context">STUDIO</span>
        </header>

        <section className="m01-profile-slice__hero">
          <p className="m01-profile-slice__eyebrow">{t('editor.title')}</p>
          <h1 className="m01-profile-slice__title" id={pageHeadingId}>
            {t('modules.personal.title')}
          </h1>
          <p className="m01-profile-slice__description">{t('editor.desc')}</p>
        </section>

        <div className="m01-profile-slice__workspace">
          <StudioCard
            as="section"
            className="m01-profile-slice__card m01-profile-slice__form-card"
            aria-labelledby={profileHeadingId}
          >
            <section
              ref={profileRef}
              className="m01-profile-slice__profile-summary"
              aria-label={t('modules.personal.title')}
              data-testid="m01-profile-card"
            >
              <div className="m01-profile-slice__avatar" aria-hidden="true">
                {isLocalImage(personal.photo) ? (
                  <img src={personal.photo} alt="" loading="lazy" />
                ) : (
                  <span>{personal.fullName?.trim().slice(0, 1) || '·'}</span>
                )}
              </div>
              <div className="m01-profile-slice__identity">
                <h2 className="m01-profile-slice__identity-name" id={profileHeadingId}>
                  {displayName}
                </h2>
                {profileDetails ? (
                  <p className="m01-profile-slice__identity-details">{profileDetails}</p>
                ) : null}
              </div>
            </section>

            <div className="m01-profile-slice__field-group m01-profile-slice__field-group--identity">
              {identityFields.map((definition) => renderTextField(definition))}
            </div>

            <div className="m01-profile-slice__field-group m01-profile-slice__field-group--contact">
              {contactFields.map((definition) => renderTextField(definition))}
            </div>

            <StudioTextarea
              className="m01-profile-slice__summary"
              label={t('modules.personal.fields.summary.label')}
              name="summary"
              placeholder={t('modules.personal.fields.summary.placeholder')}
              rows={2}
              value={personal.summary ?? ''}
              data-testid="m01-summary-field"
              onValueChange={(value) => onPersonalChange('summary', value)}
            />
          </StudioCard>

          <StudioCard
            as="section"
            className="m01-profile-slice__card m01-profile-slice__preview-card"
            aria-labelledby={previewHeadingId}
          >
            <div className="m01-profile-slice__section-heading">
              <div>
                <p className="m01-profile-slice__section-eyebrow">Inkless-Cat · Studio</p>
                <h2 className="m01-profile-slice__section-title" id={previewHeadingId}>
                  {t('preview.title')}
                </h2>
              </div>
            </div>
            <div ref={previewRef} className="m01-profile-slice__preview">
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

        <GlassSurface
          className="m01-profile-slice__action-dock"
          role="group"
          aria-label={t('editor.title')}
        >
          <StudioButton
            className="m01-profile-slice__action-button m01-profile-slice__action-button--edit"
            variant="secondary"
            data-testid="m01-edit-action"
            onClick={() => scrollTo(profileRef.current)}
          >
            <StudioIcon name="file" />
            <span>{t('modules.personal.title')}</span>
          </StudioButton>
          <StudioButton
            className="m01-profile-slice__action-button m01-profile-slice__action-button--preview"
            variant="primary"
            data-testid="m01-preview-action"
            onClick={() => scrollTo(previewRef.current)}
          >
            <StudioIcon name="eye" />
            <span>{t('preview.title')}</span>
          </StudioButton>
        </GlassSurface>
      </main>
    </div>
  );
};

export default M01ProfilePage;
