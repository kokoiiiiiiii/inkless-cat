import type { ResumeData, ResumePersonal, ResumePersonalExtra } from '@entities/resume';
import { AIEnhancementAction } from '@features/ai-resume-enhancement';
import type { PersonalSettings } from '@features/edit-module';
import type { SectionFocusHandler } from '@features/modules-panel';
import { useI18n } from '@shared/i18n';
import { normalizePhotoDataUrl } from '@shared/lib/urls';
import { memo, useId } from 'react';

import {
  dangerButtonClass,
  inputClass,
  labelClass,
  labelTextClass,
  subtleButtonClass,
  textareaClass,
} from './constants';
import styles from './PCStudioPersonalSection.module.css';
import PhotoUpload from './PhotoUpload';

type PCStudioPersonalSectionProps = {
  personal: ResumePersonal;
  settings: PersonalSettings;
  onChange: (field: Exclude<keyof ResumeData['personal'], 'extras'>, value: string) => void;
  notifyFocus: SectionFocusHandler;
  sectionRef?: (node: HTMLElement | null) => void;
  onExtraAdd: () => void;
  onExtraChange: (id: string, key: keyof ResumePersonalExtra, value: string) => void;
  onExtraRemove: (id: string) => void;
  moreFieldsOpen: boolean;
  onMoreFieldsOpenChange?: (open: boolean) => void;
  onSettingChange: <Key extends keyof PersonalSettings>(
    key: Key,
    value: PersonalSettings[Key],
  ) => void;
};

