import { Application } from 'pixi.js';
import type { Stage } from '../state';
import { createVisionEntryScene } from './visionEntryScene';
import { createVisionMainScene } from './visionMainScene';
import { loadVisionSceneTextures } from './visionSceneAssets';
import { setCssVar } from './visionSceneGraphics';
import { getStageReadyTime, isCalibrationClear } from './visionSceneModel';
import type { PixiVisionScene, SceneOptions } from './visionSceneModel';

export { getCalibrationBlurAmount, getCopyHeight, getEntryBootState, getRevealFractureKick, getSoundBarHeights, getStageReadyTime, isCalibrationClear, isDriftAligned, isWideLayout } from './visionSceneModel';
export type { PixiVisionScene } from './visionSceneModel';

export async function createPixiVisionScene({ host, reducedMotion: initialReducedMotion, onEntryReady }: SceneOptions) {
  const app = new Application();
  try {
    await app.init({
      antialias: true,
      autoDensity: true,
      autoStart: false,
      backgroundAlpha: 0,
      preference: 'webgl',
      // ponytail: cap DPR at 2; raise only if visual QA justifies the GPU cost.
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
  } catch (error) {
    app.destroy({ removeView: true }, { children: true });
    throw error;
  }

  host.appendChild(app.canvas);
  app.canvas.setAttribute('aria-hidden', 'true');

  let textures;
  try {
    [textures] = await Promise.all([
      loadVisionSceneTextures(),
      document.fonts.load('400 16px Bender', 'PRTS'),
      document.fonts.load('700 16px Bender', 'PRTS'),
      document.fonts.load('400 16px Novecento', 'OPTICAL'),
      document.fonts.load('700 16px Novecento', '01'),
      document.fonts.load('400 16px SourceHan', '验光终端'),
      document.fonts.load('700 16px SourceHan', '视觉回收完成'),
    ]);
  } catch (error) {
    const canvas = app.canvas;
    app.destroy({ removeView: true }, { children: true });
    if (host.contains(canvas)) host.removeChild(canvas);
    throw error;
  }

  const main = createVisionMainScene({ app, textures, reducedMotion: initialReducedMotion });
  const entry = createVisionEntryScene({ textures, onReady: onEntryReady });
  app.stage.label = 'vision-terminal';
  app.stage.addChild(main.outsideBackground, main.layer, entry.layer, entry.bootCurtain, entry.bootLine, main.flash);

  let currentStage: Stage = 'intro';
  let currentReducedMotion = initialReducedMotion;
  let destroyed = false;
  let time = 0;
  let stageTime = 0;
  let lastFrameTime = 0;
  let loopActive = false;
  let frameRequest = 0;
  let handoffRequest = 0;
  let handoffComplete: (() => void) | undefined;
  let stageReady: (() => void) | undefined;
  let entryBootStartedAt = 0;

  function layout() {
    const rect = host.getBoundingClientRect();
    const width = Math.max(Math.round(rect.width), 1);
    const height = Math.max(Math.round(rect.height), 1);
    app.renderer.resize(width, height);
    app.canvas.style.width = `${width}px`;
    app.canvas.style.height = `${height}px`;

    const mainLayout = main.layout(width, height);
    const entryLayout = entry.layout(width, height);
    setCssVar(host, '--pixi-entry-x', entryLayout.buttonX);
    setCssVar(host, '--pixi-entry-y', entryLayout.buttonY);
    setCssVar(host, '--pixi-entry-width', entryLayout.buttonWidth);
    setCssVar(host, '--pixi-entry-height', 70);
    setCssVar(host, '--pixi-vision-left', mainLayout.visionLeft);
    setCssVar(host, '--pixi-vision-top', mainLayout.visionTop);
    setCssVar(host, '--pixi-vision-size', mainLayout.visionSize);
    setCssVar(host, '--pixi-sound-left', mainLayout.soundLeft);
    setCssVar(host, '--pixi-sound-top', mainLayout.soundTop);
    setCssVar(host, '--pixi-sound-width', mainLayout.soundWidth);
    if (mainLayout.reset) {
      setCssVar(host, '--pixi-reset-left', mainLayout.reset.left);
      setCssVar(host, '--pixi-reset-top', mainLayout.reset.top);
      setCssVar(host, '--pixi-reset-width', mainLayout.reset.width);
      setCssVar(host, '--pixi-reset-height', mainLayout.reset.height);
    }
  }

  function finishHandoff() {
    window.cancelAnimationFrame(handoffRequest);
    handoffRequest = 0;
    main.show();
    entry.finishHandoff();
    app.render();
    const onComplete = handoffComplete;
    handoffComplete = undefined;
    onComplete?.();
  }

  function setStarted(nextStarted: boolean, onComplete?: () => void) {
    window.cancelAnimationFrame(handoffRequest);
    handoffRequest = 0;
    handoffComplete = nextStarted ? onComplete : undefined;
    entry.finishBoot();

    if (!nextStarted) {
      entry.show();
      main.hide();
      app.render();
      onComplete?.();
      return;
    }

    if (currentReducedMotion) {
      finishHandoff();
      return;
    }

    main.show(0);
    entry.prepareHandoff();
    const startedAt = performance.now();
    const handoff = (now: number) => {
      if (destroyed) return;
      const progress = Math.min((now - startedAt) / 620, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      main.applyHandoff(eased);
      entry.applyHandoff(eased);
      app.render();

      if (progress < 1) {
        handoffRequest = window.requestAnimationFrame(handoff);
        return;
      }

      finishHandoff();
    };

    handoffRequest = window.requestAnimationFrame(handoff);
  }

  function finishStage() {
    const onReady = stageReady;
    stageReady = undefined;
    onReady?.();
  }

  function setStage(stage: Stage, onReady?: () => void) {
    currentStage = stage;
    stageTime = 0;
    stageReady = onReady;
    main.selectStage(stage);
    layout();
    main.applyStage();
    app.render();
    if (stage === 'reveal' && !currentReducedMotion) main.triggerRevealFlash();
    if (getStageReadyTime(stage, currentReducedMotion) === 0) finishStage();
  }

  function setReducedMotion(reducedMotion: boolean) {
    currentReducedMotion = reducedMotion;
    main.setReducedMotion(reducedMotion);
    if (reducedMotion) {
      loopActive = false;
      window.cancelAnimationFrame(frameRequest);
      main.applyStage();
      layout();
      entry.finishBoot();
      if (handoffComplete) finishHandoff();
      else app.render();
      finishStage();
    } else {
      stageTime = Math.max(stageTime, getStageReadyTime(currentStage));
      layout();
      main.applyStage();
      main.tick(time, stageTime);
      app.render();
      startLoop();
    }
  }

  function confirmCalibration(bypassTiming = false) {
    if (currentStage !== 'calibrate') return false;
    const confirmed = bypassTiming || currentReducedMotion || isCalibrationClear(stageTime);
    main.showCalibrationFeedback(confirmed);
    return confirmed;
  }

  function tick(deltaSeconds: number) {
    if (currentReducedMotion || destroyed) return;
    if (!entry.isBootComplete()) entry.applyBoot(performance.now() - entryBootStartedAt);
    time += deltaSeconds;
    stageTime += deltaSeconds;
    main.tick(time, stageTime);
    entry.tick(time);
    if (stageReady && stageTime >= getStageReadyTime(currentStage)) finishStage();
  }

  function startLoop() {
    if (loopActive || currentReducedMotion || destroyed) return;
    loopActive = true;
    lastFrameTime = 0;
    const renderFrame = (now: number) => {
      if (!loopActive || destroyed) return;
      try {
        const deltaSeconds = lastFrameTime === 0 ? 0 : (now - lastFrameTime) / 1000;
        lastFrameTime = now;
        tick(deltaSeconds);
        app.render();
      } catch (error) {
        console.error('PIXEL_LOOP_ERROR', error);
        loopActive = false;
        return;
      }
      frameRequest = window.requestAnimationFrame(renderFrame);
    };
    frameRequest = window.requestAnimationFrame(renderFrame);
  }

  const resizeObserver = new ResizeObserver(() => {
    layout();
    if (currentReducedMotion) app.render();
  });
  resizeObserver.observe(host);
  main.selectStage('intro');
  main.setMuted(false);
  layout();
  main.applyStage();
  main.hide();
  if (currentReducedMotion) {
    entry.finishBoot();
    app.render();
  } else {
    entryBootStartedAt = performance.now();
    entry.applyBoot(0);
    app.render();
    startLoop();
  }

  return {
    setStarted,
    setStage,
    confirmCalibration,
    moveDriftBy: main.moveDriftBy,
    confirmDrift: main.confirmDrift,
    setMuted: main.setMuted,
    setReducedMotion,
    reset: () => setStage('intro'),
    destroy() {
      destroyed = true;
      loopActive = false;
      window.cancelAnimationFrame(frameRequest);
      window.cancelAnimationFrame(handoffRequest);
      handoffComplete = undefined;
      stageReady = undefined;
      resizeObserver.disconnect();
      main.destroy();
      const canvas = app.canvas;
      app.destroy({ removeView: true }, { children: true });
      if (host.contains(canvas)) host.removeChild(canvas);
    },
  } satisfies PixiVisionScene;
}
