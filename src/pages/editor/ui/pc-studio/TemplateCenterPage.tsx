/* eslint-disable tailwindcss/no-custom-classname -- These scoped BEM classes are defined in TemplateCenterPage.css. */
import './TemplateCenterPage.css';

import type { ActiveSectionKey, ResumeData } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import { ResumePreview } from '@features/resume-preview';
import { useI18n } from '@shared/i18n';
import { TemplateThumbnail } from '@widgets/template-selector';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

type TemplateCenterPageProps = {
  builtInTemplates: ResumeTemplate[];
  customTemplates: ResumeTemplate[];
  resume: ResumeData;
  activeSections: ActiveSectionKey[];
  currentTemplateId: string;
  displayedFallbackTemplateName: string;
  onBackToWorkspace: () => void;
  onManageTemplates: (trigger: HTMLButtonElement) => void;
};

type TemplateSource = 'built-in' | 'custom';
type GalleryGroup = 'all' | TemplateSource;
type ViewMode = 'gallery' | 'details' | 'preview';

type TemplateEntry = {
  template: ResumeTemplate;
  source: TemplateSource;
  key: string;
};

const supportedPreviewStyles = new Set(['modern', 'classic', 'creative', 'custom']);

const isTemplateRecord = (value: unknown): value is ResumeTemplate => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ResumeTemplate>;
  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
};

const getSafeDescription = (template: ResumeTemplate) =>
  typeof template.description === 'string' ? template.description : '';

const isSafeHexColor = (value: string) =>
  /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/iu.test(value);

const canRenderThumbnail = (template: ResumeTemplate) =>
  typeof template.previewStyle === 'string' &&
  supportedPreviewStyles.has(template.previewStyle) &&
  typeof template.accentColor === 'string' &&
  isSafeHexColor(template.accentColor);

const canRenderLivePreview = (template: ResumeTemplate) =>
  typeof template.previewStyle === 'string' && supportedPreviewStyles.has(template.previewStyle);

