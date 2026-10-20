import { createEmptyResume, deriveSectionsFromResume } from '@entities/resume';
import type { StoreLogger } from '@shared/lib/logger';
import {
  getPersistedValueSizeBytes,
  MAX_PERSISTED_ITEM_SIZE_BYTES,
  RESUME_STORE_PERSIST_KEY,
  StorageIssueError,
  UI_STORE_PERSIST_KEY,
} from '@shared/lib/storage';
import { createBrowserStorage } from '@shared/lib/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ensureLegacyStorageMigration,
  resetLegacyStorageMigrationForTests,
  sanitizePersistedResumeStoreState,
} from './persist';

const logger: StoreLogger = {
  scope: 'test',
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('workspace persistence safeguards', () => {
  beforeEach(() => {
    localStorage.clear();
    resetLegacyStorageMigrationForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetLegacyStorageMigrationForTests();
  });

  it('derives default modules when legacy persisted state has no module list', () => {
    const migrated = sanitizePersistedResumeStoreState({ resume: createEmptyResume() });

    expect(migrated.activeSections).toEqual(deriveSectionsFromResume(migrated.resume));
  });

  it('keeps legacy data and does not create a default envelope when migration fails', () => {
    const issueHandler = vi.fn();
    localStorage.setItem('inkless-cat-data', '{broken');

    expect(ensureLegacyStorageMigration(issueHandler)).toBe(false);

    expect(localStorage.getItem('inkless-cat-data')).toBe('{broken');
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).toBeNull();
    expect(localStorage.getItem(UI_STORE_PERSIST_KEY)).toBeNull();
    expect(issueHandler).toHaveBeenCalledWith(expect.any(StorageIssueError));
  });

  it('prefers valid current-format data to stale legacy data', () => {
    const currentResume = createEmptyResume();
    currentResume.personal.fullName = 'Current format';
    localStorage.setItem(
      RESUME_STORE_PERSIST_KEY,
      JSON.stringify({
        version: 1,
        state: { resume: currentResume, activeSections: [] },
      }),
    );
    localStorage.setItem('inkless-cat-data', JSON.stringify({ personal: { fullName: 'Legacy' } }));

    expect(ensureLegacyStorageMigration()).toBe(true);

    const migrated = JSON.parse(localStorage.getItem(RESUME_STORE_PERSIST_KEY) ?? 'null') as {
      state?: { resume?: { personal?: { fullName?: string } }; activeSections?: string[] };
    };
    expect(migrated.state?.resume?.personal?.fullName).toBe('Current format');
    expect(migrated.state?.activeSections).toEqual([]);
    expect(localStorage.getItem('inkless-cat-data')).toBeNull();
  });

  it('retains old keys until both legacy store envelopes are written', () => {
    const resume = createEmptyResume();
    resume.personal.fullName = 'Migrated user';
    localStorage.setItem('inkless-cat-data', JSON.stringify(resume));
    localStorage.setItem('inkless-cat-theme', 'dark');

    expect(ensureLegacyStorageMigration()).toBe(true);
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).not.toBeNull();
    expect(localStorage.getItem(UI_STORE_PERSIST_KEY)).not.toBeNull();
    expect(localStorage.getItem('inkless-cat-data')).toBeNull();
    expect(localStorage.getItem('inkless-cat-theme')).toBeNull();
  });

  it('keeps legacy inputs intact when the second store write interrupts migration', () => {
    const resume = createEmptyResume();
    resume.personal.fullName = 'Recover after interruption';
    localStorage.setItem('inkless-cat-data', JSON.stringify(resume));
    localStorage.setItem('inkless-cat-theme', 'dark');
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === UI_STORE_PERSIST_KEY) {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem(key, value);
    });

    expect(ensureLegacyStorageMigration()).toBe(false);
    expect(localStorage.getItem('inkless-cat-data')).not.toBeNull();
    expect(localStorage.getItem('inkless-cat-theme')).toBe('dark');
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).not.toBeNull();
    expect(localStorage.getItem(UI_STORE_PERSIST_KEY)).toBeNull();

    setItem.mockRestore();
    resetLegacyStorageMigrationForTests();
    expect(ensureLegacyStorageMigration()).toBe(true);
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).toContain('Recover after interruption');
    expect(localStorage.getItem(UI_STORE_PERSIST_KEY)).not.toBeNull();
    expect(localStorage.getItem('inkless-cat-data')).toBeNull();
  });

  it('reports quota errors without throwing or claiming that a value was saved', () => {
    const issueHandler = vi.fn();
    const storage = createBrowserStorage(logger, 'test', issueHandler);
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });

    expect(() => storage.setItem('key', 'resume')).not.toThrow();
    expect(issueHandler).toHaveBeenCalledWith(expect.objectContaining({ kind: 'write' }));
  });

  it('reports unavailable browser storage and does not throw from state writes', () => {
    const issueHandler = vi.fn();
    const storage = createBrowserStorage(logger, 'test', issueHandler);
    vi.stubGlobal('localStorage', null);

    expect(() => storage.setItem('key', 'resume')).not.toThrow();

    expect(issueHandler).toHaveBeenCalledWith(expect.objectContaining({ kind: 'unavailable' }));
  });

  it('keeps the original value when writing a recovery copy fails', () => {
    const issueHandler = vi.fn();
    const storage = createBrowserStorage(logger, 'test', issueHandler);
    localStorage.setItem('key', 'original data');
    storage.preserveExistingBeforeNextWrite();
    const originalSetItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === 'key/recovery') {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem(key, value);
    });

    storage.setItem('key', 'new data');

    expect(localStorage.getItem('key')).toBe('original data');
    expect(localStorage.getItem('key/recovery')).toBeNull();
    expect(issueHandler).toHaveBeenCalledWith(expect.objectContaining({ kind: 'write' }));
  });

  it('rejects values over the centralized storage cap without calling localStorage', () => {
    const issueHandler = vi.fn();
    const storage = createBrowserStorage(logger, 'test', issueHandler);
    const setItem = vi.spyOn(localStorage, 'setItem');
    const oversized = 'x'.repeat(Math.floor(MAX_PERSISTED_ITEM_SIZE_BYTES / 2) + 1);

    storage.setItem('key', oversized);

    expect(getPersistedValueSizeBytes(oversized)).toBeGreaterThan(MAX_PERSISTED_ITEM_SIZE_BYTES);
    expect(setItem).not.toHaveBeenCalled();
    expect(issueHandler).toHaveBeenCalledWith(expect.objectContaining({ kind: 'too-large' }));
  });
});
