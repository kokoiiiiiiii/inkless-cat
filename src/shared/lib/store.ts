import type { SetStateAction } from 'react';
import type { StateStorage } from 'zustand/middleware';

import type { StoreLogger } from './logger';
import { isBrowser } from './storage';

export type StateSetter<T> = (value: SetStateAction<T>) => void;

export const resolveSetStateAction = <T>(input: SetStateAction<T>, current: T): T =>
  typeof input === 'function' ? (input as (prev: T) => T)(current) : input;

const memoryStorage: StateStorage = {
  getItem: () => null,
  setItem: () => null,
  removeItem: () => null,
};

export const createBrowserStorage = (logger: StoreLogger, label: string): StateStorage => {
  if (!isBrowser || !globalThis.localStorage) {
    logger.info(`${label} falling back to in-memory storage`);
    return memoryStorage;
  }

  return {
    getItem: (key: string) => globalThis.localStorage.getItem(key),
    setItem: (key: string, value: string) => globalThis.localStorage.setItem(key, value),
    removeItem: (key: string) => globalThis.localStorage.removeItem(key),
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
