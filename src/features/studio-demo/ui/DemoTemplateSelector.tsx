import { StudioIcon } from '@shared/ui/studio';

import type { DemoTemplateId } from '../model/useDemoStudio';

type DemoTemplateSelectorProps = {
  onChange: (template: DemoTemplateId) => void;
  selected: DemoTemplateId;
};

const templates: Array<{ detail: string; id: DemoTemplateId; name: string; style: string }> = [
  {
    id: 'mist',
    name: '清晰留白',
    detail: '安静的蓝灰层级，适合专业履历。',
    style: 'studio-template-swatch--mist',
  },
  {
    id: 'folio',
    name: '作品叙事',
    detail: '强调项目标题与成果阅读顺序。',
    style: 'studio-template-swatch--folio',
  },
  {
    id: 'column',
    name: '轻量分栏',
    detail: '用精细分隔线整理多类信息。',
    style: 'studio-template-swatch--column',
  },
];

export const DemoTemplateSelector = ({ onChange, selected }: DemoTemplateSelectorProps) => (
  <fieldset className="studio-template-selector">
    <legend className="studio-sr-only">选择演示模板</legend>
    <div className="studio-template-options">
      {templates.map((template) => (
        <label
          className={`studio-template-option ${selected === template.id ? 'is-selected' : ''}`}
          key={template.id}
        >
          <input
            checked={selected === template.id}
            name="studio-demo-template"
            onChange={() => onChange(template.id)}
            type="radio"
            value={template.id}
          />
          <span aria-hidden="true" className={`studio-template-swatch ${template.style}`}>
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="studio-template-option__copy">
            <strong>{template.name}</strong>
            <span>{template.detail}</span>
          </span>
          <span aria-hidden="true" className="studio-template-option__check">
            <StudioIcon name="check" />
          </span>
        </label>
      ))}
    </div>
    <p className="studio-demo-privacy">
      <StudioIcon name="info" /> 这里只切换原型排版样式，不更改生产模板或正式打印契约
    </p>
  </fieldset>
);
