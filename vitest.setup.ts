import { afterEach, beforeEach } from 'vitest';

const createLocalStorageMock = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(String(key)) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(String(key)),
    setItem: (key, value) => values.set(String(key), String(value)),
  };
};

const testLocalStorage = createLocalStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: testLocalStorage,
});

beforeEach(() => {
  testLocalStorage.clear();
  document.documentElement.className = '';
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  testLocalStorage.clear();
});
