import { useLayoutEffect, useReducer, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { advanceState, createInitialState, getStageCopy } from './state.js';
import visionHouse from '../assets/vision-house.jpg';
import prtsClose from '../assets/prts-close.jpg';

const actionByStage = Object.freeze({
  intro: 'START',
  calibrate: 'CONFIRM',
  drift: 'CONTINUE',
});

const stageMeta = Object.freeze({
  intro: Object.freeze({ code: '01 / 04', index: '01', signal: 'SIGNAL / STABLE' }),
  calibrate: Object.freeze({ code: '02 / 04', index: '02', signal: 'SIGNAL / CALIBRATING' }),
  drift: Object.freeze({ code: '03 / 04', index: '03', signal: 'SIGNAL / DUAL' }),
  reveal: Object.freeze({ code: '04 / 04', index: '04', signal: 'SIGNAL / RETURNED' }),
});

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export default function App() {
  const [state, dispatch] = useReducer(advanceState, undefined, createInitialState);
  const [hasStarted, setHasStarted] = useState(false);
  const appRef = useRef(null);
  const entryRef = useRef(null);
  const visionTargetRef = useRef(null);
  const houseBaseRef = useRef(null);
  const houseGlitchRef = useRef(null);
  const screenFlashRef = useRef(null);
  const prtsPortraitRef = useRef(null);
  const prtsImageScanRef = useRef(null);
  const originumFrameRef = useRef(null);
  const ambientAudioRef = useRef(null);
  const activeTimeline = useRef(null);
  const flashTimer = useRef(null);
  const flashSequenceTimer = useRef(null);
  const revealCompleteTimer = useRef(null);
  const audioStarted = useRef(false);
  const initialized = useRef(false);
  const previousStage = useRef(state.stage);
  const copy = getStageCopy(state);
  const meta = stageMeta[state.stage];

  function originumHalves() {
    return originumFrameRef.current?.querySelectorAll('.originum-half') ?? [];
  }

  function setStageClasses(stage) {
    const app = appRef.current;
    app.classList.toggle('is-drifting', stage === 'drift');
    app.classList.toggle('is-revealing', stage === 'reveal');
    app.classList.toggle('is-complete', false);
  }

  function startAudio(muted = state.muted) {
    const audio = ambientAudioRef.current;
    if (audioStarted.current || muted || !audio) return;

    audio.volume = 0.14;
    const playResult = audio.play();
    audioStarted.current = true;

    playResult?.catch(() => {
      audioStarted.current = false;
      appRef.current.classList.add('audio-unavailable');
    });
  }

  function stopAudio() {
    const audio = ambientAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audioStarted.current = false;
  }

  function runIntroTimeline() {
    const app = appRef.current;
    if (reduceMotion) {
      app.classList.add('is-entering');
      window.setTimeout(() => app.classList.remove('is-entering'), 460);
      return;
    }

    activeTimeline.current?.kill();
    activeTimeline.current = gsap.timeline().fromTo(
      visionTargetRef.current,
      { opacity: 0.52, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.58, ease: 'power2.out' },
    );
  }

  function runCalibrationTimeline() {
    const app = appRef.current;
    if (reduceMotion) {
      app.classList.add('is-entering');
      window.setTimeout(() => app.classList.remove('is-entering'), 420);
      return;
    }

    activeTimeline.current?.kill();
    activeTimeline.current = gsap.timeline()
      .fromTo(houseBaseRef.current,
        { filter: 'blur(0px) contrast(1.03) saturate(.95)', scale: 1 },
        { filter: 'blur(12px) contrast(1.03) saturate(.95)', scale: 1.035, duration: 0.32, ease: 'power2.in' })
      .to(houseBaseRef.current,
        { filter: 'blur(3.5px) contrast(1.03) saturate(.95)', scale: 1.015, duration: 0.42, ease: 'power2.out' });
  }

  function runDriftTimeline() {
    if (reduceMotion) {
      appRef.current.classList.add('is-drifting');
      return;
    }

    activeTimeline.current?.kill();
    activeTimeline.current = gsap.to(houseBaseRef.current, {
      filter: 'blur(2px) brightness(.38) contrast(1.35) saturate(.65)',
      scale: 1.025,
      duration: 0.72,
      ease: 'power2.inOut',
    });
  }

  function triggerRevealFlash() {
    const app = appRef.current;
    const screenFlash = screenFlashRef.current;
    window.clearTimeout(flashTimer.current);
    window.clearTimeout(flashSequenceTimer.current);
    app.classList.remove('is-flashing', 'is-gsap-flash', 'is-script-flash');
    screenFlash.style.opacity = '0';
    void app.offsetWidth;
    app.classList.add('is-flashing');

    if (!reduceMotion) {
      app.classList.add('is-gsap-flash');
      gsap.killTweensOf(screenFlash);
      gsap.timeline()
        .set(screenFlash, { opacity: 0, background: '#effff8' })
        .to(screenFlash, { opacity: 0.94, duration: 0.07, ease: 'steps(1)' })
        .to(screenFlash, { opacity: 0.04, duration: 0.1, ease: 'none' })
        .to(screenFlash, { opacity: 0.72, background: '#dfe9ff', duration: 0.08, ease: 'steps(1)' })
        .to(screenFlash, { opacity: 0.06, duration: 0.1, ease: 'none' })
        .to(screenFlash, { opacity: 0.46, background: '#ffedf0', duration: 0.08, ease: 'steps(1)' })
        .to(screenFlash, { opacity: 0, duration: 0.14, ease: 'power1.out' });
    } else {
      app.classList.add('is-script-flash');
      const frames = [[0.92, 0], [0.05, 80], [0.68, 95], [0.04, 100], [0.42, 105], [0, 140]];
      let frameIndex = 0;
      const playFrame = () => {
        const [opacity, delay] = frames[frameIndex++];
        screenFlash.style.opacity = String(opacity);
        if (frameIndex < frames.length) flashSequenceTimer.current = window.setTimeout(playFrame, delay);
      };
      playFrame();
    }

    flashTimer.current = window.setTimeout(() => {
      app.classList.remove('is-flashing', 'is-gsap-flash', 'is-script-flash');
      screenFlash.style.opacity = '0';
    }, 760);
  }

  function runRevealTimeline() {
    const app = appRef.current;
    const portrait = prtsPortraitRef.current;
    const frame = originumFrameRef.current;
    app.classList.add('is-revealing');
    triggerRevealFlash();

    if (reduceMotion) {
      portrait.style.opacity = '1';
      portrait.style.transform = 'scale(1)';
      frame.style.opacity = '1';
      window.clearTimeout(revealCompleteTimer.current);
      revealCompleteTimer.current = window.setTimeout(() => {
        app.classList.remove('is-revealing');
        app.classList.add('is-complete');
      }, 560);
      return;
    }

    activeTimeline.current?.kill();
    activeTimeline.current = gsap.timeline({
      onComplete: () => {
        app.classList.remove('is-revealing');
        app.classList.add('is-complete');
      },
    });

    activeTimeline.current
      .fromTo(portrait,
        { opacity: 0, scale: 0.9, filter: 'blur(8px)' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.68, ease: 'power3.out' })
      .set(frame, { opacity: 1 }, '<0.04')
      .fromTo(originumHalves(),
        { x: (index) => index ? 52 : -52 },
        { x: 0, duration: 0.34, stagger: 0.025, ease: 'power3.inOut' }, '<')
      .fromTo(frame,
        { scale: 1.08, rotation: 1.4 },
        { scale: 1, rotation: 0, duration: 0.42, ease: 'power2.out' }, '<')
      .to(prtsImageScanRef.current, { opacity: 1, x: '100%', duration: 0.64, ease: 'power1.inOut' }, '<0.06');
  }

  function resetReveal() {
    const app = appRef.current;
    const screenFlash = screenFlashRef.current;
    const halves = originumHalves();
    activeTimeline.current?.kill();
    window.clearTimeout(flashTimer.current);
    window.clearTimeout(flashSequenceTimer.current);
    window.clearTimeout(revealCompleteTimer.current);
    activeTimeline.current = null;
    flashTimer.current = null;
    flashSequenceTimer.current = null;
    revealCompleteTimer.current = null;

    gsap.killTweensOf([
      houseBaseRef.current,
      houseGlitchRef.current,
      prtsPortraitRef.current,
      prtsImageScanRef.current,
      originumFrameRef.current,
      halves,
    ]);
    gsap.set(prtsPortraitRef.current, { clearProps: 'all' });
    gsap.set(prtsImageScanRef.current, { clearProps: 'all' });
    gsap.set(originumFrameRef.current, { clearProps: 'all' });
    gsap.set(halves, { clearProps: 'all' });
    gsap.set([houseBaseRef.current, houseGlitchRef.current], { clearProps: 'all' });

    app.classList.remove('is-drifting', 'is-revealing', 'is-complete', 'is-entering', 'is-flashing', 'is-gsap-flash', 'is-script-flash');
    gsap.killTweensOf(screenFlash);
    gsap.set(screenFlash, { clearProps: 'all' });
    prtsPortraitRef.current.style.opacity = '0';
    prtsPortraitRef.current.style.transform = 'scale(0.92)';
    originumFrameRef.current.style.opacity = '0';
    prtsImageScanRef.current.style.opacity = '0';
    prtsImageScanRef.current.style.transform = 'translateX(-110%)';
    stopAudio();
  }

  function runStageTransition(from, to) {
    if (to === 'intro') return runIntroTimeline();
    if (from === 'intro' && to === 'calibrate') return runCalibrationTimeline();
    if (to === 'drift') return runDriftTimeline();
    if (to === 'reveal') runRevealTimeline();
  }

  useLayoutEffect(() => setStageClasses(state.stage), [state]);

  useLayoutEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
    } else {
      runStageTransition(previousStage.current, state.stage);
    }
    previousStage.current = state.stage;
  }, [state.stage]);

  function handleVisionActivate() {
    startAudio();
    const action = actionByStage[state.stage];
    if (action) dispatch(action);
  }

  function handleStart() {
    startAudio();
    runIntroTimeline();

    if (reduceMotion) {
      setHasStarted(true);
      return;
    }

    const entry = entryRef.current;
    entry.classList.add('is-departing');
    gsap.timeline()
      .to(entry.querySelectorAll('.entry-status, .entry-copy, .entry-start, .entry-footer'), {
        opacity: 0,
        y: -14,
        duration: 0.28,
        stagger: 0.025,
        ease: 'power2.in',
      })
      .to(entry.querySelector('.entry-reticle'), {
        scale: 4.2,
        opacity: 0.08,
        duration: 0.78,
        ease: 'power3.in',
      }, '<0.04')
      .to(entry, {
        clipPath: 'inset(50% 0 50% 0)',
        duration: 0.82,
        ease: 'power4.inOut',
      }, '<0.16');
    window.setTimeout(() => setHasStarted(true), 1100);
  }

  function handleReset() {
    resetReveal();
    dispatch('RESET');
  }

  function handleMute() {
    const willMute = !state.muted;
    dispatch('TOGGLE_MUTE');
    if (willMute) {
      ambientAudioRef.current?.pause();
      audioStarted.current = false;
    } else {
      startAudio(false);
    }
  }

  return (
    <>
      <main id="screening-app" ref={appRef} data-stage={state.stage} className="relative isolate flex min-h-svh flex-col overflow-hidden" aria-hidden={!hasStarted} inert={!hasStarted ? true : undefined}>
      <div className="grain absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="scanline absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="screen-filter absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div ref={screenFlashRef} className="screen-flash absolute inset-0 pointer-events-none" aria-hidden="true" />

      <header className="top-bar relative z-10 flex items-start justify-between">
        <div className="brand-lockup flex items-center">
          <span className="rhodes-watermark block" aria-hidden="true" />
          <div>
            <p className="brand-name">PRTS</p>
            <p className="brand-sub">PERSONAL RECORD TERMINAL</p>
          </div>
        </div>

        <div className="top-readout flex items-center">
          <span id="stage-code" className="stage-code">{meta.code}</span>
          <button id="mute-toggle" className="icon-button inline-flex items-center" type="button" aria-pressed={state.muted} aria-label={state.muted ? '打开声音' : '关闭声音'} onClick={handleMute}>
            <span className="sound-bars inline-flex items-center" aria-hidden="true"><i /><i /><i /></span>
            <span className="icon-button-label">SOUND</span>
          </button>
        </div>
      </header>

      <div className="system-rail relative z-10 grid" aria-hidden="true">
        <span>RI-07</span>
        <span>OPTICAL CONTROL</span>
        <span>PRTS // LIVE</span>
      </div>

      <section className="screen-body relative grid min-h-0 flex-1" aria-label="视觉筛查体验">
        <div className="visual-meta relative z-10 flex items-center" aria-hidden="true">
          <span>OPTICAL ARRAY</span>
          <span className="meta-rule block" />
          <span id="signal-line">{meta.signal}</span>
        </div>

        <section className="visual-stage relative grid place-items-center overflow-visible" aria-label="远距视觉检测">
          <div className="visual-halo absolute aspect-square" aria-hidden="true" />
          <button id="vision-target" ref={visionTargetRef} className="vision-frame relative z-[2] block aspect-square cursor-pointer border-0 bg-transparent p-0" type="button" aria-label={copy.actionLabel} disabled={state.stage === 'reveal'} onClick={handleVisionActivate}>
            <span className="corner corner-tl" aria-hidden="true" />
            <span className="corner corner-tr" aria-hidden="true" />
            <span className="corner corner-bl" aria-hidden="true" />
            <span className="corner corner-br" aria-hidden="true" />

            <div id="vision-visual" className="vision-visual house-scene relative block h-full w-full overflow-hidden rounded-full" role="img" aria-label="圆形视野中的田野与远处房屋">
              <div className="house-viewport absolute inset-0 isolate overflow-hidden">
                <img ref={houseBaseRef} className="house-image house-image-base pointer-events-none absolute block max-w-none select-none" src={visionHouse} alt="" draggable="false" />
                <img ref={houseGlitchRef} className="house-image house-image-glitch pointer-events-none absolute block max-w-none select-none" src={visionHouse} alt="" draggable="false" aria-hidden="true" />
                <span className="house-vignette absolute inset-0 block pointer-events-none" aria-hidden="true" />
                <span className="house-reticle absolute inset-0 block pointer-events-none" aria-hidden="true" />
              </div>
            </div>
          </button>

          <div id="reveal-scene" className="reveal-scene absolute z-[3] block" aria-hidden={state.stage !== 'reveal'}>
            <div id="prts-portrait" ref={prtsPortraitRef} className="prts-portrait absolute isolate overflow-hidden" aria-hidden="true">
              <img id="prts-image" className="prts-image relative block h-full w-full" src={prtsClose} alt="" />
              <span ref={prtsImageScanRef} className="prts-image-scan pointer-events-none absolute" aria-hidden="true" />
            </div>

            <svg id="originum-frame" ref={originumFrameRef} className="originum-frame absolute inset-0 block h-full w-full overflow-visible pointer-events-none" viewBox="0 0 320 360" role="img" aria-labelledby="originum-title originum-description">
              <title id="originum-title">源石菱形中的 PRTS 影像</title>
              <desc id="originum-description">普瑞赛斯的面部影像出现在分段破碎并持续扰动的源石菱形中。</desc>
              <defs>
                <filter id="unstable-edge" x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence type="fractalNoise" baseFrequency=".012 .07" numOctaves="2" seed="8" result="noise">
                    <animate attributeName="baseFrequency" values=".012 .07;.02 .045;.009 .09;.012 .07" dur="1.8s" repeatCount="indefinite" />
                  </feTurbulence>
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="B">
                    <animate attributeName="scale" values="2;7;3;9;2" dur="1.1s" repeatCount="indefinite" />
                  </feDisplacementMap>
                </filter>
                <filter id="edge-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g className="originum-frame-glitch" filter="url(#unstable-edge)" aria-hidden="true">
                <g className="originum-half originum-half-left">
                  <path className="originum-frame-shadow" d="M153 13L18 169M18 191L153 347" />
                  <path className="originum-frame-edge" d="M153 13L92 83M73 105L18 169M18 191L62 242M81 264L153 347" />
                  <path className="originum-frame-chip" d="M82 86L58 108L72 117ZM49 120L28 142L37 151ZM61 250L76 267L62 278Z" />
                </g>
                <g className="originum-half originum-half-right">
                  <path className="originum-frame-shadow" d="M167 13L302 169M302 191L167 347" />
                  <path className="originum-frame-edge" d="M167 13L231 87M249 108L302 169M302 191L263 236M244 258L167 347" />
                  <path className="originum-frame-chip" d="M239 88L262 108L249 119ZM271 122L293 145L282 153ZM258 247L245 263L258 275Z" />
                </g>
                <path className="originum-frame-echo originum-frame-echo-left" d="M154 25L31 168M31 192L154 335" />
                <path className="originum-frame-echo originum-frame-echo-right" d="M166 25L289 168M289 192L166 335" />
              </g>
              <path className="originum-frame-glint" filter="url(#edge-glow)" d="M153 13L92 83M18 191L62 242M167 13L231 87M302 191L263 236" aria-hidden="true" />
            </svg>
          </div>
        </section>

        <div className="visual-meta visual-meta-bottom relative z-10 flex items-center" aria-hidden="true">
          <span>FOCAL DISTANCE / 30 CM</span>
          <span className="meta-rule block" />
          <span id="phase-readout">PHASE / {meta.index}</span>
        </div>
      </section>

      <section className="copy-block reveal-caption relative z-10" aria-labelledby="stage-title">
        <div className="copy-heading flex items-center justify-between">
          <p id="stage-eyebrow" className="stage-eyebrow">{copy.eyebrow}</p>
          <span className="copy-index" aria-hidden="true">{meta.index}</span>
        </div>
        <h1 id="stage-title">{copy.title}</h1>
        <p id="stage-note" className="stage-note">{copy.note}</p>
        {state.stage === 'reveal' && (
          <button className="reset-button" type="button" onClick={handleReset} aria-label="重置并返回第一个画面">
            <span>RESET</span>
            <small aria-hidden="true">R-00</small>
          </button>
        )}
        <p className="screening-note">FICTIONAL VISUAL EFFECT / NOT A MEDICAL TEST</p>
      </section>

      <p id="announcer" className="sr-only" aria-live="polite">{copy.eyebrow}，{copy.title}。{copy.note}</p>

      <audio id="ambient-audio" ref={ambientAudioRef} loop preload="none" aria-hidden="true" onError={() => appRef.current?.classList.add('audio-unavailable')}>
        <source src="https://web.hycdn.cn/arknights/official/_next/static/media/audio/bgm.ea4286.mp3" type="audio/mpeg" />
      </audio>
      </main>

      {!hasStarted && (
        <section ref={entryRef} className="entry-gate" aria-labelledby="entry-title">
          <div className="entry-noise" aria-hidden="true" />

          <header className="entry-status">
            <div className="entry-lockup">
              <span className="entry-mark" aria-hidden="true" />
              <span><b>PRTS</b><small>PERSONAL RECORD TERMINAL</small></span>
            </div>
            <span className="entry-sequence">SYS / 00</span>
          </header>

          <div className="entry-core">
            <div className="entry-reticle" aria-hidden="true">
              <span className="entry-reticle-ring" />
              <span className="entry-reticle-ring entry-reticle-ring-inner" />
              <span className="entry-reticle-cross" />
            </div>

            <div className="entry-copy">
              <p className="entry-kicker">RHODES ISLAND / OPTICAL SERVICE</p>
              <h1 id="entry-title"><span>PRTS</span><strong>验光终端</strong></h1>
              <p className="entry-intro">保持设备与双眼平齐，进入后请注视视野中央。</p>
            </div>

            <button className="entry-start" type="button" onClick={handleStart}>
              <span className="entry-start-index" aria-hidden="true">01</span>
              <span className="entry-start-label"><strong>开始验光</strong><small>BEGIN OPTICAL TEST</small></span>
              <span className="entry-start-arrow" aria-hidden="true">→</span>
            </button>
          </div>

          <footer className="entry-footer">
            <span>OPTICAL ARRAY / RI-07</span>
            <span className="entry-ready"><i aria-hidden="true" /> TERMINAL READY</span>
          </footer>
        </section>
      )}
    </>
  );
}
