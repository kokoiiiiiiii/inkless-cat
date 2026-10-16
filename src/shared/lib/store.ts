import type { SetStateAction } from 'react';
import type { StateStorage } from 'zustand/middleware';

import type { StoreLogger } from './logger';
import {
  getLocalStorage,
  getPersistedValueSizeBytes,
  isBrowser,
  MAX_PERSISTED_ITEM_SIZE_BYTES,
  StorageIssueError,
  type StorageIssueKind,
} from './storage';

export type StateSetter<T> = (value: SetStateAction<T>) => void;

export const resolveSetStateAction = <T>(input: SetStateAction<T>, current: T): T =>
  typeof input === 'function' ? (input as (prev: T) => T)(current) : input;

export type BrowserStateStorage = StateStorage & {
  blockWrites: () => void;
  preserveExistingBeforeNextWrite: () => void;
};

const getRecoveryKey = (key: string) => `${key}/recovery`;

export const createBrowserStorage = (
  logger: StoreLogger,
  label: string,
  onIssue: (error: StorageIssueError) => void,
  canWrite: () => boolean = () => true,
): BrowserStateStorage => {
  let writesBlocked = false;
  let preserveExisting = false;

  const report = (kind: StorageIssueKind, error: unknown) => {
    const issue =
      error instanceof StorageIssueError
        ? error
        : new StorageIssueError(kind, `${label} storage ${kind} failed.`, { cause: error });
    logger.error(`${label} storage ${issue.kind} failed`, issue);
    onIssue(issue);
  };

  return {
    getItem: (key) => {
      if (!isBrowser) return null;
      const storage = getLocalStorage();
      if (!storage) {
        throw new StorageIssueError('unavailable', `${label} browser storage is unavailable.`);
      }
      try {
        const value = storage.getItem(key);
        if (value && getPersistedValueSizeBytes(value) > MAX_PERSISTED_ITEM_SIZE_BYTES) {
          throw new StorageIssueError(
            'too-large',
            `${label} persisted data exceeds its size limit.`,
          );
        }
        return value;
      } catch (error) {
        throw error instanceof StorageIssueError
          ? error
          : new StorageIssueError('read', `${label} storage read failed.`, { cause: error });
      }
    },
    setItem: (key, value) => {
      if (!isBrowser || writesBlocked || !canWrite()) return;
      if (getPersistedValueSizeBytes(value) > MAX_PERSISTED_ITEM_SIZE_BYTES) {
        report(
          'too-large',
          new StorageIssueError('too-large', `${label} data exceeds its size limit.`),
        );
        return;
      }
      const storage = getLocalStorage();
      if (!storage) {
        report(
          'unavailable',
          new StorageIssueError('unavailable', `${label} browser storage is unavailable.`),
        );
        return;
      }
      try {
        if (preserveExisting) {
          const current = storage.getItem(key);
          const recoveryKey = getRecoveryKey(key);
          if (current !== null && storage.getItem(recoveryKey) === null) {
            storage.setItem(recoveryKey, current);
          }
          preserveExisting = false;
        }
        storage.setItem(key, value);
      } catch (error) {
        report('write', error);
      }
    },
    removeItem: (key) => {
      if (!isBrowser) return;
      const storage = getLocalStorage();
      if (!storage) {
        report(
          'unavailable',
          new StorageIssueError('unavailable', `${label} browser storage is unavailable.`),
        );
        return;
      }
      try {
        storage.removeItem(key);
      } catch (error) {
        report('remove', error);
      }
    },
    blockWrites: () => {
      writesBlocked = true;
    },
    preserveExistingBeforeNextWrite: () => {
      preserveExisting = true;
    },
  };
};

export const withStoreErrorBoundary = <T>(
  logger: StoreLogger,
  actionName: string,
  action: () => T,
): T => {
  try {
    return action();
  } catch (error) {
    logger.error(`${actionName} failed`, error);
    throw error;
  }
};
