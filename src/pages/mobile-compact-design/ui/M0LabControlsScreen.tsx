import { useEffect, useRef } from 'react';

import type { M0Strings } from '../model/strings';

type Locale = 'zh-CN' | 'en';
type PanelStrings = Pick<
  M0Strings,
  | 'simulationTools'
  | 'labDescription'
  | 'fontScale'
  | 'fontNormal'
  | 'font150'
  | 'font200'
  | 'keyboardLabel'
  | 'dark'
  | 'language'
  | 'openLab'
  | 'closeLab'
>;

type M0LabControlsScreenProps = {
  strings: PanelStrings;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  fontScale: number;
  setFontScale: (scale: number) => void;
  keyboardSimulation: boolean;
  setKeyboardSimulation: (enabled: boolean) => void;
  dark: boolean;
  setDark: (enabled: boolean) => void;
  onClose: () => void;
};

export const M0LabControlsScreen = ({
  strings,
  locale,
  setLocale,
  fontScale,
  setFontScale,
  keyboardSimulation,
  setKeyboardSimulation,
  dark,
  setDark,
  onClose,
}: M0LabControlsScreenProps) => {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="m0-lab-screen" aria-labelledby="m0-lab-title">
      <div className="m0-lab-screen-heading">
        <p className="m0-eyebrow">M0 / LAB</p>
        <h1 id="m0-lab-title" ref={headingRef} tabIndex={-1}>
          {strings.simulationTools}
        </h1>
      </div>
      <p className="m0-lab-description">{strings.labDescription}</p>
      <div className="m0-summary-card m0-lab-card">
        <div className="m0-lab-controls">
          <label>
            <span>{strings.fontScale}</span>
            <select
              value={fontScale}
              onChange={(event) => setFontScale(Number(event.target.value))}
            >
              <option value={1}>{strings.fontNormal}</option>
              <option value={1.5}>{strings.font150}</option>
              <option value={2}>{strings.font200}</option>
            </select>
          </label>
          <label className="m0-check">
            <input
              type="checkbox"
              checked={keyboardSimulation}
              onChange={(event) => setKeyboardSimulation(event.target.checked)}
            />
            <span>{strings.keyboardLabel}</span>
          </label>
          <label className="m0-check">
            <input
              type="checkbox"
              checked={dark}
              onChange={(event) => setDark(event.target.checked)}
            />
            <span>{strings.dark}</span>
          </label>
          <label>
            <span>{strings.language}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
              <option value="zh-CN">{locale === 'en' ? 'Chinese (Simplified)' : '简体中文'}</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
      </div>
      <button type="button" className="m0-primary-button m0-lab-close" onClick={onClose}>
        {strings.closeLab}
      </button>
    </section>
  );
};
