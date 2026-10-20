/** Confirmation helper for actions that replace or remove user-authored data. */
export const confirmDestructiveOperation = (message: string): boolean => {
  if (typeof globalThis.confirm !== 'function') return false;
  try {
    return globalThis.confirm(message);
  } catch {
    return false;
  }
};
