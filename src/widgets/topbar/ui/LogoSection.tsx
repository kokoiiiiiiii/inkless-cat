const inklessCatLogo = new URL('../../../assets/Inkless Cat.png', import.meta.url).href;

const LogoSection = () => (
  <div className="flex items-center gap-3">
    <img
      src={inklessCatLogo}
      alt="Inkless Cat 标志"
      className="size-10 rounded-full border border-slate-200/70 bg-white object-cover shadow-inner shadow-brand-200/60 dark:border-slate-700 dark:bg-slate-900"
    />
    <div className="flex flex-col">
      <span className="text-base font-semibold tracking-wide text-slate-900 dark:text-white sm:text-lg">
        Inkless Cat
      </span>
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
        无墨猫简历编辑器
      </span>
    </div>
    <a
      href="https://github.com/kokoiiiiiiii/inkless-cat"
      target="_blank"
      rel="noreferrer"
      aria-label="GitHub 仓库"
      className="ml-2 inline-flex size-10 items-center justify-center rounded-full border border-slate-200/70 bg-white/70 text-slate-500 transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.69c-2.78.6-3.37-1.34-3.37-1.34-.46-1.17-1.12-1.48-1.12-1.48-.92-.63.07-.61.07-.61 1.02.07 1.56 1.05 1.56 1.05.9 1.55 2.36 1.1 2.94.84.09-.65.35-1.1.63-1.35-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.28.1-2.67 0 0 .84-.27 2.75 1.02A9.57 9.57 0 0 1 12 7.5c.85 0 1.7.11 2.5.32 1.9-1.29 2.74-1.02 2.74-1.02.56 1.39.21 2.42.11 2.67.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.58 4.93.36.3.68.9.68 1.81v2.68c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
        />
      </svg>
    </a>
  </div>
);

export default LogoSection;
