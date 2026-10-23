import type { DemoModule, DemoResume, DemoTemplateId } from '@features/studio-demo';
import { StudioSegmentedControl } from '@shared/ui/studio';
import { useState } from 'react';

import { StudioPaperFrame } from './StudioPaperFrame';

type StudioPreviewPanelProps = {
  modules: DemoModule[];
  resume: DemoResume;
  template: DemoTemplateId;
};

type PaperScale = 'comfortable' | 'large';

const scaleOptions: Array<{ label: string; value: PaperScale }> = [
  { label: '适合', value: 'comfortable' },
  { label: '放大', value: 'large' },
];

export const StudioPreviewPanel = ({ modules, resume, template }: StudioPreviewPanelProps) => {
  const [scale, setScale] = useState<PaperScale>('comfortable');

  return (
    <section aria-labelledby="studio-preview-title" className="studio-preview-panel">
      <div className="studio-preview-heading">
        <div>
          <p className="studio-eyebrow">LIVE PREVIEW</p>
          <h2 id="studio-preview-title">A4 纸张预览</h2>
        </div>
        <StudioSegmentedControl
          aria-label="预览缩放"
          onChange={setScale}
          options={scaleOptions}
          value={scale}
        />
      </div>
      <div
        aria-label="A4 纸张预览滚动区"
        className={`studio-paper-stage studio-paper-stage--${scale}`}
        role="region"
        tabIndex={0}
      >
        <StudioPaperFrame modules={modules} resume={resume} template={template} />
      </div>
      <div aria-live="polite" className="studio-preview-footer">
        <span>
          <span className="studio-preview-footer__dot" /> 预览已更新
        </span>
        <span>合成内容 · 不连接正式打印</span>
      </div>
    </section>
  );
};
