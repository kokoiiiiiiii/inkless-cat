import {
  type ChatCompletionAdapter,
  openAICompatibleClient,
  type ProviderConfig,
  type ProviderConnectionStatus,
  ProviderError,
  type ProviderErrorCode,
  validateProviderConfiguration,
} from '@shared/api/ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ProviderForm = ProviderConfig & { apiKey: string };

export type ConnectionTestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'success'; model: string; testedAt: number }
  | { status: 'failure'; errorCode: ProviderErrorCode; statusCode?: number }
  | { status: 'cancelled' };

const emptyForm: ProviderForm = { baseUrl: '', apiKey: '', model: '' };

const getValidationError = (form: ProviderForm): ProviderError | null => {
  if (!form.baseUrl.trim() || !form.model.trim() || !form.apiKey.trim()) return null;
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

export const useAIProviderSettings = (client: ChatCompletionAdapter = openAICompatibleClient) => {
  const [form, setForm] = useState<ProviderForm>(emptyForm);
  const [isSaved, setIsSaved] = useState(false);
  const [testState, setTestState] = useState<ConnectionTestState>({ status: 'idle' });
  const formRef = useRef(form);
  const isSavedRef = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      requestVersion.current += 1;
      activeRequest.current?.abort();
      activeRequest.current = null;
      isSavedRef.current = false;
      formRef.current = emptyForm;
    };
  }, []);

  const invalidateTest = useCallback(() => {
    requestVersion.current += 1;
    activeRequest.current?.abort();
    activeRequest.current = null;
    isSavedRef.current = false;
    setTestState({ status: 'idle' });
    setIsSaved(false);
  }, []);

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
  const configurationStatus: ProviderConnectionStatus = useMemo(() => {
    if (testState.status === 'testing') return 'testing';
    if (testState.status === 'success') return 'success';
    if (testState.status === 'failure') return 'failure';
    if (testState.status === 'cancelled') return 'cancelled';
    if (!hasAnyValue) return 'not_configured';
    if (!isComplete) return 'incomplete';
    if (validationError) return 'invalid';
    return 'ready';
  }, [hasAnyValue, isComplete, testState.status, validationError]);

  const canSave = isComplete && !validationError && !isSaved;
  const canTest = isComplete && !validationError && isSaved && testState.status !== 'testing';

  const saveForSession = useCallback(() => {
    const currentForm = formRef.current;
    try {
      validateProviderConfiguration(
        { baseUrl: currentForm.baseUrl, model: currentForm.model },
        { apiKey: currentForm.apiKey },
      );
    } catch {
      return false;
    }
    isSavedRef.current = true;
    setIsSaved(true);
    setTestState({ status: 'idle' });
    return true;
  }, []);

  const testConnection = useCallback(async () => {
    if (!isSavedRef.current || activeRequest.current) return;

    requestVersion.current += 1;
    const currentVersion = requestVersion.current;
    const controller = new AbortController();
    activeRequest.current = controller;
    const currentForm = formRef.current;
    const config = { baseUrl: currentForm.baseUrl, model: currentForm.model };
    const credentials = { apiKey: currentForm.apiKey };
    try {
      validateProviderConfiguration(config, credentials);
    } catch {
      activeRequest.current = null;
      return;
    }
    setTestState({ status: 'testing' });

    try {
      await client.complete(
        config,
        credentials,
        [{ role: 'user', content: 'Reply with exactly: OK' }],
        { signal: controller.signal },
      );
      if (isMounted.current && requestVersion.current === currentVersion) {
        setTestState({ status: 'success', model: config.model, testedAt: Date.now() });
      }
    } catch (error) {
      if (!isMounted.current || requestVersion.current !== currentVersion) return;
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
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, [client]);

  const cancelTest = useCallback(() => {
    if (!activeRequest.current) return;
    requestVersion.current += 1;
    activeRequest.current.abort();
    activeRequest.current = null;
    if (isMounted.current) setTestState({ status: 'cancelled' });
  }, []);

  const clear = useCallback(() => {
    requestVersion.current += 1;
    activeRequest.current?.abort();
    activeRequest.current = null;
    isSavedRef.current = false;
    formRef.current = emptyForm;
    setForm(emptyForm);
    setIsSaved(false);
    setTestState({ status: 'idle' });
  }, []);

  return {
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
    connectionStatus: configurationStatus,
    validationErrorCode: validationError?.code ?? null,
  };
};
