import { useEffect, useReducer, useRef, useState } from 'react';
import ambientAudio from '../../assets/audio/bgm.ea4286.mp3';
import revealAudio from '../../assets/audio/luanxu.mp3';
import {
  advanceState,
  createInitialState,
  getStageCopy,
  type Action,
} from '../state';
import { createPixiVisionScene, type PixiVisionScene } from '../pixi/createPixiVisionScene';

const ACTION_BY_STAGE: Partial<Record<string, Action>> = {
  intro: 'START',
  calibrate: 'CONFIRM',
  drift: 'CONTINUE',
};

const AMBIENT_VOLUME = 0.35;
const REVEAL_VOLUME = 0.5;

export default function PixiVisionPage() {
  const [state, dispatch] = useReducer(advanceState, undefined, createInitialState);
  const [started, setStarted] = useState(false);
  const [entryDeparting, setEntryDeparting] = useState(false);
  const [entryReady, setEntryReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<PixiVisionScene | null>(null);
  const reducedMotionRef = useRef(false);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const revealRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reducedMotionRef.current = query.matches;
      setReducedMotion(query.matches);
    };

    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const ambient = new Audio(ambientAudio);
    ambient.loop = true;
    ambient.preload = 'none';

    const reveal = new Audio(revealAudio);
    reveal.loop = true;
    reveal.preload = 'none';

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

    createPixiVisionScene({
      host,
      reducedMotion: reducedMotionRef.current,
      onEntryReady: () => {
        if (!cancelled) setEntryReady(true);
      },
    })
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
      setEntryReady(false);
      setReady(false);
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    if (!ready) return;
    sceneRef.current?.setStage(state.stage);
  }, [ready, state.stage]);

  useEffect(() => {
    if (!ready) return;
    sceneRef.current?.setMuted(state.muted);
  }, [ready, state.muted]);

  useEffect(() => {
    const ambient = ambientRef.current;
    const reveal = revealRef.current;
    if (!ambient || !reveal || !started) return;

    if (state.muted) {
      ambient.pause();
      reveal.pause();
      return;
    }

    if (state.stage === 'reveal') {
      ambient.pause();
      reveal.volume = REVEAL_VOLUME;
      reveal.currentTime = 0;
      void reveal.play().catch(() => undefined);
      return;
    }

    reveal.pause();
    ambient.volume = AMBIENT_VOLUME;
    void ambient.play().catch(() => undefined);
  }, [started, state.muted, state.stage]);

  const copy = getStageCopy(state);

  function startAmbientAudio() {
    const ambient = ambientRef.current;
    if (!ambient || state.muted) return;
    ambient.volume = AMBIENT_VOLUME;
    void ambient.play().catch(() => undefined);
  }

  function handleStart() {
    if (!ready || !entryReady || error || started || entryDeparting) return;
    startAmbientAudio();
    setEntryDeparting(true);
    sceneRef.current?.setStarted(true, () => {
      setStarted(true);
      setEntryDeparting(false);
    });
  }

  function handleVisionActivate() {
    if (!ready || error || !started || entryDeparting || state.stage === 'reveal') return;
    const action = ACTION_BY_STAGE[state.stage];
    if (action) dispatch(action);
  }

  function handleReset() {
    if (!ready) return;
    sceneRef.current?.reset();
    dispatch('RESET');
  }

  function handleMute() {
    dispatch('TOGGLE_MUTE');
  }

  return (
    <main className="pixi-page" data-stage={state.stage} data-started={started} data-entry-departing={entryDeparting} aria-label="视觉筛查体验">
      <div ref={canvasHostRef} className="pixi-canvas-host" aria-hidden="true" />
      {!ready && !error && <div className="pixi-loading">PRTS // INITIALIZING OPTICAL ARRAY</div>}

      <div className="pixi-ui">
        <button
          className="pixi-sound-hit"
          type="button"
          onClick={handleMute}
          aria-pressed={state.muted}
          aria-label={state.muted ? '打开声音' : '关闭声音'}
          disabled={!started || !ready}
        >
          <span className="pixi-sr-only">{state.muted ? '打开声音' : '关闭声音'}</span>
        </button>
      </div>

      <button
        className="pixi-hit pixi-entry-hit"
        type="button"
        onClick={handleStart}
        disabled={started || entryDeparting || !ready || !entryReady || Boolean(error)}
        aria-label="开始验光"
      />

      <button
        className="pixi-hit pixi-vision-hit"
        type="button"
        onClick={handleVisionActivate}
        disabled={!started || entryDeparting || !ready || Boolean(error) || state.stage === 'reveal'}
        aria-label={copy.actionLabel}
      />

      {state.stage === 'reveal' && (
        <button
          className="pixi-hit pixi-reset-hit"
          type="button"
          onClick={handleReset}
          disabled={!ready}
          aria-label="重置并返回第一个画面"
        />
      )}

      <p className="pixi-sr-only" aria-live="polite" aria-atomic="true">
        {entryDeparting ? '正在进入验光界面。' : `${copy.eyebrow}。${copy.title}。${copy.note}`}
      </p>

      {error && <p className="pixi-error">{error}</p>}
    </main>
  );
}
