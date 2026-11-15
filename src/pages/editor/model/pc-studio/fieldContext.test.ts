import { createEmptyResume } from '@entities/resume';
import { describe, expect, it } from 'vitest';

import { createStudioFieldContext } from './fieldContext';

const createResume = () => {
  const resume = createEmptyResume();
  resume.personal.fullName = '林悦';
  resume.personal.title = '产品战略负责人';
  resume.personal.summary = '将复杂产品策略转化为清晰的增长路径。';
  resume.experience = [
    {
      id: 'exp-1',
      company: 'Northstar',
      role: '产品负责人',
      highlights: ['增长 32%', '交付周期缩短'],
    },
  ];
  resume.projects = [
    {
      id: 'project-1',
      name: 'Northstar Insights',
      summary: '面向企业客户的分析平台。',
      highlights: ['项目亮点目前没有正式 AI 写入器'],
    },
  ];
  return resume;
};

describe('PC Studio field context adapter', () => {
  it('maps personal summary to its canonical source and supported write path', () => {
    const context = createStudioFieldContext(createResume(), {
      moduleKey: 'personal',
      sectionKey: 'personal',
      itemKey: 'personal',
      fieldId: 'personal.summary',
    });

    expect(context.sourceValue).toBe('将复杂产品策略转化为清晰的增长路径。');
    expect(context.aiTarget).toEqual({ kind: 'personal-summary' });
    expect(context.writeTarget).toBe('personal.summary');
    expect(context.requestContext).toEqual({
      moduleKey: 'personal',
      itemKey: 'personal',
      fieldId: 'personal.summary',
      sourceValue: '将复杂产品策略转化为清晰的增长路径。',
      targetPath: 'personal.summary',
      sourceRevision: 0,
      workspaceGeneration: 0,
      selectionRange: null,
    });
  });

  it('carries non-persistent source revision, workspace generation, and editor selection metadata', () => {
    const selectionRange = { start: 4, end: 13, direction: 'backward' as const };
    const context = createStudioFieldContext(
      createResume(),
      {
        moduleKey: 'personal',
        sectionKey: 'personal',
        itemKey: 'personal',
        fieldId: 'personal.summary',
      },
      { sourceRevision: 27, workspaceGeneration: 4, selectionRange },
    );

    expect(context).toMatchObject({
      sourceRevision: 27,
      workspaceGeneration: 4,
      selectionRange,
      requestContext: {
        sourceRevision: 27,
        workspaceGeneration: 4,
        selectionRange,
      },
    });
  });

  it('keeps the personal title visible but unavailable to AI writes', () => {
    const context = createStudioFieldContext(createResume(), {
      moduleKey: 'personal',
      sectionKey: 'personal',
      itemKey: 'personal',
      fieldId: 'personal.title',
    });

    expect(context.sourceValue).toBe('产品战略负责人');
    expect(context.aiTarget).toBeNull();
    expect(context.writeTarget).toBeNull();
  });

  it('uses the experience item ID and highlights field without consulting its label', () => {
    const resume = createResume();
    const identity = {
      moduleKey: 'experience' as const,
      sectionKey: 'experience',
      itemKey: 'exp-1',
      fieldId: 'experience.exp-1.highlights',
    };
    const englishContext = createStudioFieldContext(resume, identity);
    const chineseContext = createStudioFieldContext(resume, identity);

    expect(englishContext.aiTarget).toEqual({ kind: 'experience-highlights', itemId: 'exp-1' });
    expect(chineseContext.aiTarget).toEqual(englishContext.aiTarget);
    expect(englishContext.sourceValue).toEqual(['增长 32%', '交付周期缩短']);
    expect(englishContext.writeTarget).toBe('experience.exp-1.highlights');
  });

  it('maps project summary and leaves unsupported project highlights unavailable', () => {
    const resume = createResume();
    const summary = createStudioFieldContext(resume, {
      moduleKey: 'projects',
      sectionKey: 'projects',
      itemKey: 'project-1',
      fieldId: 'projects.project-1.summary',
    });
    const highlights = createStudioFieldContext(resume, {
      moduleKey: 'projects',
      sectionKey: 'projects',
      itemKey: 'project-1',
      fieldId: 'projects.project-1.highlights',
    });

    expect(summary.aiTarget).toEqual({ kind: 'project-summary', itemId: 'project-1' });
    expect(summary.sourceValue).toBe('面向企业客户的分析平台。');
    expect(summary.writeTarget).toBe('projects.project-1.summary');
    expect(highlights.sourceValue).toEqual(['项目亮点目前没有正式 AI 写入器']);
    expect(highlights.aiTarget).toBeNull();
    expect(highlights.writeTarget).toBeNull();
  });

  it('refuses AI context when an item identity is missing or duplicated', () => {
    const resume = createResume();
    const identity = {
      moduleKey: 'experience' as const,
      sectionKey: 'experience',
      itemKey: 'exp-1',
      fieldId: 'experience.exp-1.highlights',
    };

    resume.experience = [];
    expect(createStudioFieldContext(resume, identity).aiTarget).toBeNull();
    resume.experience = [
      { id: 'exp-1', company: 'A', highlights: [] },
      { id: 'exp-1', company: 'B', highlights: [] },
    ];
    expect(createStudioFieldContext(resume, identity).aiTarget).toBeNull();
  });
});
