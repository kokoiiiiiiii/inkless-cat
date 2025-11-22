type LogLevel = 'info' | 'warn' | 'error';

export type StoreLogger = {
  scope: string;
  log: (level: LogLevel, message: string, payload?: unknown) => void;
  info: (message: string, payload?: unknown) => void;
  warn: (message: string, payload?: unknown) => void;
  error: (message: string, payload?: unknown) => void;
};

const logMessage = (level: LogLevel, scope: string, message: string, payload?: unknown) => {
  const prefix = `[store:${scope}] ${message}`;
  if (payload === undefined) {
    console[level](prefix);
    return;
  }
  console[level](prefix, payload);
};

export const createStoreLogger = (scope: string): StoreLogger => ({
  scope,
  log: (level, message, payload) => logMessage(level, scope, message, payload),
  info: (message, payload) => logMessage('info', scope, message, payload),
  warn: (message, payload) => logMessage('warn', scope, message, payload),
  error: (message, payload) => logMessage('error', scope, message, payload),
});
