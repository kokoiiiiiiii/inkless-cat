import type { StandardSectionKey } from '@entities/module';
import type { ReactNode } from 'react';

export type FieldOptions = {
  placeholder?: string;
  focusId?: string;
};

export type TextareaOptions = FieldOptions & {
  rows?: number;
};

export type FieldHelpers = {
  input: (field: string, options?: FieldOptions) => ReactNode;
  textarea: (field: string, options?: TextareaOptions) => ReactNode;
  list: (field: string, options?: TextareaOptions) => ReactNode;
  placeholder: (field: string, fallback: string) => string;
  itemId: string;
};

type SectionRenderer = (helpers: FieldHelpers) => ReactNode;

const rendererMap: Partial<Record<StandardSectionKey, SectionRenderer>> = {
  socials: ({ input, placeholder }) => (
    <>
      {input('label', { placeholder: placeholder('label', 'GitHub / 个人网站') })}
      {input('url', { placeholder: placeholder('url', 'https://example.com') })}
    </>
  ),
  experience: ({ input, list, placeholder }) => (
    <>
      {input('company', { placeholder: placeholder('company', '公司或团队名称') })}
      {input('role', { placeholder: placeholder('role', '职位 / 角色') })}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {input('location', { placeholder: placeholder('location', '所在城市') })}
        {input('startDate', { placeholder: placeholder('startDate', '2019-06') })}
        {input('endDate', { placeholder: placeholder('endDate', '至今 / 2023-08') })}
      </div>
      {list('highlights', {
        rows: 4,
        placeholder: placeholder('highlights', '每行一个成果或职责'),
      })}
    </>
  ),
  education: ({ input, textarea, placeholder, itemId }) => (
    <>
      {input('school', { placeholder: placeholder('school', '学校') })}
      {input('degree', { placeholder: placeholder('degree', '学历 / 专业') })}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {input('startDate', { placeholder: placeholder('startDate', '2014') })}
        {input('endDate', { placeholder: placeholder('endDate', '2018') })}
      </div>
      {textarea('details', {
        rows: 3,
        placeholder: placeholder('details', '校内成绩、荣誉或主修课程'),
        focusId: itemId,
      })}
    </>
  ),
  projects: ({ input, textarea, placeholder, itemId }) => (
    <>
      {input('name', { placeholder: placeholder('name', '项目名称') })}
      {input('role', { placeholder: placeholder('role', '角色 / 负责范围') })}
      {textarea('summary', {
        rows: 3,
        placeholder: placeholder('summary', '简要说明项目背景、亮点与成果'),
        focusId: itemId,
      })}
      {input('link', { placeholder: placeholder('link', 'https://项目链接（可选）') })}
    </>
  ),
  skills: ({ input, list, placeholder, itemId }) => (
    <>
      {input('title', { placeholder: placeholder('title', '例如：前端 / 工程实践') })}
      {list('items', {
        rows: 3,
        placeholder: placeholder('items', '每行一个技能或关键字'),
        focusId: itemId,
      })}
    </>
  ),
  languages: ({ input, placeholder }) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {input('name', { placeholder: placeholder('name', '语言') })}
      {input('level', { placeholder: placeholder('level', '熟练程度') })}
    </div>
  ),
  interests: ({ input, placeholder, itemId }) =>
    input('name', { placeholder: placeholder('name', '兴趣 / 爱好'), focusId: itemId }),
  awards: ({ input, placeholder }) => (
    <>
      {input('name', { placeholder: placeholder('name', '奖项名称') })}
      {input('issuer', { placeholder: placeholder('issuer', '颁发机构') })}
      {input('year', { placeholder: placeholder('year', '年份') })}
    </>
  ),
};

export const renderSectionFields = (
  sectionKey: StandardSectionKey,
  helpers: FieldHelpers,
): ReactNode => {
  const renderer = rendererMap[sectionKey];
  return renderer ? renderer(helpers) : null;
};