const TemplateCenterPage = ({
  builtInTemplates,
  customTemplates,
  resume,
  activeSections,
  currentTemplateId,
  displayedFallbackTemplateName,
  onBackToWorkspace,
  onManageTemplates,
}: TemplateCenterPageProps) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<GalleryGroup>('all');
  const [selectedDetail, setSelectedDetail] = useState<TemplateEntry | null>(null);
  const [candidate, setCandidate] = useState<TemplateEntry | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const pageRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const pendingGalleryFocusKeyRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (viewMode !== 'gallery') {
      headingRef.current?.focus();
      return;
    }

    const templateKey = pendingGalleryFocusKeyRef.current;
    if (templateKey !== null) {
      const detailButton = [
        ...(pageRef.current?.querySelectorAll<HTMLButtonElement>(
          'button[data-template-detail-trigger]',
        ) ?? []),
      ].find((button) => button.dataset.templateDetailTrigger === templateKey);
      (detailButton ?? headingRef.current)?.focus();
      pendingGalleryFocusKeyRef.current = null;
      return;
    }

    headingRef.current?.focus();
  }, [viewMode]);

  const entries = useMemo<TemplateEntry[]>(() => {
    const safeBuiltIn = Array.isArray(builtInTemplates)
      ? builtInTemplates.filter((template) => isTemplateRecord(template))
      : [];
    const safeCustom = Array.isArray(customTemplates)
      ? customTemplates.filter((template) => isTemplateRecord(template))
      : [];
    return [
      ...safeBuiltIn.map((template, index) => ({
        template,
        source: 'built-in' as const,
        key: `built-in:${index}:${template.id}`,
      })),
      ...safeCustom.map((template, index) => ({
        template,
        source: 'custom' as const,
        key: `custom:${index}:${template.id}`,
      })),
    ];
  }, [builtInTemplates, customTemplates]);

  const currentEntry = entries.find((entry) => entry.template.id === currentTemplateId);
  const missingCurrent = !currentEntry;
  const searchValue = searchQuery.trim().toLocaleLowerCase();

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (activeGroup !== 'all' && entry.source !== activeGroup) return false;
      if (!searchValue) return true;
      const name = entry.template.name.toLocaleLowerCase();
      const description = getSafeDescription(entry.template).toLocaleLowerCase();
      return name.includes(searchValue) || description.includes(searchValue);
    });
  }, [activeGroup, entries, searchValue]);

  const builtInEntries = filteredEntries.filter((entry) => entry.source === 'built-in');
  const customEntries = filteredEntries.filter((entry) => entry.source === 'custom');
  const resolveSelectedEntry = (selection: TemplateEntry | null) =>
    selection
      ? entries.find(
          (entry) =>
            entry.key === selection.key &&
            entry.source === selection.source &&
            entry.template === selection.template,
        )
      : undefined;
  const selectedEntry = viewMode === 'details' ? resolveSelectedEntry(selectedDetail) : undefined;
  const candidateEntry = viewMode === 'preview' ? resolveSelectedEntry(candidate) : undefined;

  const openDetails = (entry: TemplateEntry) => {
    setSelectedDetail(entry);
    setViewMode('details');
  };

  const openPreview = (entry: TemplateEntry) => {
    if (!canRenderLivePreview(entry.template)) return;
    setCandidate(entry);
    setViewMode('preview');
  };

  const backToGallery = (focusKey = candidate?.key ?? selectedDetail?.key ?? null) => {
    pendingGalleryFocusKeyRef.current = focusKey;
    setViewMode('gallery');
    setSelectedDetail(null);
    setCandidate(null);
  };

  const backToWorkspace = () => {
    setSelectedDetail(null);
    setCandidate(null);
    setViewMode('gallery');
    onBackToWorkspace();
  };

  const renderThumbnail = (template: ResumeTemplate) => {
    if (!canRenderThumbnail(template)) {
      return (
        <div
          className="pc-template-center__thumbnail-unavailable"
          role="img"
          aria-label={t('template.gallery.thumbnailUnavailable')}
        >
          <span aria-hidden="true">▧</span>
          <span>{t('template.gallery.thumbnailUnavailableShort')}</span>
        </div>
      );
    }

    return (
      <div role="img" aria-label={t('template.gallery.illustrativeThumbnail')}>
        <TemplateThumbnail
          previewStyle={template.previewStyle}
          accentColor={template.accentColor}
          theme={template.theme}
        />
      </div>
    );
  };

  const renderTemplateCard = (entry: TemplateEntry, index: number) => {
    const { template, source } = entry;
    const isCurrent = entry === currentEntry;
    const description = getSafeDescription(template);
    const nameId = `pc-template-${source}-${index}-name`;

    return (
      <article
        className="pc-template-card"
        key={entry.key}
        aria-labelledby={nameId}
        data-template-id={template.id}
        data-template-source={source}
        data-template-instance-key={entry.key}
      >
        <div className="pc-template-card__body">
          <div className="pc-template-card__thumbnail">{renderThumbnail(template)}</div>
          <div className="pc-template-card__content">
            <div className="pc-template-card__heading-row">
              <h3 className="pc-template-card__name" id={nameId}>
                {template.name || t('template.gallery.unnamedTemplate')}
              </h3>
              {isCurrent && (
                <span className="pc-template-card__current" role="status">
                  <span aria-hidden="true">✓</span>
                  {t('template.gallery.current')}
                </span>
              )}
            </div>
            <p className="pc-template-card__description">
              {description || t('template.gallery.noDescription')}
            </p>
            <p className="pc-template-card__source">
              {t('template.gallery.source')}:{' '}
              {t(`template.gallery.${source === 'built-in' ? 'builtIn' : 'custom'}`)}
            </p>
          </div>
        </div>
        <div className="pc-template-card__actions">
          <span className="pc-template-card__applied-status">
            {isCurrent
              ? t('template.gallery.currentlyApplied')
              : t('template.gallery.notCurrentlyApplied')}
          </span>
          <button
            type="button"
            className="pc-template-center__button pc-template-center__button--secondary"
            data-template-detail-trigger={entry.key}
            onClick={() => openDetails(entry)}
          >
            {t('template.gallery.viewDetails')}
          </button>
        </div>
      </article>
    );
  };

  const renderGroup = (
    group: TemplateSource,
    groupEntries: TemplateEntry[],
    hasTemplates: boolean,
  ) => {
    const heading = t(`template.gallery.${group === 'built-in' ? 'builtIn' : 'custom'}`);
    const groupKey = group === 'built-in' ? 'builtIn' : 'custom';

    if (searchValue && groupEntries.length === 0) return null;
    if (!searchValue && activeGroup === 'all' && !hasTemplates && group === 'built-in') {
      return (
        <section className="pc-template-group" aria-labelledby={`pc-template-group-${groupKey}`}>
          <h2 className="pc-template-group__title" id={`pc-template-group-${groupKey}`}>
            {heading}
          </h2>
          <p className="pc-template-center__empty-group">
            {t('template.gallery.noBuiltInTemplates')}
          </p>
        </section>
      );
    }

    if (!searchValue && activeGroup === 'all' && !hasTemplates && group === 'custom') {
      return (
        <section className="pc-template-group" aria-labelledby={`pc-template-group-${groupKey}`}>
          <h2 className="pc-template-group__title" id={`pc-template-group-${groupKey}`}>
            {heading}
          </h2>
          <p className="pc-template-center__empty-group">
            {t('template.gallery.noCustomTemplates')}
          </p>
        </section>
      );
    }

    if (groupEntries.length === 0) return null;

    return (
      <section className="pc-template-group" aria-labelledby={`pc-template-group-${groupKey}`}>
        <div className="pc-template-group__heading-row">
          <h2 className="pc-template-group__title" id={`pc-template-group-${groupKey}`}>
            {heading}
          </h2>
          <span className="pc-template-group__count">
            {groupEntries.length === 1
              ? t('template.gallery.singleTemplateCount')
              : t('template.gallery.templateCount', { count: groupEntries.length })}
          </span>
        </div>
        <div className="pc-template-grid">
          {groupEntries.map((entry, index) => renderTemplateCard(entry, index))}
        </div>
      </section>
    );
  };

  const groupButtons: Array<{ value: GalleryGroup; label: string }> = [
    { value: 'all', label: t('template.gallery.allTemplates') },
    { value: 'built-in', label: t('template.gallery.builtIn') },
    ...(entries.some((entry) => entry.source === 'custom')
      ? [{ value: 'custom' as const, label: t('template.gallery.custom') }]
      : []),
  ];

  return (
    <main className="pc-template-center" data-testid="pc-template-center" ref={pageRef}>
      <div className="pc-template-center__inner">
        <header className="pc-template-center__header">
          <div className="pc-template-center__heading-copy">
            <p className="pc-template-center__eyebrow">{t('template.gallery.eyebrow')}</p>
            <h1 className="pc-template-center__title" ref={headingRef} tabIndex={-1}>
              {viewMode === 'preview'
                ? t('template.gallery.livePreviewTitle')
                : viewMode === 'details'
                  ? t('template.gallery.detailsTitle')
                  : t('template.gallery.title')}
            </h1>
            <p className="pc-template-center__intro">
              {viewMode === 'preview'
                ? t('template.gallery.livePreviewDescription')
                : viewMode === 'details'
                  ? t('template.gallery.detailsDescription')
                  : t('template.gallery.description')}
            </p>
          </div>
          <div className="pc-template-center__header-actions">
            {viewMode === 'gallery' ? (
              <button
                type="button"
                className="pc-template-center__button pc-template-center__button--secondary"
                onClick={(event) => onManageTemplates(event.currentTarget)}
              >
                {t('template.gallery.manageTemplates')}
              </button>
            ) : (
              <button
                type="button"
                className="pc-template-center__button pc-template-center__button--secondary"
                onClick={() => backToGallery()}
              >
                {t('template.gallery.backToGallery')}
              </button>
            )}
            <button
              type="button"
              className="pc-template-center__button pc-template-center__button--primary"
              onClick={backToWorkspace}
            >
              {t('template.gallery.backToWorkspace')}
            </button>
          </div>
        </header>

        {missingCurrent && viewMode !== 'preview' && (
          <div className="pc-template-center__missing-current" role="alert">
            <span className="pc-template-center__missing-icon" aria-hidden="true">
              !
            </span>
            <div>
              <strong>{t('template.gallery.missingTemplate')}</strong>
              <p>
                {t('template.gallery.missingCurrentDescription', {
                  templateId: currentTemplateId || '—',
                  fallbackName:
                    displayedFallbackTemplateName || t('template.gallery.unnamedTemplate'),
                })}
              </p>
            </div>
          </div>
        )}

        {viewMode === 'preview' ? (
          candidateEntry ? (
            <section
              className="pc-template-live-preview"
              aria-labelledby="pc-template-live-preview-name"
              data-testid="pc-template-live-preview"
              data-template-id={candidateEntry.template.id}
              data-template-source={candidateEntry.source}
              data-template-instance-key={candidateEntry.key}
              data-preview-style={candidateEntry.template.previewStyle}
            >
              <div className="pc-template-live-preview__notice" role="status">
                <strong>{t('template.gallery.previewOnly')}</strong>
                <p>{t('template.gallery.livePreviewNotice')}</p>
              </div>
              <h2 id="pc-template-live-preview-name" className="pc-template-live-preview__name">
                {candidateEntry.template.name || t('template.gallery.unnamedTemplate')}
              </h2>
              <div
                className="pc-template-live-preview__paper"
                role="region"
                aria-label={t('template.gallery.liveResumePreview')}
              >
                <ResumePreview
                  resume={resume}
                  activeSections={activeSections}
                  templateStyle={candidateEntry.template.previewStyle}
                  accentColor={candidateEntry.template.accentColor}
                  theme={candidateEntry.template.theme}
                />
              </div>
            </section>
          ) : (
            <section className="pc-template-center__stale-detail" role="alert">
              <h2>{t('template.gallery.previewUnavailable')}</h2>
              <p>{t('template.gallery.previewUnavailableDescription')}</p>
              <div className="pc-template-detail__actions">
                <button
                  type="button"
                  className="pc-template-center__button pc-template-center__button--secondary"
                  onClick={() => backToGallery()}
                >
                  {t('template.gallery.backToGallery')}
                </button>
              </div>
            </section>
          )
        ) : viewMode === 'details' ? (
          selectedEntry ? (
            <section
              className="pc-template-detail"
              aria-labelledby="pc-template-detail-name"
              data-testid="pc-template-detail"
            >
              <div className="pc-template-detail__illustration-card">
                <figure className="pc-template-detail__figure">
                  <div className="pc-template-detail__thumbnail">
                    {renderThumbnail(selectedEntry.template)}
                  </div>
                  <figcaption>{t('template.gallery.illustrativeThumbnail')}</figcaption>
                </figure>
                <p className="pc-template-detail__illustration-note">
                  {t('template.gallery.illustrativeNote')}
                </p>
              </div>
              <div className="pc-template-detail__copy">
                <p className="pc-template-center__eyebrow">
                  {t('template.gallery.source')}:{' '}
                  {t(
                    `template.gallery.${selectedEntry.source === 'built-in' ? 'builtIn' : 'custom'}`,
                  )}
                </p>
                <h2 id="pc-template-detail-name" className="pc-template-detail__name">
                  {selectedEntry.template.name || t('template.gallery.unnamedTemplate')}
                </h2>
                <p className="pc-template-detail__description">
                  {getSafeDescription(selectedEntry.template) ||
                    t('template.gallery.noDescription')}
                </p>
                <p className="pc-template-detail__status" role="status">
                  {selectedEntry === currentEntry
                    ? t('template.gallery.currentlyApplied')
                    : t('template.gallery.notCurrentlyApplied')}
                </p>
                <dl className="pc-template-detail__metadata">
                  <div>
                    <dt>{t('template.gallery.source')}</dt>
                    <dd>
                      {t(
                        `template.gallery.${selectedEntry.source === 'built-in' ? 'builtIn' : 'custom'}`,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('template.gallery.templateId')}</dt>
                    <dd>
                      <code>{selectedEntry.template.id}</code>
                    </dd>
                  </div>
                </dl>
                <div className="pc-template-detail__actions">
                  <button
                    type="button"
                    className="pc-template-center__button pc-template-center__button--primary"
                    disabled={!canRenderLivePreview(selectedEntry.template)}
                    onClick={() => openPreview(selectedEntry)}
                  >
                    {canRenderLivePreview(selectedEntry.template)
                      ? t('template.gallery.livePreview')
                      : t('template.gallery.previewUnavailable')}
                  </button>
                </div>
                {!canRenderLivePreview(selectedEntry.template) && (
                  <p className="pc-template-detail__preview-warning" role="alert">
                    {t('template.gallery.unsupportedPreviewStyle', {
                      style:
                        selectedEntry.template.previewStyle || t('template.gallery.unknownStyle'),
                    })}
                  </p>
                )}
              </div>
            </section>
          ) : (
            <section className="pc-template-center__stale-detail" role="alert">
              <h2>{t('template.gallery.detailUnavailable')}</h2>
              <p>{t('template.gallery.detailUnavailableDescription')}</p>
              <code>{selectedDetail?.template.id || '—'}</code>
              <div className="pc-template-detail__actions">
                <button
                  type="button"
                  className="pc-template-center__button pc-template-center__button--secondary"
                  onClick={() => backToGallery()}
                >
                  {t('template.gallery.backToGallery')}
                </button>
                <button
                  type="button"
                  className="pc-template-center__button pc-template-center__button--primary"
                  onClick={backToWorkspace}
                >
                  {t('template.gallery.backToWorkspace')}
                </button>
              </div>
            </section>
          )
        ) : (
          <>
            <section
              className="pc-template-toolbar"
              aria-label={t('template.gallery.searchAndFilter')}
            >
              <div className="pc-template-search">
                <label className="pc-template-search__label" htmlFor="pc-template-search">
                  {t('template.gallery.searchLabel')}
                </label>
                <div className="pc-template-search__control">
                  <span aria-hidden="true" className="pc-template-search__icon">
                    ⌕
                  </span>
                  <input
                    id="pc-template-search"
                    data-testid="pc-template-search"
                    type="search"
                    value={searchQuery}
                    placeholder={t('template.gallery.searchPlaceholder')}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="pc-template-search__clear"
                      onClick={() => setSearchQuery('')}
                      aria-label={t('template.gallery.clearSearch')}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div
                className="pc-template-filters"
                role="group"
                aria-label={t('template.gallery.filterLabel')}
              >
                {groupButtons.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`pc-template-filter${activeGroup === value ? ' is-active' : ''}`}
                    aria-pressed={activeGroup === value}
                    onClick={() => setActiveGroup(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {filteredEntries.length === 0 ? (
              <div className="pc-template-center__no-results" role="status" aria-live="polite">
                <span aria-hidden="true">⌕</span>
                <h2>{t('template.gallery.noResultsTitle')}</h2>
                <p>
                  {searchValue
                    ? t('template.gallery.noResultsDescription', { query: searchQuery.trim() })
                    : t('template.gallery.emptyGroupDescription')}
                </p>
              </div>
            ) : (
              <div className="pc-template-center__groups">
                <p className="pc-template-center__results-count" role="status">
                  {filteredEntries.length === 1
                    ? t('template.gallery.singleTemplateCount')
                    : t('template.gallery.templateCount', { count: filteredEntries.length })}
                </p>
                {activeGroup === 'all' ? (
                  <>
                    {renderGroup(
                      'built-in',
                      builtInEntries,
                      entries.some((entry) => entry.source === 'built-in'),
                    )}
                    {renderGroup(
                      'custom',
                      customEntries,
                      entries.some((entry) => entry.source === 'custom'),
                    )}
                  </>
                ) : (
                  renderGroup(
                    activeGroup,
                    filteredEntries,
                    entries.some((entry) => entry.source === activeGroup),
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default TemplateCenterPage;
