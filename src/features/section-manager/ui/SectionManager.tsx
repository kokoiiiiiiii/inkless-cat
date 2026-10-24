import type { ResumeCustomSection } from '@entities/resume';
import { useI18n } from '@shared/i18n';
import { memo } from 'react';

import {
  type SectionReorderHandler,
  type SectionToggleHandler,
  useSectionManager,
} from '../model/useSectionManager';
import { useSectionOrderHistory } from '../model/useSectionOrderHistory';
import { CustomSectionPanel } from './components/CustomSectionPanel';
import { SectionSortPanel } from './components/SectionSortPanel';
import { SectionTogglePanel } from './components/SectionTogglePanel';

type SectionManagerProps = {
  activeSections?: string[];
  onToggleSection?: SectionToggleHandler;
  customSections?: ResumeCustomSection[];
  onAddCustomSection?: () => void;
  onRemoveCustomSection?: (sectionId: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
  onReorderSections?: SectionReorderHandler;
  panelId?: string;
};

export const SectionManager = memo(
  ({
    activeSections,
    onToggleSection,
    customSections,
    onAddCustomSection,
    onRemoveCustomSection,
    isOpen,
    onToggle,
    onReorderSections,
    panelId = 'section-manager-panel',
  }: SectionManagerProps) => {
    const { t } = useI18n();
    const open = typeof isOpen === 'boolean' ? isOpen : true;

    const { canRestore, canUndo, handleReorder, handleRestore, handleUndo } =
      useSectionOrderHistory({
        activeSections,
        onReorderSections,
      });

    const {
      resolvedActiveSections,
      customList,
      standardAllEnabled,
      standardAnyEnabled,
      displayOrder,
      dragState,
      dragCompletion,
      dragListRef,
      getSectionTitle,
      handleToggleAllStandard,
      handlePointerDown,
    } = useSectionManager({
      activeSections,
      customSections,
      onToggleSection,
      onReorderSections: onReorderSections ? handleReorder : undefined,
    });

    return (
      <section
        id="production-modules-navigation-target"
        className="space-y-3"
        tabIndex={-1}
        aria-labelledby="production-modules-heading"
      >
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3
              id="production-modules-heading"
              className="text-base font-semibold text-slate-900 dark:text-white"
            >
              {t('modules.manager.title')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('modules.manager.desc')}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200 sm:w-auto"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={panelId}
          >
            {open ? t('modules.manager.collapse') : t('modules.manager.expand')}
          </button>
        </header>
        <div id={panelId} className="space-y-4" hidden={!open}>
          <SectionSortPanel
            resolvedActiveSections={resolvedActiveSections}
            displayOrder={displayOrder}
            dragState={dragState}
            dragCompletion={dragCompletion}
            dragListRef={dragListRef}
            getSectionTitle={getSectionTitle}
            handlePointerDown={handlePointerDown}
            canRestore={canRestore}
            canUndo={canUndo}
            onReorderSections={onReorderSections ? handleReorder : undefined}
            onRestore={handleRestore}
            onUndo={handleUndo}
          />
          <SectionTogglePanel
            resolvedActiveSections={resolvedActiveSections}
            standardAllEnabled={standardAllEnabled}
            standardAnyEnabled={standardAnyEnabled}
            handleToggleAllStandard={handleToggleAllStandard}
            onToggleSection={onToggleSection}
          />
          <CustomSectionPanel
            customSections={customList}
            resolvedActiveSections={resolvedActiveSections}
            onToggleSection={onToggleSection}
            onAddCustomSection={onAddCustomSection}
            onRemoveCustomSection={onRemoveCustomSection}
          />
        </div>
      </section>
    );
  },
);

SectionManager.displayName = 'SectionManager';

export default SectionManager;
