import { StudioButton, StudioIcon } from '@shared/ui';

import { copy, formatCopy, localized } from '../model/copy';
import type { DemoModule, DemoResume, Direction, Locale, SectionId } from '../model/fixtures';
import styles from './studio-v3.module.css';

export interface ResumePaperProps {
  resume: DemoResume;
  modules: DemoModule[];
  templateId: string;
  locale: Locale;
  direction: Direction;
  presentation: 'a4' | 'reader' | 'canvas';
  onEdit?: (section: SectionId) => void;
}

const listText = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export function ResumePaper({
  resume,
  modules,
  templateId,
  locale,
  direction,
  presentation,
  onEdit,
}: ResumePaperProps) {
  const visibleModules = modules.filter((module) => module.enabled);

  return (
    <article
      aria-label={copy(locale, 'ariaResumeCanvas')}
      className={`${styles.resumePaper} ${styles[`paper-${presentation}`]}`}
      data-direction={direction}
      data-template={templateId}
      data-testid="resume-paper"
    >
      <header className={styles.resumeHeader} id="resume-profile">
        <div className={styles.resumeHeaderMain}>
          <p className={styles.resumeEyebrow}>{copy(locale, 'resumeFixture')}</p>
          <h1>{localized(resume.fullName, locale)}</h1>
          <p className={styles.resumeHeadline}>{localized(resume.headline, locale)}</p>
        </div>
        <div className={styles.resumeMeta}>
          <span>{resume.email}</span>
          <span>{resume.phone}</span>
          <span>{localized(resume.location, locale)}</span>
          <span>{resume.website}</span>
        </div>
        {onEdit && (
          <StudioButton
            aria-label={`${copy(locale, 'editSection')}: ${copy(locale, 'profile')}`}
            className={styles.paperEditButton}
            onClick={() => onEdit('profile')}
            variant="quiet"
          >
            <StudioIcon name="user" size={16} />
            {copy(locale, 'edit')}
          </StudioButton>
        )}
        <p className={styles.resumeSummary}>{localized(resume.summary, locale)}</p>
      </header>

      {visibleModules.map((module, index) => {
        const label = localized(module.title, locale);
        const editButton = onEdit ? (
          <StudioButton
            aria-label={`${copy(locale, 'editSection')}: ${label}`}
            className={styles.paperEditButton}
            onClick={() => onEdit(module.id)}
            variant="quiet"
          >
            {copy(locale, 'edit')}
            <StudioIcon name="arrow-right" size={15} />
          </StudioButton>
        ) : null;

        if (module.id === 'experience') {
          return (
            <section className={styles.resumeSection} id="resume-experience" key={module.id}>
              <div className={styles.resumeSectionHeading}>
                <span className={styles.resumeSectionIndex}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2>{label}</h2>
                {editButton}
              </div>
              <div className={styles.resumeEntryList}>
                {resume.experiences.map((entry) => (
                  <article className={styles.resumeEntry} key={entry.id}>
                    <div className={styles.resumeEntryHeading}>
                      <div>
                        <h3>{entry.company || copy(locale, 'newEntry')}</h3>
                        <p>
                          {localized(entry.role, locale)} · {localized(entry.location, locale)}
                        </p>
                      </div>
                      <time>{entry.dates}</time>
                    </div>
                    <ul className={styles.resumeBullets}>
                      {listText(localized(entry.highlights, locale)).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          );
        }

        if (module.id === 'projects') {
          return (
            <section className={styles.resumeSection} id="resume-projects" key={module.id}>
              <div className={styles.resumeSectionHeading}>
                <span className={styles.resumeSectionIndex}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2>{label}</h2>
                {editButton}
              </div>
              <div className={styles.resumeEntryList}>
                {resume.projects.map((project) => (
                  <article className={styles.resumeEntry} key={project.id}>
                    <div className={styles.resumeEntryHeading}>
                      <div>
                        <h3>{project.name || copy(locale, 'newEntry')}</h3>
                        <p>{localized(project.role, locale)}</p>
                      </div>
                      <time>{project.dates}</time>
                    </div>
                    <p className={styles.resumeBody}>{localized(project.description, locale)}</p>
                    {project.link && <p className={styles.resumeLink}>{project.link}</p>}
                  </article>
                ))}
              </div>
            </section>
          );
        }

        if (module.id === 'education') {
          return (
            <section className={styles.resumeSection} id="resume-education" key={module.id}>
              <div className={styles.resumeSectionHeading}>
                <span className={styles.resumeSectionIndex}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2>{label}</h2>
                {editButton}
              </div>
              <div className={styles.resumeEntryList}>
                {resume.education.map((entry) => (
                  <article className={styles.resumeEntry} key={entry.id}>
                    <div className={styles.resumeEntryHeading}>
                      <div>
                        <h3>{entry.school || copy(locale, 'newEntry')}</h3>
                        <p>{localized(entry.degree, locale)}</p>
                      </div>
                      <time>{entry.dates}</time>
                    </div>
                    <p className={styles.resumeBody}>{localized(entry.detail, locale)}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        }

        if (module.id === 'skills') {
          return (
            <section className={styles.resumeSection} id="resume-skills" key={module.id}>
              <div className={styles.resumeSectionHeading}>
                <span className={styles.resumeSectionIndex}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2>{label}</h2>
                {editButton}
              </div>
              <ul className={styles.resumeSkillList}>
                {resume.skills.map((skill) => (
                  <li key={skill.en || skill.zh}>{localized(skill, locale)}</li>
                ))}
              </ul>
            </section>
          );
        }

        if (module.id === 'languages') {
          return (
            <section className={styles.resumeSection} id="resume-languages" key={module.id}>
              <div className={styles.resumeSectionHeading}>
                <span className={styles.resumeSectionIndex}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2>{label}</h2>
                {editButton}
              </div>
              <ul className={styles.resumeInlineList}>
                {resume.languages.map((language) => (
                  <li key={language.name.en}>
                    <strong>{localized(language.name, locale)}</strong>
                    <span>{localized(language.level, locale)}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        }

        if (module.id === 'awards') {
          return (
            <section className={styles.resumeSection} id="resume-awards" key={module.id}>
              <div className={styles.resumeSectionHeading}>
                <span className={styles.resumeSectionIndex}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2>{label}</h2>
                {editButton}
              </div>
              <ul className={styles.resumeCompactList}>
                {resume.awards.map((award) => (
                  <li key={`${award.name.en}-${award.year}`}>
                    <strong>{localized(award.name, locale)}</strong>
                    <span>
                      {award.organization} · {award.year}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        }

        if (module.id === 'interests') {
          return (
            <section className={styles.resumeSection} id="resume-interests" key={module.id}>
              <div className={styles.resumeSectionHeading}>
                <span className={styles.resumeSectionIndex}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2>{label}</h2>
                {editButton}
              </div>
              <ul className={styles.resumeInlineList}>
                {resume.interests.map((interest) => (
                  <li key={interest.en}>{localized(interest, locale)}</li>
                ))}
                {resume.customSections.map((item) => (
                  <li key={item.id}>{localized(item.title, locale)}</li>
                ))}
              </ul>
            </section>
          );
        }

        const customId = module.id.split(':')[1];
        const custom = resume.customSections.find((item) => item.id === customId);

        return (
          <section className={styles.resumeSection} id={`resume-${module.id}`} key={module.id}>
            <div className={styles.resumeSectionHeading}>
              <span className={styles.resumeSectionIndex}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <h2>{label}</h2>
              {editButton}
            </div>
            <p className={styles.resumeBody}>
              {custom ? localized(custom.body, locale) : copy(locale, 'customContent')}
            </p>
          </section>
        );
      })}
      <footer className={styles.resumeFooter}>
        <span>INKLESS CAT</span>
        <span>{formatCopy(locale, 'sectionCount', { count: visibleModules.length })}</span>
      </footer>
    </article>
  );
}
