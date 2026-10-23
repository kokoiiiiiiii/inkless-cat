import { aiEnhancement } from './aiEnhancement';
import { aiInterview } from './aiInterview';
import { aiProvider } from './aiProvider';
import { common } from './common';
import { editor } from './editor';
import { exporter } from './exporter';
import { modules } from './modules';
import { preview } from './preview';
import { template } from './template';
import { topbar } from './topbar';

const en = {
  aiProvider,
  aiEnhancement,
  aiInterview,
  common,
  topbar,
  editor,
  preview,
  template,
  modules,
  exporter,
} as const;

export default en;
