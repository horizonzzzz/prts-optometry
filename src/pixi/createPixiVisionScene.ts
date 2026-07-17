import maskAsset from '../../assets/common_mask.55fff2e9.png';
import blueprintAsset from '../../assets/official-terminal-blueprint.jpg';
import gridAsset from '../../assets/official-terminal-grid.jpg';
import rhodesAsset from '../../assets/official-rhodes-island.png';
import particleAsset from '../../assets/particle.f4b76a4f.png';
import portraitAsset from '../../assets/prts-close.jpg';
import houseAsset from '../../assets/vision-house.jpg';
import { gsap } from 'gsap';
import {
  Application,
  Assets,
  BlurFilter,
  ColorMatrixFilter,
  Container,
  Graphics,
  NoiseFilter,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from 'pixi.js';
import type { Stage } from '../state';

const COLORS = {
  clinic: 0xdce1e2,
  clinicShadow: 0xaeb8ba,
  graphite: 0x171c1f,
  muted: 0x59666b,
  cyan: 0x00a7bd,
  teal: 0x5dd5de,
  red: 0xb82b38,
  night: 0x0d1112,
  ice: 0xdce9e4,
  pale: 0xedf2f1,
  yellow: 0xe5c546,
  shadow: 0x080c0e,
};

const STAGE_META: Record<Stage, { code: string; index: string; signal: string }> = {
  intro: { code: '01 / 04', index: '01', signal: 'SIGNAL / STABLE' },
  calibrate: { code: '02 / 04', index: '02', signal: 'SIGNAL / CALIBRATING' },
  drift: { code: '03 / 04', index: '03', signal: 'SIGNAL / DUAL' },
  reveal: { code: '04 / 04', index: '04', signal: 'SIGNAL / RETURNED' },
};

const STAGE_ACCENTS: Record<Stage, number> = {
  intro: COLORS.cyan,
  calibrate: COLORS.cyan,
  drift: COLORS.red,
  reveal: COLORS.ice,
};

const ENTRY_BOOT_DURATION = 1080;

function phase(elapsedMs: number, delay: number, duration: number) {
  return Math.min(Math.max((elapsedMs - delay) / duration, 0), 1);
}

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

export function getEntryBootState(elapsedMs: number) {
  return {
    aperture: easeOutCubic(phase(elapsedMs, 80, 420)),
    chrome: easeOutCubic(phase(elapsedMs, 300, 360)),
    title: easeOutCubic(phase(elapsedMs, 420, 360)),
    reticle: easeOutCubic(phase(elapsedMs, 240, 520)),
    action: easeOutCubic(phase(elapsedMs, 680, 360)),
    curtain: 1 - easeOutCubic(phase(elapsedMs, 120, 380)),
    line: easeOutCubic(phase(elapsedMs, 60, 240)),
    lineAlpha: 1 - phase(elapsedMs, 300, 260),
    complete: elapsedMs >= ENTRY_BOOT_DURATION,
  };
}

type SceneOptions = {
  host: HTMLElement;
  reducedMotion: boolean;
  onEntryReady?: () => void;
};

export type PixiVisionScene = {
  setStarted: (started: boolean, onComplete?: () => void) => void;
  setStage: (stage: Stage) => void;
  setMuted: (muted: boolean) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  reset: () => void;
  destroy: () => void;
};

function addText(text: string, style: TextStyle) {
  const node = new Text({ text, style });
  node.roundPixels = true;
  return node;
}

function fitCover(sprite: Sprite, x: number, y: number, width: number, height: number) {
  const textureWidth = sprite.texture.width || 1;
  const textureHeight = sprite.texture.height || 1;
  const scale = Math.max(width / textureWidth, height / textureHeight);
  sprite.anchor.set(0.5);
  sprite.position.set(x, y);
  sprite.scale.set(scale);
}

function fitStretch(sprite: Sprite, x: number, y: number, width: number, height: number) {
  const textureWidth = sprite.texture.width || 1;
  const textureHeight = sprite.texture.height || 1;
  sprite.anchor.set(0.5);
  sprite.position.set(x, y);
  sprite.scale.set(width / textureWidth, height / textureHeight);
}

function drawDiamond(graphics: Graphics, width: number, height: number, fill?: number, alpha = 1) {
  graphics.clear();
  graphics
    .moveTo(0, -height / 2)
    .lineTo(width / 2, 0)
    .lineTo(0, height / 2)
    .lineTo(-width / 2, 0)
    .closePath();

  if (fill !== undefined) graphics.fill({ color: fill, alpha });
}

function drawPolygon(graphics: Graphics, points: Array<[number, number]>, color: number, alpha: number) {
  graphics.clear().moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) graphics.lineTo(x, y);
  graphics.closePath().fill({ color, alpha });
}

function drawDashedCircle(graphics: Graphics, radius: number, color: number, alpha: number) {
  graphics.clear();
  const segments = 28;
  for (let index = 0; index < segments; index += 2) {
    const start = (index / segments) * Math.PI * 2;
    const end = ((index + 1) / segments) * Math.PI * 2;
    graphics.arc(0, 0, radius, start, end).stroke({ width: 1, color, alpha });
  }
}

function drawLine(graphics: Graphics, x1: number, y1: number, x2: number, y2: number, width: number, color: number, alpha: number) {
  graphics.moveTo(x1, y1).lineTo(x2, y2).stroke({ width, color, alpha });
}

function setCssVar(host: HTMLElement, name: string, value: number) {
  host.parentElement?.style.setProperty(name, `${Math.round(value)}px`);
}

export function getCopyHeight(height: number, reveal: boolean) {
  if (reveal) return height <= 860 ? 140 : 180;
  if (height <= 700) return 90;
  if (height <= 860) return 110;
  return 154;
}

