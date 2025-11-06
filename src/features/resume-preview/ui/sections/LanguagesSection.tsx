import { cn } from '../../lib/cn';
import { SectionContainer } from '../components/SectionContainer';
import type { LanguageItem, SectionCollectionProps } from './types';

export type LanguagesSectionProps = SectionCollectionProps<LanguageItem>;

export const LanguagesSection = ({
  items: languages,
  visible,
  variant,
  themeStyles,
  registerSectionRef,
  accentStyle,
  setSectionRef,
}: LanguagesSectionProps) => {
  if (!visible) return null;

  return (
    <SectionContainer
      title="语言能力"
      sectionKey="languages"
      registerSectionRef={registerSectionRef}
      accentStyle={accentStyle}
      variant={variant}
      headingStyle={themeStyles.heading}
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {languages.map((language) => (
          <li
            key={language.id}
            ref={setSectionRef('languages', language.id)}
            className={cn('flex flex-col gap-1 text-sm', variant.metaValue)}
            style={themeStyles.text}
          >
            <span className="font-semibold">{language.name}</span>
            {language.level && (
              <span
                className={cn('text-xs uppercase', variant.timelineMeta)}
                style={themeStyles.muted}
              >
                {language.level}
              </span>
            )}
          </li>
        ))}
      </ul>
    </SectionContainer>
  );
};
