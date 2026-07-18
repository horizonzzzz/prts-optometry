import { useEffect, useReducer, useRef, useState, type MouseEvent } from 'react';
import qrNode01 from '../../assets/7521a33230186fc1435c3077c4449634.png';
import qrNode02 from '../../assets/b3a33055da1d8f99363e4042f4df035f.jpg';
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
const SNOW_NOISE_VOLUME = 0.02;

export default function PixiVisionPage() {
  const [state, dispatch] = useReducer(advanceState, undefined, createInitialState);
  const [started, setStarted] = useState(false);
  const [entryDeparting, setEntryDeparting] = useState(false);
  const [entryReady, setEntryReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [interactionMessage, setInteractionMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const qrDialogRef = useRef<HTMLDialogElement | null>(null);
  const sceneRef = useRef<PixiVisionScene | null>(null);
  const reducedMotionRef = useRef(false);
  const calibrationTimerRef = useRef(0);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const revealRef = useRef<HTMLAudioElement | null>(null);
  const snowNoiseRef = useRef<{
    context: AudioContext;
    gain: GainNode;
  } | null>(null);

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

  useEffect(() => () => window.clearTimeout(calibrationTimerRef.current), []);

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
      const snowNoise = snowNoiseRef.current;
      ambient.pause();
      reveal.pause();
      ambient.currentTime = 0;
      reveal.currentTime = 0;
      void snowNoise?.context.close().catch(() => undefined);
      ambientRef.current = null;
      revealRef.current = null;
      snowNoiseRef.current = null;
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
    setInteractionMessage('');
    setStageReady(false);
    sceneRef.current?.setStage(state.stage, () => setStageReady(true));
  }, [ready, state.stage]);

  useEffect(() => {
    if (!ready) return;
    sceneRef.current?.setMuted(state.muted);
  }, [ready, state.muted]);

  useEffect(() => {
    const ambient = ambientRef.current;
    const reveal = revealRef.current;
    if (!ambient || !reveal || !started) return;

    const snowNoise = snowNoiseRef.current;
    if (snowNoise) snowNoise.gain.gain.value = 0;

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
    if (state.stage === 'drift') {
      ambient.pause();
      if (snowNoise) snowNoise.gain.gain.value = SNOW_NOISE_VOLUME;
      return;
    }

    ambient.volume = AMBIENT_VOLUME;
    void ambient.play().catch(() => undefined);
  }, [started, state.muted, state.stage]);

  const copy = getStageCopy(state);
  const liveNote = copy.note.endsWith('。') ? copy.note : `${copy.note}。`;

  function startAmbientAudio() {
    const ambient = ambientRef.current;
    if (!ambient || state.muted) return;
    ambient.volume = AMBIENT_VOLUME;
    void ambient.play().catch(() => undefined);
  }

  function prepareSnowNoise() {
    if (snowNoiseRef.current) return;

    try {
      const context = new AudioContext();
      const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] = Math.random() * 2 - 1;
      }

      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0;
      source.connect(gain).connect(context.destination);
      source.start();
      snowNoiseRef.current = { context, gain };
      void context.resume().catch(() => undefined);
    } catch {
      // Audio is optional; unsupported browsers continue silently.
    }
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

  function handleVisionActivate(event: MouseEvent<HTMLButtonElement>) {
    if (!ready || !stageReady || error || !started || entryDeparting || state.stage === 'reveal') return;
    if (state.stage === 'calibrate') {
      prepareSnowNoise();
      const confirmed = sceneRef.current?.confirmCalibration(event.detail === 0) ?? false;
      setInteractionMessage(confirmed ? '焦距已锁定。' : '焦距未锁定，请在图像清晰时点击。');
      if (!confirmed) return;
      setStageReady(false);
      window.clearTimeout(calibrationTimerRef.current);
      calibrationTimerRef.current = window.setTimeout(() => dispatch('CONFIRM'), 180);
      return;
    }

    setInteractionMessage('');
    const action = ACTION_BY_STAGE[state.stage];
    if (action) {
      setStageReady(false);
      dispatch(action);
    }
  }

  function handleReset() {
    if (!ready || !stageReady) return;
    setStageReady(false);
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
        disabled={!started || entryDeparting || !ready || !stageReady || Boolean(error) || state.stage === 'reveal'}
        aria-label={copy.actionLabel}
      />

      {state.stage === 'reveal' && stageReady && (
        <>
          <button
            className="pixi-hit pixi-reset-hit"
            type="button"
            onClick={handleReset}
            disabled={!ready}
            aria-label="重置并返回第一个画面"
          />
          <button
            className="pixi-qr-trigger"
            type="button"
            onClick={() => qrDialogRef.current?.showModal()}
            aria-haspopup="dialog"
            aria-controls="pixi-qr-dialog"
          >
            <span>接入通讯终端</span>
            <strong>QR-02</strong>
          </button>
        </>
      )}

      <dialog
        ref={qrDialogRef}
        id="pixi-qr-dialog"
        className="pixi-qr-dialog"
        aria-labelledby="pixi-qr-title"
        aria-describedby="pixi-qr-description"
      >
        <section className="pixi-qr-panel">
          <header className="pixi-qr-header">
            <div>
              <p>PRTS // EXTERNAL CHANNEL</p>
              <h2 id="pixi-qr-title">通讯终端接入</h2>
            </div>
            <form method="dialog">
              <button type="submit" aria-label="关闭通讯终端弹窗">CLOSE / ESC</button>
            </form>
          </header>

          <p id="pixi-qr-description" className="pixi-qr-description">
            选择任一通讯节点，扫描二维码完成外部接入。
          </p>

          <div className="pixi-qr-grid">
            <figure className="pixi-qr-node">
              <div className="pixi-qr-code">
                <img src={qrNode01} alt="通讯节点 01 二维码" />
              </div>
              <figcaption><span>NODE // 01</span><strong>通讯节点 A</strong></figcaption>
            </figure>

            <figure className="pixi-qr-node">
              <div className="pixi-qr-code">
                <img src={qrNode02} alt="通讯节点 02 二维码" />
              </div>
              <figcaption><span>NODE // 02</span><strong>通讯节点 B</strong></figcaption>
            </figure>
          </div>

          <footer className="pixi-qr-footer">
            <span>SCAN STATUS // STANDBY</span>
            <span>ENCRYPTED CHANNEL / 02</span>
          </footer>
        </section>
      </dialog>

      <p className="pixi-sr-only" aria-live="polite" aria-atomic="true">
        {entryDeparting ? '正在进入验光界面。' : `${copy.eyebrow}。${copy.title}。${liveNote}${stageReady ? `${copy.actionLabel}。` : ''}${interactionMessage}`}
      </p>

      {error && <p className="pixi-error">{error}</p>}
    </main>
  );
}
