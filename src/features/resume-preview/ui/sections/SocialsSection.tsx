import type { ResumeData } from '@entities/resume';

import { cn } from '../../lib/cn';
import { SectionContainer } from '../components/SectionContainer';
import type { SectionCollectionProps } from './types';

type SocialItem = NonNullable<ResumeData['socials']>[number];

export type SocialsSectionProps = SectionCollectionProps<SocialItem>;

export const SocialsSection = ({
  items: socials,
  visible,
  variant,
  themeStyles,
  registerSectionRef,
  accentStyle,
  setSectionRef,
}: SocialsSectionProps) => {
  if (!visible) return null;

  return (
    <SectionContainer
      title="社交与链接"
      sectionKey="socials"
      registerSectionRef={registerSectionRef}
      accentStyle={accentStyle}
      variant={variant}
      headingStyle={themeStyles.heading}
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {socials.map((social) => (
          <li
            key={social.id}
            ref={setSectionRef('socials', social.id)}
            className={cn(
              'rounded-2xl border border-transparent px-4 py-3 text-sm shadow-sm transition hover:-translate-y-0.5',
              variant.card,
              variant.link,
            )}
            style={themeStyles.card}
          >
            <p className={cn('font-semibold', variant.heading)} style={themeStyles.heading}>
              {social.label || social.url || '链接'}
            </p>
            {social.url && (
              <>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'mt-1 block truncate text-xs underline underline-offset-4 print:hidden',
                    variant.link,
                  )}
                  style={themeStyles.link}
                >
                  {social.url}
                </a>
                <span
                  className={cn('mt-1 hidden break-words text-xs print:block', variant.metaValue)}
                  style={themeStyles.text}
                >
                  {social.url}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </SectionContainer>
  );
};
