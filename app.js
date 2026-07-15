import {
  advanceState,
  createInitialState,
  getStageCopy,
} from './state.js';

const dom = {
  app: document.querySelector('#screening-app'),
  stageCode: document.querySelector('#stage-code'),
  stageEyebrow: document.querySelector('#stage-eyebrow'),
  stageTitle: document.querySelector('#stage-title'),
  stageNote: document.querySelector('#stage-note'),
  copyIndex: document.querySelector('.copy-index'),
  signalLine: document.querySelector('#signal-line'),
  phaseReadout: document.querySelector('#phase-readout'),
  muteToggle: document.querySelector('#mute-toggle'),
  announcer: document.querySelector('#announcer'),
  visionTarget: document.querySelector('#vision-target'),
  houseViewport: document.querySelector('.house-viewport'),
  houseBase: document.querySelector('.house-image-base'),
  houseGlitch: document.querySelector('.house-image-glitch'),
  revealScene: document.querySelector('#reveal-scene'),
  screenFlash: document.querySelector('.screen-flash'),
  prtsPortrait: document.querySelector('#prts-portrait'),
  prtsImageScan: document.querySelector('.prts-image-scan'),
  originumFrame: document.querySelector('#originum-frame'),
  originumHalves: document.querySelectorAll('.originum-half'),
  ambientAudio: document.querySelector('#ambient-audio'),
};

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
let state = createInitialState();
let activeTimeline = null;
let flashTimer = null;
let flashSequenceTimer = null;
let revealCompleteTimer = null;
let audioStarted = false;

function hasGsap() {
  return Boolean(window.gsap) && !reduceMotion;
}

function setStageClasses(stage) {
  dom.app.classList.toggle('is-drifting', stage === 'drift');
  dom.app.classList.toggle('is-revealing', stage === 'reveal');
  dom.app.classList.toggle('is-complete', false);
}

function renderState(nextState) {
  state = nextState;
  const copy = getStageCopy(state);
  const meta = stageMeta[state.stage];

  dom.app.dataset.stage = state.stage;
  dom.stageCode.textContent = meta.code;
  dom.copyIndex.textContent = meta.index;
  dom.stageEyebrow.textContent = copy.eyebrow;
  dom.stageTitle.textContent = copy.title;
  dom.stageNote.textContent = copy.note;
  dom.signalLine.textContent = meta.signal;
  dom.phaseReadout.textContent = `PHASE / ${meta.index}`;
  dom.visionTarget.setAttribute('aria-label', copy.actionLabel);
  dom.visionTarget.disabled = state.stage === 'reveal';
  dom.muteToggle.setAttribute('aria-pressed', String(state.muted));
  dom.muteToggle.setAttribute('aria-label', state.muted ? '打开声音' : '关闭声音');
  dom.revealScene.setAttribute('aria-hidden', String(state.stage !== 'reveal'));
  dom.revealScene.setAttribute('aria-label', state.stage === 'reveal' ? '点击普瑞赛斯影像重新校准' : '异常影像');
  dom.revealScene.tabIndex = state.stage === 'reveal' ? 0 : -1;
  setStageClasses(state.stage);

  dom.announcer.textContent = `${copy.eyebrow}，${copy.title}。${copy.note}`;
}

function startAudio() {
  if (audioStarted || state.muted || !dom.ambientAudio) return;

  dom.ambientAudio.volume = 0.14;
  const playResult = dom.ambientAudio.play();
  audioStarted = true;

  if (playResult?.catch) {
    playResult.catch(() => {
      audioStarted = false;
      dom.app.classList.add('audio-unavailable');
    });
  }
}

function stopAudio() {
  if (!dom.ambientAudio) return;
  dom.ambientAudio.pause();
  dom.ambientAudio.currentTime = 0;
  audioStarted = false;
}

function runIntroTimeline() {
  if (!hasGsap()) {
    dom.app.classList.add('is-entering');
    window.setTimeout(() => dom.app.classList.remove('is-entering'), 460);
    return;
  }

  activeTimeline?.kill();
  activeTimeline = window.gsap.timeline();
  activeTimeline.fromTo(
    dom.visionTarget,
    { opacity: 0.52, scale: 0.96 },
    { opacity: 1, scale: 1, duration: 0.58, ease: 'power2.out' },
  );
}

