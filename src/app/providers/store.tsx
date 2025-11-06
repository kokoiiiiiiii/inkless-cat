import { ResumeStoreProvider } from '@entities/resume';
import { UIStoreProvider } from '@entities/ui';
import type { ReactNode } from 'react';

type StoreProviderProps = {
  children: ReactNode;
};

export const StoreProvider = ({ children }: StoreProviderProps) => (
  <ResumeStoreProvider>
    <UIStoreProvider>{children}</UIStoreProvider>
  </ResumeStoreProvider>
);
