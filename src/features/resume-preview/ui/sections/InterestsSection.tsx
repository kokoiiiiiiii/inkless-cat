import { useI18n } from '@shared/i18n';

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
  const { t } = useI18n();
  if (!visible) return null;

  return (
    <SectionContainer
      title={t('preview.sections.interests')}
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
