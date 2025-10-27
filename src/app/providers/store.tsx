import type { ReactNode } from 'react';

import { ResumeStoreProvider } from '@/stores/resume.store';
import { UIStoreProvider } from '@/stores/ui.store';

type StoreProviderProps = {
  children: ReactNode;
};

export const StoreProvider = ({ children }: StoreProviderProps) => (
  <ResumeStoreProvider>
    <UIStoreProvider>{children}</UIStoreProvider>
  </ResumeStoreProvider>
);
