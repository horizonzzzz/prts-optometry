import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import './styles/main.scss';
import './styles/pixi.scss';
import './styles/terminal.scss';

const LegacyDomPage = lazy(() => import('./pages/LegacyDomPage'));
const PixiVisionPage = lazy(() => import('./pages/PixiVisionPage'));
const IndexPage = lazy(() => import('./pages/IndexPage'));
const M3RescuePage = lazy(() => import('./pages/M3RescuePage'));

createRoot(document.querySelector('#root')!).render(
  <HashRouter>
    <Suspense fallback={<div className="pixi-loading">PRTS // CONNECTING</div>}>
      <Routes>
        <Route path="/" element={<><PixiVisionPage /><Link className="terminal-index-link" to="/index">← INDEX</Link></>} />
        <Route path="/index" element={<IndexPage />} />
        <Route path="/m3" element={<M3RescuePage />} />
        <Route path="/legacy-dom" element={<><LegacyDomPage /><Link className="terminal-index-link" to="/index">← INDEX</Link></>} />
        <Route path="*" element={<Navigate replace to="/index" />} />
      </Routes>
    </Suspense>
  </HashRouter>,
);
