import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { advanceState, createInitialState, getStageCopy, type Action, type Stage } from '../state';
import visionHouse from '../../assets/vision-house.jpg';
import prtsClose from '../../assets/prts-close.jpg';
import ambientAudio from '../../assets/audio/bgm.ea4286.mp3';
import revealAudio from '../../assets/audio/luanxu.mp3';

const AMBIENT_VOLUME = 0.35;
const REVEAL_VOLUME = 0.5;

const actionByStage: Readonly<Partial<Record<Stage, Action>>> = Object.freeze({
  intro: 'START',
  calibrate: 'CONFIRM',
  drift: 'CONTINUE',
});

const stageMeta: Readonly<Record<Stage, Readonly<{ code: string; index: string; signal: string }>>> = Object.freeze({
  intro: Object.freeze({ code: '01 / 04', index: '01', signal: 'SIGNAL / STABLE' }),
  calibrate: Object.freeze({ code: '02 / 04', index: '02', signal: 'SIGNAL / CALIBRATING' }),
  drift: Object.freeze({ code: '03 / 04', index: '03', signal: 'SIGNAL / DUAL' }),
  reveal: Object.freeze({ code: '04 / 04', index: '04', signal: 'SIGNAL / RETURNED' }),
});

const reduceMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');

export default function LegacyDomPage() {
  const [state, dispatch] = useReducer(advanceState, undefined, createInitialState);
  const [hasStarted, setHasStarted] = useState(false);
  const [entryMounted, setEntryMounted] = useState(true);
  const [isEntryDeparting, setIsEntryDeparting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(() => reduceMotionQuery?.matches ?? false);
  const appRef = useRef<HTMLElement>(null);
  const entryRef = useRef<HTMLElement>(null);
  const visionTargetRef = useRef<HTMLButtonElement>(null);
  const houseBaseRef = useRef<HTMLImageElement>(null);
  const houseGlitchRef = useRef<HTMLImageElement>(null);
  const screenFlashRef = useRef<HTMLDivElement>(null);
  const prtsPortraitRef = useRef<HTMLDivElement>(null);
  const prtsImageScanRef = useRef<HTMLSpanElement>(null);
  const originumFrameRef = useRef<SVGSVGElement>(null);
  const ambientAudioRef = useRef<HTMLAudioElement>(null);
  const activeTimeline = useRef<gsap.core.Timeline | gsap.core.Tween | null>(null);
  const flashTimer = useRef<number | null>(null);
  const revealCompleteTimer = useRef<number | null>(null);
  const audioStarted = useRef(false);
  const audioPlayAttempt = useRef(0);
  const initialized = useRef(false);
  const previousStage = useRef(state.stage);
  const copy = getStageCopy(state);
  const meta = stageMeta[state.stage];

  useEffect(() => {
    if (!reduceMotionQuery) return;
    const handleChange = () => setReduceMotion(reduceMotionQuery.matches);
    reduceMotionQuery.addEventListener?.('change', handleChange);
    return () => reduceMotionQuery.removeEventListener?.('change', handleChange);
  }, []);

  useEffect(() => {
    if (!hasStarted || entryMounted) return;
    const focusTimer = window.setTimeout(() => {
      appRef.current?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(focusTimer);
  }, [hasStarted, entryMounted]);

  function originumHalves() {
    return originumFrameRef.current?.querySelectorAll('.originum-half') ?? [];
  }

  function setStageClasses(stage: Stage) {
    const app = appRef.current!;
    app.classList.toggle('is-drifting', stage === 'drift');
    app.classList.toggle('is-revealing', stage === 'reveal');
    app.classList.toggle('is-complete', false);
  }

  function startAudio(muted = state.muted, restart = false) {
    const audio = ambientAudioRef.current;
    if (muted || !audio || (!restart && audioStarted.current)) return;

    if (restart) {
      audioPlayAttempt.current += 1;
      audio.pause();
      audio.currentTime = 0;
      audio.load();
      audioStarted.current = false;
    }

    audio.volume = state.stage === 'reveal' ? REVEAL_VOLUME : AMBIENT_VOLUME;
    const playAttempt = ++audioPlayAttempt.current;
    const playResult = audio.play();
    audioStarted.current = true;

    playResult?.catch(() => {
      if (playAttempt !== audioPlayAttempt.current) return;
      audioStarted.current = false;
      appRef.current?.classList.add('audio-unavailable');
    });
  }

  function stopAudio() {
    const audio = ambientAudioRef.current;
    if (!audio) return;
    audioPlayAttempt.current += 1;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = AMBIENT_VOLUME;
    audioStarted.current = false;
  }

  function runIntroTimeline() {
    if (reduceMotion) return;

    activeTimeline.current?.kill();
    activeTimeline.current = gsap.timeline().fromTo(
      visionTargetRef.current,
      { opacity: 0.52, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.58, ease: 'power2.out' },
    );
  }

  function runCalibrationTimeline() {
    if (reduceMotion) return;

    activeTimeline.current?.kill();
    activeTimeline.current = gsap.timeline({ repeat: -1, yoyo: true, repeatDelay: 0.12 })
      .fromTo(houseBaseRef.current,
        { filter: 'blur(3.5px) contrast(1.03) saturate(.95)', scale: 1.015 },
        { filter: 'blur(9px) contrast(1.03) saturate(.95)', scale: 1.03, duration: 1.05, ease: 'sine.inOut' });
  }

  function runDriftTimeline() {
    if (reduceMotion) {
      appRef.current!.classList.add('is-drifting');
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
    const app = appRef.current!;
    const screenFlash = screenFlashRef.current!;
    window.clearTimeout(flashTimer.current ?? undefined);
    gsap.killTweensOf(screenFlash);
    app.classList.remove('is-flashing', 'is-gsap-flash');
    screenFlash.style.opacity = '0';
    if (reduceMotion) return;

    void app.offsetWidth;
    app.classList.add('is-flashing', 'is-gsap-flash');
    gsap.timeline()
      .set(screenFlash, { opacity: 0, background: '#effff8' })
      .to(screenFlash, { opacity: 0.94, duration: 0.07, ease: 'steps(1)' })
      .to(screenFlash, { opacity: 0.04, duration: 0.1, ease: 'none' })
      .to(screenFlash, { opacity: 0.72, background: '#dfe9ff', duration: 0.08, ease: 'steps(1)' })
      .to(screenFlash, { opacity: 0.06, duration: 0.1, ease: 'none' })
      .to(screenFlash, { opacity: 0.46, background: '#ffedf0', duration: 0.08, ease: 'steps(1)' })
      .to(screenFlash, { opacity: 0, duration: 0.14, ease: 'power1.out' });

    flashTimer.current = window.setTimeout(() => {
      app.classList.remove('is-flashing', 'is-gsap-flash');
      screenFlash.style.opacity = '0';
    }, 760);
  }

  function runRevealTimeline() {
    const app = appRef.current!;
    const portrait = prtsPortraitRef.current!;
    const frame = originumFrameRef.current!;
    app.classList.add('is-revealing');
    triggerRevealFlash();

    if (reduceMotion) {
      portrait.style.opacity = '1';
      portrait.style.transform = 'scale(1)';
      frame.style.opacity = '1';
      window.clearTimeout(revealCompleteTimer.current ?? undefined);
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
        { x: (index: number) => index ? 52 : -52 },
        { x: 0, duration: 0.34, stagger: 0.025, ease: 'power3.inOut' }, '<')
      .fromTo(frame,
        { scale: 1.08, rotation: 1.4 },
        { scale: 1, rotation: 0, duration: 0.42, ease: 'power2.out' }, '<')
      .to(prtsImageScanRef.current, { opacity: 1, x: '100%', duration: 0.64, ease: 'power1.inOut' }, '<0.06');
  }

  function resetReveal() {
    const app = appRef.current!;
    const screenFlash = screenFlashRef.current!;
    const halves = originumHalves();
    activeTimeline.current?.kill();
    window.clearTimeout(flashTimer.current ?? undefined);
    window.clearTimeout(revealCompleteTimer.current ?? undefined);
    activeTimeline.current = null;
    flashTimer.current = null;
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

    app.classList.remove('is-drifting', 'is-revealing', 'is-complete', 'is-flashing', 'is-gsap-flash');
    gsap.killTweensOf(screenFlash);
    gsap.set(screenFlash, { clearProps: 'all' });
    prtsPortraitRef.current!.style.opacity = '0';
    prtsPortraitRef.current!.style.transform = 'scale(0.92)';
    originumFrameRef.current!.style.opacity = '0';
    prtsImageScanRef.current!.style.opacity = '0';
    prtsImageScanRef.current!.style.transform = 'translateX(-110%)';
    stopAudio();
  }

  function runStageTransition(from: Stage, to: Stage) {
    if (to === 'intro') return runIntroTimeline();
    if (from === 'intro' && to === 'calibrate') return runCalibrationTimeline();
    if (to === 'drift') return runDriftTimeline();
    if (to === 'reveal') {
      startAudio(state.muted, true);
      runRevealTimeline();
    }
  }

  useLayoutEffect(() => setStageClasses(state.stage), [state]);

  useLayoutEffect(() => () => {
    activeTimeline.current?.kill();
    activeTimeline.current = null;
    window.clearTimeout(flashTimer.current ?? undefined);
    window.clearTimeout(revealCompleteTimer.current ?? undefined);
    const screenFlash = screenFlashRef.current;
    if (screenFlash) gsap.killTweensOf(screenFlash);
  }, []);

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

  function finishEntry(playIntro = false) {
    const app = appRef.current;
    if (app) {
      app.classList.remove('is-handoff');
      gsap.set([
        app,
        app.querySelector('.top-bar'),
        app.querySelector('.copy-block'),
        visionTargetRef.current,
      ], { clearProps: 'all' });
    }

    setIsEntryDeparting(false);
    setHasStarted(true);
    setEntryMounted(false);
    if (playIntro) runIntroTimeline();
  }

  function handleStart() {
    if (hasStarted || entryRef.current?.classList.contains('is-departing')) return;

    startAudio();

    if (reduceMotion) {
      finishEntry(true);
      return;
    }

    const entry = entryRef.current;
    const app = appRef.current;
    if (!entry || !app) {
      finishEntry(true);
      return;
    }

    const reticle = entry.querySelector('.entry-reticle');
    const entryChrome = entry.querySelectorAll('.entry-status, .entry-footer, .entry-copy, .entry-start');
    const handoffPanels = [
      app.querySelector('.top-bar'),
      app.querySelector('.copy-block'),
    ];

    setIsEntryDeparting(true);
    entry.classList.add('is-departing');
    app.classList.add('is-handoff');

    gsap.set(entry, { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(app, { opacity: 0, filter: 'blur(10px) brightness(1.08)' });
    gsap.set(handoffPanels, { opacity: 0, y: 14 });
    gsap.set(visionTargetRef.current, { opacity: 0.4, scale: 0.92 });

    activeTimeline.current?.kill();
    activeTimeline.current = gsap.timeline({
      onComplete: finishEntry,
    })
      .to(entryChrome, {
        opacity: 0,
        y: -12,
        duration: 0.28,
        stagger: 0.025,
        ease: 'power2.in',
      })
      .to(reticle, {
        scale: 3.6,
        opacity: 0.12,
        duration: 0.78,
        ease: 'power3.in',
      }, '<0.04')
      .to(entry, {
        clipPath: 'inset(50% 0% 50% 0%)',
        duration: 0.82,
        ease: 'power4.inOut',
      }, '<0.14')
      .to(entry, {
        opacity: 0,
        duration: 0.28,
        ease: 'power1.out',
      }, '>-0.22')
      .to(app, {
        opacity: 1,
        filter: 'blur(0px) brightness(1)',
        duration: 0.7,
        ease: 'power2.out',
      }, '<0.08')
      .to(handoffPanels, {
        opacity: 1,
        y: 0,
        duration: 0.48,
        stagger: 0.04,
        ease: 'power2.out',
      }, '<0.1')
      .to(visionTargetRef.current, {
        opacity: 1,
        scale: 1,
        duration: 0.58,
        ease: 'power2.out',
      }, '<0.04');
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
    <div className={`app-root${hasStarted ? ' is-live' : ' is-entry'}`}>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {isEntryDeparting ? '正在进入验光界面。' : ''}
      </p>
      <main
        id="screening-app"
        ref={appRef}
        tabIndex={-1}
        data-stage={state.stage}
        className={hasStarted ? undefined : 'is-gated'}
        aria-hidden={!hasStarted}
        inert={!hasStarted ? true : undefined}
      >
      <div className="grain" aria-hidden="true" />
      <div className="scanline" aria-hidden="true" />
      <div className="screen-filter" aria-hidden="true" />
      <div ref={screenFlashRef} className="screen-flash" aria-hidden="true" />

      <header className="top-bar">
        <div className="brand-lockup">
          <span className="rhodes-watermark" aria-hidden="true" />
          <div>
            <p className="brand-name">PRTS</p>
            <p className="brand-sub">PERSONAL RECORD TERMINAL</p>
          </div>
        </div>

        <div className="top-readout">
          <span id="stage-code" className="stage-code">{meta.code}</span>
          <button id="mute-toggle" className="icon-button" type="button" aria-pressed={state.muted} aria-label={state.muted ? '打开声音' : '关闭声音'} onClick={handleMute}>
            <span className="sound-bars" aria-hidden="true"><i /><i /><i /></span>
            <span className="icon-button-label">SOUND</span>
          </button>
        </div>
      </header>

      <div className="system-rail" aria-hidden="true">
        <span>RI-07</span>
        <span>OPTICAL CONTROL</span>
        <span>PRTS // LIVE</span>
      </div>

      <section className="screen-body" aria-label="视觉筛查体验">
        <div className="visual-meta" aria-hidden="true">
          <span>OPTICAL ARRAY</span>
          <span className="meta-rule" />
          <span id="signal-line">{meta.signal}</span>
        </div>

        <section className="visual-stage" aria-label="远距视觉检测">
          <div className="visual-halo" aria-hidden="true" />
          <button id="vision-target" ref={visionTargetRef} className="vision-frame" type="button" aria-label={copy.actionLabel} disabled={state.stage === 'reveal'} onClick={handleVisionActivate}>
            <span className="corner corner-tl" aria-hidden="true" />
            <span className="corner corner-tr" aria-hidden="true" />
            <span className="corner corner-bl" aria-hidden="true" />
            <span className="corner corner-br" aria-hidden="true" />

            <div id="vision-visual" className="vision-visual house-scene" role="img" aria-label="圆形视野中的田野与远处房屋">
              <div className="house-viewport">
                <img ref={houseBaseRef} className="house-image house-image-base" src={visionHouse} alt="" draggable="false" />
                <img ref={houseGlitchRef} className="house-image house-image-glitch" src={visionHouse} alt="" draggable="false" aria-hidden="true" />
                <span className="house-vignette" aria-hidden="true" />
                <span className="house-reticle" aria-hidden="true" />
              </div>
            </div>
          </button>

          <div id="reveal-scene" className="reveal-scene" aria-hidden={state.stage !== 'reveal'}>
            <div id="prts-portrait" ref={prtsPortraitRef} className="prts-portrait" aria-hidden="true">
              <img id="prts-image" className="prts-image" src={prtsClose} alt="" />
              <span ref={prtsImageScanRef} className="prts-image-scan" aria-hidden="true" />
            </div>

            <svg id="originum-frame" ref={originumFrameRef} className="originum-frame" viewBox="0 0 320 360" role="img" aria-labelledby="originum-title originum-description">
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

        <div className="visual-meta visual-meta-bottom" aria-hidden="true">
          <span>FOCAL DISTANCE / 30 CM</span>
          <span className="meta-rule" />
          <span id="phase-readout">PHASE / {meta.index}</span>
        </div>
      </section>

      <section className="copy-block reveal-caption" aria-labelledby="stage-title">
        <div className="copy-heading">
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

      <audio id="ambient-audio" ref={ambientAudioRef} src={state.stage === 'reveal' ? revealAudio : ambientAudio} loop preload="none" aria-hidden="true" onError={() => appRef.current?.classList.add('audio-unavailable')} />
      </main>

      {entryMounted && (
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
    </div>
  );
}
