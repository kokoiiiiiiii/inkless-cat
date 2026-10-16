export const RESUME_STORE_PERSIST_KEY = 'inkless-cat/resume-store';
export const UI_STORE_PERSIST_KEY = 'inkless-cat/ui-store';

export const MAX_PERSISTED_ITEM_SIZE_BYTES = 8 * 1024 * 1024;

export type StorageIssueKind =
  | 'unavailable'
  | 'read'
  | 'write'
  | 'remove'
  | 'too-large'
  | 'corrupt';

export class StorageIssueError extends Error {
  readonly kind: StorageIssueKind;

  constructor(kind: StorageIssueKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'StorageIssueError';
    this.kind = kind;
  }
}

export const isBrowser = globalThis.window !== undefined;

export const getLocalStorage = (): Storage | null => {
  if (!isBrowser) return null;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

export const getPersistedValueSizeBytes = (value: string): number => value.length * 2;
