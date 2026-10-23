import type { ReactNode, RefObject } from 'react';
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';

import { AIResumeInterviewContext } from './AIResumeInterviewContext';
import type { AIInterviewProviderClient } from './types';

const AIResumeInterviewRuntime = lazy(() => import('../ui/AIResumeInterviewRuntime'));

type AIResumeInterviewProviderProps = {
  children: ReactNode;
  provider: AIInterviewProviderClient;
  onOpenProviderSettings: () => void;
  settingsTriggerRef?: RefObject<HTMLButtonElement | null>;
};

export const AIResumeInterviewProvider = ({
  children,
  provider,
  onOpenProviderSettings,
}: AIResumeInterviewProviderProps) => {
  const [runtimeCreated, setRuntimeCreated] = useState(false);
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const launch = useCallback((opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setRuntimeCreated(true);
    setOpen(true);
  }, []);

  const pause = useCallback(() => setOpen(false), []);

  const openSettings = useCallback(() => {
    setOpen(false);
    onOpenProviderSettings();
  }, [onOpenProviderSettings]);

  const contextValue = useMemo(() => ({ open: launch }), [launch]);

  return (
    <AIResumeInterviewContext.Provider value={contextValue}>
      {children}
      {runtimeCreated && (
        <Suspense fallback={null}>
          <AIResumeInterviewRuntime
            open={open}
            provider={provider}
            openerRef={openerRef}
            onPause={pause}
            onOpenProviderSettings={openSettings}
          />
        </Suspense>
      )}
    </AIResumeInterviewContext.Provider>
  );
};
