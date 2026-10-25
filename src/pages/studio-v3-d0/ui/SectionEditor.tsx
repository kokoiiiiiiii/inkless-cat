import { StudioButton, StudioField, StudioIcon } from '@shared/ui';
import type { Dispatch, SetStateAction } from 'react';

import { copy, formatCopy, localized } from '../model/copy';
import type {
  DemoEducation,
  DemoExperience,
  DemoProject,
  DemoResume,
  Locale,
  LocalizedText,
  SectionId,
} from '../model/fixtures';
import styles from './studio-v3.module.css';

export type AssistTarget =
  | { type: 'summary' }
  | { type: 'experience'; index: number }
  | { type: 'project'; index: number };

interface SectionEditorProps {
  section: SectionId;
  resume: DemoResume;
  setResume: Dispatch<SetStateAction<DemoResume>>;
  locale: Locale;
  experienceIndex: number;
  setExperienceIndex: (index: number) => void;
  onOpenAI: (target: AssistTarget) => void;
}

function updateLocalized(value: LocalizedText, locale: Locale, next: string): LocalizedText {
  return { ...value, [locale]: next };
}

export function SectionEditor({
  section,
  resume,
  setResume,
  locale,
  experienceIndex,
  setExperienceIndex,
  onOpenAI,
}: SectionEditorProps) {
  const updateProfileText = (
    field: 'fullName' | 'headline' | 'summary' | 'location',
    value: string,
  ) => {
    setResume((previous) => ({
      ...previous,
      [field]: updateLocalized(previous[field], locale, value),
    }));
  };
  const updateProfilePlain = (field: 'email' | 'phone' | 'website', value: string) => {
    setResume((previous) => ({ ...previous, [field]: value }));
  };
  const patchExperience = (index: number, patch: Partial<DemoExperience>) => {
    setResume((previous) => ({
      ...previous,
      experiences: previous.experiences.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    }));
  };
  const patchProject = (index: number, patch: Partial<DemoProject>) => {
    setResume((previous) => ({
      ...previous,
      projects: previous.projects.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    }));
  };
  const patchEducation = (index: number, patch: Partial<DemoEducation>) => {
    setResume((previous) => ({
      ...previous,
      education: previous.education.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    }));
  };
  const addExperience = () => {
    setResume((previous) => ({
      ...previous,
      experiences: [
        ...previous.experiences,
        {
          id: `demo-exp-${Date.now()}`,
          company: '',
          role: { zh: '', en: '' },
          location: { zh: '', en: '' },
          dates: '',
          highlights: { zh: '', en: '' },
        },
      ],
    }));
    setExperienceIndex(resume.experiences.length);
  };
  const addProject = () =>
    setResume((previous) => ({
      ...previous,
      projects: [
        ...previous.projects,
        {
          id: `demo-project-${Date.now()}`,
          name: '',
          role: { zh: '', en: '' },
          dates: '',
          description: { zh: '', en: '' },
          link: '',
        },
      ],
    }));
  const addEducation = () =>
    setResume((previous) => ({
      ...previous,
      education: [
        ...previous.education,
        {
          id: `demo-education-${Date.now()}`,
          school: '',
          degree: { zh: '', en: '' },
          dates: '',
          detail: { zh: '', en: '' },
        },
      ],
    }));

  if (section === 'profile') {
    return (
      <div className={styles.fieldStack}>
        <p className={styles.formIntro}>{copy(locale, 'profileHelp')}</p>
        <div className={styles.formGrid}>
          <StudioField
            error={
              localized(resume.fullName, locale).trim().length > 0
                ? undefined
                : copy(locale, 'nameRequired')
            }
            label={copy(locale, 'fullName')}
            onChange={(value) => updateProfileText('fullName', value)}
            required
            value={localized(resume.fullName, locale)}
          />
          <StudioField
            label={copy(locale, 'headline')}
            onChange={(value) => updateProfileText('headline', value)}
            value={localized(resume.headline, locale)}
          />
          <StudioField
            autoComplete="email"
            label={copy(locale, 'email')}
            onChange={(value) => updateProfilePlain('email', value)}
            type="email"
            value={resume.email}
          />
          <StudioField
            autoComplete="tel"
            label={copy(locale, 'phone')}
            onChange={(value) => updateProfilePlain('phone', value)}
            value={resume.phone}
          />
          <StudioField
            label={copy(locale, 'location')}
            onChange={(value) => updateProfileText('location', value)}
            value={localized(resume.location, locale)}
          />
          <StudioField
            label={copy(locale, 'website')}
            onChange={(value) => updateProfilePlain('website', value)}
            value={resume.website}
          />
        </div>
        <StudioField
          as="textarea"
          hint={copy(locale, 'aiTip')}
          label={copy(locale, 'summary')}
          onChange={(value) => updateProfileText('summary', value)}
          rows={6}
          value={localized(resume.summary, locale)}
        />
        <div className={styles.fieldTools}>
          <StudioButton onClick={() => onOpenAI({ type: 'summary' })} variant="quiet">
            <StudioIcon name="spark" size={16} />
            {copy(locale, 'aiAssist')}
            <span className={styles.demoMiniTag}>Demo</span>
          </StudioButton>
        </div>
      </div>
    );
  }

  if (section === 'experience') {
    const safeIndex = Math.min(experienceIndex, Math.max(0, resume.experiences.length - 1));
    const entry = resume.experiences[safeIndex];
    return (
      <div className={styles.fieldStack}>
        <p className={styles.formIntro}>{copy(locale, 'experienceHelp')}</p>
        <div className={styles.entryToolbar}>
          <span className={styles.microLabel}>{copy(locale, 'chooseEntry')}</span>
          <div aria-label={copy(locale, 'chooseEntry')} className={styles.entrySwitch} role="group">
            {resume.experiences.map((item, index) => (
              <button
                aria-label={
                  formatCopy(locale, 'entryNumber', { number: index + 1 }) +
                  ` · ${item.company || copy(locale, 'newEntry')}`
                }
                aria-pressed={index === safeIndex}
                className={styles.entrySwitchButton}
                key={item.id}
                onClick={() => setExperienceIndex(index)}
                type="button"
              >
                {String(index + 1).padStart(2, '0')}
              </button>
            ))}
            <StudioButton
              aria-label={copy(locale, 'addExperience')}
              onClick={addExperience}
              variant="quiet"
            >
              <StudioIcon name="plus" size={16} />
            </StudioButton>
          </div>
        </div>
        {entry ? (
          <div className={styles.fieldStack} key={entry.id}>
            <div className={styles.formGrid}>
              <StudioField
                label={copy(locale, 'company')}
                onChange={(value) => patchExperience(safeIndex, { company: value })}
                value={entry.company}
              />
              <StudioField
                label={copy(locale, 'role')}
                onChange={(value) =>
                  patchExperience(safeIndex, { role: updateLocalized(entry.role, locale, value) })
                }
                value={localized(entry.role, locale)}
              />
              <StudioField
                label={copy(locale, 'location')}
                onChange={(value) =>
                  patchExperience(safeIndex, {
                    location: updateLocalized(entry.location, locale, value),
                  })
                }
                value={localized(entry.location, locale)}
              />
              <StudioField
                label={copy(locale, 'dates')}
                onChange={(value) => patchExperience(safeIndex, { dates: value })}
                value={entry.dates}
              />
            </div>
            <StudioField
              as="textarea"
              label={copy(locale, 'achievements')}
              onChange={(value) =>
                patchExperience(safeIndex, {
                  highlights: updateLocalized(entry.highlights, locale, value),
                })
              }
              rows={7}
              value={localized(entry.highlights, locale)}
            />
            <div className={styles.fieldTools}>
              <StudioButton
                onClick={() => onOpenAI({ type: 'experience', index: safeIndex })}
                variant="quiet"
              >
                <StudioIcon name="spark" size={16} />
                {copy(locale, 'aiAssist')}
                <span className={styles.demoMiniTag}>Demo</span>
              </StudioButton>
            </div>
          </div>
        ) : (
          <div className={styles.emptyEntries}>
            <p>{copy(locale, 'newEntry')}</p>
            <StudioButton onClick={addExperience} variant="secondary">
              <StudioIcon name="plus" />
              {copy(locale, 'addExperience')}
            </StudioButton>
          </div>
        )}
      </div>
    );
  }

  if (section === 'projects') {
    return (
      <div className={styles.fieldStack}>
        <div className={styles.sectionFormTop}>
          <p className={styles.formIntro}>{copy(locale, 'sectionHint')}</p>
          <StudioButton onClick={addProject} variant="secondary">
            <StudioIcon name="plus" size={16} />
            {copy(locale, 'addProject')}
          </StudioButton>
        </div>
        {resume.projects.map((project, index) => (
          <fieldset className={styles.entryFieldset} key={project.id}>
            <legend>{formatCopy(locale, 'entryNumber', { number: index + 1 })}</legend>
            <div className={styles.formGrid}>
              <StudioField
                label={copy(locale, 'projectName')}
                onChange={(value) => patchProject(index, { name: value })}
                value={project.name}
              />
              <StudioField
                label={copy(locale, 'role')}
                onChange={(value) =>
                  patchProject(index, { role: updateLocalized(project.role, locale, value) })
                }
                value={localized(project.role, locale)}
              />
              <StudioField
                label={copy(locale, 'dates')}
                onChange={(value) => patchProject(index, { dates: value })}
                value={project.dates}
              />
              <StudioField
                label={copy(locale, 'link')}
                onChange={(value) => patchProject(index, { link: value })}
                value={project.link}
              />
            </div>
            <StudioField
              as="textarea"
              label={copy(locale, 'description')}
              onChange={(value) =>
                patchProject(index, {
                  description: updateLocalized(project.description, locale, value),
                })
              }
              rows={4}
              value={localized(project.description, locale)}
            />
            <div className={styles.fieldTools}>
              <StudioButton onClick={() => onOpenAI({ type: 'project', index })} variant="quiet">
                <StudioIcon name="spark" size={16} />
                {copy(locale, 'aiAssist')}
                <span className={styles.demoMiniTag}>Demo</span>
              </StudioButton>
            </div>
          </fieldset>
        ))}
      </div>
    );
  }

  if (section === 'education') {
    return (
      <div className={styles.fieldStack}>
        <div className={styles.sectionFormTop}>
          <p className={styles.formIntro}>{copy(locale, 'sectionHint')}</p>
          <StudioButton onClick={addEducation} variant="secondary">
            <StudioIcon name="plus" size={16} />
            {copy(locale, 'addEducation')}
          </StudioButton>
        </div>
        {resume.education.map((item, index) => (
          <fieldset className={styles.entryFieldset} key={item.id}>
            <legend>{formatCopy(locale, 'entryNumber', { number: index + 1 })}</legend>
            <div className={styles.formGrid}>
              <StudioField
                label={copy(locale, 'school')}
                onChange={(value) => patchEducation(index, { school: value })}
                value={item.school}
              />
              <StudioField
                label={copy(locale, 'degree')}
                onChange={(value) =>
                  patchEducation(index, { degree: updateLocalized(item.degree, locale, value) })
                }
                value={localized(item.degree, locale)}
              />
              <StudioField
                label={copy(locale, 'dates')}
                onChange={(value) => patchEducation(index, { dates: value })}
                value={item.dates}
              />
            </div>
            <StudioField
              as="textarea"
              label={copy(locale, 'detail')}
              onChange={(value) =>
                patchEducation(index, { detail: updateLocalized(item.detail, locale, value) })
              }
              rows={3}
              value={localized(item.detail, locale)}
            />
          </fieldset>
        ))}
      </div>
    );
  }

  if (section === 'skills') {
    return (
      <div className={styles.fieldStack}>
        <StudioField
          as="textarea"
          hint={copy(locale, 'sectionHint')}
          label={copy(locale, 'skillList')}
          onChange={(value) =>
            setResume((previous) => ({
              ...previous,
              skills: value
                .split('\n')
                .map((line) => updateLocalized({ zh: line, en: line }, locale, line)),
            }))
          }
          rows={8}
          value={resume.skills.map((skill) => localized(skill, locale)).join('\n')}
        />
      </div>
    );
  }

  if (section === 'languages') {
    return (
      <div className={styles.fieldStack}>
        {resume.languages.map((language, index) => (
          <fieldset className={styles.entryFieldset} key={language.name.en}>
            <legend>{formatCopy(locale, 'entryNumber', { number: index + 1 })}</legend>
            <div className={styles.formGrid}>
              <StudioField
                label={copy(locale, 'languageName')}
                onChange={(value) =>
                  setResume((previous) => ({
                    ...previous,
                    languages: previous.languages.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, name: updateLocalized(item.name, locale, value) }
                        : item,
                    ),
                  }))
                }
                value={localized(language.name, locale)}
              />
              <StudioField
                label={copy(locale, 'proficiency')}
                onChange={(value) =>
                  setResume((previous) => ({
                    ...previous,
                    languages: previous.languages.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, level: updateLocalized(item.level, locale, value) }
                        : item,
                    ),
                  }))
                }
                value={localized(language.level, locale)}
              />
            </div>
          </fieldset>
        ))}
      </div>
    );
  }

  if (section === 'awards') {
    return (
      <div className={styles.fieldStack}>
        {resume.awards.map((award, index) => (
          <fieldset className={styles.entryFieldset} key={`${award.name.en}-${award.year}`}>
            <legend>{formatCopy(locale, 'entryNumber', { number: index + 1 })}</legend>
            <div className={styles.formGrid}>
              <StudioField
                label={copy(locale, 'awardName')}
                onChange={(value) =>
                  setResume((previous) => ({
                    ...previous,
                    awards: previous.awards.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, name: updateLocalized(item.name, locale, value) }
                        : item,
                    ),
                  }))
                }
                value={localized(award.name, locale)}
              />
              <StudioField
                label={copy(locale, 'organization')}
                onChange={(value) =>
                  setResume((previous) => ({
                    ...previous,
                    awards: previous.awards.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, organization: value } : item,
                    ),
                  }))
                }
                value={award.organization}
              />
              <StudioField
                label={copy(locale, 'year')}
                onChange={(value) =>
                  setResume((previous) => ({
                    ...previous,
                    awards: previous.awards.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, year: value } : item,
                    ),
                  }))
                }
                value={award.year}
              />
            </div>
          </fieldset>
        ))}
      </div>
    );
  }

  if (section === 'interests') {
    return (
      <div className={styles.fieldStack}>
        <StudioField
          as="textarea"
          hint={copy(locale, 'sectionHint')}
          label={copy(locale, 'interestsList')}
          onChange={(value) =>
            setResume((previous) => ({
              ...previous,
              interests: value
                .split('\n')
                .map((line) => updateLocalized({ zh: line, en: line }, locale, line)),
            }))
          }
          rows={6}
          value={resume.interests.map((interest) => localized(interest, locale)).join('\n')}
        />
      </div>
    );
  }

  const customId = section.split(':')[1];
  const customSection = resume.customSections.find((item) => item.id === customId);
  if (!customSection) {
    return <p className={styles.emptyEntries}>{copy(locale, 'newEntry')}</p>;
  }

  return (
    <div className={styles.fieldStack}>
      <StudioField
        label={copy(locale, 'moduleName')}
        onChange={(value) =>
          setResume((previous) => ({
            ...previous,
            customSections: previous.customSections.map((item) =>
              item.id === customSection.id
                ? { ...item, title: updateLocalized(item.title, locale, value) }
                : item,
            ),
          }))
        }
        value={localized(customSection.title, locale)}
      />
      <StudioField
        as="textarea"
        label={copy(locale, 'description')}
        onChange={(value) =>
          setResume((previous) => ({
            ...previous,
            customSections: previous.customSections.map((item) =>
              item.id === customSection.id
                ? { ...item, body: updateLocalized(item.body, locale, value) }
                : item,
            ),
          }))
        }
        rows={6}
        value={localized(customSection.body, locale)}
      />
    </div>
  );
}
