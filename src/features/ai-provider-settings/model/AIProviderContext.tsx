import {
  type ChatCompletionAdapter,
  type ChatCompletionResult,
  type ChatMessage,
  type CompleteOptions,
  openAICompatibleClient,
  type ProviderConfig,
  type ProviderConnectionStatus,
  ProviderError,
  type ProviderErrorCode,
  type RuntimeCredentials,
  type StreamCompleteOptions,
  validateProviderConfiguration,
} from '@shared/api/ai';
import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ProviderForm = ProviderConfig & { apiKey: string };

export type ConnectionTestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'success'; model: string; testedAt: number }
  | { status: 'failure'; errorCode: ProviderErrorCode; statusCode?: number }
  | { status: 'cancelled' };

export type AIProviderClient = {
  configuration: Readonly<ProviderConfig> | null;
  isConfigured: boolean;
  connectionStatus: ProviderConnectionStatus;
  complete: (messages: ChatMessage[], options?: CompleteOptions) => Promise<ChatCompletionResult>;
  streamComplete: (
    messages: ChatMessage[],
    options: StreamCompleteOptions,
  ) => Promise<ChatCompletionResult>;
};

export type AIProviderSettings = {
  form: ProviderForm;
  updateField: (field: keyof ProviderForm, value: string) => void;
  isSaved: boolean;
  canSave: boolean;
  canTest: boolean;
  saveForSession: () => boolean;
  testConnection: () => Promise<void>;
  cancelTest: () => void;
  clear: () => void;
  testState: ConnectionTestState;
  connectionStatus: ProviderConnectionStatus;
  validationErrorCode: ProviderErrorCode | null;
};

export const AIProviderSettingsContext = createContext<AIProviderSettings | undefined>(undefined);
export const AIProviderClientContext = createContext<AIProviderClient | undefined>(undefined);

const emptyForm: ProviderForm = { baseUrl: '', apiKey: '', model: '' };
const connectionTestMessages: ChatMessage[] = [{ role: 'user', content: 'Reply with exactly: OK' }];

const getValidationError = (form: ProviderForm): ProviderError | null => {
  if (!form.baseUrl.trim() || !form.model.trim()) return null;
  try {
    validateProviderConfiguration(
      { baseUrl: form.baseUrl, model: form.model },
      { apiKey: form.apiKey },
    );
    return null;
  } catch (error) {
    return error instanceof ProviderError ? error : new ProviderError('invalid_url');
  }
};

const getConnectionStatus = (
  hasAnyValue: boolean,
  isComplete: boolean,
  testState: ConnectionTestState,
  validationError: ProviderError | null,
): ProviderConnectionStatus => {
  if (testState.status === 'testing') return 'testing';
  if (testState.status === 'success') return 'success';
  if (testState.status === 'failure') return 'failure';
  if (testState.status === 'cancelled') return 'cancelled';
  if (!hasAnyValue) return 'not_configured';
  if (validationError?.code === 'invalid_api_key') return 'invalid';
  if (!isComplete) return 'incomplete';
  if (validationError) return 'invalid';
  return 'ready';
};

const statusFromTestState = (
  isConfigured: boolean,
  testState: ConnectionTestState,
): ProviderConnectionStatus => {
  if (!isConfigured) return 'not_configured';
  switch (testState.status) {
    case 'testing': {
      return 'testing';
    }
    case 'success': {
      return 'success';
    }
    case 'failure': {
      return 'failure';
    }
    case 'cancelled': {
      return 'cancelled';
    }
    default: {
      return 'ready';
    }
  }
};

type SavedProvider = {
  config: ProviderConfig;
  credentials: RuntimeCredentials;
};

type AIProviderProviderProps = {
  children: ReactNode;
  client?: ChatCompletionAdapter;
};

