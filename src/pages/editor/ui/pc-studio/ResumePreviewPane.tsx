import type { ActiveSectionKey, ResumeData } from '@entities/resume';
import type { TemplateTheme } from '@entities/template';
import type { RegisterSectionRef } from '@features/resume-preview';
import { ResumePreview } from '@features/resume-preview';
import { useI18n } from '@shared/i18n';

import {
  PC_PREVIEW_A4_HEIGHT,
  PC_PREVIEW_A4_WIDTH,
  PC_PREVIEW_MAX_ZOOM,
  PC_PREVIEW_MIN_ZOOM,
  usePCPreviewZoom,
} from './usePCPreviewZoom';

type ResumePreviewPaneProps = {
  visible: boolean;
  resume: ResumeData;
  activeSections: ActiveSectionKey[];
  registerSectionRef: RegisterSectionRef;
  templateStyle?: string;
  accentColor?: string;
  theme?: TemplateTheme;
  title?: string;
  onFocusPreview?: () => void;
  onReturnToEdit?: () => void;
};

const ResumePreviewPane = ({
  visible,
  resume,
  activeSections,
  registerSectionRef,
  templateStyle,
  accentColor,
  theme,
  title,
  onFocusPreview,
  onReturnToEdit,
}: ResumePreviewPaneProps) => {
  const { t } = useI18n();
  const {
    zoom,
    zoomPercent,
    naturalHeight,
    containerSize,
    scrollRef,
    stageRef,
    paperRef,
    zoomIn,
    zoomOut,
    setManualZoom,
    setFitWidth,
  } = usePCPreviewZoom();

  return (
    <section
      className={`pc-preview-pane ${visible ? '' : 'is-hidden'}`}
      aria-label={t('editor.pcStudio.previewModule')}
      data-testid="pc-preview-pane"
      aria-hidden={!visible}
      data-zoom-mode={zoom.mode}
      data-effective-scale={zoom.scale}
      data-container-width={containerSize.width}
    >
      <div className="pc-preview-toolbar">
        <div>
          <span className="pc-eyebrow">{title || t('editor.pcStudio.livePreview')}</span>
          <strong>{t('editor.pcStudio.a4Live')}</strong>
        </div>
        <div className="pc-preview-controls">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoomPercent <= PC_PREVIEW_MIN_ZOOM}
            data-testid="pc-preview-zoom-out"
            aria-label={t('editor.pcStudio.zoomOut')}
            title={t('editor.pcStudio.zoomOut')}
          >
            −
          </button>
          <output data-testid="pc-preview-zoom-value" aria-label={`${zoomPercent}%`}>
            {zoomPercent}%
          </output>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoomPercent >= PC_PREVIEW_MAX_ZOOM}
            data-testid="pc-preview-zoom-in"
            aria-label={t('editor.pcStudio.zoomIn')}
            title={t('editor.pcStudio.zoomIn')}
          >
            ＋
          </button>
          <button
            className="pc-fit-button"
            type="button"
            onClick={() => setManualZoom(1)}
            aria-pressed={zoom.mode === 'MANUAL' && zoomPercent === 100}
            data-testid="pc-preview-zoom-100"
          >
            100%
          </button>
          <button
            className="pc-fit-button"
            type="button"
            onClick={setFitWidth}
            aria-pressed={zoom.mode === 'FIT_WIDTH'}
            data-testid="pc-preview-fit-width"
          >
            {t('editor.pcStudio.fit')}
          </button>
        </div>
        {onFocusPreview && (
          <button
            className="pc-preview-return"
            type="button"
            onClick={onFocusPreview}
            data-testid="pc-preview-focus"
          >
            {t('editor.pcStudio.focusPreview')}
          </button>
        )}
        {onReturnToEdit && (
          <button className="pc-preview-return" type="button" onClick={onReturnToEdit}>
            {t('editor.pcStudio.edit')}
          </button>
        )}
      </div>

      <div className="pc-preview-scroll" ref={scrollRef} style={{ display: 'block' }}>
        <div
          className="pc-preview-stage"
          ref={stageRef}
          style={{
            display: 'block',
            position: 'relative',
            height: naturalHeight * zoom.scale,
            width: PC_PREVIEW_A4_WIDTH * zoom.scale,
            margin: '0 auto',
          }}
          data-testid="pc-preview-stage"
          data-zoom-scale={zoom.scale}
        >
          <div
            className="pc-preview-paper"
            ref={paperRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: PC_PREVIEW_A4_WIDTH,
              minHeight: PC_PREVIEW_A4_HEIGHT,
              transform: `scale(${zoom.scale})`,
              transformOrigin: 'top left',
            }}
            data-testid="pc-preview-paper"
          >
            <ResumePreview
              resume={resume}
              activeSections={activeSections}
              registerSectionRef={registerSectionRef}
              templateStyle={templateStyle}
              accentColor={accentColor}
              theme={theme}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResumePreviewPane;
