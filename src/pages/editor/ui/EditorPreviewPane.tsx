import type { ActiveSectionKey, ResumeData } from '@entities/resume';
import type { TemplateTheme } from '@entities/template';
import type { RegisterSectionRef } from '@features/resume-preview';
import { ResumePreview } from '@features/resume-preview';
import type { RefObject } from 'react';

type EditorPreviewPaneProps = {
  visible: boolean;
  isLargeScreen: boolean;
  title: string;
  description: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  resume: ResumeData;
  activeSections: ActiveSectionKey[];
  registerSectionRef: RegisterSectionRef;
  templateStyle?: string;
  accentColor?: string;
  theme?: TemplateTheme;
};

export const EditorPreviewPane = ({
  visible,
  isLargeScreen,
  title,
  description,
  scrollRef,
  resume,
  activeSections,
  registerSectionRef,
  templateStyle,
  accentColor,
  theme,
}: EditorPreviewPaneProps) => (
  <section
    id="production-preview-pane"
    tabIndex={-1}
    aria-labelledby="production-preview-heading"
    className={`studio-glass production-preview-pane flex min-h-0 flex-col gap-4 rounded-3xl p-4 sm:p-6 print:static print:m-0 print:block print:max-h-none print:min-h-0 print:w-full print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none ${
      visible ? '' : 'hidden print:block'
    } lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden`}
    aria-hidden={!visible && !isLargeScreen}
  >
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <div>
        <h2
          className="production-preview-heading text-lg font-semibold text-slate-900 dark:text-white"
          id="production-preview-heading"
        >
          {title}
        </h2>
        <p className="production-preview-description mt-1 text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
    <div
      ref={scrollRef}
      className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 print:min-h-0 print:flex-none print:overflow-visible print:pr-0"
      data-production-preview-scroll="true"
    >
      <ResumePreview
        resume={resume}
        registerSectionRef={registerSectionRef}
        templateStyle={templateStyle}
        accentColor={accentColor}
        activeSections={activeSections}
        theme={theme}
      />
    </div>
  </section>
);
