import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles/main.scss';
import './styles/pixi.scss';

const LegacyDomPage = lazy(() => import('./pages/LegacyDomPage'));
const PixiVisionPage = lazy(() => import('./pages/PixiVisionPage'));

createRoot(document.querySelector('#root')!).render(
  <HashRouter>
    <Suspense fallback={<div className="pixi-loading">LOADING VISUAL TERMINAL</div>}>
      <Routes>
        <Route path="/" element={<PixiVisionPage />} />
        <Route path="/legacy-dom" element={<LegacyDomPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </Suspense>
  </HashRouter>,
);
