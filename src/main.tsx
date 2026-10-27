import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import './styles/main.scss';
import './styles/optometry.scss';
import './styles/terminal.scss';

const LegacyDomPage = lazy(() => import('./pages/LegacyDomPage'));
const OptometryPage = lazy(() => import('./pages/OptometryPage'));
const IndexPage = lazy(() => import('./pages/IndexPage'));
const M3RescuePage = lazy(() => import('./pages/M3RescuePage'));

createRoot(document.querySelector('#root')!).render(
  <HashRouter>
    <Suspense fallback={<div className="optometry-loading">PRTS // CONNECTING</div>}>
      <Routes>
        <Route path="/" element={<OptometryPage />} />
        <Route path="/index" element={<IndexPage />} />
        <Route path="/m3" element={<M3RescuePage />} />
        <Route path="/legacy-dom" element={<><LegacyDomPage /><Link className="terminal-index-link" to="/index">← INDEX</Link></>} />
        <Route path="*" element={<Navigate replace to="/index" />} />
      </Routes>
    </Suspense>
  </HashRouter>,
);
