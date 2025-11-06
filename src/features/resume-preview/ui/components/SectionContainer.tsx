import type { CSSProperties, ReactNode } from 'react';

import { cn } from '../../lib/cn';
import type { VariantConfig } from '../../lib/variants';
import type { RegisterSectionRef } from '../../model/useResumePreviewState';

type SectionContainerProps = {
  title: string;
  children: ReactNode;
  sectionKey: string;
  registerSectionRef?: RegisterSectionRef;
  variant: VariantConfig;
  accentStyle?: CSSProperties;
  headingStyle?: CSSProperties;
};

export const SectionContainer = ({
  title,
  children,
  sectionKey,
  registerSectionRef,
  variant,
  accentStyle,
  headingStyle,
}: SectionContainerProps) => {
  const handleRef = (node: HTMLElement | null) => {
    if (registerSectionRef) {
      registerSectionRef(sectionKey, '__section__', node);
    }
  };

  return (
    <section ref={handleRef} className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={cn('h-2 w-8 rounded-full', variant.accentBar)} style={accentStyle} />
        <h3 className={cn('text-lg font-semibold', variant.sectionHeading)} style={headingStyle}>
          {title}
        </h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
};
