import './index.css';

import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';

const Phase4BStudioPage = lazy(() => import('@pages/phase4b-studio'));

const container = document.querySelector('#root');

if (!container) {
  throw new Error('Root element #root not found');
}

const path = globalThis.location.pathname.replace(/\/+$/, '') || '/';
const application =
  path === '/design/phase4b' ? (
    <Suspense fallback={<div aria-busy="true">正在打开设计演示…</div>}>
      <Phase4BStudioPage />
    </Suspense>
  ) : (
    <App />
  );

createRoot(container).render(<StrictMode>{application}</StrictMode>);
