import type { ResumeData } from '@entities/resume';
import { useI18n } from '@shared/i18n';
import { normalizeExternalUrl } from '@shared/lib/urls';

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
  const { t } = useI18n();
  if (!visible) return null;

  return (
    <SectionContainer
      title={t('preview.sections.socials')}
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
              {social.label || social.url || t('preview.sections.socials')}
            </p>
            {social.url && (
              <>
                {normalizeExternalUrl(social.url) ? (
                  <a
                    href={normalizeExternalUrl(social.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'mt-1 block truncate text-xs underline underline-offset-4 print:hidden',
                      variant.link,
                    )}
                    style={themeStyles.link}
                  >
                    {normalizeExternalUrl(social.url)}
                  </a>
                ) : (
                  <span className="mt-1 block truncate text-xs print:hidden">{social.url}</span>
                )}
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