const PCStudioPersonalSection = memo(
  ({
    personal,
    settings,
    onChange,
    notifyFocus,
    sectionRef,
    onExtraAdd,
    onExtraChange,
    onExtraRemove,
    moreFieldsOpen,
    onMoreFieldsOpenChange,
    onSettingChange,
  }: PCStudioPersonalSectionProps) => {
    const { t } = useI18n();
    const summaryId = useId();
    const emailErrorId = useId();
    const photoPositionName = useId();
    const extras = Array.isArray(personal.extras) ? personal.extras : [];
    const photoSize = Math.max(80, Math.min(settings.photoSize, 260));
    const photoPosition = settings.photoPosition === 'left' ? 'left' : 'right';
    const photoSource = normalizePhotoDataUrl(personal.photo);
    const fullName = personal.fullName || '';
    const emailInvalid =
      Boolean(personal.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email ?? '');
    const contactFields = [
      {
        id: 'email',
        key: 'email' as const,
        labelKey: 'emailLabel' as const,
        label: personal.emailLabel || t('modules.personal.fields.email.label'),
        value: personal.email || '',
        placeholder: t('modules.personal.fields.email.placeholder'),
        type: 'email',
      },
      {
        id: 'location',
        key: 'location' as const,
        labelKey: 'locationLabel' as const,
        label: personal.locationLabel || t('modules.personal.fields.location.label'),
        value: personal.location || '',
        placeholder: t('modules.personal.fields.location.placeholder'),
        type: 'text',
      },
      {
        id: 'phone',
        key: 'phone' as const,
        labelKey: 'phoneLabel' as const,
        label: personal.phoneLabel || t('modules.personal.fields.phone.label'),
        value: personal.phone || '',
        placeholder: t('modules.personal.fields.phone.placeholder'),
        type: 'text',
      },
    ];
    const summaryLength = [...(personal.summary || '')].length;
    const displayName = fullName.trim() || t('modules.personal.fields.fullName.placeholder');

    return (
      <section ref={sectionRef} className={styles.root} data-testid="pc-personal-editor">
        <div className={styles.heading}>
          <div>
            <h3>{t('modules.personal.title')}</h3>
            <p>{t('editor.pcStudio.personalHelp')}</p>
          </div>
          <span className={styles.dataBadge} data-testid="pc-personal-source">
            <span aria-hidden="true" />
            {t('editor.pcStudio.profileData')}
          </span>
        </div>

        <article className={styles.identityCard} data-testid="pc-personal-identity">
          <div className={styles.avatar} aria-hidden="true">
            {photoSource ? (
              <img src={photoSource} alt="" />
            ) : (
              <span>{fullName.trim().slice(0, 1) || '•'}</span>
            )}
          </div>
          <div className={styles.identityCopy}>
            <strong>{displayName}</strong>
            <span>{personal.title || t('modules.personal.fields.title.placeholder')}</span>
            {personal.location && (
              <small>
                <span aria-hidden="true">⌖</span>
                {personal.location}
              </small>
            )}
          </div>
        </article>

        <div className={styles.fields} data-testid="pc-personal-fields">
          <label className={styles.field}>
            <span>{t('modules.personal.fields.fullName.label')}</span>
            <input
              className={inputClass}
              type="text"
              value={personal.fullName}
              placeholder={t('modules.personal.fields.fullName.placeholder')}
              data-studio-field-id="personal.fullName"
              onChange={(event) => onChange('fullName', event.target.value)}
              onFocus={() => notifyFocus('personal', 'personal', 'personal.fullName')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('editor.pcStudio.targetRole')}</span>
            <input
              className={inputClass}
              type="text"
              value={personal.title}
              placeholder={t('modules.personal.fields.title.placeholder')}
              data-studio-field-id="personal.title"
              onChange={(event) => onChange('title', event.target.value)}
              onFocus={() => notifyFocus('personal', 'personal', 'personal.title')}
            />
          </label>

          {contactFields.map((contact) => (
            <label className={styles.field} key={contact.id}>
              <span>{contact.label}</span>
              <input
                className={inputClass}
                type={contact.type}
                value={contact.value}
                placeholder={contact.placeholder}
                data-studio-field-id={`personal.${contact.key}`}
                onChange={(event) => onChange(contact.key, event.target.value)}
                onFocus={() => notifyFocus('personal', 'personal', `personal.${contact.key}`)}
                aria-invalid={contact.id === 'email' && emailInvalid ? true : undefined}
                aria-describedby={contact.id === 'email' && emailInvalid ? emailErrorId : undefined}
              />
              {contact.id === 'email' && emailInvalid && (
                <span id={emailErrorId} className={styles.fieldError} data-testid="pc-email-error">
                  {t('editor.pcStudio.emailInvalid')}
                </span>
              )}
            </label>
          ))}

          {extras.slice(0, 1).map((extra) => (
            <label className={styles.field} key={extra.id}>
              <span>{extra.label || t('modules.personal.extras.value.label')}</span>
              <input
                className={inputClass}
                type="text"
                value={extra.value || ''}
                placeholder={t('modules.personal.extras.value.placeholder')}
                data-studio-field-id={`personal.extras.${extra.id}.value`}
                onChange={(event) => onExtraChange(extra.id, 'value', event.target.value)}
                onFocus={() =>
                  notifyFocus('personal', extra.id, `personal.extras.${extra.id}.value`)
                }
              />
            </label>
          ))}
        </div>

        <section className={styles.summary} data-testid="pc-summary-writing-space">
          <div className={styles.summaryHeading}>
            <div>
              <label htmlFor={summaryId}>{t('modules.personal.fields.summary.label')}</label>
              <p>{t('modules.personal.fields.summary.placeholder')}</p>
            </div>
            <AIEnhancementAction target={{ kind: 'personal-summary' }} />
          </div>
          <textarea
            id={summaryId}
            className={textareaClass}
            value={personal.summary}
            placeholder={t('modules.personal.fields.summary.placeholder')}
            data-studio-field-id="personal.summary"
            onChange={(event) => onChange('summary', event.target.value)}
            onFocus={() => notifyFocus('personal', 'personal', 'personal.summary')}
          />
          <div className={styles.summaryFooter}>
            <span>{t('editor.pcStudio.summaryLiveNote')}</span>
            <output data-testid="pc-summary-character-count">
              {t('editor.pcStudio.characterCount', { count: summaryLength })}
            </output>
          </div>
        </section>

        <details
          className={styles.more}
          data-testid="pc-personal-more"
          open={moreFieldsOpen}
          onToggle={(event) => onMoreFieldsOpenChange?.(event.currentTarget.open)}
        >
          <summary>
            <span>{t('editor.pcStudio.morePersonalFields')}</span>
            <span aria-hidden="true" className={styles.chevron}>
              ⌄
            </span>
          </summary>
          <div className={styles.moreContent}>
            <section className={styles.moreBlock} aria-label={t('editor.pcStudio.photoSettings')}>
              <h4>{t('editor.pcStudio.photoSettings')}</h4>
              <div className={styles.photoEditor}>
                <PhotoUpload
                  value={personal.photo}
                  onChange={(value) => onChange('photo', value)}
                  onFocus={() => notifyFocus('personal', 'personal', 'personal.photo')}
                  size={96}
                />
                <div className={styles.photoOptions}>
                  <label className={styles.settingRow}>
                    <span>{t('modules.personal.photo.show')}</span>
                    <input
                      type="checkbox"
                      checked={settings.showPhoto}
                      onChange={(event) => onSettingChange('showPhoto', event.target.checked)}
                    />
                  </label>
                  <label className={`${styles.settingRow} ${styles.settingRowStacked}`}>
                    <span>{t('modules.personal.photo.size', { size: photoSize })}</span>
                    <input
                      type="range"
                      min="96"
                      max="240"
                      step="4"
                      value={photoSize}
                      onChange={(event) => onSettingChange('photoSize', Number(event.target.value))}
                    />
                  </label>
                  <fieldset>
                    <legend>{t('modules.personal.photo.position')}</legend>
                    <label>
                      <input
                        type="radio"
                        name={photoPositionName}
                        value="left"
                        checked={photoPosition === 'left'}
                        onChange={() => onSettingChange('photoPosition', 'left')}
                      />
                      {t('modules.personal.photo.left')}
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={photoPositionName}
                        value="right"
                        checked={photoPosition === 'right'}
                        onChange={() => onSettingChange('photoPosition', 'right')}
                      />
                      {t('modules.personal.photo.right')}
                    </label>
                  </fieldset>
                </div>
              </div>
            </section>

            <section className={styles.moreBlock} aria-label={t('modules.personal.extras.title')}>
              <h4>{t('modules.personal.extras.title')}</h4>
              <div className={styles.labelOverrides}>
                {contactFields.map((contact) => (
                  <label className={styles.field} key={`${contact.id}-label`}>
                    <span>
                      {t('modules.personal.extras.label.label')} · {contact.value}
                    </span>
                    <input
                      className={inputClass}
                      type="text"
                      value={personal[contact.labelKey] || ''}
                      placeholder={contact.label}
                      data-studio-field-id={`personal.${contact.labelKey}`}
                      onChange={(event) => onChange(contact.labelKey, event.target.value)}
                      onFocus={() =>
                        notifyFocus('personal', 'personal', `personal.${contact.labelKey}`)
                      }
                    />
                  </label>
                ))}
              </div>
              <div className={styles.extraHeading}>
                <span>{t('editor.pcStudio.customContactFields')}</span>
                <button type="button" className={subtleButtonClass} onClick={onExtraAdd}>
                  {t('modules.personal.extras.add')}
                </button>
              </div>
              {extras.length > 1 ? (
                <div className={styles.extraGrid}>
                  {extras.slice(1).map((extra) => (
                    <div className={styles.extraItem} key={extra.id}>
                      <label className={labelClass}>
                        <span className={labelTextClass}>
                          {t('modules.personal.extras.label.label')}
                        </span>
                        <input
                          className={inputClass}
                          type="text"
                          value={extra.label || ''}
                          placeholder={t('modules.personal.extras.label.placeholder')}
                          data-studio-field-id={`personal.extras.${extra.id}.label`}
                          onChange={(event) => onExtraChange(extra.id, 'label', event.target.value)}
                          onFocus={() =>
                            notifyFocus('personal', extra.id, `personal.extras.${extra.id}.label`)
                          }
                        />
                      </label>
                      <label className={labelClass}>
                        <span className={labelTextClass}>
                          {t('modules.personal.extras.value.label')}
                        </span>
                        <input
                          className={inputClass}
                          type="text"
                          value={extra.value || ''}
                          placeholder={t('modules.personal.extras.value.placeholder')}
                          data-studio-field-id={`personal.extras.${extra.id}.value`}
                          onChange={(event) => onExtraChange(extra.id, 'value', event.target.value)}
                          onFocus={() =>
                            notifyFocus('personal', extra.id, `personal.extras.${extra.id}.value`)
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className={dangerButtonClass}
                        onClick={() => onExtraRemove(extra.id)}
                      >
                        {t('modules.actions.delete')}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.extraEmpty}>{t('modules.personal.extras.empty')}</p>
              )}
            </section>
          </div>
        </details>
      </section>
    );
  },
);

PCStudioPersonalSection.displayName = 'PCStudioPersonalSection';

export default PCStudioPersonalSection;
