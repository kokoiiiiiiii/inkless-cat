import type { ResumeCustomSection } from '@entities/resume';
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
import { useUndoHotkey } from './hooks/useUndoHotkey';

type SectionManagerProps = {
  activeSections?: string[];
  onToggleSection?: SectionToggleHandler;
  customSections?: ResumeCustomSection[];
  onAddCustomSection?: () => void;
  onRemoveCustomSection?: (sectionId: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
  onReorderSections?: SectionReorderHandler;
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
  }: SectionManagerProps) => {
    const open = typeof isOpen === 'boolean' ? isOpen : true;

    const {
      resolvedActiveSections,
      customList,
      standardAllEnabled,
      standardAnyEnabled,
      displayOrder,
      dragState,
      dragListRef,
      getSectionTitle,
      handleToggleAllStandard,
      handlePointerDown,
    } = useSectionManager({
      activeSections,
      customSections,
      onToggleSection,
      onReorderSections,
    });

    const { canRestore, canUndo, handleRestore, handleUndo } = useSectionOrderHistory({
      activeSections,
      onReorderSections,
    });

    useUndoHotkey(open, handleUndo);

    return (
      <section className="space-y-3">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">模块管理</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              可自行开启/关闭模块，保持简历结构灵活，并支持拖动排序。
            </p>
          </div>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200 sm:w-auto"
            onClick={onToggle}
            aria-expanded={open}
          >
            {open ? '收起模块管理' : '展开模块管理'}
          </button>
        </header>
        {open && (
          <div className="space-y-4">
            <SectionSortPanel
              resolvedActiveSections={resolvedActiveSections}
              displayOrder={displayOrder}
              dragState={dragState}
              dragListRef={dragListRef}
              getSectionTitle={getSectionTitle}
              handlePointerDown={handlePointerDown}
              canRestore={canRestore}
              canUndo={canUndo}
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
        )}
      </section>
    );
  },
);

SectionManager.displayName = 'SectionManager';

export default SectionManager;
