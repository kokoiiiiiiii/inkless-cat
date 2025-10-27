import { deriveSectionsFromResume, normalizeResumeSchema, type ResumeData } from '@entities/resume';
import { useCallback } from 'react';

import { useResumeActions } from '@/stores/resume.store';

type ImportResult = {
  success: boolean;
  message?: string;
};

const isResumeData = (value: unknown): value is ResumeData =>
  Boolean(value && typeof value === 'object' && 'personal' in (value as Record<string, unknown>));

export const useImportResume = () => {
  const { updateResume, updateActiveSections } = useResumeActions();

  const importFromObject = useCallback(
    (payload: unknown): ImportResult => {
      if (!isResumeData(payload)) {
        return { success: false, message: '导入的文件缺少必要的字段。' };
      }
      const normalized = normalizeResumeSchema(payload, { clone: true });
      updateResume(normalized, { markDirty: true, syncSections: false });
      updateActiveSections(() => deriveSectionsFromResume(normalized));
      return { success: true };
    },
    [updateResume, updateActiveSections],
  );

  const importFromJson = useCallback(
    (content: string): ImportResult => {
      try {
        const data = JSON.parse(content) as ResumeData;
        return importFromObject(data);
      } catch (error) {
        return { success: false, message: `解析失败：${(error as Error).message}` };
      }
    },
    [importFromObject],
  );

  return { importFromObject, importFromJson };
};