export const AIProviderProvider = ({
  children,
  client = openAICompatibleClient,
}: AIProviderProviderProps) => {
  const [form, setForm] = useState<ProviderForm>(emptyForm);
  const [isSaved, setIsSaved] = useState(false);
  const [savedConfiguration, setSavedConfiguration] = useState<Readonly<ProviderConfig> | null>(
    null,
  );
  const [testState, setTestState] = useState<ConnectionTestState>({ status: 'idle' });

  const formRef = useRef(form);
  const isSavedRef = useRef(false);
  const savedProviderRef = useRef<SavedProvider | null>(null);
  const activeTestRequest = useRef<AbortController | null>(null);
  const activeBusinessRequests = useRef(new Set<AbortController>());
  const testRequestVersion = useRef(0);
  const providerGeneration = useRef(0);
  const isMounted = useRef(false);

  const resetTestRequest = useCallback(() => {
    testRequestVersion.current += 1;
    activeTestRequest.current?.abort();
    activeTestRequest.current = null;
  }, []);

  const cancelBusinessRequests = useCallback(() => {
    providerGeneration.current += 1;
    for (const controller of activeBusinessRequests.current) controller.abort();
    activeBusinessRequests.current.clear();
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      resetTestRequest();
      cancelBusinessRequests();
      savedProviderRef.current = null;
      formRef.current = emptyForm;
      isSavedRef.current = false;
    };
  }, [cancelBusinessRequests, resetTestRequest]);

  const invalidateTest = useCallback(() => {
    resetTestRequest();
    isSavedRef.current = false;
    setTestState({ status: 'idle' });
    setIsSaved(false);
  }, [resetTestRequest]);

  const updateField = useCallback(
    (field: keyof ProviderForm, value: string) => {
      if (formRef.current[field] === value) return;
      invalidateTest();
      const next = { ...formRef.current, [field]: value };
      formRef.current = next;
      setForm(next);
    },
    [invalidateTest],
  );

  const validationError = useMemo(() => getValidationError(form), [form]);
  const hasAnyValue = Boolean(form.baseUrl || form.model || form.apiKey);
  const isComplete = Boolean(form.baseUrl.trim() && form.model.trim() && form.apiKey.trim());
  const settingsConnectionStatus = useMemo(
    () => getConnectionStatus(hasAnyValue, isComplete, testState, validationError),
    [hasAnyValue, isComplete, testState, validationError],
  );

  const canSave = isComplete && !validationError && !isSaved;
  const canTest = isComplete && !validationError && isSaved && testState.status !== 'testing';

  const saveForSession = useCallback(() => {
    const currentForm = formRef.current;
    const config = { baseUrl: currentForm.baseUrl, model: currentForm.model };
    const credentials = { apiKey: currentForm.apiKey };

    try {
      validateProviderConfiguration(config, credentials);
    } catch {
      return false;
    }

    resetTestRequest();
    cancelBusinessRequests();
    const savedCredentials = { apiKey: credentials.apiKey.trim() };
    savedProviderRef.current = { config, credentials: savedCredentials };
    setSavedConfiguration({ baseUrl: config.baseUrl, model: config.model });
    isSavedRef.current = true;
    setIsSaved(true);
    setTestState({ status: 'idle' });
    return true;
  }, [cancelBusinessRequests, resetTestRequest]);

  const testConnection = useCallback(async () => {
    const saved = savedProviderRef.current;
    if (!isSavedRef.current || !saved || activeTestRequest.current) return;

    resetTestRequest();
    const currentVersion = testRequestVersion.current;
    const controller = new AbortController();
    activeTestRequest.current = controller;
    setTestState({ status: 'testing' });

    try {
      validateProviderConfiguration(saved.config, saved.credentials);
    } catch {
      if (activeTestRequest.current === controller) activeTestRequest.current = null;
      setTestState({ status: 'failure', errorCode: 'incomplete_config' });
      return;
    }

    try {
      await client.complete(saved.config, saved.credentials, connectionTestMessages, {
        signal: controller.signal,
      });
      if (isMounted.current && testRequestVersion.current === currentVersion) {
        setTestState({ status: 'success', model: saved.config.model, testedAt: Date.now() });
      }
    } catch (error) {
      if (!isMounted.current || testRequestVersion.current !== currentVersion) return;
      if (error instanceof ProviderError && error.code === 'cancelled') {
        setTestState({ status: 'cancelled' });
      } else if (error instanceof ProviderError) {
        setTestState({
          status: 'failure',
          errorCode: error.code,
          ...(error.statusCode === undefined ? {} : { statusCode: error.statusCode }),
        });
      } else {
        setTestState({ status: 'failure', errorCode: 'network' });
      }
    } finally {
      if (activeTestRequest.current === controller) activeTestRequest.current = null;
    }
  }, [client, resetTestRequest]);

  const cancelTest = useCallback(() => {
    const controller = activeTestRequest.current;
    if (!controller) return;
    testRequestVersion.current += 1;
    activeTestRequest.current = null;
    controller.abort();
    if (isMounted.current) setTestState({ status: 'cancelled' });
  }, []);

  const clear = useCallback(() => {
    resetTestRequest();
    cancelBusinessRequests();
    savedProviderRef.current = null;
    formRef.current = emptyForm;
    isSavedRef.current = false;
    setForm(emptyForm);
    setSavedConfiguration(null);
    setIsSaved(false);
    setTestState({ status: 'idle' });
  }, [cancelBusinessRequests, resetTestRequest]);

  const runBusinessRequest = useCallback(
    async <T,>(
      options: Pick<CompleteOptions, 'signal' | 'timeoutMs'>,
      run: (saved: SavedProvider, signal: AbortSignal, isCurrent: () => boolean) => Promise<T>,
    ): Promise<T> => {
      const saved = savedProviderRef.current;
      if (!saved) throw new ProviderError('incomplete_config');
      validateProviderConfiguration(saved.config, saved.credentials);

      const currentGeneration = providerGeneration.current;
      const controller = new AbortController();
      const abortFromCaller = () => controller.abort();
      if (options.signal?.aborted) {
        controller.abort();
      } else {
        options.signal?.addEventListener('abort', abortFromCaller, { once: true });
      }
      activeBusinessRequests.current.add(controller);

      try {
        if (!isMounted.current || controller.signal.aborted) {
          throw new ProviderError('cancelled');
        }
        const isCurrent = () =>
          isMounted.current &&
          !controller.signal.aborted &&
          providerGeneration.current === currentGeneration;
        const result = await run(saved, controller.signal, isCurrent);
        if (!isCurrent()) {
          throw new ProviderError('cancelled');
        }
        return result;
      } catch (error) {
        if (
          !isMounted.current ||
          controller.signal.aborted ||
          providerGeneration.current !== currentGeneration
        ) {
          throw new ProviderError('cancelled');
        }
        if (error instanceof ProviderError) throw error;
        throw new ProviderError('network');
      } finally {
        options.signal?.removeEventListener('abort', abortFromCaller);
        activeBusinessRequests.current.delete(controller);
      }
    },
    [],
  );

  const complete = useCallback(
    (messages: ChatMessage[], options: CompleteOptions = {}) =>
      runBusinessRequest(options, (saved, signal) =>
        client.complete(saved.config, saved.credentials, messages, {
          ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
          signal,
        }),
      ),
    [client, runBusinessRequest],
  );

  const streamComplete = useCallback(
    (messages: ChatMessage[], options: StreamCompleteOptions) =>
      runBusinessRequest(options, (saved, signal, isCurrent) =>
        client.streamComplete(saved.config, saved.credentials, messages, {
          ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
          ...(options.idleTimeoutMs === undefined ? {} : { idleTimeoutMs: options.idleTimeoutMs }),
          ...(options.maxOutputCodeUnits === undefined
            ? {}
            : { maxOutputCodeUnits: options.maxOutputCodeUnits }),
          signal,
          onDelta: (delta) => {
            if (isCurrent()) options.onDelta(delta);
          },
        }),
      ),
    [client, runBusinessRequest],
  );

  const clientConnectionStatus = useMemo(
    () => statusFromTestState(savedConfiguration !== null, testState),
    [savedConfiguration, testState],
  );
  const clientContextValue = useMemo<AIProviderClient>(
    () => ({
      configuration: savedConfiguration,
      isConfigured: savedConfiguration !== null,
      connectionStatus: clientConnectionStatus,
      complete,
      streamComplete,
    }),
    [clientConnectionStatus, complete, savedConfiguration, streamComplete],
  );
  const settingsContextValue = useMemo<AIProviderSettings>(
    () => ({
      form,
      updateField,
      isSaved,
      canSave,
      canTest,
      saveForSession,
      testConnection,
      cancelTest,
      clear,
      testState,
      connectionStatus: settingsConnectionStatus,
      validationErrorCode: validationError?.code ?? null,
    }),
    [
      form,
      updateField,
      isSaved,
      canSave,
      canTest,
      saveForSession,
      testConnection,
      cancelTest,
      clear,
      testState,
      settingsConnectionStatus,
      validationError,
    ],
  );

  return (
    <AIProviderSettingsContext.Provider value={settingsContextValue}>
      <AIProviderClientContext.Provider value={clientContextValue}>
        {children}
      </AIProviderClientContext.Provider>
    </AIProviderSettingsContext.Provider>
  );
};

export default AIProviderProvider;
