export const arraysShallowEqual = (
  a: readonly string[] | null | undefined,
  b: readonly string[] | null | undefined,
) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (const [index, value] of a.entries()) {
    if (value !== b[index]) {
      return false;
    }
  }
  return true;
};