function runCalibrationTimeline() {
  if (!hasGsap()) {
    dom.app.classList.add('is-entering');
    window.setTimeout(() => dom.app.classList.remove('is-entering'), 420);
    return;
  }

  activeTimeline?.kill();
  activeTimeline = window.gsap.timeline();
  activeTimeline
    .fromTo(dom.houseBase,
      { filter: 'blur(0px) contrast(1.03) saturate(.95)', scale: 1 },
      { filter: 'blur(12px) contrast(1.03) saturate(.95)', scale: 1.035, duration: 0.32, ease: 'power2.in' })
    .to(dom.houseBase,
      { filter: 'blur(3.5px) contrast(1.03) saturate(.95)', scale: 1.015, duration: 0.42, ease: 'power2.out' });
}

function runDriftTimeline() {
  if (!hasGsap()) {
    dom.app.classList.add('is-drifting');
    return;
  }

  activeTimeline?.kill();
  activeTimeline = window.gsap.to(dom.houseBase, {
    filter: 'blur(2px) brightness(.38) contrast(1.35) saturate(.65)',
    scale: 1.025,
    duration: 0.72,
    ease: 'power2.inOut',
  });
}

function triggerRevealFlash() {
  window.clearTimeout(flashTimer);
  window.clearTimeout(flashSequenceTimer);
  dom.app.classList.remove('is-flashing', 'is-gsap-flash', 'is-script-flash');
  dom.screenFlash.style.opacity = '0';
  void dom.app.offsetWidth;
  dom.app.classList.add('is-flashing');

  if (hasGsap()) {
    dom.app.classList.add('is-gsap-flash');
    window.gsap.killTweensOf(dom.screenFlash);
    window.gsap.timeline()
      .set(dom.screenFlash, { opacity: 0, background: '#effff8' })
      .to(dom.screenFlash, { opacity: 0.94, duration: 0.07, ease: 'steps(1)' })
      .to(dom.screenFlash, { opacity: 0.04, duration: 0.1, ease: 'none' })
      .to(dom.screenFlash, { opacity: 0.72, background: '#dfe9ff', duration: 0.08, ease: 'steps(1)' })
      .to(dom.screenFlash, { opacity: 0.06, duration: 0.1, ease: 'none' })
      .to(dom.screenFlash, { opacity: 0.46, background: '#ffedf0', duration: 0.08, ease: 'steps(1)' })
      .to(dom.screenFlash, { opacity: 0, duration: 0.14, ease: 'power1.out' });
  } else {
    dom.app.classList.add('is-script-flash');
    const frames = [
      [0.92, 0],
      [0.05, 80],
      [0.68, 95],
      [0.04, 100],
      [0.42, 105],
      [0, 140],
    ];
    let frameIndex = 0;
    const playFrame = () => {
      const [opacity, delay] = frames[frameIndex++];
      dom.screenFlash.style.opacity = String(opacity);
      if (frameIndex < frames.length) flashSequenceTimer = window.setTimeout(playFrame, delay);
    };
    playFrame();
  }

  flashTimer = window.setTimeout(() => {
    dom.app.classList.remove('is-flashing', 'is-gsap-flash', 'is-script-flash');
    dom.screenFlash.style.opacity = '0';
  }, 760);
}

