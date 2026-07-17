import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import './styles/main.scss';
import './styles/pixi.scss';

const PixiVisionPage = lazy(() => import('./pixi/PixiVisionPage'));

createRoot(document.querySelector('#root')!).render(
  <HashRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route
        path="/pixi"
        element={(
          <Suspense fallback={<div className="pixi-loading">LOADING VISUAL TERMINAL</div>}>
            <PixiVisionPage />
          </Suspense>
        )}
      />
      <Route path="*" element={<App />} />
    </Routes>
  </HashRouter>,
);
