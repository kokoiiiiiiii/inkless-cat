import { lazy, Suspense, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { AIResumeEnhancementContext } from '../model/AIResumeEnhancementContext';
import type { AIEnhancementOpenContext } from '../model/types';
import type { AIResumeEnhancementLaunchRequest } from '../model/AIResumeEnhancementLauncherContext';
import type { AIEnhancementProviderClient } from '../model/useAIResumeEnhancement';
import { useAIResumeEnhancement } from '../model/useAIResumeEnhancement';

const AIEnhancementDialog = lazy(() => import('./AIEnhancementDialog'));
const AIEnhancementInlinePanel = lazy(() => import('./AIEnhancementInlinePanel'));

type AIResumeEnhancementRuntimeProps = {
  provider: AIEnhancementProviderClient;
  request: AIResumeEnhancementLaunchRequest | null;
};

const AIResumeEnhancementRuntime = ({ provider, request }: AIResumeEnhancementRuntimeProps) => {
  const controller = useAIResumeEnhancement(provider);
  const { open, close } = controller;
  const handledRequestId = useRef<number | null>(null);

  useEffect(() => {
    if (!request) {
      if (controller.session?.presentation === 'inline') close();
      return;
    }
    if (handledRequestId.current === request.id) return;
    let isCurrent = true;
    queueMicrotask(() => {
      if (!isCurrent || handledRequestId.current === request.id) return;
      handledRequestId.current = request.id;
      const openContext: AIEnhancementOpenContext = {
        presentation: request.presentation,
        sourceRevision: request.sourceRevision,
        selectionRange: request.selectionRange,
      };
      open(request.target, request.opener, openContext);
    });
    return () => {
      isCurrent = false;
    };
  }, [close, controller.session?.presentation, open, request]);

  const inlineRequest =
    request?.presentation === 'inline' && controller.session?.presentation === 'inline'
      ? request
      : null;
  const inlineTarget =
    inlineRequest?.target.kind === 'personal-summary' ? inlineRequest.target : null;
  const inlineMountNode = inlineRequest?.mountNode ?? null;

  return (
    <AIResumeEnhancementContext.Provider value={controller}>
      {inlineRequest && inlineTarget && inlineMountNode && controller.session
        ? createPortal(
            <Suspense
              fallback={
                <span className="sr-only" role="status">
                  Loading contextual AI…
                </span>
              }
            >
              <AIEnhancementInlinePanel
                target={inlineTarget}
                fieldLabel={inlineRequest.fieldLabel ?? ''}
                sourceValue={inlineRequest.sourceValue ?? null}
                sourceRevision={inlineRequest.sourceRevision ?? controller.session.sourceRevision}
                workspaceGeneration={
                  inlineRequest.workspaceGeneration ?? controller.session.workspaceGeneration
                }
                selectionRange={inlineRequest.selectionRange ?? controller.session.selectionRange}
                onAccept={() => controller.apply()}
                onReject={controller.reject}
                onDone={controller.close}
                onConfigureProvider={inlineRequest.onConfigureProvider ?? (() => {})}
              />
            </Suspense>,
            inlineMountNode,
          )
        : null}
      {controller.session && controller.session.presentation === 'dialog' && (
        <Suspense
          fallback={
            <span className="sr-only" role="status">
              Loading AI enhancement…
            </span>
          }
        >
          <AIEnhancementDialog />
        </Suspense>
      )}
    </AIResumeEnhancementContext.Provider>
  );
};

export default AIResumeEnhancementRuntime;
