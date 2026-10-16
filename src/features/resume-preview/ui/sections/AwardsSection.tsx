import { useI18n } from '@shared/i18n';

import { cn } from '../../lib/cn';
import { SectionContainer } from '../components/SectionContainer';
import type { AwardItem, SectionCollectionProps } from './types';

export type AwardsSectionProps = SectionCollectionProps<AwardItem>;

export const AwardsSection = ({
  items: awards,
  visible,
  variant,
  themeStyles,
  registerSectionRef,
  accentStyle,
  setSectionRef,
}: AwardsSectionProps) => {
  const { t } = useI18n();
  if (!visible) return null;

  return (
    <SectionContainer
      title={t('preview.sections.awards')}
      sectionKey="awards"
      registerSectionRef={registerSectionRef}
      accentStyle={accentStyle}
      variant={variant}
      headingStyle={themeStyles.heading}
    >
      <ul className="space-y-2 text-sm">
        {awards.map((award) => (
          <li
            key={award.id}
            ref={setSectionRef('awards', award.id)}
            className={cn('flex items-start justify-between gap-2', variant.metaValue)}
            style={themeStyles.text}
          >
            <span>{award.name}</span>
            <span className={cn('text-xs', variant.timelineMeta)} style={themeStyles.muted}>
              {[award.issuer, award.year].filter(Boolean).join(' · ')}
            </span>
          </li>
        ))}
      </ul>
    </SectionContainer>
  );
};
