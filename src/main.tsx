import './index.css';

import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

const Phase4BStudioPage = lazy(() => import('@pages/phase4b-studio'));
const MobileCompactDesignPage = lazy(() => import('@pages/mobile-compact-design'));
const App = lazy(() => import('./App'));

const container = document.querySelector('#root');

if (!container) {
  throw new Error('Root element #root not found');
}

const path = globalThis.location.pathname.replace(/\/+$/, '') || '/';
const application =
  path === '/design/mobile-compact' ? (
    <Suspense fallback={<div aria-busy="true">正在打开移动端设计原型…</div>}>
      <MobileCompactDesignPage />
    </Suspense>
  ) : path === '/design/phase4b' ? (
    <Suspense fallback={<div aria-busy="true">正在打开设计演示…</div>}>
      <Phase4BStudioPage />
    </Suspense>
  ) : (
    <Suspense fallback={<div aria-busy="true">正在打开 Inkless Cat…</div>}>
      <App />
    </Suspense>
  );

createRoot(container).render(<StrictMode>{application}</StrictMode>);