function runRevealTimeline() {
  dom.app.classList.add('is-revealing');
  triggerRevealFlash();

  if (!hasGsap()) {
    dom.prtsPortrait.style.opacity = '1';
    dom.prtsPortrait.style.transform = 'scale(1)';
    dom.originumFrame.style.opacity = '1';
    window.clearTimeout(revealCompleteTimer);
    revealCompleteTimer = window.setTimeout(() => {
      dom.app.classList.remove('is-revealing');
      dom.app.classList.add('is-complete');
    }, 560);
    return;
  }

  activeTimeline?.kill();
  activeTimeline = window.gsap.timeline({
    onComplete: () => {
      dom.app.classList.remove('is-revealing');
      dom.app.classList.add('is-complete');
    },
  });

  activeTimeline
    .fromTo(dom.prtsPortrait,
      { opacity: 0, scale: 0.9, filter: 'blur(8px)' },
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.68, ease: 'power3.out' })
    .set(dom.originumFrame, { opacity: 1 }, '<0.04')
    .fromTo(dom.originumHalves,
      { x: (index) => index ? 52 : -52 },
      { x: 0, duration: 0.34, stagger: 0.025, ease: 'power3.inOut' }, '<')
    .fromTo(dom.originumFrame,
      { scale: 1.08, rotation: 1.4 },
      { scale: 1, rotation: 0, duration: 0.42, ease: 'power2.out' }, '<')
    .to(dom.prtsImageScan, { opacity: 1, x: '100%', duration: 0.64, ease: 'power1.inOut' }, '<0.06');
}

function resetReveal() {
  activeTimeline?.kill();
  window.clearTimeout(flashTimer);
  window.clearTimeout(flashSequenceTimer);
  window.clearTimeout(revealCompleteTimer);
  activeTimeline = null;
  flashTimer = null;
  flashSequenceTimer = null;
  revealCompleteTimer = null;

  if (window.gsap) {
    window.gsap.killTweensOf([
      dom.houseBase,
      dom.houseGlitch,
      dom.prtsPortrait,
      dom.prtsImageScan,
      dom.originumFrame,
      dom.originumHalves,
    ]);
    window.gsap.set(dom.prtsPortrait, { clearProps: 'all' });
    window.gsap.set(dom.prtsImageScan, { clearProps: 'all' });
    window.gsap.set(dom.originumFrame, { clearProps: 'all' });
    window.gsap.set(dom.originumHalves, { clearProps: 'all' });
    window.gsap.set([dom.houseBase, dom.houseGlitch], { clearProps: 'all' });
  }

  dom.app.classList.remove('is-drifting', 'is-revealing', 'is-complete', 'is-entering', 'is-flashing', 'is-gsap-flash', 'is-script-flash');
  if (window.gsap) {
    window.gsap.killTweensOf(dom.screenFlash);
    window.gsap.set(dom.screenFlash, { clearProps: 'all' });
  } else {
    dom.screenFlash.style.opacity = '0';
  }
  dom.prtsPortrait.style.opacity = '0';
  dom.prtsPortrait.style.transform = 'scale(0.92)';
  dom.originumFrame.style.opacity = '0';
  dom.prtsImageScan.style.opacity = '0';
  dom.prtsImageScan.style.transform = 'translateX(-110%)';
  stopAudio();
}

function runStageTransition(previousState, nextState) {
  if (nextState.stage === 'intro') {
    runIntroTimeline();
    return;
  }

  if (previousState.stage === 'intro' && nextState.stage === 'calibrate') {
    runCalibrationTimeline();
    return;
  }

  if (nextState.stage === 'drift') {
    runDriftTimeline();
    return;
  }

  if (nextState.stage === 'reveal') {
    runRevealTimeline();
  }
}

function dispatch(action) {
  const previousState = state;
  const nextState = advanceState(state, action);

  if (nextState === state) return;

  renderState(nextState);
  runStageTransition(previousState, nextState);
}

function handleVisionActivate() {
  startAudio();
  const action = actionByStage[state.stage];
  if (action) dispatch(action);
}

function handleRevealActivate() {
  if (state.stage !== 'reveal') return;
  resetReveal();
  dispatch('RESET');
}

function handleMute() {
  dispatch('TOGGLE_MUTE');
  if (state.muted) {
    dom.ambientAudio?.pause();
    audioStarted = false;
  } else {
    startAudio();
  }
}

function init() {
  renderState(state);
  dom.visionTarget.addEventListener('click', handleVisionActivate);
  dom.revealScene.addEventListener('click', handleRevealActivate);
  dom.muteToggle.addEventListener('click', handleMute);
  dom.ambientAudio?.addEventListener('error', () => dom.app.classList.add('audio-unavailable'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
