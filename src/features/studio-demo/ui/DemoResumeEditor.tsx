import { StudioCard, StudioIcon, StudioInput, StudioTextarea } from '@shared/ui/studio';

import type { DemoResume } from '../model/useDemoStudio';

type DemoResumeEditorProps = {
  onStartInterview: () => void;
  onUpdate: <Key extends keyof DemoResume>(key: Key, value: DemoResume[Key]) => void;
  resume: DemoResume;
};

export const DemoResumeEditor = ({ onStartInterview, onUpdate, resume }: DemoResumeEditorProps) => (
  <div className="studio-demo-editor">
    <StudioCard className="studio-demo-card studio-demo-card--guide" inset="compact">
      <div className="studio-guide-icon">
        <StudioIcon name="check" />
      </div>
      <div>
        <strong>内容结构已就绪</strong>
        <p>修改字段后，纸张预览会即时反映当前合成内容。</p>
      </div>
      <span>实时预览</span>
    </StudioCard>

    <StudioCard className="studio-demo-card studio-demo-card--form">
      <div className="studio-card-heading">
        <div>
          <p className="studio-eyebrow">01 · 基本资料</p>
          <h2>让重要信息一目了然</h2>
        </div>
        <span className="studio-completion">4 / 5</span>
      </div>
      <div className="studio-form-grid">
        <StudioInput
          autoComplete="off"
          label="姓名"
          maxLength={80}
          onValueChange={(value) => onUpdate('name', value)}
          value={resume.name}
        />
        <StudioInput
          label="目标职位"
          maxLength={100}
          onValueChange={(value) => onUpdate('role', value)}
          value={resume.role}
        />
        <StudioInput
          autoComplete="off"
          inputMode="email"
          label="电子邮箱"
          maxLength={160}
          onValueChange={(value) => onUpdate('email', value)}
          type="email"
          value={resume.email}
        />
        <StudioInput
          label="所在城市"
          maxLength={80}
          onValueChange={(value) => onUpdate('location', value)}
          value={resume.location}
        />
        <div className="studio-form-grid__wide">
          <StudioTextarea
            label="个人简介"
            maxLength={500}
            onValueChange={(value) => onUpdate('summary', value)}
            rows={4}
            value={resume.summary}
          />
        </div>
      </div>
      <p className="studio-demo-privacy">
        <StudioIcon name="shield" /> 仅当前页面的合成数据 · 不写入正式简历
      </p>
    </StudioCard>

    <button className="studio-ai-entry" onClick={onStartInterview} type="button">
      <span className="studio-ai-entry__icon">
        <StudioIcon name="sparkles" />
      </span>
      <span>
        <strong>从经历开始探索</strong>
        <small>AI 访谈界面演示 · 不调用模型</small>
      </span>
      <span aria-hidden="true" className="studio-ai-entry__arrow">
        →
      </span>
    </button>
  </div>
);
