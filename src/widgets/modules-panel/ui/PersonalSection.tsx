import type { ResumePersonal, ResumePersonalExtra } from '@entities/resume';
import { type PersonalSettings } from '@features/edit-module';
import { memo } from 'react';

import {
  cardClass,
  dangerButtonClass,
  inputClass,
  labelClass,
  labelTextClass,
  subtleButtonClass,
  textareaClass,
  toggleBaseClass,
  toggleDisabledClass,
  toggleEnabledClass,
} from './constants';
import PhotoUpload from './PhotoUpload';
import type { SectionFocusHandler } from './types';

type PersonalSectionProps = {
  personal: ResumePersonal;
  settings: PersonalSettings;
  onChange: (field: string, value: string) => void;
  notifyFocus: SectionFocusHandler;
  sectionRef?: (node: HTMLElement | null) => void;
  onExtraAdd: () => void;
  onExtraChange: (id: string, key: keyof ResumePersonalExtra, value: string) => void;
  onExtraRemove: (id: string) => void;
  onSettingChange: <Key extends keyof PersonalSettings>(
    key: Key,
    value: PersonalSettings[Key],
  ) => void;
};

const PersonalSection = memo(
  ({
    personal,
    settings,
    onChange,
    notifyFocus,
    sectionRef,
    onExtraAdd,
    onExtraChange,
    onExtraRemove,
    onSettingChange,
  }: PersonalSectionProps) => {
    const extras = Array.isArray(personal.extras) ? personal.extras : [];
    const showPhoto = settings.showPhoto !== false;
    const photoSize = Math.max(80, Math.min(settings.photoSize ?? 120, 260));
    const photoPosition = settings.photoPosition === 'left' ? 'left' : 'right';

    return (
      <section ref={sectionRef} className="space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">个人信息</h3>
        </header>
        <div className={cardClass}>
          <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-8">
            <div className="space-y-4">
              <label className={labelClass}>
                <span className={labelTextClass}>姓名</span>
                <input
                  className={inputClass}
                  type="text"
                  value={personal.fullName}
                  placeholder="张三"
                  onChange={(event) => onChange('fullName', event.target.value)}
                  onFocus={() => notifyFocus('personal', 'personal')}
                />
              </label>
              <label className={labelClass}>
                <span className={labelTextClass}>头衔</span>
                <input
                  className={inputClass}
                  type="text"
                  value={personal.title}
                  placeholder="前端工程师 / 产品技术负责人"
                  onChange={(event) => onChange('title', event.target.value)}
                  onFocus={() => notifyFocus('personal', 'personal')}
                />
              </label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className={labelClass}>
                  <span className={labelTextClass}>邮箱</span>
                  <input
                    className={inputClass}
                    type="email"
                    value={personal.email}
                    placeholder="you@example.com"
                    onChange={(event) => onChange('email', event.target.value)}
                    onFocus={() => notifyFocus('personal', 'personal')}
                  />
                </label>
                <label className={labelClass}>
                  <span className={labelTextClass}>电话</span>
                  <input
                    className={inputClass}
                    type="text"
                    value={personal.phone}
                    placeholder="+86 138 0000 0000"
                    onChange={(event) => onChange('phone', event.target.value)}
                    onFocus={() => notifyFocus('personal', 'personal')}
                  />
                </label>
              </div>
              <label className={labelClass}>
                <span className={labelTextClass}>所在地</span>
                <input
                  className={inputClass}
                  type="text"
                  value={personal.location}
                  placeholder="上海 / 远程"
                  onChange={(event) => onChange('location', event.target.value)}
                  onFocus={() => notifyFocus('personal', 'personal')}
                />
              </label>
              <label className={labelClass}>
                <span className={labelTextClass}>个人简介</span>
                <textarea
                  className={textareaClass}
                  value={personal.summary}
                  placeholder="用 2-3 句话突出你的价值、成果与优势"
                  onChange={(event) => onChange('summary', event.target.value)}
                  onFocus={() => notifyFocus('summary', 'summary')}
                />
              </label>
            </div>
            <div className="flex flex-col gap-4 lg:w-[260px] lg:flex-shrink-0">
              {showPhoto && (
                <div className="self-center lg:self-stretch">
                  <PhotoUpload
                    value={personal.photo}
                    onChange={(value) => onChange('photo', value)}
                    onFocus={() => notifyFocus('personal', 'personal')}
                    size={photoSize}
                  />
                </div>
              )}
              <div className="w-full space-y-3 rounded-2xl border border-slate-200/60 bg-white/80 p-4 text-left text-xs font-semibold text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-400">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>显示照片</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-500"
                    checked={showPhoto}
                    onChange={(event) => onSettingChange('showPhoto', event.target.checked)}
                  />
                </div>
                <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  照片尺寸 ({photoSize}px)
                  <input
                    type="range"
                    min="96"
                    max="240"
                    step="4"
                    value={photoSize}
                    onChange={(event) => onSettingChange('photoSize', Number(event.target.value))}
                  />
                </label>
                <div className="space-y-2">
                  <span>照片位置</span>
                  <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="photo-position"
                        value="left"
                        checked={photoPosition === 'left'}
                        onChange={() => onSettingChange('photoPosition', 'left')}
                      />
                      左侧
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="photo-position"
                        value="right"
                        checked={photoPosition === 'right'}
                        onChange={() => onSettingChange('photoPosition', 'right')}
                      />
                      右侧
                    </label>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/70 p-4 text-[11px] leading-relaxed text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/50 dark:text-slate-300">
                <h4 className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-200">
                  照片小贴士
                </h4>
                <ul className="space-y-2">
                  <li>选择光线均匀、背景干净的正面照片，更易传递专业感。</li>
                  <li>保持头肩居中并留出适度空白，避免裁剪过多造成失真。</li>
                  <li>服装与背景配色与简历主题相呼应，整体视觉更协调。</li>
                </ul>
              </div>
            </div>
            <div className="space-y-3 lg:col-span-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className={labelTextClass}>补充信息</span>
                <button type="button" className={subtleButtonClass} onClick={onExtraAdd}>
                  添加
                </button>
              </div>
              {extras.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300/60 bg-white/60 px-3 py-4 text-xs text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-400">
                  暂无补充信息，点击“添加”可自定义标签与内容。
                </p>
              ) : (
                <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  {extras.map((extra) => (
                    <div
                      key={extra.id}
                      className="rounded-xl border border-slate-200/60 bg-white/80 p-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60"
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className={labelClass}>
                          <span className={labelTextClass}>标签</span>
                          <input
                            className={inputClass}
                            type="text"
                            value={extra.label || ''}
                            placeholder="例如：个人网站"
                            onChange={(event) => onExtraChange(extra.id, 'label', event.target.value)}
                            onFocus={() => notifyFocus('personal', extra.id)}
                          />
                        </label>
                        <label className={labelClass}>
                          <span className={labelTextClass}>内容</span>
                          <input
                            className={inputClass}
                            type="text"
                            value={extra.value || ''}
                            placeholder="https://example.com"
                            onChange={(event) => onExtraChange(extra.id, 'value', event.target.value)}
                            onFocus={() => notifyFocus('personal', extra.id)}
                          />
                        </label>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          className={dangerButtonClass}
                          onClick={() => onExtraRemove(extra.id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }
);

PersonalSection.displayName = 'PersonalSection';

export default PersonalSection;
