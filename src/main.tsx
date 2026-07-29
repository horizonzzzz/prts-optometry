import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles/main.scss';
import './styles/pixi.scss';

const LegacyDomPage = lazy(() => import('./pages/LegacyDomPage'));
const PixiVisionPage = lazy(() => import('./pages/PixiVisionPage'));
const needsHide = import.meta.env.VITE_NEED_HIDE === 'true';

createRoot(document.querySelector('#root')!).render(
  <HashRouter>
    <Suspense fallback={needsHide ? (
      <div className="pixi-loading pixi-loading--blocked" role="alert">
        <div className="pixi-loading__lock">
          <p className="pixi-loading__label">PRTS // ACCESS CONTROL</p>
          <p className="pixi-loading__title">验光终端暂未开放使用</p>
          <p className="pixi-loading__status">TERMINAL STATUS: LOCKED</p>
        </div>
      </div>
    ) : <div className="pixi-loading">PRTS // INITIALIZING OPTICAL ARRAY</div>}>
      <Routes>
        <Route path="/" element={<PixiVisionPage />} />
        <Route path="/legacy-dom" element={<LegacyDomPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </Suspense>
  </HashRouter>,
);
