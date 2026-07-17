import { useEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ambientAudio from '../../assets/audio/bgm.ea4286.mp3';
import revealAudio from '../../assets/audio/luanxu.mp3';
import {
  advanceState,
  createInitialState,
  getStageCopy,
  type Action,
} from '../state';
import { createPixiVisionScene, type PixiVisionScene } from './createPixiVisionScene';

const ACTION_BY_STAGE: Record<string, Action> = {
  intro: 'START',
  calibrate: 'CONFIRM',
  drift: 'CONTINUE',
  reveal: 'RESET',
};

export default function PixiVisionPage() {
  const [state, dispatch] = useReducer(advanceState, createInitialState());
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<PixiVisionScene | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const revealRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);

    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const ambient = new Audio(ambientAudio);
    ambient.loop = true;
    ambient.volume = 0.24;

    const reveal = new Audio(revealAudio);
    reveal.volume = 0.42;

    ambientRef.current = ambient;
    revealRef.current = reveal;

    return () => {
      ambient.pause();
      reveal.pause();
      ambient.currentTime = 0;
      reveal.currentTime = 0;
      ambientRef.current = null;
      revealRef.current = null;
    };
  }, []);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    let cancelled = false;

    createPixiVisionScene({ host, reducedMotion })
      .then((scene) => {
        if (cancelled) {
          scene.destroy();
          return;
        }

        sceneRef.current = scene;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError('PixiJS 视觉终端初始化失败，请检查浏览器的 WebGL 支持。');
        }
      });

    return () => {
      cancelled = true;
      sceneRef.current?.destroy();
      sceneRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    if (!ready) return;
    sceneRef.current?.setStarted(started);
  }, [ready, started]);

  useEffect(() => {
    if (!ready) return;
    sceneRef.current?.setStage(state.stage);
  }, [ready, state.stage]);

  useEffect(() => {
    const ambient = ambientRef.current;
    if (!ambient || !started) return;

    if (state.muted) {
      ambient.pause();
      return;
    }

    void ambient.play().catch(() => undefined);
  }, [started, state.muted]);

  useEffect(() => {
    const reveal = revealRef.current;
    if (!reveal || !started || state.stage !== 'reveal' || state.muted) return;

    reveal.currentTime = 0;
    void reveal.play().catch(() => undefined);
  }, [started, state.muted, state.stage]);

  const copy = getStageCopy(state);
  const actionLabel = started ? copy.actionLabel : '启动视觉终端';

  function handleStart() {
    setStarted(true);
    sceneRef.current?.setStarted(true);
  }

  function handleAction() {
    if (!started) {
      handleStart();
      return;
    }

    const action = ACTION_BY_STAGE[state.stage];
    if (action === 'RESET') {
      sceneRef.current?.reset();
    }
    dispatch(action);
  }

  function handleMute() {
    dispatch('TOGGLE_MUTE');
  }

  return (
    <main className="pixi-page" data-stage={state.stage} data-started={started}>
      <div ref={canvasHostRef} className="pixi-canvas-host" aria-hidden="true" />

      <div className="pixi-ui">
        <div className="pixi-brand">ORIGINUM / PRTS</div>
        <Link className="pixi-back" to="/">
          ORIGINAL DOM
        </Link>
        <button
          className="pixi-sound"
          type="button"
          onClick={handleMute}
          aria-label={state.muted ? '打开声音' : '关闭声音'}
        >
          {state.muted ? 'SOUND / OFF' : 'SOUND / ON'}
        </button>
      </div>

      <div className="pixi-controls">
        <button className="pixi-primary" type="button" onClick={handleAction} disabled={Boolean(error)}>
          {actionLabel}
        </button>
      </div>

      <p className="pixi-sr-only" aria-live="polite">
        {copy.eyebrow}。{copy.title}。{copy.note}
      </p>

      {error && <p className="pixi-error">{error}</p>}
    </main>
  );
}