export function getSoundBarHeights(muted: boolean) {
  return muted ? [2, 2, 2] : [5, 12, 8];
}

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

  let gridTexture: Texture;
  let blueprintTexture: Texture;
  let maskTexture: Texture;
  let rhodesTexture: Texture;
  let particleTexture: Texture;
  let houseTexture: Texture;
  let portraitTexture: Texture;

  try {
    [gridTexture, blueprintTexture, maskTexture, rhodesTexture, particleTexture, houseTexture, portraitTexture] = await Promise.all([
      Assets.load<Texture>(gridAsset),
      Assets.load<Texture>(blueprintAsset),
      Assets.load<Texture>(maskAsset),
      Assets.load<Texture>(rhodesAsset),
      Assets.load<Texture>(particleAsset),
      Assets.load<Texture>(houseAsset),
      Assets.load<Texture>(portraitAsset),
    ]);
  } catch (error) {
    const canvas = app.canvas;
    app.destroy({ removeView: true }, { children: true });
    if (host.contains(canvas)) host.removeChild(canvas);
    throw error;
  }

  const outsideBackground = new Graphics();
  const mainLayer = new Container();
  const mainBody = new Container();
  const mainCopy = new Container();
  const mainChrome = new Container();
  const entryLayer = new Container();
  const entryChrome = new Container();
  const entryBootCurtain = new Graphics();
  const entryBootLine = new Graphics();
  const flash = new Graphics();

  const mainBackdrop = new Sprite(gridTexture);
  const mainMask = new Sprite(maskTexture);
  const mainShade = new Graphics();
  const mainDiagonal = new Graphics();
  const mainGrain = new Sprite(particleTexture);
  const mainGrid = new Graphics();
  const mainScanline = new Graphics();
  const mainFilter = new Graphics();
  const stageGlow = new Graphics();
  const stageGlowBlur = new BlurFilter({ strength: 24 });

  const topBar = new Graphics();
  const topAccent = new Graphics();
  const rhodes = new Sprite(rhodesTexture);
  const brandName = addText('PRTS', new TextStyle({ fill: 0xf4f6f5, fontFamily: 'Bender, sans-serif', fontSize: 16, fontWeight: '700' }));
  const brandSub = addText('PERSONAL RECORD TERMINAL', new TextStyle({ fill: 0x59666b, fontFamily: 'Bender, sans-serif', fontSize: 8, letterSpacing: 1.6 }));
  const stageCodeBg = new Graphics();
  const stageCode = addText('01 / 04', new TextStyle({ fill: 0xf3f5f4, fontFamily: 'Bender, sans-serif', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 }));
  const soundLabel = addText('SOUND', new TextStyle({ fill: 0x59666b, fontFamily: 'Bender, sans-serif', fontSize: 8, letterSpacing: 1.2 }));
  const soundBars = new Container();
  const soundBarItems = [0, 1, 2].map((index) => {
    const bar = new Graphics().rect(0, -6, 2, 12).fill(0xffffff);
    bar.position.x = index * 4;
    bar.alpha = 0.78;
    bar.roundPixels = true;
    soundBars.addChild(bar);
    return bar;
  });
  const railLeft = addText('RI-07', new TextStyle({ fill: 0x59666b, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.2 }));
  const railMiddle = addText('OPTICAL CONTROL', new TextStyle({ fill: 0x59666b, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.2 }));
  const railRight = addText('PRTS // LIVE', new TextStyle({ fill: 0x59666b, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.2 }));
  const railRuleLeft = new Graphics();
  const railRuleRight = new Graphics();

  const bodyBorder = new Graphics();
  const bodyNumber = addText('01', new TextStyle({ fill: COLORS.graphite, fontFamily: 'Novecento, Bender, sans-serif', fontSize: 128, fontWeight: '700', letterSpacing: -4 }));
  const metaTopDot = new Graphics();
  const metaBottomDot = new Graphics();
  const metaTop = addText('OPTICAL ARRAY', new TextStyle({ fill: COLORS.muted, fontFamily: 'Bender, sans-serif', fontSize: 8, letterSpacing: 1.3 }));
  const metaSignal = addText('SIGNAL / STABLE', new TextStyle({ fill: COLORS.muted, fontFamily: 'Bender, sans-serif', fontSize: 8, letterSpacing: 1.1 }));
  const metaBottom = addText('FOCAL DISTANCE / 30 CM', new TextStyle({ fill: COLORS.muted, fontFamily: 'Bender, sans-serif', fontSize: 8, letterSpacing: 1.1 }));
  const metaPhase = addText('PHASE / 01', new TextStyle({ fill: COLORS.muted, fontFamily: 'Bender, sans-serif', fontSize: 8, letterSpacing: 1.1 }));
  const metaRuleTop = new Graphics();
  const metaRuleBottom = new Graphics();
  const moduleTag = new Graphics();
  const moduleText = addText('OPTICAL MODULE // ACTIVE', new TextStyle({ fill: 0xf3f5f4, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.05 }));

  const halo = new Graphics();
  const haloShadow = new Graphics();
  const houseGroup = new Container();
  const houseMask = new Graphics();
  const houseViewport = new Container();
  const houseBase = new Sprite(houseTexture);
  const houseGlitch = new Sprite(houseTexture);
  const houseStatic = new Graphics();
  const houseRoll = new Graphics();
  const houseVignette = new Graphics();
  const houseReticle = new Graphics();
  const houseFrame = new Graphics();
  const targetDash = new Graphics();
  const houseBlur = new BlurFilter({ strength: 0 });
  const houseNoise = new NoiseFilter({ noise: 0.045, seed: 0.15 });
  const houseColor = new ColorMatrixFilter();
  houseColor.brightness(0.38, false);
  houseColor.contrast(1.35, true);
  houseColor.saturate(0.65, true);
  houseColor.enabled = false;

  const revealGroup = new Container();
  const revealPortrait = new Container();
  const portraitMask = new Graphics();
  const portraitBackdrop = new Sprite(portraitTexture);
  const portrait = new Sprite(portraitTexture);
  const portraitVignette = new Graphics();
  const revealFrame = new Container();
  const revealGlow = new Graphics();
  const leftHalf = new Graphics();
  const rightHalf = new Graphics();
  const leftEcho = new Graphics();
  const rightEcho = new Graphics();
  const glint = new Graphics();
  const revealBars = new Graphics();
  const revealScan = new Graphics();
  const portraitBlur = new BlurFilter({ strength: 8 });
  const portraitBackdropBlur = new BlurFilter({ strength: 14 });

  const copyBackground = new Graphics();
  const copyAccent = new Graphics();
  const copyBorder = new Graphics();
  const copyHeading = addText('INTAKE / 远距辨认', new TextStyle({ fill: COLORS.cyan, fontFamily: 'Bender, Source Han Sans SC, sans-serif', fontSize: 8, letterSpacing: 1.1 }));
  const copyIndex = addText('01', new TextStyle({ fill: COLORS.graphite, fontFamily: 'Novecento, Bender, sans-serif', fontSize: 26, fontWeight: '700' }));
  const copyTitle = addText('请注视远处的房屋', new TextStyle({ fill: COLORS.graphite, fontFamily: 'Novecento, Source Han Sans SC, sans-serif', fontSize: 40, fontWeight: '700', letterSpacing: 1, lineHeight: 42, wordWrap: true }));
  const copyNote = addText('保持手机距离，确认房屋轮廓', new TextStyle({ fill: COLORS.muted, fontFamily: 'Source Han Sans SC, sans-serif', fontSize: 13, letterSpacing: 0.5, lineHeight: 20, wordWrap: true }));
  const screeningNote = addText('FICTIONAL VISUAL EFFECT / NOT A MEDICAL TEST', new TextStyle({ fill: 0x627176, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.2 }));
  const resetButton = new Graphics();
  const resetLabel = addText('RESET', new TextStyle({ fill: COLORS.night, fontFamily: 'Bender, sans-serif', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }));
  const resetCode = addText('R-00', new TextStyle({ fill: 0x627176, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 0.8 }));

  const entryBackdrop = new Sprite(blueprintTexture);
  const entryShade = new Graphics();
  const entryGrid = new Graphics();
  const entryRule = new Graphics();
  const entryNoise = new Graphics();
  const entryScan = new Graphics();
  const entryTopLine = new Graphics();
  const entryBottomLine = new Graphics();
  const entrySequenceBg = new Graphics();
  const entryMark = new Sprite(rhodesTexture);
  const entryPrts = addText('PRTS', new TextStyle({ fill: 0xe8edeb, fontFamily: 'Bender, sans-serif', fontSize: 16, fontWeight: '700' }));
  const entrySub = addText('PERSONAL RECORD TERMINAL', new TextStyle({ fill: 0xb3bfbd, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.3 }));
  const entrySequence = addText('SYS / 00', new TextStyle({ fill: COLORS.night, fontFamily: 'Bender, sans-serif', fontSize: 7, fontWeight: '700', letterSpacing: 1.1 }));
  const entryKicker = addText('RHODES ISLAND / OPTICAL SERVICE', new TextStyle({ fill: COLORS.teal, fontFamily: 'Bender, sans-serif', fontSize: 8, letterSpacing: 1.35 }));
  const entryTitle = addText('PRTS', new TextStyle({ fill: { color: 0x101516, alpha: 0.2 }, stroke: { color: 0xe8edeb, width: 1 }, fontFamily: 'Novecento, Bender, sans-serif', fontSize: 100, fontWeight: '700', letterSpacing: -5 }));
  const entryChinese = addText('验光终端', new TextStyle({ fill: 0xe8edeb, fontFamily: 'Source Han Sans SC, sans-serif', fontSize: 42, letterSpacing: 8 }));
  const entryIntro = addText('保持设备与双眼平齐，进入后请注视视野中央。', new TextStyle({ fill: 0xb4c0be, fontFamily: 'Source Han Sans SC, sans-serif', fontSize: 12, letterSpacing: 0.7, lineHeight: 22, wordWrap: true }));
  const entryButton = new Container();
  const entryButtonShadow = new Graphics();
  const entryButtonBg = new Graphics();
  const entryButtonIndex = addText('01', new TextStyle({ fill: COLORS.night, fontFamily: 'Bender, sans-serif', fontSize: 10, fontWeight: '700', letterSpacing: 1 }));
  const entryButtonLabel = addText('开始验光', new TextStyle({ fill: COLORS.night, fontFamily: 'Source Han Sans SC, sans-serif', fontSize: 16, letterSpacing: 2 }));
  const entryButtonHint = addText('BEGIN OPTICAL TEST', new TextStyle({ fill: COLORS.night, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.25 }));
  const entryButtonArrow = addText('→', new TextStyle({ fill: COLORS.night, fontFamily: 'Bender, sans-serif', fontSize: 23 }));
  const entryReticle = new Container();
  const entryReticleOuter = new Graphics();
  const entryReticleInner = new Graphics();
  const entryReticleCross = new Graphics();
  const entryFooterLeft = addText('OPTICAL ARRAY / RI-07', new TextStyle({ fill: 0xb3bfbd, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.15 }));
  const entryFooterRight = addText('●  TERMINAL READY', new TextStyle({ fill: 0xd4e0dd, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.15 }));
  const entryOptical = addText('OPTICAL', new TextStyle({ fill: 0xe8edeb, fontFamily: 'Novecento, Bender, sans-serif', fontSize: 78, letterSpacing: -3 }));

  app.stage.addChild(outsideBackground, mainLayer, entryLayer, entryBootCurtain, entryBootLine, flash);
  mainLayer.addChild(mainBackdrop, mainShade, mainMask, mainDiagonal, mainGrid, stageGlow, mainBody, mainCopy, mainChrome, mainGrain, mainScanline, mainFilter);
  mainBody.addChild(bodyBorder, bodyNumber, metaTopDot, metaTop, metaRuleTop, metaSignal, metaBottomDot, metaBottom, metaRuleBottom, metaPhase, haloShadow, halo, houseGroup, revealGroup, moduleTag, moduleText);
  mainCopy.addChild(copyBackground, copyBorder, copyAccent, copyHeading, copyIndex, copyTitle, copyNote, resetButton, resetLabel, resetCode, screeningNote);
  mainChrome.addChild(topBar, topAccent, rhodes, brandName, brandSub, stageCodeBg, stageCode, soundBars, soundLabel, railLeft, railMiddle, railRight, railRuleLeft, railRuleRight);
  entryLayer.addChild(entryBackdrop, entryShade, entryGrid, entryRule, entryNoise, entryScan, entryTopLine, entryBottomLine, entryChrome);
  entryChrome.addChild(entryMark, entryPrts, entrySub, entrySequenceBg, entrySequence, entryKicker, entryTitle, entryChinese, entryIntro, entryButton, entryReticle, entryOptical, entryFooterLeft, entryFooterRight);
  entryButton.addChild(entryButtonShadow, entryButtonBg, entryButtonIndex, entryButtonLabel, entryButtonHint, entryButtonArrow);
  entryReticle.addChild(entryReticleOuter, entryReticleInner, entryReticleCross);

  mainBackdrop.alpha = 0.94;
  mainMask.alpha = 0.12;
  mainGrain.alpha = 0.045;
  mainGrain.blendMode = 'multiply';
  mainMask.blendMode = 'multiply';
  mainBackdrop.blendMode = 'multiply';
  mainBody.position.set(0, 0);
  mainCopy.position.set(0, 0);
  mainChrome.position.set(0, 0);
  mainFilter.alpha = 0;

  houseMask.renderable = true;
  houseMask.alpha = 0;
  houseViewport.mask = houseMask;
  houseViewport.addChild(houseBase, houseGlitch, houseStatic, houseRoll, houseVignette, houseReticle);
  houseGroup.addChild(houseMask, houseViewport, houseFrame, targetDash);
  houseBase.filters = [houseBlur, houseNoise, houseColor];
  houseGlitch.tint = 0xff5665;
  houseGlitch.blendMode = 'screen';
  houseGlitch.alpha = 0;

  portraitMask.renderable = true;
  portraitMask.alpha = 0;
  revealPortrait.mask = portraitMask;
  revealPortrait.addChild(portraitMask, portraitBackdrop, portrait, portraitVignette);
  portraitBackdrop.filters = [portraitBackdropBlur];
  portrait.filters = [portraitBlur];
  stageGlow.filters = [stageGlowBlur];
  portraitBackdrop.alpha = 0.72;
  portrait.alpha = 0.96;
  revealFrame.addChild(revealGlow, leftEcho, rightEcho, leftHalf, rightHalf, glint, revealBars, revealScan);
  revealGroup.addChild(revealPortrait, revealFrame);
  revealGroup.visible = false;

  let width = 1;
  let height = 1;
  let panelX = 0;
  let panelWidth = 1;
  let padding = 20;
  let bodyTop = 80;
  let copyTop = 680;
  let visualY = 360;
  let frameSize = 300;
  let haloSize = 320;
  let revealWidth = 320;
  let revealHeight = 360;
  let currentStage: Stage = 'intro';
  let currentReducedMotion = initialReducedMotion;
  let complete = false;
  let destroyed = false;
  let time = 0;
  let loopActive = false;
  let frameRequest = 0;
  let flashTimer = 0;
  let handoffRequest = 0;
  let handoffComplete: (() => void) | undefined;
  let stageTime = 0;
  let entryBootStartedAt = 0;
  let entryBootComplete = false;
  let entryButtonBaseY = 0;
  let entryReticleBaseScale = 1;
  let currentMuted: boolean | null = null;
  let soundTimeline: gsap.core.Timeline | null = null;

  function drawScreenGrid(graphics: Graphics, x: number, y: number, gridWidth: number, gridHeight: number, alpha: number) {
    graphics.clear();
    for (let lineX = 0; lineX <= gridWidth; lineX += 24) {
      drawLine(graphics, x + lineX, y, x + lineX, y + gridHeight, 1, COLORS.pale, alpha);
    }
    for (let lineY = 0; lineY <= gridHeight; lineY += 24) {
      drawLine(graphics, x, y + lineY, x + gridWidth, y + lineY, 1, COLORS.pale, alpha);
    }
  }

  function drawMainFilter() {
    mainFilter.clear();
    for (let lineX = panelX; lineX < panelX + panelWidth; lineX += 4) {
      mainFilter.rect(lineX, 0, 1, height).fill({ color: COLORS.pale, alpha: 0.035 });
    }
    for (let lineY = 0; lineY < height; lineY += 5) {
      mainFilter.rect(panelX, lineY, panelWidth, 1).fill({ color: currentStage === 'drift' ? COLORS.red : COLORS.pale, alpha: 0.045 });
    }
  }

  function drawHouse(radius: number) {
    houseMask.clear().circle(0, 0, radius).fill({ color: 0xffffff });
    fitStretch(houseBase, 0, 0, radius * 2 * 1.756, radius * 2 * 1.098);
    fitStretch(houseGlitch, 0, 0, radius * 2 * 1.756, radius * 2 * 1.098);

    houseFrame.clear();
    houseFrame.circle(0, 0, radius + 8).stroke({ width: 8, color: COLORS.shadow, alpha: 1 });
    houseFrame.circle(0, 0, radius + 1).stroke({ width: 1, color: currentStage === 'drift' ? COLORS.red : COLORS.cyan, alpha: 0.46 });
    houseFrame.circle(0, 0, radius + 12).stroke({ width: 1, color: currentStage === 'drift' ? COLORS.pale : COLORS.cyan, alpha: 0.16 });

    targetDash.position.set(0, 0);
    drawDashedCircle(targetDash, radius * 0.92, currentStage === 'drift' ? COLORS.pale : COLORS.graphite, currentStage === 'drift' ? 0.12 : 0.25);

    houseReticle.clear();
    const reticleLength = 12;
    const reticleGap = 5;
    drawLine(houseReticle, -reticleGap - reticleLength, 0, -reticleGap, 0, 1, COLORS.pale, currentStage === 'calibrate' ? 0.48 : currentStage === 'drift' ? 0.06 : 0.24);
    drawLine(houseReticle, reticleGap, 0, reticleGap + reticleLength, 0, 1, COLORS.pale, currentStage === 'calibrate' ? 0.48 : currentStage === 'drift' ? 0.06 : 0.24);
    drawLine(houseReticle, 0, -reticleGap - reticleLength, 0, -reticleGap, 1, COLORS.pale, currentStage === 'calibrate' ? 0.48 : currentStage === 'drift' ? 0.06 : 0.24);
    drawLine(houseReticle, 0, reticleGap, 0, reticleGap + reticleLength, 1, COLORS.pale, currentStage === 'calibrate' ? 0.48 : currentStage === 'drift' ? 0.06 : 0.24);

    houseStatic.clear();
    for (let lineY = -radius; lineY <= radius; lineY += 4) {
      drawLine(houseStatic, -radius, lineY, radius, lineY, 1, COLORS.pale, 0.2);
    }
    for (let lineX = -radius; lineX <= radius; lineX += 7) {
      drawLine(houseStatic, lineX, -radius, lineX, radius, 1, COLORS.cyan, 0.1);
    }

    houseRoll.clear();
    for (let index = 0; index < 7; index += 1) {
      const y = -radius * 1.2 + index * radius * 0.42;
      const barHeight = index % 3 === 0 ? 8 : 3;
      houseRoll.rect(-radius, y, radius * (1.1 + (index % 4) * 0.18), barHeight).fill({
        color: index % 2 ? COLORS.cyan : COLORS.red,
        alpha: index % 3 === 0 ? 0.25 : 0.12,
      });
    }

    houseVignette.clear();
    for (let index = 0; index < 8; index += 1) {
      houseVignette.circle(0, 0, radius - index * (radius / 9)).stroke({ width: radius / 9 + 2, color: COLORS.shadow, alpha: currentStage === 'drift' ? 0.14 : 0.025 });
    }
  }

  function framePoint(x: number, y: number, scaleX: number, scaleY: number): [number, number] {
    return [(x - 160) * scaleX, (y - 180) * scaleY];
  }

  function drawOriginumHalf(graphics: Graphics, side: -1 | 1, scaleX: number, scaleY: number) {
    const p = (x: number, y: number) => framePoint(x, y, scaleX, scaleY);
    const shadow = side < 0
      ? [[153, 13], [18, 169], [18, 191], [153, 347]]
      : [[167, 13], [302, 169], [302, 191], [167, 347]];
    const edge = side < 0
      ? [[[153, 13], [92, 83]], [[73, 105], [18, 169]], [[18, 191], [62, 242]], [[81, 264], [153, 347]]]
      : [[[167, 13], [231, 87]], [[249, 108], [302, 169]], [[302, 191], [263, 236]], [[244, 258], [167, 347]]];
    const chips = side < 0
      ? [[[82, 86], [58, 108], [72, 117]], [[49, 120], [28, 142], [37, 151]], [[61, 250], [76, 267], [62, 278]]]
      : [[[239, 88], [262, 108], [249, 119]], [[271, 122], [293, 145], [282, 153]], [[258, 247], [245, 263], [258, 275]]];

    graphics.clear();
    for (let index = 0; index < shadow.length; index += 2) {
      const [start, end] = [p(shadow[index][0], shadow[index][1]), p(shadow[index + 1][0], shadow[index + 1][1])];
      drawLine(graphics, start[0], start[1], end[0], end[1], 15 * Math.min(scaleX, scaleY), COLORS.shadow, 0.9);
    }
    for (const [[x1, y1], [x2, y2]] of edge) {
      const start = p(x1, y1);
      const end = p(x2, y2);
      drawLine(graphics, start[0], start[1], end[0], end[1], 13 * Math.min(scaleX, scaleY), COLORS.pale, 0.96);
    }
    for (const chip of chips) {
      drawPolygon(graphics, chip.map(([x, y]) => p(x, y)), COLORS.pale, 0.92);
    }
  }

  function drawReveal() {
    const scaleX = revealWidth / 320;
    const scaleY = revealHeight / 360;
    const portraitWidth = revealWidth * 0.91;
    const portraitHeight = revealHeight * 0.91;
    drawDiamond(portraitMask, portraitWidth, portraitHeight, 0xffffff);
    fitCover(portraitBackdrop, 0, revealHeight * 0.19, revealWidth * 1.1, revealHeight * 1.1);
    fitCover(portrait, 0, revealHeight * 0.19, revealWidth * 1.1, revealHeight * 1.1);
    portraitVignette.clear();
    portraitVignette
      .moveTo(0, -portraitHeight / 2)
      .lineTo(portraitWidth / 2, 0)
      .lineTo(0, portraitHeight / 2)
      .lineTo(-portraitWidth / 2, 0)
      .closePath()
      .stroke({ width: 12, color: COLORS.shadow, alpha: 0.42 });

    revealGlow.clear();
    drawLine(revealGlow, framePoint(153, 13, scaleX, scaleY)[0], framePoint(153, 13, scaleX, scaleY)[1], framePoint(18, 169, scaleX, scaleY)[0], framePoint(18, 169, scaleX, scaleY)[1], 10, COLORS.teal, 0.12);
    drawLine(revealGlow, framePoint(167, 13, scaleX, scaleY)[0], framePoint(167, 13, scaleX, scaleY)[1], framePoint(302, 169, scaleX, scaleY)[0], framePoint(302, 169, scaleX, scaleY)[1], 10, COLORS.red, 0.12);
    drawOriginumHalf(leftHalf, -1, scaleX, scaleY);
    drawOriginumHalf(rightHalf, 1, scaleX, scaleY);

    leftEcho.clear();
    rightEcho.clear();
    const leftEchoSegments = [[[154, 25], [31, 168]], [[31, 192], [154, 335]]];
    const rightEchoSegments = [[[166, 25], [289, 168]], [[289, 192], [166, 335]]];
    for (const [[x1, y1], [x2, y2]] of leftEchoSegments) {
      const start = framePoint(x1, y1, scaleX, scaleY);
      const end = framePoint(x2, y2, scaleX, scaleY);
      drawLine(leftEcho, start[0], start[1], end[0], end[1], 1, COLORS.cyan, 0.58);
    }
    for (const [[x1, y1], [x2, y2]] of rightEchoSegments) {
      const start = framePoint(x1, y1, scaleX, scaleY);
      const end = framePoint(x2, y2, scaleX, scaleY);
      drawLine(rightEcho, start[0], start[1], end[0], end[1], 1, COLORS.red, 0.48);
    }

    glint.clear();
    for (const [[x1, y1], [x2, y2]] of [[[153, 13], [92, 83]], [[18, 191], [62, 242]], [[167, 13], [231, 87]], [[302, 191], [263, 236]]]) {
      const start = framePoint(x1, y1, scaleX, scaleY);
      const end = framePoint(x2, y2, scaleX, scaleY);
      drawLine(glint, start[0], start[1], end[0], end[1], 2.2, COLORS.pale, 0.86);
    }

    revealBars.clear();
    for (let index = 0; index < 14; index += 1) {
      const y = -revealHeight / 2 + ((index * 19) % revealHeight);
      const barWidth = revealWidth * (0.34 + (index % 4) * 0.12);
      revealBars.rect(-barWidth / 2, y, barWidth, index % 3 === 0 ? 2 : 1).fill({ color: index % 2 ? COLORS.red : COLORS.cyan, alpha: 0.07 });
    }
    revealScan.clear().rect(-revealWidth * 0.72, -4, revealWidth * 1.44, 8).fill({ color: COLORS.pale, alpha: 0.3 });
  }

  function drawEntryReticle(size: number) {
    entryReticleOuter.clear();
    entryReticleInner.clear();
    entryReticleCross.clear();
    entryReticleOuter.circle(0, 0, size / 2).stroke({ width: 1, color: COLORS.teal, alpha: 0.5 });
    entryReticleOuter.arc(0, 0, size / 2, -1.4, -1.35).stroke({ width: 5, color: COLORS.teal, alpha: 0.9 });
    entryReticleOuter.arc(0, 0, size / 2, 0.6, 0.65).stroke({ width: 5, color: COLORS.yellow, alpha: 0.9 });
    entryReticleOuter.arc(0, 0, size / 2, 2.6, 2.66).stroke({ width: 3, color: COLORS.pale, alpha: 0.7 });
    entryReticleInner.circle(0, 0, size * 0.32).stroke({ width: 1, color: COLORS.teal, alpha: 0.45 });
    entryReticleInner.arc(0, 0, size * 0.32, 1.2, 1.28).stroke({ width: 3, color: COLORS.pale, alpha: 0.7 });
    drawLine(entryReticleCross, -33, 0, -5, 0, 1, COLORS.pale, 0.72);
    drawLine(entryReticleCross, 5, 0, 33, 0, 1, COLORS.pale, 0.72);
    drawLine(entryReticleCross, 0, -33, 0, -5, 1, COLORS.pale, 0.72);
    drawLine(entryReticleCross, 0, 5, 0, 33, 1, COLORS.pale, 0.72);
  }

  function drawEntryButton(x: number, y: number, buttonWidth: number) {
    const buttonHeight = 70;
    const points: Array<[number, number]> = [[0, 0], [buttonWidth - 13, 0], [buttonWidth, 13], [buttonWidth, buttonHeight], [13, buttonHeight], [0, buttonHeight - 13]];
    entryButton.position.set(x, y);
    entryButtonShadow.clear();
    drawPolygon(entryButtonShadow, points.map(([px, py]) => [px + 7, py + 7]), COLORS.cyan, 0.28);
    drawPolygon(entryButtonBg, points, COLORS.yellow, 1);
    entryButtonIndex.position.set(12, 25);
    entryButtonLabel.position.set(49, 13);
    entryButtonHint.position.set(49, 40);
    entryButtonArrow.position.set(buttonWidth - 36, 22);
    entryButtonBg.alpha = 1;
  }

  function drawEntryGrid() {
    entryGrid.clear();
    for (let x = 0; x <= width; x += 24) drawLine(entryGrid, x, 0, x, height, 1, COLORS.pale, 0.07);
    for (let y = 0; y <= height; y += 24) drawLine(entryGrid, 0, y, width, y, 1, COLORS.pale, 0.07);
    entryGrid.alpha = 0.9;
  }

  function updateLayoutVars(entryX: number, entryY: number, entryWidth: number, visionX: number, visionY: number, visionWidth: number) {
    setCssVar(host, '--pixi-entry-x', entryX);
    setCssVar(host, '--pixi-entry-y', entryY);
    setCssVar(host, '--pixi-entry-width', entryWidth);
    setCssVar(host, '--pixi-entry-height', 70);
    setCssVar(host, '--pixi-vision-left', visionX - visionWidth / 2);
    setCssVar(host, '--pixi-vision-top', visionY - visionWidth / 2);
    setCssVar(host, '--pixi-vision-size', visionWidth);
    const soundRight = panelX + panelWidth - padding;
    const soundLeft = soundRight - soundLabel.width - 24;
    setCssVar(host, '--pixi-sound-left', soundLeft);
    setCssVar(host, '--pixi-sound-top', 2);
    setCssVar(host, '--pixi-sound-width', soundRight - soundLeft);
  }

  function drawCopy(copyTopValue: number, contentWidth: number, contentX: number) {
    const shortScreen = height <= 860;
    const veryShortScreen = height <= 700;
    const copyHeight = height - copyTopValue - (veryShortScreen ? 10 : shortScreen ? 10 : 18);
    const reveal = currentStage === 'reveal';
    copyBackground.clear();
    copyBorder.clear();
    copyAccent.clear();
    if (!reveal) {
      copyBackground.rect(contentX + 12, copyTopValue, contentWidth - 12, copyHeight).fill({ color: 0xf7f9f8, alpha: currentStage === 'drift' ? 0.04 : 0.8 });
      copyBorder.rect(contentX + 12, copyTopValue, contentWidth - 12, copyHeight).stroke({ width: 1, color: currentStage === 'drift' ? COLORS.pale : COLORS.graphite, alpha: currentStage === 'drift' ? 0.62 : 1 });
      copyBorder.rect(contentX + 12, copyTopValue, 1, copyHeight).fill({ color: currentStage === 'drift' ? COLORS.pale : COLORS.graphite, alpha: 1 });
      copyBorder.rect(contentX + 12, copyTopValue, contentWidth - 12, 5).fill({ color: COLORS.graphite, alpha: 1 });
      copyAccent.rect(contentX + 12 + (contentWidth - 12) * 0.71, copyTopValue, (contentWidth - 12) * 0.29, 5).fill({ color: currentStage === 'drift' ? COLORS.red : COLORS.cyan, alpha: 1 });
    }

    const textX = reveal ? contentX : contentX + 25;
    const topPadding = reveal ? 6 : veryShortScreen ? 8 : shortScreen ? 14 : 26;
    const titleOffset = veryShortScreen ? 19 : shortScreen ? 22 : 27;
    const noteOffset = veryShortScreen ? 49 : shortScreen ? 59 : 86;
    copyHeading.position.set(textX, copyTopValue + topPadding);
    copyIndex.position.set(contentX + contentWidth - (reveal ? 20 : 42), copyTopValue + topPadding - 4);
    copyTitle.position.set(textX, copyTopValue + topPadding + (reveal ? 15 : titleOffset));
    copyNote.position.set(textX, copyTopValue + topPadding + (reveal ? 67 : noteOffset));
    screeningNote.position.set(textX, copyTopValue + copyHeight - (veryShortScreen ? 5 : shortScreen ? 7 : 9));
    const titleSize = reveal
      ? Math.min(42, Math.max(27, width * 0.074))
      : veryShortScreen
        ? Math.min(30, Math.max(22, width * 0.06))
        : shortScreen
          ? Math.min(36, Math.max(25, width * 0.07))
          : Math.min(42, Math.max(27, width * 0.074));
    copyTitle.style.fontSize = titleSize;
    copyTitle.style.lineHeight = Math.round(titleSize * 1.02);
    copyTitle.style.wordWrapWidth = contentWidth - (reveal ? 12 : 38);
    copyNote.style.wordWrapWidth = contentWidth - (reveal ? 12 : 38);
    copyIndex.style.fontSize = reveal ? 8 : veryShortScreen ? 22 : shortScreen ? 22 : 26;
    copyIndex.alpha = reveal ? 1 : 0.2;
    copyTitle.style.fill = reveal ? COLORS.ice : currentStage === 'drift' ? COLORS.pale : COLORS.graphite;
    copyNote.style.fill = reveal ? 0x9aa9a6 : currentStage === 'drift' ? 0xa9b6b3 : COLORS.muted;
    screeningNote.style.fill = reveal ? 0x80918e : currentStage === 'drift' ? 0xa9b6b3 : 0x627176;
    copyBackground.visible = !reveal;
    copyBorder.visible = !reveal;
    copyAccent.visible = !reveal;
    resetButton.visible = reveal;
    resetLabel.visible = reveal;
    resetCode.visible = reveal;
    if (reveal) {
      copyNote.position.set(textX, copyTitle.y + copyTitle.height + 6);
      const resetX = textX;
      const resetY = copyNote.y + copyNote.height + 12;
      const resetWidth = 94;
      const resetHeight = 36;
      const resetPoints: Array<[number, number]> = [[0, 0], [resetWidth - 8, 0], [resetWidth, 8], [resetWidth, resetHeight], [8, resetHeight], [0, resetHeight - 8]];
      drawPolygon(resetButton, resetPoints, COLORS.ice, 1);
      resetButton.position.set(resetX, resetY);
      resetLabel.position.set(resetX + 12, resetY + 12);
      resetCode.position.set(resetX + 61, resetY + 14);
      setCssVar(host, '--pixi-reset-left', resetX);
      setCssVar(host, '--pixi-reset-top', resetY);
      setCssVar(host, '--pixi-reset-width', resetWidth);
      setCssVar(host, '--pixi-reset-height', resetHeight);
    }
  }

  function layout() {
    const rect = host.getBoundingClientRect();
    width = Math.max(Math.round(rect.width), 1);
    height = Math.max(Math.round(rect.height), 1);
    app.renderer.resize(width, height);
    app.canvas.style.width = `${width}px`;
    app.canvas.style.height = `${height}px`;

    panelWidth = Math.min(width, 720);
    panelX = (width - panelWidth) / 2;
    padding = width >= 600 ? 32 : 20;
    const bottomPadding = height <= 700 ? 10 : height <= 860 ? 10 : 18;
    const headerHeight = currentStage === 'reveal' ? 45 : height <= 700 ? 49 : 58;
    const railHeight = currentStage === 'reveal' ? 0 : 19;
    bodyTop = (height <= 700 ? 10 : 16) + headerHeight + railHeight;
    const copyHeight = getCopyHeight(height, currentStage === 'reveal');
    copyTop = Math.max(bodyTop + 230, height - bottomPadding - copyHeight);
    const bodyBottom = copyTop;
    const stageCenterY = (bodyTop + bodyBottom) / 2;
    frameSize = height <= 700 ? Math.min(height * 0.58, 250) : Math.min(width * 0.78, 320);
    frameSize = Math.min(frameSize, panelWidth - padding * 2);
    haloSize = height <= 700 ? Math.min(height * 0.6, 260) : Math.min(width * 0.8, 330);
    haloSize = Math.min(haloSize, panelWidth - padding);
    visualY = stageCenterY;
    revealWidth = Math.min(width * 0.88, 360);
    revealHeight = Math.min(height * 0.76, 390);
    const radius = Math.max((frameSize - 16) / 2, 30);
    const contentX = panelX + padding;
    const contentWidth = panelWidth - padding * 2;
    const entryContentX = Math.max(20, (width - 680) / 2);
    const entryContentWidth = Math.min(width - entryContentX * 2, 680);
    const entryButtonWidth = Math.min(entryContentWidth, 350);
    const entryButtonY = Math.min(height - 118, Math.max(height * 0.67, height - 208));
    entryButtonBaseY = entryButtonY;

    outsideBackground.clear().rect(0, 0, width, height).fill({ color: COLORS.clinic });
    fitCover(mainBackdrop, panelX + panelWidth / 2, height / 2, panelWidth, height);
    mainMask.position.set(panelX + panelWidth / 2, height / 2);
    mainMask.anchor.set(0.5);
    mainMask.scale.set(Math.max(panelWidth / (mainMask.texture.width || 1), height / (mainMask.texture.height || 1)));
    mainShade.clear().rect(panelX, 0, panelWidth, height).fill({
      color: currentStage === 'reveal' || currentStage === 'drift' ? COLORS.night : COLORS.pale,
      alpha: currentStage === 'reveal' ? 0.94 : currentStage === 'drift' ? 0.96 : 0.25,
    });
    mainDiagonal.clear();
    mainDiagonal.moveTo(panelX + panelWidth * 0.77, 0).lineTo(panelX + panelWidth * 0.78, height).stroke({ width: 1, color: COLORS.graphite, alpha: currentStage === 'drift' ? 0.42 : 0.12 });
    mainGrid.position.set(0, 0);
    drawScreenGrid(mainGrid, panelX, 0, panelWidth, height, currentStage === 'reveal' ? 0.035 : currentStage === 'drift' ? 0.045 : 0.035);
    fitCover(mainGrain, panelX + panelWidth / 2, height * 0.36, Math.min(panelWidth, 420), Math.min(height, 420));
    drawMainFilter();

    mainBackdrop.alpha = currentStage === 'reveal' ? 0.18 : currentStage === 'drift' ? 0.15 : 0.94;
    mainMask.alpha = currentStage === 'reveal' || currentStage === 'drift' ? 0.04 : 0.12;
    mainGrain.alpha = currentStage === 'reveal' ? 0.018 : currentStage === 'drift' ? 0.018 : 0.045;

    mainBody.position.set(0, 0);
    mainCopy.position.set(0, 0);
    mainChrome.position.set(0, 0);
    bodyBorder.clear().rect(contentX, bodyTop, 3, Math.max(bodyBottom - bodyTop, 1)).fill({ color: currentStage === 'drift' ? COLORS.red : COLORS.graphite, alpha: 1 });
    bodyBorder.visible = currentStage !== 'reveal';
    bodyNumber.text = STAGE_META[currentStage].index;
    bodyNumber.position.set(contentX + 8, bodyTop + (bodyBottom - bodyTop) * 0.08);
    bodyNumber.style.fontSize = Math.min(150, Math.max(92, width * 0.31));
    bodyNumber.style.fill = currentStage === 'drift' ? COLORS.red : COLORS.graphite;
    bodyNumber.alpha = currentStage === 'drift' ? 0.12 : 0.08;
    bodyNumber.visible = currentStage !== 'reveal';

    metaTopDot.clear().rect(contentX + 13, bodyTop + 7, 5, 5).fill({ color: currentStage === 'drift' ? COLORS.red : COLORS.cyan, alpha: 1 });
    metaBottomDot.clear().rect(contentX + 13, bodyBottom - 13, 5, 5).fill({ color: currentStage === 'drift' ? COLORS.red : COLORS.cyan, alpha: 1 });
    metaTop.position.set(contentX + 26, bodyTop + 5);
    metaRuleTop.clear().rect(contentX + 121, bodyTop + 9, 26, 1).fill({ color: COLORS.muted, alpha: 0.55 });
    metaSignal.position.set(contentX + 155, bodyTop + 5);
    metaBottom.position.set(contentX + 26, bodyBottom - 17);
    metaRuleBottom.clear().rect(contentX + 178, bodyBottom - 13, 26, 1).fill({ color: COLORS.muted, alpha: 0.55 });
    metaPhase.position.set(contentX + 212, bodyBottom - 17);
    metaTop.style.fill = currentStage === 'reveal' ? 0x9aa9a6 : COLORS.muted;
    metaSignal.style.fill = currentStage === 'reveal' ? 0x9aa9a6 : COLORS.muted;
    metaBottom.style.fill = currentStage === 'reveal' ? 0x9aa9a6 : COLORS.muted;
    metaPhase.style.fill = currentStage === 'reveal' ? 0x9aa9a6 : COLORS.muted;
    metaTopDot.visible = currentStage !== 'reveal';
    metaBottomDot.visible = currentStage !== 'reveal';
    metaRuleTop.visible = currentStage !== 'reveal';
    metaRuleBottom.visible = currentStage !== 'reveal';
    metaBottom.visible = true;
    metaPhase.visible = true;

    halo.position.set(panelX + panelWidth / 2, visualY);
    halo.clear();
    drawPolygon(halo, [[-haloSize / 2 + 12, -haloSize / 2], [haloSize / 2, -haloSize / 2], [haloSize / 2, haloSize / 2 - 12], [haloSize / 2 - 12, haloSize / 2], [-haloSize / 2, haloSize / 2], [-haloSize / 2, -haloSize / 2 + 12]], currentStage === 'drift' ? COLORS.night : 0xf5f7f6, currentStage === 'drift' ? 0.46 : 0.64);
    halo.stroke({ width: 2, color: currentStage === 'drift' ? COLORS.red : COLORS.graphite, alpha: currentStage === 'drift' ? 0.38 : 1 });
    haloShadow.clear();
    drawPolygon(haloShadow, [[-haloSize / 2 + 12 + 11, -haloSize / 2 + 11], [haloSize / 2 + 11, -haloSize / 2 + 11], [haloSize / 2 + 11, haloSize / 2 - 1], [haloSize / 2 - 1, haloSize / 2 + 11], [-haloSize / 2 + 11, haloSize / 2 + 11], [-haloSize / 2 + 11, -haloSize / 2 + 23]], currentStage === 'drift' ? COLORS.red : COLORS.graphite, currentStage === 'drift' ? 0.1 : 0.12);
    haloShadow.position.set(panelX + panelWidth / 2, visualY);
    halo.visible = currentStage !== 'reveal';
    haloShadow.visible = currentStage !== 'reveal';

    houseGroup.position.set(panelX + panelWidth / 2, visualY);
    drawHouse(radius);
    houseGroup.visible = currentStage !== 'reveal';
    revealGroup.position.set(panelX + panelWidth / 2, visualY);
    revealGroup.visible = currentStage === 'reveal';
    revealGroup.pivot.set(0, 0);
    drawReveal();
    revealFrame.position.set(0, 0);
    revealPortrait.position.set(0, 0);
    revealScan.position.set(0, 0);
    revealBars.position.set(0, 0);
    stageGlow.clear();
    if (currentStage === 'drift') {
      const glowRadius = Math.min(frameSize * 0.75, panelWidth / 2 - 36);
      const glowX = panelX + panelWidth / 2;
      stageGlow.circle(glowX, visualY, glowRadius).fill({ color: COLORS.red, alpha: 0.28 });
      stageGlow.circle(glowX, visualY, Math.min(frameSize * 0.58, glowRadius * 0.62)).fill({ color: COLORS.red, alpha: 0.16 });
    } else if (currentStage === 'reveal') {
      stageGlow.circle(panelX + panelWidth / 2, visualY, Math.max(revealWidth * 0.72, 170)).fill({ color: 0x2e5053, alpha: 0.08 });
    } else {
      stageGlow.circle(panelX + panelWidth / 2, visualY, Math.max(frameSize * 1.05, 160)).fill({ color: COLORS.cyan, alpha: 0.07 });
    }
    stageGlow.visible = currentStage !== 'reveal';

    const moduleY = bodyTop + (bodyBottom - bodyTop) * 0.9;
    moduleTag.visible = currentStage !== 'reveal';
    moduleText.visible = currentStage !== 'reveal';
    moduleText.position.set(panelX + panelWidth - 168, moduleY - 12);
    moduleTag.clear();
    drawPolygon(moduleTag, [[panelX + panelWidth - 184, moduleY - 17], [panelX + panelWidth + 2, moduleY - 17], [panelX + panelWidth - 8, moduleY + 4], [panelX + panelWidth - 184, moduleY + 4]], COLORS.graphite, 1);

    const copyX = currentStage === 'reveal' ? panelX + padding : panelX + padding;
    drawCopy(copyTop, contentWidth, copyX);

    topBar.clear();
    topBar.rect(panelX, 0, panelWidth, headerHeight).fill({ color: currentStage === 'reveal' ? COLORS.night : COLORS.graphite, alpha: currentStage === 'reveal' ? 0.15 : 1 });
    topBar.rect(panelX, headerHeight - 4, panelWidth, 4).fill({ color: currentStage === 'reveal' ? COLORS.night : COLORS.graphite, alpha: 1 });
    topAccent.clear().rect(panelX + panelWidth * 0.76, headerHeight - 4, panelWidth * 0.24, 4).fill({ color: COLORS.cyan, alpha: currentStage === 'reveal' ? 0 : 1 });
    rhodes.position.set(panelX + padding + 15, 27);
    rhodes.anchor.set(0.5);
    rhodes.scale.set(30 / (rhodes.texture.width || 1), 26 / (rhodes.texture.height || 1));
    rhodes.tint = currentStage === 'reveal' ? COLORS.ice : 0xf4f6f5;
    rhodes.alpha = currentStage === 'reveal' ? 0.68 : 1;
    brandName.position.set(panelX + padding + 39, 13);
    brandSub.position.set(panelX + padding + 39, 34);
    brandSub.style.fill = currentStage === 'reveal' ? 0x9aa9a6 : COLORS.muted;
    stageCode.text = STAGE_META[currentStage].code;
    stageCode.position.set(panelX + panelWidth - padding - 123, 16);
    stageCode.style.fill = currentStage === 'reveal' ? 0x9aa9a6 : COLORS.graphite;
    stageCode.style.fontSize = 10;
    stageCodeBg.clear().rect(panelX + panelWidth - padding - 130, 12, 73, 24).fill({ color: currentStage === 'reveal' ? COLORS.graphite : COLORS.cyan, alpha: 1 });
    soundLabel.position.set(panelX + panelWidth - padding, 20);
    soundLabel.anchor.set(1, 0);
    soundBars.position.set(soundLabel.x - soundLabel.width - 16, 24);
    soundLabel.style.fill = currentMuted ? COLORS.red : currentStage === 'reveal' ? 0x9aa9a6 : 0xbac6c3;
    railLeft.position.set(panelX + padding, headerHeight + 7);
    railMiddle.position.set(panelX + panelWidth / 2 - 52, headerHeight + 7);
    railRight.position.set(panelX + panelWidth - padding - 63, headerHeight + 7);
    railRuleLeft.clear().rect(panelX + padding + 112, headerHeight + 10, panelWidth / 2 - 180, 1).fill({ color: COLORS.clinicShadow, alpha: 0.8 });
    railRuleRight.clear().rect(panelX + panelWidth / 2 + 64, headerHeight + 10, panelWidth / 2 - padding - 64, 1).fill({ color: COLORS.clinicShadow, alpha: 0.8 });
    const railVisible = currentStage !== 'reveal';
    railLeft.visible = railVisible;
    railMiddle.visible = railVisible;
    railRight.visible = railVisible;
    railRuleLeft.visible = railVisible;
    railRuleRight.visible = railVisible;

    mainScanline.clear();
    for (let lineY = 0; lineY < height; lineY += 14) mainScanline.rect(panelX, lineY, panelWidth, 1).fill({ color: currentStage === 'drift' ? COLORS.red : COLORS.graphite, alpha: currentStage === 'drift' ? 0.26 : 0 });
    mainScanline.alpha = currentStage === 'drift' ? 0.4 : 1;

    entryBackdrop.position.set(width / 2, height / 2);
    entryBackdrop.anchor.set(0.5);
    entryBackdrop.scale.set(Math.max(width / (entryBackdrop.texture.width || 1), height / (entryBackdrop.texture.height || 1)));
    entryLayer.origin.set(width / 2, height / 2);
    entryShade.clear().rect(0, 0, width, height).fill({ color: COLORS.night, alpha: 0.78 });
    drawEntryGrid();
    entryRule.clear();
    entryRule.rect(width - Math.max(20, (width - 680) / 2), height * 0.17, 3, height * 0.71).fill({ color: COLORS.cyan, alpha: 0.86 });
    entryRule.rect(width - Math.max(20, (width - 680) / 2), height * 0.17 + height * 0.71 * 0.58, 3, height * 0.08).fill({ color: COLORS.yellow, alpha: 0.9 });
    entryNoise.clear();
    for (let lineY = 0; lineY < height; lineY += 7) entryNoise.rect(0, lineY, width, 1).fill({ color: COLORS.pale, alpha: 0.07 });
    entryScan.clear().rect(entryContentX, height * 0.15, entryContentWidth, 1).fill({ color: COLORS.teal, alpha: 0.86 });
    entryTopLine.clear().rect(entryContentX, 59, entryContentWidth, 1).fill({ color: COLORS.pale, alpha: 0.38 });
    entryTopLine.rect(entryContentX + entryContentWidth * 0.71, 58, entryContentWidth * 0.29, 3).fill({ color: COLORS.cyan, alpha: 1 });
    entryBottomLine.clear().rect(entryContentX, height - 52, entryContentWidth, 1).fill({ color: COLORS.pale, alpha: 0.24 });
    entryMark.position.set(entryContentX + 15, 31);
    entryMark.anchor.set(0.5);
    entryMark.scale.set(29 / (entryMark.texture.width || 1), 25 / (entryMark.texture.height || 1));
    entryPrts.position.set(entryContentX + 36, 21);
    entrySub.position.set(entryContentX + 36, 42);
    entrySequence.position.set(entryContentX + entryContentWidth - 45, 26);
    entrySequence.anchor.set(0.5);
    entrySequence.style.fill = COLORS.night;
    entrySequenceBg.clear().rect(entryContentX + entryContentWidth - 78, 17, 58, 24).fill({ color: COLORS.yellow, alpha: 1 });
    entryKicker.position.set(entryContentX, height * 0.27);
    entryTitle.position.set(entryContentX, height * 0.31);
    entryTitle.style.fontSize = Math.min(126, Math.max(78, width * 0.25));
    entryChinese.position.set(entryContentX, height * 0.31 + Math.min(126, Math.max(78, width * 0.25)) * 0.72 + 28);
    entryChinese.style.fontSize = Math.min(50, Math.max(34, width * 0.1));
    entryIntro.position.set(entryContentX + 12, height * 0.31 + Math.min(126, Math.max(78, width * 0.25)) * 0.72 + 82);
    entryIntro.style.wordWrapWidth = Math.min(entryContentWidth * 0.58, 340);
    entryButton.position.set(entryContentX, entryButtonY);
    drawEntryButton(entryContentX, entryButtonY, entryButtonWidth);
    entryOptical.position.set(entryContentX + entryContentWidth - 30, height * 0.22);
    entryOptical.rotation = Math.PI / 2;
    entryOptical.alpha = 0.08;
    entryReticle.position.set(entryContentX + entryContentWidth * 0.97, height * 0.43);
    entryReticleBaseScale = Math.min(width * 0.69, 300) / 300;
    entryReticle.scale.set(entryReticleBaseScale);
    entryReticle.alpha = 0.82;
    drawEntryReticle(300);
    entryFooterLeft.position.set(entryContentX, height - 43);
    entryFooterRight.position.set(entryContentX + entryContentWidth - 130, height - 43);
    updateLayoutVars(entryContentX, entryButtonY, entryButtonWidth, panelX + panelWidth / 2, visualY, frameSize);
    entryBootCurtain.clear().rect(0, 0, width, height).fill({ color: COLORS.night, alpha: 1 });
    entryBootLine.clear();
    entryBootLine.rect(-entryContentWidth / 2, -1, entryContentWidth, 2).fill({ color: COLORS.teal, alpha: 0.92 });
    entryBootLine.rect(entryContentWidth * 0.21, -2, entryContentWidth * 0.14, 4).fill({ color: COLORS.yellow, alpha: 0.96 });
    entryBootLine.position.set(width / 2, height / 2);
    flash.clear().rect(0, 0, width, height).fill({ color: 0xeffff8, alpha: 1 });
    flash.alpha = 0;
  }

  function finishEntryBoot() {
    if (entryBootComplete) return;
    entryBootComplete = true;
    entryLayer.alpha = 1;
    entryLayer.scale.set(1);
    entryChrome.alpha = 1;
    entryChrome.y = 0;
    entryKicker.alpha = 1;
    entryTitle.alpha = 1;
    entryTitle.scale.set(1);
    entryChinese.alpha = 1;
    entryIntro.alpha = 1;
    entryButton.alpha = 1;
    entryButton.y = entryButtonBaseY;
    entryReticle.alpha = 0.82;
    entryReticle.scale.set(entryReticleBaseScale);
    entryOptical.alpha = 0.08;
    entryFooterLeft.alpha = 1;
    entryFooterRight.alpha = 1;
    entryBootCurtain.visible = false;
    entryBootLine.visible = false;
    onEntryReady?.();
  }

  function applyEntryBoot(elapsedMs: number) {
    const boot = getEntryBootState(elapsedMs);
    entryLayer.alpha = 0.28 + boot.aperture * 0.72;
    entryLayer.scale.set(1.02 - boot.aperture * 0.02, 0.018 + boot.aperture * 0.982);
    entryChrome.alpha = boot.chrome;
    entryChrome.y = 8 * (1 - boot.chrome);
    entryKicker.alpha = boot.title;
    entryTitle.alpha = boot.title;
    entryTitle.scale.set(0.96 + boot.title * 0.04);
    entryChinese.alpha = boot.title;
    entryIntro.alpha = boot.action;
    entryButton.alpha = boot.action;
    entryButton.y = entryButtonBaseY + 14 * (1 - boot.action);
    entryReticle.alpha = 0.82 * boot.reticle;
    entryReticle.scale.set(entryReticleBaseScale * (0.72 + boot.reticle * 0.28));
    entryOptical.alpha = 0.08 * boot.reticle;
    entryFooterLeft.alpha = boot.action;
    entryFooterRight.alpha = boot.action;
    entryBootCurtain.visible = true;
    entryBootCurtain.alpha = boot.curtain;
    entryBootLine.visible = boot.lineAlpha > 0;
    entryBootLine.alpha = boot.lineAlpha;
    entryBootLine.scale.x = boot.line;
    if (boot.complete) finishEntryBoot();
  }

  function updateCopy(stage: Stage) {
    const copy = {
      intro: { eyebrow: 'INTAKE / 远距辨认', title: '请注视远处的房屋', note: '保持手机距离，确认房屋轮廓' },
      calibrate: { eyebrow: 'CALIBRATE / 焦距校准', title: '焦距校准中', note: '画面会短暂失焦，请继续注视房屋' },
      drift: { eyebrow: 'ANOMALY / 视觉偏移', title: '房屋位置发生偏移', note: '视觉信号偏离基线，请不要移开视线' },
      reveal: { eyebrow: 'REVEAL / 影像回收', title: 'PRTS // 视觉回收完成', note: '你看到的，从来不止一层。' },
    }[stage];
    copyHeading.text = copy.eyebrow;
    copyHeading.style.fill = STAGE_ACCENTS[stage];
    copyTitle.text = copy.title;
    copyNote.text = copy.note;
    copyIndex.text = STAGE_META[stage].index;
    metaSignal.text = STAGE_META[stage].signal;
    metaPhase.text = `PHASE / ${STAGE_META[stage].index}`;
  }

  function applyImmediate(stage: Stage) {
    currentStage = stage;
    complete = currentReducedMotion && stage === 'reveal';
    mainBody.x = 0;
    mainBody.y = 0;
    houseGroup.visible = stage !== 'reveal';
    revealGroup.visible = stage === 'reveal';
    houseBlur.strength = stage === 'calibrate' ? 3.5 : stage === 'drift' ? 2 : 0;
    houseNoise.noise = stage === 'drift' ? 0.16 : 0.045;
    houseBase.alpha = stage === 'drift' ? 0.62 : 1;
    houseBase.tint = 0xffffff;
    houseColor.enabled = stage === 'drift';
    houseGlitch.alpha = stage === 'drift' ? 0.22 : 0;
    houseStatic.alpha = stage === 'drift' ? 0.42 : 0;
    houseRoll.alpha = stage === 'drift' ? 0.64 : 0;
    houseVignette.alpha = stage === 'drift' ? 1 : 0.12;
    houseGroup.scale.set(stage === 'drift' ? 1.025 : 1);
    mainFilter.alpha = stage === 'reveal' ? 0.28 : 0;
    mainScanline.alpha = stage === 'drift' ? 0.4 : 0;
    revealPortrait.alpha = stage === 'reveal' ? 1 : 0;
    revealFrame.alpha = stage === 'reveal' ? 1 : 0;
    portraitBlur.strength = stage === 'reveal' && !currentReducedMotion ? 8 : 0;
    revealPortrait.scale.set(stage === 'reveal' && !currentReducedMotion ? 0.9 : 1);
    revealFrame.scale.set(stage === 'reveal' && !currentReducedMotion ? 1.08 : 1);
    revealFrame.rotation = stage === 'reveal' && !currentReducedMotion ? 0.024 : 0;
    revealPortrait.alpha = stage === 'reveal' && !currentReducedMotion ? 0 : stage === 'reveal' ? 1 : 0;
    revealFrame.alpha = stage === 'reveal' && !currentReducedMotion ? 0 : stage === 'reveal' ? 1 : 0;
    leftHalf.x = 0;
    rightHalf.x = 0;
    leftEcho.x = 0;
    rightEcho.x = 0;
    revealScan.x = stage === 'reveal' && !currentReducedMotion ? -revealWidth * 0.72 : stage === 'reveal' ? revealWidth * 0.72 : -revealWidth * 0.72;
    revealScan.alpha = stage === 'reveal' && !currentReducedMotion ? 0 : stage === 'reveal' ? 0.26 : 0;
    flash.alpha = 0;
  }

  function triggerRevealFlash() {
    window.clearTimeout(flashTimer);
    flash.alpha = 0;
    if (currentReducedMotion) return;

    const pulses = [
      [0xeffff8, 0.94, 70],
      [0xeffff8, 0.04, 100],
      [0xdfe9ff, 0.72, 80],
      [0xdfe9ff, 0.06, 100],
      [0xffedf0, 0.46, 80],
      [0xffedf0, 0, 140],
    ] as const;
    let pulseIndex = 0;
    mainBody.x = -2;
    mainBody.y = 1;

    const showPulse = () => {
      const pulse = pulses[pulseIndex];
      if (!pulse) {
        flash.alpha = 0;
        mainBody.x = 0;
        mainBody.y = 0;
        app.render();
        return;
      }

      flash.clear().rect(0, 0, width, height).fill({ color: pulse[0], alpha: 1 });
      flash.alpha = pulse[1];
      mainBody.x = pulseIndex % 2 === 0 ? -2 : 1;
      mainBody.y = pulseIndex % 3 === 0 ? 1 : 0;
      app.render();
      pulseIndex += 1;
      flashTimer = window.setTimeout(showPulse, pulse[2]);
    };

    showPulse();
  }

  function setStage(stage: Stage) {
    currentStage = stage;
    complete = false;
    window.clearTimeout(flashTimer);
    stageTime = 0;
    updateCopy(stage);
    layout();
    applyImmediate(stage);
    app.render();
    if (stage === 'reveal' && !currentReducedMotion) triggerRevealFlash();
  }

  function finishHandoff() {
    window.cancelAnimationFrame(handoffRequest);
    handoffRequest = 0;
    mainLayer.visible = true;
    mainLayer.alpha = 1;
    entryLayer.visible = false;
    entryLayer.alpha = 1;
    entryChrome.alpha = 1;
    entryChrome.y = 0;
    entryReticle.scale.set(1);
    entryReticle.alpha = 0.82;
    app.render();
    const onComplete = handoffComplete;
    handoffComplete = undefined;
    onComplete?.();
  }

  function setStarted(nextStarted: boolean, onComplete?: () => void) {
    window.cancelAnimationFrame(handoffRequest);
    handoffRequest = 0;
    handoffComplete = nextStarted ? onComplete : undefined;
    if (!entryBootComplete) finishEntryBoot();

    if (!nextStarted) {
      entryLayer.visible = true;
      entryLayer.alpha = 1;
      mainLayer.visible = false;
      mainLayer.alpha = 1;
      entryChrome.alpha = 1;
      entryChrome.y = 0;
      entryReticle.scale.set(1);
      entryReticle.alpha = 0.82;
      app.render();
      onComplete?.();
      return;
    }

    if (currentReducedMotion) {
      finishHandoff();
      return;
    }

    mainLayer.visible = true;
    mainLayer.alpha = 0;
    entryLayer.visible = true;
    entryLayer.alpha = 1;
    entryChrome.alpha = 1;
    entryChrome.y = 0;
    entryReticle.scale.set(1);
    entryReticle.alpha = 0.82;

    const startedAt = performance.now();
    const handoff = (now: number) => {
      if (destroyed) return;
      const progress = Math.min((now - startedAt) / 620, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      mainLayer.alpha = eased;
      entryLayer.alpha = 1 - eased;
      entryChrome.y = -28 * eased;
      entryChrome.alpha = 1 - eased;
      entryReticle.scale.set(1 + eased * 0.34);
      entryReticle.alpha = 0.82 * (1 - eased);
      app.render();

      if (progress < 1) {
        handoffRequest = window.requestAnimationFrame(handoff);
        return;
      }

      finishHandoff();
    };

    handoffRequest = window.requestAnimationFrame(handoff);
  }

  function setMuted(muted: boolean) {
    const animate = currentMuted !== null && currentMuted !== muted && !currentReducedMotion;
    const heights = getSoundBarHeights(muted);
    currentMuted = muted;
    soundTimeline?.kill();
    soundTimeline = null;
    soundBarItems.forEach((bar) => { bar.tint = muted ? COLORS.red : COLORS.pale; });
    soundLabel.style.fill = muted ? COLORS.red : currentStage === 'reveal' ? 0x9aa9a6 : 0xbac6c3;

    if (!animate) {
      soundBarItems.forEach((bar, index) => { bar.scale.y = heights[index] / 12; });
      if (currentReducedMotion) app.render();
      return;
    }

    const scales = soundBarItems.map((bar) => bar.scale);
    soundTimeline = gsap.timeline({ onComplete: () => { soundTimeline = null; } })
      .to(scales, { y: 0.12, duration: 0.08, stagger: 0.018, ease: 'power2.in' })
      .to(scales, { y: (index: number) => heights[index] / 12, duration: 0.24, stagger: 0.035, ease: 'back.out(2.1)' }, '<0.035')
      .fromTo(soundLabel, { alpha: 0.45 }, { alpha: 1, duration: 0.18, ease: 'power2.out', immediateRender: false }, 0.04);
  }

  function setReducedMotion(reducedMotion: boolean) {
    currentReducedMotion = reducedMotion;
    window.clearTimeout(flashTimer);
    if (reducedMotion) {
      soundTimeline?.kill();
      soundTimeline = null;
      setMuted(currentMuted ?? false);
      loopActive = false;
      window.cancelAnimationFrame(frameRequest);
      applyImmediate(currentStage);
      layout();
      finishEntryBoot();
      if (handoffComplete) finishHandoff();
      else app.render();
    } else {
      setStage(currentStage);
      startLoop();
    }
  }

  function reset() {
    setStage('intro');
  }

  function tick() {
    if (currentReducedMotion || destroyed) return;
    if (!entryBootComplete) applyEntryBoot(performance.now() - entryBootStartedAt);
    time += 0.016;
    stageTime += 0.016;
    if (currentStage === 'calibrate') {
      const calibration = (Math.sin(stageTime * Math.PI / 1.17) + 1) / 2;
      houseBlur.strength = 3.5 + calibration * 5.5;
      houseGroup.scale.set(1.015 + calibration * 0.015);
    }
    mainScanline.y = (time * (currentStage === 'drift' ? 180 : 72)) % Math.max(height + 40, 1);
    entryScan.y = (time * 72) % Math.max(height, 1);
    entryReticleOuter.rotation = time * 0.08;
    entryReticleInner.rotation = -time * 0.12;
    mainGrain.rotation = Math.sin(time * 0.12) * 0.01;
    if (currentStage === 'drift') {
      houseGlitch.x = Math.sin(time * 26) * 13;
      houseGlitch.y = Math.cos(time * 18) * 1.2;
      houseGlitch.scale.x = houseBase.scale.x * (1 + Math.sin(time * 11) * 0.05);
      houseStatic.position.set(Math.sin(time * 22), Math.cos(time * 18));
      houseRoll.y = ((time * 120) % Math.max(frameSize * 2, 1)) - frameSize;
    } else {
      houseGlitch.x = 0;
      houseGlitch.y = 0;
      houseStatic.position.set(0, 0);
      houseRoll.y = 0;
    }
    houseNoise.seed = (time * 0.17) % 1;
    if (currentStage === 'reveal') {
      const revealProgress = Math.min(stageTime / 0.68, 1);
      const revealEase = 1 - Math.pow(1 - revealProgress, 3);
      revealPortrait.alpha = revealEase;
      revealPortrait.scale.set(0.9 + revealEase * 0.1);
      revealFrame.alpha = Math.min(stageTime / 0.04, 1);
      revealFrame.scale.set(1.08 - revealEase * 0.08);
      revealFrame.rotation = 0.024 * (1 - revealEase);
      portraitBlur.strength = 8 * (1 - revealEase);
      const scanProgress = Math.min(stageTime / 0.64, 1);
      revealScan.x = -revealWidth * 0.72 + revealWidth * 1.44 * scanProgress;
      revealScan.alpha = scanProgress * (0.12 + Math.abs(Math.sin(time * 2.2)) * 0.14);
      if (revealProgress >= 1) complete = true;
      glint.alpha = 0.42 + Math.abs(Math.sin(time * 1.7)) * 0.42;
      if (complete) {
        leftHalf.x = Math.sin(time * 1.65) > 0.92 ? -7 : Math.sin(time * 3.1) > 0.95 ? 3 : 0;
        rightHalf.x = -leftHalf.x;
      }
    }
  }

  function startLoop() {
    if (loopActive || currentReducedMotion || destroyed) return;
    loopActive = true;
    const renderFrame = () => {
      if (!loopActive || destroyed) return;
      try {
        tick();
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
  updateCopy('intro');
  setMuted(false);
  layout();
  applyImmediate('intro');
  mainLayer.visible = false;
  entryLayer.visible = true;
  if (currentReducedMotion) {
    finishEntryBoot();
    app.render();
  } else {
    entryBootStartedAt = performance.now();
    applyEntryBoot(0);
    app.render();
    startLoop();
  }

  return {
    setStarted,
    setStage,
    setMuted,
    setReducedMotion,
    reset,
    destroy() {
      destroyed = true;
      soundTimeline?.kill();
      soundTimeline = null;
      window.clearTimeout(flashTimer);
      loopActive = false;
      window.cancelAnimationFrame(frameRequest);
      window.cancelAnimationFrame(handoffRequest);
      handoffComplete = undefined;
      resizeObserver.disconnect();
      const canvas = app.canvas;
      app.destroy({ removeView: true }, { children: true });
      if (host.contains(canvas)) host.removeChild(canvas);
    },
  } satisfies PixiVisionScene;
}
