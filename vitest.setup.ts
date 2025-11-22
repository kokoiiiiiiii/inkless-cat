import { afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  localStorage.clear();
});
