import { cn } from '../../lib/cn';
import { SectionContainer } from '../components/SectionContainer';
import type { InterestItem, SectionCollectionProps } from './types';

export type InterestsSectionProps = SectionCollectionProps<InterestItem>;

export const InterestsSection = ({
  items: interests,
  visible,
  variant,
  themeStyles,
  registerSectionRef,
  accentStyle,
}: InterestsSectionProps) => {
  if (!visible) return null;

  return (
    <SectionContainer
      title="兴趣爱好"
      sectionKey="interests"
      registerSectionRef={registerSectionRef}
      accentStyle={accentStyle}
      variant={variant}
      headingStyle={themeStyles.heading}
    >
      <p className={cn('text-sm', variant.metaValue)} style={themeStyles.text}>
        {interests
          .map((interest) => interest.name)
          .filter(Boolean)
          .join(' ｜ ')}
      </p>
    </SectionContainer>
  );
};
