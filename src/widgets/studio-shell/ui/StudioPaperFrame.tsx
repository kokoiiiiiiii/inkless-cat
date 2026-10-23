import type { DemoModule, DemoResume, DemoTemplateId } from '@features/studio-demo';
import { StudioIcon } from '@shared/ui/studio';

type StudioPaperFrameProps = {
  modules: DemoModule[];
  resume: DemoResume;
  template: DemoTemplateId;
};

const moduleLabels: Record<DemoModule['id'], string> = {
  experience: '工作经历',
  projects: '项目经验',
  education: '教育经历',
  skills: '技能',
};

export const StudioPaperFrame = ({ modules, resume, template }: StudioPaperFrameProps) => (
  <section aria-label="简历实时预览" className="studio-paper-frame">
    <article
      aria-label="A4 合成简历页面，可在页面内滚动查看内容"
      className={`studio-paper studio-paper--${template}`}
    >
      <header className="studio-paper__identity">
        <p className="studio-paper__eyebrow">PRODUCT DESIGN · EXPERIENCE STRATEGY</p>
        <h2>{resume.name || '姓名'}</h2>
        <p className="studio-paper__role">{resume.role || '目标职位'}</p>
        <div className="studio-paper__contact">
          {resume.email ? <span>{resume.email}</span> : null}
          {resume.location ? <span>{resume.location}</span> : null}
        </div>
      </header>
      {resume.summary ? (
        <section className="studio-paper__summary">
          <h3>个人简介</h3>
          <p>{resume.summary}</p>
        </section>
      ) : null}
      <div className="studio-paper__sections">
        {modules
          .filter((module) => module.visible)
          .map((module) => (
            <section
              className={`studio-paper__section studio-paper__section--${module.id}`}
              key={module.id}
            >
              <h3>{moduleLabels[module.id]}</h3>
              {module.id === 'experience' ? (
                <div className="studio-paper__entry">
                  <div>
                    <strong>体验设计负责人</strong>
                    <span>2022 — 至今</span>
                  </div>
                  <p>澄序产品工作室 · 上海</p>
                  <ul>
                    <li>重构复杂协作流程，让团队更快找到关键信息。</li>
                    <li>建立研究与设计评审节奏，缩短跨团队交接周期。</li>
                  </ul>
                </div>
              ) : null}
              {module.id === 'projects' ? (
                <div className="studio-paper__entry">
                  <div>
                    <strong>城市服务体验地图</strong>
                    <span>2024</span>
                  </div>
                  <p>从用户研究到服务蓝图，梳理 6 个高频办理场景。</p>
                </div>
              ) : null}
              {module.id === 'education' ? (
                <div className="studio-paper__entry">
                  <div>
                    <strong>同济大学</strong>
                    <span>2016 — 2020</span>
                  </div>
                  <p>设计学 · 学士</p>
                </div>
              ) : null}
              {module.id === 'skills' ? (
                <p className="studio-paper__skills">
                  产品策略 · 用户研究 · 信息架构 · 原型设计 · 设计系统
                </p>
              ) : null}
            </section>
          ))}
      </div>
      {modules.every((module) => !module.visible) ? (
        <p className="studio-paper__empty">
          <StudioIcon name="info" /> 显示一个模块即可预览示例内容。
        </p>
      ) : null}
      <footer className="studio-paper__footer">INKLESS CAT STUDIO · 合成内容预览</footer>
    </article>
  </section>
);
