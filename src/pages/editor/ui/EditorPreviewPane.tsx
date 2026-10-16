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
    className={`flex min-h-0 flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-soft backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/60 dark:shadow-[0_35px_60px_-25px_rgba(15,23,42,0.75)] sm:p-6 print:static print:m-0 print:block print:max-h-none print:min-h-0 print:w-full print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none ${
      visible ? '' : 'hidden print:block'
    } lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden`}
    aria-hidden={!visible && !isLargeScreen}
  >
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
    <div
      ref={scrollRef}
      className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 print:min-h-0 print:flex-none print:overflow-visible print:pr-0"
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
