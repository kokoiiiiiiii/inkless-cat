import { actions } from './actions';
import { custom } from './custom';
import { customModes } from './customModes';
import { customSection } from './customSection';
import { manager } from './manager';
import { personal } from './personal';
import { resume } from './resume';
import { sections } from './sections';
import { sort } from './sort';
import { status } from './status';
import { toggle } from './toggle';

export const modules = {
  manager,
  sort,
  toggle,
  custom,
  status,
  actions,
  sections,
  customSection,
  customModes,
  personal,
  resume,
} as const;
