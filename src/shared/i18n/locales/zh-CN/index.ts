import { aiEnhancement } from './aiEnhancement';
import { aiProvider } from './aiProvider';
import { common } from './common';
import { editor } from './editor';
import { exporter } from './exporter';
import { modules } from './modules';
import { preview } from './preview';
import { template } from './template';
import { topbar } from './topbar';

const zhCN = {
  aiProvider,
  aiEnhancement,
  common,
  topbar,
  editor,
  preview,
  template,
  modules,
  exporter,
} as const;

export default zhCN;
