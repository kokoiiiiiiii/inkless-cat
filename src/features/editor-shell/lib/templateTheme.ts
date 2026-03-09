export { normalizeTemplateTheme } from '@entities/template';

export const createCustomTemplateId = () =>
  `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
