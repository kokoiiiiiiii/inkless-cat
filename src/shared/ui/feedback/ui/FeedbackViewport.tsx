import { useFeedbackActions, useFeedbackItems } from '../model/feedback.store';

const toneClassMap = {
  info: 'border-slate-200/80 bg-white/95 text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-slate-200',
  success:
    'border-emerald-200/80 bg-emerald-50/95 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/90 dark:text-emerald-100',
  error:
    'border-rose-200/80 bg-rose-50/95 text-rose-900 dark:border-rose-900/70 dark:bg-rose-950/90 dark:text-rose-100',
} as const;

export const FeedbackViewport = () => {
  const items = useFeedbackItems();
  const { dismissFeedback } = useFeedbackActions();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-3 px-4 sm:items-end sm:px-6">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto w-full max-w-sm rounded-2xl border p-4 shadow-xl backdrop-blur ${toneClassMap[item.tone]}`}
          role={item.tone === 'error' ? 'alert' : 'status'}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {item.title && <p className="text-sm font-semibold">{item.title}</p>}
              <p className="mt-1 text-sm leading-6">{item.message}</p>
            </div>
            <button
              type="button"
              className="text-current/70 rounded-full p-1 transition hover:bg-black/5 hover:text-current dark:hover:bg-white/10"
              onClick={() => dismissFeedback(item.id)}
              aria-label="Dismiss notification"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
