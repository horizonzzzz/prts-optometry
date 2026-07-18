import { gsap } from 'gsap';
import {
  BlurFilter,
  ColorMatrixFilter,
  Container,
  Graphics,
  NoiseFilter,
  Sprite,
  TextStyle,
  type Application,
} from 'pixi.js';
import type { Stage } from '../state';
import type { VisionSceneTextures } from './visionSceneAssets';
import {
  addText,
  drawDashedCircle,
  drawDiamond,
  drawDiamondStroke,
  drawLine,
  drawOriginiumCore,
  drawPolygon,
  fitCover,
  fitStretch,
} from './visionSceneGraphics';
import {
  COLORS,
  getCalibrationBlurAmount,
  getCopyHeight,
  getRevealFractureKick,
  getSoundBarHeights,
  getStageReadyTime,
  isWideLayout,
  STAGE_ACCENTS,
  STAGE_META,
} from './visionSceneModel';

type MainSceneOptions = {
  app: Application;
  textures: VisionSceneTextures;
  reducedMotion: boolean;
};

export function createVisionMainScene({ app, textures, reducedMotion: initialReducedMotion }: MainSceneOptions) {
  const outsideBackground = new Graphics();
  const layer = new Container({ label: 'main-scene' });
  const body = new Container({ label: 'main-body' });
  const copy = new Container({ label: 'main-copy' });
  const chrome = new Container({ label: 'main-chrome' });
  const flash = new Graphics();

  const backdrop = new Sprite(textures.grid);
  const mask = new Sprite(textures.mask);
  const shade = new Graphics();
  const diagonal = new Graphics();
  const grain = new Sprite(textures.particle);
  const grid = new Graphics();
  const scanline = new Graphics();
  const filter = new Graphics();
  const stageGlow = new Graphics();
  const stageGlowBlur = new BlurFilter({ strength: 24 });

  const topBar = new Graphics();
  const topAccent = new Graphics();
  const rhodes = new Sprite(textures.rhodes);
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
  const bodyNumber = addText('01', new TextStyle({ fill: COLORS.graphite, fontFamily: 'Novecento, Bender, sans-serif', fontSize: 128, fontWeight: '700' }));
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

  const calibrationAlert = new Container({ label: 'calibration-alert' });
  const calibrationAlertBg = new Graphics();
  const calibrationAlertAccent = new Graphics();
  const calibrationAlertCode = addText('ERR 02', new TextStyle({ fill: COLORS.pale, fontFamily: 'Bender, sans-serif', fontSize: 8, fontWeight: '700', letterSpacing: 1 }));
  const calibrationAlertMessage = addText('FOCUS UNSTABLE\n请在清晰时点击', new TextStyle({ fill: COLORS.pale, fontFamily: "Bender, SourceHan, 'Noto Sans SC', sans-serif", fontSize: 8, letterSpacing: 0.7, lineHeight: 11 }));

  const halo = new Graphics();
  const haloShadow = new Graphics();
  const houseGroup = new Container({ label: 'house-visual' });
  const houseMask = new Graphics();
  const houseViewport = new Container();
  const houseBase = new Sprite(textures.house);
  const houseGlitch = new Sprite(textures.house);
  const houseStatic = new Graphics();
  const houseRoll = new Graphics();
  const houseVignette = new Graphics();
  const houseTrace = new Graphics();
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

  const revealGroup = new Container({ label: 'reveal-visual' });
  const revealPortrait = new Container();
  const portraitMask = new Graphics();
  const portraitBackdrop = new Sprite(textures.portrait);
  const portrait = new Sprite(textures.portrait);
  const portraitVignette = new Graphics();
  const revealFrame = new Container();
  const originiumAura = new Graphics();
  const originiumBody = new Graphics();
  const originiumShellMask = new Graphics();
  const originiumRim = new Graphics();
  const originiumShards = new Graphics();
  const originiumCoreGlow = new Graphics();
  const originiumCore = new Graphics();
  const leftEcho = new Graphics();
  const rightEcho = new Graphics();
  const glint = new Graphics();
  const revealBars = new Graphics();
  const revealScan = new Graphics();
  const portraitBlur = new BlurFilter({ strength: 8 });
  const portraitBackdropBlur = new BlurFilter({ strength: 14 });
  const originiumAuraBlur = new BlurFilter({ strength: 18 });

  const copyBackground = new Graphics();
  const copyAccent = new Graphics();
  const copyBorder = new Graphics();
  const copyHeading = addText('INTAKE / 远距辨认', new TextStyle({ fill: COLORS.cyan, fontFamily: "Bender, 'Arial Narrow', SourceHan, 'Noto Sans SC', sans-serif", fontSize: 8, letterSpacing: 1.1 }));
  const copyIndex = addText('01', new TextStyle({ fill: COLORS.graphite, fontFamily: 'Novecento, Bender, sans-serif', fontSize: 26, fontWeight: '700' }));
  const copyTitle = addText('请注视远处的房屋', new TextStyle({ fill: COLORS.graphite, fontFamily: "Novecento, Bender, SourceHan, 'Noto Sans SC', sans-serif", fontSize: 40, fontWeight: '700', letterSpacing: 1, lineHeight: 42, wordWrap: true }));
  const copyNote = addText('保持手机距离，确认房屋轮廓', new TextStyle({ fill: COLORS.muted, fontFamily: "SourceHan, 'Noto Sans SC', sans-serif", fontSize: 13, letterSpacing: 0.5, lineHeight: 20, wordWrap: true }));
  const screeningNote = addText('FICTIONAL VISUAL EFFECT / NOT A MEDICAL TEST', new TextStyle({ fill: 0x627176, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.2 }));
  const resetButton = new Graphics();
  const resetLabel = addText('RESET', new TextStyle({ fill: COLORS.night, fontFamily: 'Bender, sans-serif', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }));
  const resetCode = addText('R-00', new TextStyle({ fill: 0x627176, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 0.8 }));

  layer.addChild(backdrop, shade, mask, diagonal, grid, stageGlow, body, copy, chrome, grain, scanline, filter);
  body.addChild(bodyBorder, bodyNumber, metaTopDot, metaTop, metaRuleTop, metaSignal, metaBottomDot, metaBottom, metaRuleBottom, metaPhase, haloShadow, halo, houseGroup, revealGroup, calibrationAlert, moduleTag, moduleText);
  calibrationAlert.addChild(calibrationAlertBg, calibrationAlertAccent, calibrationAlertCode, calibrationAlertMessage);
  copy.addChild(copyBackground, copyBorder, copyAccent, copyHeading, copyIndex, copyTitle, copyNote, resetButton, resetLabel, resetCode, screeningNote);
  chrome.addChild(topBar, topAccent, rhodes, brandName, brandSub, stageCodeBg, stageCode, soundBars, soundLabel, railLeft, railMiddle, railRight, railRuleLeft, railRuleRight);

  backdrop.alpha = 0.94;
  mask.alpha = 0.12;
  grain.alpha = 0.045;
  grain.blendMode = 'multiply';
  mask.blendMode = 'multiply';
  backdrop.blendMode = 'multiply';
  body.position.set(0, 0);
  copy.position.set(0, 0);
  chrome.position.set(0, 0);
  filter.alpha = 0;
  calibrationAlert.alpha = 0;

  houseMask.renderable = true;
  houseMask.alpha = 0;
  houseViewport.mask = houseMask;
  houseViewport.addChild(houseBase, houseGlitch, houseStatic, houseRoll, houseVignette, houseTrace, houseReticle);
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
  originiumAura.filters = [originiumAuraBlur];
  portraitBackdrop.alpha = 0.72;
  portrait.alpha = 0.96;
  leftEcho.blendMode = 'screen';
  rightEcho.blendMode = 'screen';
  originiumCoreGlow.blendMode = 'add';
  glint.blendMode = 'add';
  // Layer order: crystal shell + aura behind portrait, PRTS frame accents on top.
  originiumShellMask.renderable = true;
  originiumShellMask.alpha = 0;
  originiumBody.mask = originiumShellMask;
  revealGroup.addChild(originiumAura, originiumShellMask, originiumBody, revealPortrait, revealFrame);
  revealFrame.addChild(
    leftEcho,
    rightEcho,
    originiumRim,
    originiumShards,
    glint,
    originiumCoreGlow,
    originiumCore,
    revealBars,
    revealScan,
  );
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
  let currentMuted: boolean | null = null;
  let soundTimeline: gsap.core.Timeline | null = null;
  let calibrationFeedbackTimeline: gsap.core.Timeline | null = null;
  let calibrationLocked = false;
  let flashTimer = 0;

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
    filter.clear();
    for (let lineX = panelX; lineX < panelX + panelWidth; lineX += 4) {
      filter.rect(lineX, 0, 1, height).fill({ color: COLORS.pale, alpha: 0.035 });
    }
    for (let lineY = 0; lineY < height; lineY += 5) {
      filter.rect(panelX, lineY, panelWidth, 1).fill({ color: currentStage === 'drift' ? COLORS.red : COLORS.pale, alpha: 0.045 });
    }
  }

  function drawCalibrationAlert(alertWidth: number) {
    const left = -alertWidth / 2;
    const right = alertWidth / 2;
    const top = -19;
    const bottom = 19;
    calibrationAlertBg.clear();
    drawPolygon(calibrationAlertBg, [[left + 8, top], [right, top], [right, bottom - 8], [right - 8, bottom], [left, bottom], [left, top + 8]], COLORS.graphite, 0.96);
    calibrationAlertAccent.clear().rect(left, top, 49, 38).fill({ color: 0xffffff, alpha: 1 });
    calibrationAlertCode.position.set(left + 9, -4);
    calibrationAlertMessage.position.set(left + 59, -12);
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
    const reticleAlpha = currentStage === 'calibrate' ? 0.48 : currentStage === 'drift' ? 0.06 : 0.24;
    drawLine(houseReticle, -reticleGap - reticleLength, 0, -reticleGap, 0, 1, COLORS.pale, reticleAlpha);
    drawLine(houseReticle, reticleGap, 0, reticleGap + reticleLength, 0, 1, COLORS.pale, reticleAlpha);
    drawLine(houseReticle, 0, -reticleGap - reticleLength, 0, -reticleGap, 1, COLORS.pale, reticleAlpha);
    drawLine(houseReticle, 0, reticleGap, 0, reticleGap + reticleLength, 1, COLORS.pale, reticleAlpha);

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

    houseTrace.clear();
    drawDiamondStroke(houseTrace, radius * 0.9, radius * 1.14, COLORS.originiumSoft, 0.86, 1.1);
    drawDiamondStroke(houseTrace, radius * 0.8, radius * 1.02, COLORS.cyan, 0.54, 0.8);
  }

  function framePoint(x: number, y: number, scaleX: number, scaleY: number): [number, number] {
    return [(x - 160) * scaleX, (y - 180) * scaleY];
  }

  // Originium crystal frame — jagged PRTS-like shell around a diamond aperture.
  // Design space 320×360, origin mapped through framePoint (center 160,180).
  // IMPORTANT: every facet must stay OUTSIDE the portrait diamond so the face is never covered.
  type Facet = {
    points: Array<[number, number]>;
    color: number;
    alpha: number;
  };

  // Facets are an outer crown/wings/tip only — clear diamond window in the middle.
  const ORIGINIUM_FACETS: Facet[] = [
    // Top crown
    { points: [[160, 2], [128, 34], [142, 48], [160, 36], [178, 48], [192, 34]], color: 0x0c1014, alpha: 0.94 },
    { points: [[128, 34], [100, 56], [118, 70], [142, 48]], color: 0x1a222a, alpha: 0.9 },
    { points: [[192, 34], [178, 48], [202, 70], [220, 56]], color: 0x222b34, alpha: 0.88 },
    { points: [[142, 36], [132, 50], [160, 58], [160, 40]], color: COLORS.originiumSoft, alpha: 0.28 },
    { points: [[178, 36], [160, 40], [160, 58], [188, 50]], color: COLORS.originium, alpha: 0.22 },

    // Upper-left outer wing
    { points: [[100, 56], [62, 98], [74, 128], [108, 108], [118, 70]], color: 0x0a0e12, alpha: 0.92 },
    { points: [[62, 98], [36, 140], [48, 162], [74, 128]], color: 0x151b22, alpha: 0.9 },
    { points: [[100, 56], [86, 78], [108, 88], [118, 70]], color: COLORS.originiumSoft, alpha: 0.3 },

    // Upper-right outer wing
    { points: [[220, 56], [202, 70], [212, 108], [246, 128], [258, 98]], color: 0x12181d, alpha: 0.9 },
    { points: [[258, 98], [246, 128], [272, 162], [284, 140]], color: 0x1a222a, alpha: 0.88 },
    { points: [[220, 56], [202, 70], [212, 88], [234, 78]], color: COLORS.originium, alpha: 0.26 },

    // Mid-left blade
    { points: [[36, 140], [14, 180], [30, 214], [50, 196], [48, 162]], color: 0x0d1116, alpha: 0.94 },
    { points: [[30, 214], [42, 244], [76, 236], [64, 204], [50, 196]], color: 0x1c252e, alpha: 0.88 },
    { points: [[14, 180], [30, 196], [46, 186], [40, 166]], color: COLORS.originiumDeep, alpha: 0.22 },

    // Mid-right blade
    { points: [[284, 140], [272, 162], [270, 196], [290, 214], [306, 180]], color: 0x151b22, alpha: 0.92 },
    { points: [[290, 214], [256, 236], [244, 244], [270, 196], [278, 204]], color: 0x222b34, alpha: 0.86 },
    { points: [[306, 180], [280, 166], [274, 186], [290, 196]], color: COLORS.originiumSoft, alpha: 0.18 },

    // Lower-left outer wing
    { points: [[42, 244], [58, 286], [90, 314], [112, 288], [76, 236]], color: 0x0a0e12, alpha: 0.92 },
    { points: [[58, 286], [80, 326], [116, 348], [128, 318], [90, 314]], color: 0x171f27, alpha: 0.9 },
    { points: [[76, 236], [98, 258], [112, 288], [88, 278]], color: COLORS.originium, alpha: 0.2 },

    // Lower-right outer wing
    { points: [[244, 244], [208, 236], [208, 288], [230, 314], [262, 286]], color: 0x12181d, alpha: 0.9 },
    { points: [[230, 314], [192, 318], [204, 348], [240, 326], [262, 286]], color: 0x1a222a, alpha: 0.88 },
    { points: [[208, 236], [232, 258], [230, 288], [210, 278]], color: COLORS.originiumSoft, alpha: 0.18 },

    // Bottom tip
    { points: [[116, 348], [148, 352], [160, 358], [172, 352], [204, 348], [192, 318], [160, 330], [128, 318]], color: 0x0c1014, alpha: 0.94 },
    { points: [[148, 332], [160, 346], [172, 332], [160, 322]], color: COLORS.originium, alpha: 0.3 },
  ];

  const ORIGINIUM_RIM: Array<[[number, number], [number, number], number, number]> = [
    // Outer silhouette only — no strokes crossing the face window
    [[160, 2], [100, 56], 2.1, 0.92],
    [[100, 56], [36, 140], 1.9, 0.86],
    [[36, 140], [14, 180], 1.8, 0.84],
    [[14, 180], [42, 244], 1.8, 0.84],
    [[42, 244], [58, 286], 1.9, 0.86],
    [[58, 286], [116, 348], 2.0, 0.9],
    [[116, 348], [160, 358], 2.1, 0.92],
    [[160, 2], [220, 56], 2.1, 0.92],
    [[220, 56], [284, 140], 1.9, 0.86],
    [[284, 140], [306, 180], 1.8, 0.84],
    [[306, 180], [244, 244], 1.8, 0.84],
    [[244, 244], [262, 286], 1.9, 0.86],
    [[262, 286], [204, 348], 2.0, 0.9],
    [[204, 348], [160, 358], 2.1, 0.92],
    // Outer fracture accents (stay on the rim)
    [[128, 34], [74, 128], 1.05, 0.36],
    [[192, 34], [246, 128], 1.05, 0.36],
    [[62, 98], [50, 196], 1.0, 0.32],
    [[258, 98], [270, 196], 1.0, 0.32],
    [[42, 244], [112, 288], 1.05, 0.34],
    [[244, 244], [208, 288], 1.05, 0.34],
    [[116, 348], [160, 330], 1.1, 0.4],
    [[204, 348], [160, 330], 1.1, 0.4],
  ];

  type ShardSpec = {
    points: Array<[number, number]>;
    color: number;
    alpha: number;
    ox: number;
    oy: number;
  };

  const ORIGINIUM_SHARDS: ShardSpec[] = [
    { points: [[0, -10], [8, -2], [4, 9], [-6, 4]], color: COLORS.originium, alpha: 0.9, ox: -132, oy: -102 },
    { points: [[0, -7], [9, 1], [2, 8], [-7, 2]], color: COLORS.originiumDeep, alpha: 0.8, ox: 138, oy: -88 },
    { points: [[0, -12], [7, 0], [1, 10], [-8, 3]], color: COLORS.originiumSoft, alpha: 0.84, ox: -152, oy: 8 },
    { points: [[0, -6], [10, -1], [5, 8], [-5, 5]], color: COLORS.originium, alpha: 0.72, ox: 156, oy: 24 },
    { points: [[0, -9], [6, 2], [-1, 9], [-8, 1]], color: COLORS.originiumSoft, alpha: 0.86, ox: -118, oy: 134 },
    { points: [[0, -8], [8, 0], [3, 9], [-7, 3]], color: COLORS.originiumDeep, alpha: 0.78, ox: 122, oy: 142 },
    { points: [[0, -5], [6, 1], [1, 6], [-5, 2]], color: COLORS.originium, alpha: 0.74, ox: -90, oy: -150 },
    { points: [[0, -6], [7, -1], [2, 7], [-6, 2]], color: COLORS.originiumSoft, alpha: 0.7, ox: 94, oy: -156 },
    { points: [[0, -11], [5, 1], [-2, 8], [-7, -2]], color: COLORS.originium, alpha: 0.82, ox: -164, oy: -34 },
    { points: [[0, -9], [9, 2], [1, 8], [-6, 0]], color: COLORS.originiumDeep, alpha: 0.76, ox: 168, oy: -20 },
    { points: [[0, -4], [5, 0], [2, 5], [-4, 2]], color: COLORS.originiumSoft, alpha: 0.68, ox: -70, oy: 164 },
    { points: [[0, -5], [6, 1], [0, 6], [-5, 1]], color: COLORS.originium, alpha: 0.72, ox: 66, oy: 168 },
    { points: [[0, -7], [5, 2], [-3, 6], [-6, -1]], color: COLORS.originiumSoft, alpha: 0.64, ox: -48, oy: -168 },
    { points: [[0, -6], [6, 0], [1, 7], [-5, 2]], color: COLORS.originiumDeep, alpha: 0.74, ox: 42, oy: -172 },
  ];

  function drawOriginiumCrystal(scaleX: number, scaleY: number, apertureW: number, apertureH: number) {
    const minScale = Math.min(scaleX, scaleY);
    originiumAura.clear();
    originiumBody.clear();
    originiumRim.clear();
    originiumShards.clear();
    originiumCoreGlow.clear();
    originiumCore.clear();
    leftEcho.clear();
    rightEcho.clear();
    glint.clear();

    // Soft vertical aura behind the crystal shell
    originiumAura
      .moveTo(...framePoint(160, 0, scaleX, scaleY))
      .lineTo(...framePoint(30, 180, scaleX, scaleY))
      .lineTo(...framePoint(160, 360, scaleX, scaleY))
      .lineTo(...framePoint(290, 180, scaleX, scaleY))
      .closePath()
      .fill({ color: 0x1a3034, alpha: 0.32 });
    originiumAura
      .moveTo(...framePoint(160, 28, scaleX, scaleY))
      .lineTo(...framePoint(88, 180, scaleX, scaleY))
      .lineTo(...framePoint(160, 332, scaleX, scaleY))
      .lineTo(...framePoint(232, 180, scaleX, scaleY))
      .closePath()
      .fill({ color: 0x2e5053, alpha: 0.16 });

    // Faceted crystal shell — geometry is already outside the face window
    for (const facet of ORIGINIUM_FACETS) {
      const pts = facet.points.map(([x, y]) => framePoint(x, y, scaleX, scaleY));
      originiumBody.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) originiumBody.lineTo(x, y);
      originiumBody.closePath().fill({ color: facet.color, alpha: facet.alpha });
    }

    // Extra safety: hard-mask the shell so nothing can paint over the portrait diamond
    const holeW = apertureW * 0.98;
    const holeH = apertureH * 0.98;
    const maskOuterW = Math.max(apertureW * 1.7, 300 * scaleX);
    const maskOuterH = Math.max(apertureH * 1.55, 360 * scaleY);
    originiumShellMask.clear();
    originiumShellMask
      .moveTo(0, -maskOuterH / 2)
      .lineTo(maskOuterW / 2, 0)
      .lineTo(0, maskOuterH / 2)
      .lineTo(-maskOuterW / 2, 0)
      .closePath()
      .fill({ color: 0xffffff, alpha: 1 });
    originiumShellMask
      .moveTo(0, -holeH / 2)
      .lineTo(holeW / 2, 0)
      .lineTo(0, holeH / 2)
      .lineTo(-holeW / 2, 0)
      .closePath()
      .cut();

    // Outer rim strokes
    for (const [[x1, y1], [x2, y2], width, alpha] of ORIGINIUM_RIM) {
      const start = framePoint(x1, y1, scaleX, scaleY);
      const end = framePoint(x2, y2, scaleX, scaleY);
      drawLine(originiumRim, start[0], start[1], end[0], end[1], width * minScale, COLORS.pale, alpha);
    }

    // Thin double diamond edge around the portrait (amber)
    const innerPad = 3 * minScale;
    drawDiamondStroke(originiumRim, apertureW + innerPad * 2.2, apertureH + innerPad * 2.2, COLORS.originiumSoft, 0.78, 1.45 * minScale);
    drawDiamondStroke(originiumRim, apertureW + innerPad * 0.3, apertureH + innerPad * 0.3, COLORS.originium, 0.4, 0.95 * minScale);

    // Edge glints in originium gold
    for (const [x1, y1, x2, y2, alpha] of [
      [160, 2, 100, 56, 0.95],
      [100, 56, 62, 98, 0.72],
      [160, 2, 142, 36, 0.88],
      [262, 286, 204, 348, 0.55],
      [204, 348, 160, 358, 0.72],
      [14, 180, 36, 140, 0.42],
    ] as Array<[number, number, number, number, number]>) {
      const start = framePoint(x1, y1, scaleX, scaleY);
      const end = framePoint(x2, y2, scaleX, scaleY);
      drawLine(glint, start[0], start[1], end[0], end[1], 2.2 * minScale, COLORS.originium, alpha);
    }

    // Floating amber debris
    for (const shard of ORIGINIUM_SHARDS) {
      const origin = framePoint(160 + shard.ox, 180 + shard.oy, scaleX, scaleY);
      const pts = shard.points.map(([x, y]) => [origin[0] + x * minScale, origin[1] + y * minScale] as [number, number]);
      originiumShards.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) originiumShards.lineTo(x, y);
      originiumShards.closePath().fill({ color: shard.color, alpha: shard.alpha });
    }

    // PRTS double-diamond sigil near the bottom tip — below the chin / on the lower crystal
    const coreW = 12 * minScale;
    const coreH = 15 * minScale;
    const coreY = apertureH * 0.58;
    originiumCoreGlow.position.set(0, coreY);
    originiumCore.position.set(0, coreY);
    originiumCoreGlow
      .moveTo(0, -coreH * 0.85)
      .lineTo(coreW * 0.85, 0)
      .lineTo(0, coreH * 0.85)
      .lineTo(-coreW * 0.85, 0)
      .closePath()
      .fill({ color: COLORS.originium, alpha: 0.26 });
    drawOriginiumCore(originiumCore, coreW, coreH, COLORS.originium, 0.96, 2 * minScale);

    // Soft chromatic echoes outside the face
    drawDiamondStroke(leftEcho, apertureW * 1.16, apertureH * 1.16, COLORS.cyan, 0.18, 0.95 * minScale);
    drawDiamondStroke(rightEcho, apertureW * 1.12, apertureH * 1.12, COLORS.red, 0.14, 0.85 * minScale);
  }

  function drawReveal() {
    const scaleX = revealWidth / 320;
    const scaleY = revealHeight / 360;
    // Large open diamond so Priestess' face dominates the reveal.
    const portraitWidth = revealWidth * 0.84;
    const portraitHeight = revealHeight * 0.88;
    drawDiamond(portraitMask, portraitWidth, portraitHeight, 0xffffff);
    // Keep the full bust visible inside the diamond instead of cropping to the face.
    const portraitScaleW = portraitWidth * 1.1;
    const portraitScaleH = portraitHeight * 1.3;
    const portraitOffsetY = portraitHeight * 0.2;
    fitCover(portraitBackdrop, 0, portraitOffsetY, portraitScaleW, portraitScaleH);
    fitCover(portrait, 0, portraitOffsetY, portraitScaleW, portraitScaleH);
    portraitBackdrop.alpha = 0.55;
    portrait.alpha = 1;
    portraitVignette.clear();
    portraitVignette
      .moveTo(0, -portraitHeight / 2)
      .lineTo(portraitWidth / 2, 0)
      .lineTo(0, portraitHeight / 2)
      .lineTo(-portraitWidth / 2, 0)
      .closePath()
      .stroke({ width: 5, color: COLORS.shadow, alpha: 0.18 });

    drawOriginiumCrystal(scaleX, scaleY, portraitWidth, portraitHeight);

    revealBars.clear();
    for (let index = 0; index < 14; index += 1) {
      const y = -revealHeight / 2 + ((index * 19) % revealHeight);
      const barWidth = revealWidth * (0.34 + (index % 4) * 0.12);
      revealBars.rect(-barWidth / 2, y, barWidth, index % 3 === 0 ? 2 : 1).fill({ color: index % 2 ? COLORS.red : COLORS.cyan, alpha: 0.05 });
    }
    revealScan.clear().rect(-revealWidth * 0.72, -4, revealWidth * 1.44, 8).fill({ color: COLORS.pale, alpha: 0.24 });
  }

  function drawCopy(copyTopValue: number, panelWidthValue: number, panelLeft: number, fixedHeight?: number) {
    const shortScreen = height <= 860;
    const veryShortScreen = height <= 700;
    const wideLayout = isWideLayout(width, height);
    const copyHeight = fixedHeight ?? height - copyTopValue - (veryShortScreen ? 10 : shortScreen ? 10 : 18);
    const reveal = currentStage === 'reveal';
    const panelRight = panelLeft + panelWidthValue;
    const panelBottom = copyTopValue + copyHeight;
    const panelPoints: Array<[number, number]> = [
      [panelLeft, copyTopValue],
      [panelRight - 12, copyTopValue],
      [panelRight, copyTopValue + 12],
      [panelRight, panelBottom],
      [panelLeft + 12, panelBottom],
      [panelLeft, panelBottom - 12],
    ];
    copyBackground.clear();
    copyBorder.clear();
    copyAccent.clear();
    if (!reveal) {
      copyBackground.moveTo(panelPoints[0][0], panelPoints[0][1]);
      for (const [x, y] of panelPoints.slice(1)) copyBackground.lineTo(x, y);
      copyBackground.closePath().fill({ color: 0xf7f9f8, alpha: currentStage === 'drift' ? 0.04 : 0.8 });
      copyBorder.moveTo(panelPoints[0][0], panelPoints[0][1]);
      for (const [x, y] of panelPoints.slice(1)) copyBorder.lineTo(x, y);
      copyBorder.closePath().stroke({ width: 1, color: currentStage === 'drift' ? COLORS.pale : COLORS.graphite, alpha: currentStage === 'drift' ? 0.62 : 1 });
      copyBorder.rect(panelLeft, copyTopValue, 1, copyHeight - 12).fill({ color: currentStage === 'drift' ? COLORS.pale : COLORS.graphite, alpha: 1 });
      copyBorder.rect(panelLeft, copyTopValue, panelWidthValue - 12, 5).fill({ color: COLORS.graphite, alpha: 1 });
      copyAccent.rect(panelLeft + panelWidthValue * 0.71, copyTopValue, panelWidthValue * 0.29 - 12, 5).fill({ color: currentStage === 'drift' ? COLORS.red : COLORS.cyan, alpha: 1 });
    }

    const textX = reveal ? panelLeft : panelLeft + 13;
    const topPadding = reveal ? 6 : wideLayout ? 26 : veryShortScreen ? 8 : shortScreen ? 14 : 26;
    const titleOffset = wideLayout ? 27 : veryShortScreen ? 19 : shortScreen ? 22 : 27;
    const noteOffset = wideLayout ? 86 : veryShortScreen ? 49 : shortScreen ? 59 : 86;
    copyHeading.position.set(textX, copyTopValue + topPadding);
    copyIndex.position.set(panelRight - (reveal ? 20 : 42), copyTopValue + topPadding - 4);
    copyTitle.position.set(textX, copyTopValue + topPadding + (reveal ? 15 : titleOffset));
    copyNote.position.set(textX, copyTopValue + topPadding + (reveal ? 67 : noteOffset));
    screeningNote.position.set(textX, panelBottom - (veryShortScreen || shortScreen ? 12 : 14));
    const titleSize = wideLayout
      ? 36
      : reveal
        ? veryShortScreen ? 27 : shortScreen ? 28 : 42
        : veryShortScreen ? 22 : shortScreen ? 28 : 42;
    copyTitle.style.fontSize = titleSize;
    copyTitle.style.lineHeight = Math.round(titleSize * 1.02);
    copyTitle.style.wordWrapWidth = panelWidthValue - (reveal ? 12 : 26);
    copyNote.style.wordWrapWidth = panelWidthValue - (reveal ? 12 : 26);
    copyIndex.style.fontSize = reveal ? 8 : wideLayout ? 24 : veryShortScreen ? 22 : shortScreen ? 22 : 26;
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
    if (!reveal) return undefined;

    copyNote.position.set(textX, copyTitle.y + copyTitle.height + 6);
    const resetX = textX;
    const resetWidth = 94;
    const resetHeight = 36;
    const resetY = Math.min(copyNote.y + copyNote.height + 12, screeningNote.y - resetHeight - 12);
    const resetPoints: Array<[number, number]> = [[0, 0], [resetWidth - 8, 0], [resetWidth, 8], [resetWidth, resetHeight], [8, resetHeight], [0, resetHeight - 8]];
    drawPolygon(resetButton, resetPoints, COLORS.ice, 1);
    resetButton.position.set(resetX, resetY);
    resetLabel.position.set(resetX + 12, resetY + 12);
    resetCode.position.set(resetX + 61, resetY + 14);
    return { left: resetX, top: resetY, width: resetWidth, height: resetHeight };
  }

  function layout(nextWidth: number, nextHeight: number) {
    width = nextWidth;
    height = nextHeight;
    const wideLayout = isWideLayout(width, height);
    panelWidth = Math.min(width, wideLayout ? 1120 : 720);
    panelX = (width - panelWidth) / 2;
    padding = wideLayout ? 40 : width >= 600 ? 32 : 20;
    const bottomPadding = wideLayout ? 28 : height <= 860 ? 10 : 18;
    const headerHeight = currentStage === 'reveal' ? (wideLayout ? 58 : 45) : wideLayout ? 64 : height <= 700 ? 49 : 58;
    const railHeight = currentStage === 'reveal' ? 0 : wideLayout ? 23 : 19;
    bodyTop = (wideLayout ? 18 : height <= 700 ? 10 : 16) + headerHeight + railHeight;
    const contentX = panelX + padding;
    const contentWidth = panelWidth - padding * 2;
    let bodyBottom: number;
    let copyPanelLeft: number;
    let copyPanelWidth: number;
    let copyPanelHeight: number | undefined;
    let visualColumnWidth = contentWidth;

    if (wideLayout) {
      const columnGap = 48;
      copyPanelWidth = Math.min(380, contentWidth * 0.36);
      visualColumnWidth = contentWidth - copyPanelWidth - columnGap;
      copyPanelLeft = contentX + visualColumnWidth + columnGap;
      bodyBottom = height - bottomPadding;
      copyPanelHeight = Math.min(currentStage === 'reveal' ? 300 : 260, bodyBottom - bodyTop - 32);
      copyTop = bodyTop + (bodyBottom - bodyTop - copyPanelHeight) / 2;
    } else {
      const copyHeight = getCopyHeight(height, currentStage === 'reveal');
      copyTop = Math.max(bodyTop + 230, height - bottomPadding - copyHeight);
      bodyBottom = copyTop;
      copyPanelLeft = contentX + 12;
      copyPanelWidth = contentWidth - 12;
    }

    const stageCenterY = (bodyTop + bodyBottom) / 2;
    const visualX = contentX + visualColumnWidth / 2;
    if (wideLayout) {
      frameSize = Math.min(visualColumnWidth * 0.72, (bodyBottom - bodyTop) * 0.58, 400);
      haloSize = Math.min(frameSize + 56, visualColumnWidth - 8);
      revealWidth = Math.min(visualColumnWidth * 0.67, 400);
      revealHeight = Math.min((bodyBottom - bodyTop) * 0.6, 440);
    } else {
      frameSize = height <= 700 ? Math.min(height * 0.58, 250) : Math.min(width * 0.78, 320);
      frameSize = Math.min(frameSize, panelWidth - padding * 2);
      haloSize = height <= 700 ? Math.min(height * 0.6, 260) : Math.min(width * 0.8, 330);
      haloSize = Math.min(haloSize, panelWidth - padding);
      revealWidth = Math.min(width * 0.84, 360);
      revealHeight = Math.min(height * 0.76, 390);
    }
    visualY = stageCenterY;
    const radius = Math.max((frameSize - 16) / 2, 30);

    outsideBackground.clear().rect(0, 0, width, height).fill({ color: COLORS.clinic });
    fitCover(backdrop, panelX + panelWidth / 2, height / 2, panelWidth, height);
    mask.position.set(panelX + panelWidth / 2, height / 2);
    mask.anchor.set(0.5);
    mask.scale.set(Math.max(panelWidth / (mask.texture.width || 1), height / (mask.texture.height || 1)));
    shade.clear().rect(panelX, 0, panelWidth, height).fill({
      color: currentStage === 'reveal' || currentStage === 'drift' ? COLORS.night : COLORS.pale,
      alpha: currentStage === 'reveal' ? 0.94 : currentStage === 'drift' ? 0.96 : 0.25,
    });
    diagonal.clear();
    diagonal.moveTo(panelX + panelWidth * 0.77, 0).lineTo(panelX + panelWidth * 0.78, height).stroke({ width: 1, color: COLORS.graphite, alpha: currentStage === 'drift' ? 0.42 : 0.12 });
    grid.position.set(0, 0);
    drawScreenGrid(grid, panelX, 0, panelWidth, height, currentStage === 'reveal' ? 0.035 : currentStage === 'drift' ? 0.045 : 0.035);
    fitCover(grain, panelX + panelWidth / 2, height * 0.36, Math.min(panelWidth, 420), Math.min(height, 420));
    drawMainFilter();

    backdrop.alpha = currentStage === 'reveal' ? 0.18 : currentStage === 'drift' ? 0.15 : 0.94;
    mask.alpha = currentStage === 'reveal' || currentStage === 'drift' ? 0.04 : 0.12;
    grain.alpha = currentStage === 'reveal' ? 0.018 : currentStage === 'drift' ? 0.018 : 0.045;

    body.position.set(0, 0);
    copy.position.set(0, 0);
    chrome.position.set(0, 0);
    bodyBorder.clear().rect(contentX, bodyTop, 3, Math.max(bodyBottom - bodyTop, 1)).fill({ color: currentStage === 'drift' ? COLORS.red : COLORS.graphite, alpha: 1 });
    bodyBorder.visible = currentStage !== 'reveal';
    bodyNumber.text = STAGE_META[currentStage].index;
    bodyNumber.position.set(contentX + 8, bodyTop + (bodyBottom - bodyTop) * 0.08);
    bodyNumber.style.fontSize = wideLayout ? 150 : width < 600 ? 112 : 128;
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
    metaTop.visible = currentStage !== 'reveal';
    metaSignal.visible = currentStage !== 'reveal';
    metaBottom.visible = true;
    metaPhase.visible = true;

    halo.position.set(visualX, visualY);
    halo.clear();
    drawPolygon(halo, [[-haloSize / 2 + 12, -haloSize / 2], [haloSize / 2, -haloSize / 2], [haloSize / 2, haloSize / 2 - 12], [haloSize / 2 - 12, haloSize / 2], [-haloSize / 2, haloSize / 2], [-haloSize / 2, -haloSize / 2 + 12]], currentStage === 'drift' ? COLORS.night : 0xf5f7f6, currentStage === 'drift' ? 0.46 : 0.64);
    halo.stroke({ width: 2, color: currentStage === 'drift' ? COLORS.red : COLORS.graphite, alpha: currentStage === 'drift' ? 0.38 : 1 });
    haloShadow.clear();
    drawPolygon(haloShadow, [[-haloSize / 2 + 23, -haloSize / 2 + 11], [haloSize / 2 + 11, -haloSize / 2 + 11], [haloSize / 2 + 11, haloSize / 2 - 1], [haloSize / 2 - 1, haloSize / 2 + 11], [-haloSize / 2 + 11, haloSize / 2 + 11], [-haloSize / 2 + 11, -haloSize / 2 + 23]], currentStage === 'drift' ? COLORS.red : COLORS.graphite, currentStage === 'drift' ? 0.1 : 0.12);
    haloShadow.position.set(visualX, visualY);
    halo.visible = currentStage !== 'reveal';
    haloShadow.visible = currentStage !== 'reveal';

    houseGroup.position.set(visualX, visualY);
    drawHouse(radius);
    houseGroup.visible = currentStage !== 'reveal';
    calibrationAlert.position.set(visualX, visualY + frameSize / 2 - 25);
    drawCalibrationAlert(Math.min(frameSize * 0.86, 260));
    revealGroup.position.set(visualX, visualY);
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
      const glowX = visualX;
      stageGlow.circle(glowX, visualY, glowRadius).fill({ color: COLORS.red, alpha: 0.28 });
      stageGlow.circle(glowX, visualY, Math.min(frameSize * 0.58, glowRadius * 0.62)).fill({ color: COLORS.red, alpha: 0.16 });
    } else if (currentStage === 'reveal') {
      stageGlow.circle(visualX, visualY, Math.max(revealWidth * 0.72, 170)).fill({ color: 0x2e5053, alpha: 0.08 });
    } else {
      stageGlow.circle(visualX, visualY, Math.max(frameSize * 1.05, 160)).fill({ color: COLORS.cyan, alpha: 0.07 });
    }
    stageGlow.visible = currentStage !== 'reveal';

    const moduleY = bodyTop + (bodyBottom - bodyTop) * 0.9;
    const moduleRight = wideLayout ? contentX + visualColumnWidth : panelX + panelWidth;
    moduleTag.visible = currentStage !== 'reveal';
    moduleText.visible = currentStage !== 'reveal';
    moduleText.position.set(moduleRight - 168, moduleY - 12);
    moduleTag.clear();
    drawPolygon(moduleTag, [[moduleRight - 184, moduleY - 17], [moduleRight + 2, moduleY - 17], [moduleRight - 8, moduleY + 4], [moduleRight - 184, moduleY + 4]], COLORS.graphite, 1);

    const reset = drawCopy(copyTop, copyPanelWidth, copyPanelLeft, copyPanelHeight);

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
    stageCode.anchor.set(0.5);
    stageCode.position.set(panelX + panelWidth - padding - 93.5, 24);
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

    scanline.clear();
    for (let lineY = 0; lineY < height; lineY += 14) scanline.rect(panelX, lineY, panelWidth, 1).fill({ color: currentStage === 'drift' ? COLORS.red : COLORS.graphite, alpha: currentStage === 'drift' ? 0.26 : 0 });
    scanline.alpha = currentStage === 'drift' ? 0.4 : 1;
    flash.clear().rect(0, 0, width, height).fill({ color: 0xeffff8, alpha: 1 });
    flash.alpha = 0;

    const soundRight = panelX + panelWidth - padding;
    const soundLeft = soundRight - soundLabel.width - 24;
    return {
      visionLeft: visualX - frameSize / 2,
      visionTop: visualY - frameSize / 2,
      visionSize: frameSize,
      soundLeft,
      soundTop: 2,
      soundWidth: soundRight - soundLeft,
      reset,
    };
  }

  function updateCopy(stage: Stage) {
    const stageCopy = {
      intro: { eyebrow: 'INTAKE / 远距辨认', title: '请注视远处的房屋', note: '点击中央图像，开始焦距校准' },
      calibrate: { eyebrow: 'CALIBRATE / 焦距校准', title: '焦距校准中', note: '观察焦距变化，在房屋最清晰时点击中央图像' },
      drift: { eyebrow: 'ANOMALY / 视觉偏移', title: '房屋位置发生偏移', note: '视觉信号偏离基线，请不要移开视线' },
      reveal: { eyebrow: 'REVEAL / 影像回收', title: 'PRTS // 视觉回收完成', note: '你看到的，从来不止一层。' },
    }[stage];
    copyHeading.text = stageCopy.eyebrow;
    copyHeading.style.fill = STAGE_ACCENTS[stage];
    copyTitle.text = stageCopy.title;
    copyNote.text = stageCopy.note;
    copyIndex.text = STAGE_META[stage].index;
    metaSignal.text = STAGE_META[stage].signal;
    metaBottom.text = stage === 'reveal' ? STAGE_META[stage].signal : 'FOCAL DISTANCE / 30 CM';
    metaPhase.text = `PHASE / ${STAGE_META[stage].index}`;
    moduleText.text = stage === 'intro' ? 'TAP IMAGE // START CALIBRATION' : stage === 'calibrate' ? 'TAP ON CLEAR // FOCUS LOCK' : 'OPTICAL MODULE // ACTIVE';
  }

  function applyStage() {
    const stage = currentStage;
    complete = currentReducedMotion && stage === 'reveal';
    body.x = 0;
    body.y = 0;
    houseGroup.visible = stage !== 'reveal';
    revealGroup.visible = stage === 'reveal';
    houseBlur.strength = stage === 'calibrate' && !currentReducedMotion ? 9 : stage === 'drift' ? 2 : 0;
    houseNoise.noise = stage === 'drift' ? 0.16 : 0.045;
    houseBase.alpha = stage === 'drift' ? 0.62 : 1;
    houseBase.tint = 0xffffff;
    houseColor.enabled = stage === 'drift';
    houseGlitch.alpha = stage === 'drift' ? 0.22 : 0;
    houseStatic.alpha = stage === 'drift' ? 0.42 : 0;
    houseRoll.alpha = stage === 'drift' ? 0.64 : 0;
    houseVignette.alpha = stage === 'drift' ? 1 : 0.12;
    houseTrace.alpha = stage === 'drift' ? 0.62 : stage === 'calibrate' ? 0.12 : 0.04;
    houseTrace.position.set(0, 0);
    houseTrace.scale.set(stage === 'drift' ? 1.04 : 1);
    houseGroup.scale.set(stage === 'calibrate' && !currentReducedMotion ? 1.03 : stage === 'drift' ? 1.025 : 1);
    houseReticle.alpha = 1;
    targetDash.alpha = 1;
    calibrationAlert.visible = stage === 'calibrate';
    filter.alpha = stage === 'reveal' ? 0.28 : 0;
    scanline.alpha = stage === 'drift' ? 0.4 : 0;
    revealPortrait.alpha = stage === 'reveal' ? 1 : 0;
    revealFrame.alpha = stage === 'reveal' ? 1 : 0;
    portraitBlur.strength = stage === 'reveal' && !currentReducedMotion ? 8 : 0;
    revealPortrait.scale.set(stage === 'reveal' && !currentReducedMotion ? 0.9 : 1);
    revealFrame.scale.set(stage === 'reveal' && !currentReducedMotion ? 1.08 : 1);
    revealFrame.rotation = stage === 'reveal' && !currentReducedMotion ? 0.024 : 0;
    revealPortrait.alpha = stage === 'reveal' && !currentReducedMotion ? 0 : stage === 'reveal' ? 1 : 0;
    revealFrame.alpha = stage === 'reveal' && !currentReducedMotion ? 0 : stage === 'reveal' ? 1 : 0;
    originiumShards.x = 0;
    originiumShards.y = 0;
    originiumCore.scale.set(1);
    originiumCoreGlow.scale.set(1);
    originiumCoreGlow.alpha = stage === 'reveal' ? 0.9 : 0;
    leftEcho.x = 0;
    rightEcho.x = 0;
    leftEcho.y = 0;
    rightEcho.y = 0;
    leftEcho.alpha = stage === 'reveal' ? 0.55 : 0;
    rightEcho.alpha = stage === 'reveal' ? 0.42 : 0;
    originiumBody.x = 0;
    originiumRim.x = 0;
    originiumShellMask.x = 0;
    originiumAura.alpha = stage === 'reveal' ? 1 : 0;
    revealScan.x = stage === 'reveal' && !currentReducedMotion ? -revealWidth * 0.72 : stage === 'reveal' ? revealWidth * 0.72 : -revealWidth * 0.72;
    revealScan.alpha = stage === 'reveal' && !currentReducedMotion ? 0 : stage === 'reveal' ? 0.26 : 0;
    const resetAlpha = complete ? 1 : 0;
    resetButton.alpha = resetAlpha;
    resetLabel.alpha = resetAlpha;
    resetCode.alpha = resetAlpha;
    flash.alpha = 0;
  }

  function showCalibrationFeedback(confirmed: boolean) {
    calibrationFeedbackTimeline?.kill();
    calibrationFeedbackTimeline = null;
    calibrationLocked = confirmed;
    calibrationAlert.visible = true;
    calibrationAlert.alpha = 1;
    calibrationAlert.scale.set(1);
    calibrationAlertAccent.tint = confirmed ? COLORS.cyan : COLORS.red;
    calibrationAlertCode.text = confirmed ? 'LOCK 100' : 'ERR 02';
    calibrationAlertCode.style.fill = confirmed ? COLORS.graphite : COLORS.pale;
    calibrationAlertMessage.text = confirmed ? 'FOCUS LOCKED\n焦距已锁定' : 'FOCUS UNSTABLE\n请在清晰时点击';

    if (confirmed) {
      houseBlur.strength = 0;
      houseGroup.scale.set(1);
      houseTrace.alpha = 0.08;
      houseTrace.scale.set(1);
      houseReticle.alpha = 1;
      targetDash.alpha = 1;
      app.render();
      return;
    }

    calibrationFeedbackTimeline = gsap.timeline({ onComplete: () => { calibrationFeedbackTimeline = null; } })
      .fromTo(calibrationAlert, { alpha: 0 }, { alpha: 1, duration: 0.05, ease: 'none' })
      .fromTo(calibrationAlert.scale, { x: 0.96 }, { x: 1, duration: 0.1, ease: 'power2.out' }, 0)
      .to(calibrationAlert, { alpha: 0.35, duration: 0.04, repeat: 3, yoyo: true, ease: 'none' }, 0.08)
      .to(calibrationAlert, { alpha: 0, duration: 0.14, ease: 'power2.in' }, '+=0.55');
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
    body.x = -2;
    body.y = 1;

    const showPulse = () => {
      const pulse = pulses[pulseIndex];
      if (!pulse) {
        flash.alpha = 0;
        body.x = 0;
        body.y = 0;
        app.render();
        return;
      }

      flash.clear().rect(0, 0, width, height).fill({ color: pulse[0], alpha: 1 });
      flash.alpha = pulse[1];
      body.x = pulseIndex % 2 === 0 ? -2 : 1;
      body.y = pulseIndex % 3 === 0 ? 1 : 0;
      app.render();
      pulseIndex += 1;
      flashTimer = window.setTimeout(showPulse, pulse[2]);
    };

    showPulse();
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

  function tick(time: number, stageTime: number) {
    if (currentStage === 'calibrate') {
      const calibration = calibrationLocked ? 0 : getCalibrationBlurAmount(stageTime);
      houseBlur.strength = calibration * 9;
      houseGroup.scale.set(1 + calibration * 0.03);
      houseTrace.alpha = 0.08 + calibration * 0.14;
      houseTrace.scale.set(1 + calibration * 0.02);
      houseReticle.alpha = 0.45 + (1 - calibration) * 0.55;
      targetDash.alpha = 0.32 + (1 - calibration) * 0.68;
    }
    scanline.y = (time * (currentStage === 'drift' ? 180 : 72)) % Math.max(height + 40, 1);
    grain.rotation = Math.sin(time * 0.12) * 0.01;
    if (currentStage === 'drift') {
      houseGlitch.x = Math.sin(time * 26) * 13;
      houseGlitch.y = Math.cos(time * 18) * 1.2;
      houseGlitch.scale.x = houseBase.scale.x * (1 + Math.sin(time * 11) * 0.05);
      houseStatic.position.set(Math.sin(time * 22), Math.cos(time * 18));
      houseRoll.y = ((time * 120) % Math.max(frameSize * 2, 1)) - frameSize;
      houseTrace.position.set(Math.sin(time * 15) * 4, Math.cos(time * 11) * 1.5);
      houseTrace.alpha = 0.48 + Math.abs(Math.sin(time * 3.2)) * 0.18;
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
      const settleDuration = getStageReadyTime('reveal') - 0.68;
      const settleProgress = Math.min(Math.max((stageTime - 0.68) / settleDuration, 0), 1);
      revealPortrait.alpha = revealEase;
      revealPortrait.scale.set(0.9 + revealEase * 0.1);
      revealFrame.alpha = Math.min(stageTime / 0.04, 1);
      revealFrame.scale.set(1.08 - revealEase * 0.08);
      revealFrame.rotation = 0.024 * (1 - revealEase);
      portraitBlur.strength = 8 * (1 - revealEase);
      const scanProgress = Math.min(stageTime / 0.64, 1);
      revealScan.x = -revealWidth * 0.72 + revealWidth * 1.44 * scanProgress;
      revealScan.alpha = (1 - settleProgress) * scanProgress * (0.12 + Math.abs(Math.sin(time * 2.2)) * 0.14);
      complete = settleProgress >= 1;
      resetButton.alpha = settleProgress;
      resetLabel.alpha = settleProgress;
      resetCode.alpha = settleProgress;

      const motion = complete ? 0.15 : 1 - settleProgress * 0.85;
      const breath = 0.5 + 0.5 * Math.sin(time * 1.55);
      const corePulse = 1 + breath * 0.06 + Math.sin(time * 4.8) * 0.015;
      originiumCore.scale.set(corePulse);
      originiumCoreGlow.scale.set(1.05 + breath * 0.18);
      originiumCoreGlow.alpha = 0.55 + breath * 0.4 + Math.abs(Math.sin(time * 3.2)) * 0.12;
      originiumCore.alpha = 0.86 + breath * 0.12;
      glint.alpha = 0.38 + Math.abs(Math.sin(time * 1.9)) * 0.48;
      originiumAura.alpha = 0.72 + breath * 0.28;
      originiumShards.rotation = Math.sin(time * 0.55) * 0.018 * motion;
      originiumShards.x = Math.sin(time * 1.3) * 1.6 * motion;
      originiumShards.y = (Math.cos(time * 1.1) * 2.2 + Math.sin(time * 2.4) * 0.8) * motion;

      const echoDrift = (3 + Math.sin(time * 2.1) * 2.4) * motion;
      leftEcho.x = -echoDrift + Math.sin(time * 5.5) * 0.8;
      leftEcho.y = Math.cos(time * 1.7) * 1.4;
      rightEcho.x = echoDrift + Math.cos(time * 4.8) * 0.7;
      rightEcho.y = Math.sin(time * 1.9) * 1.2;
      leftEcho.alpha = 0.28 + Math.abs(Math.sin(time * 2.6)) * 0.34;
      rightEcho.alpha = 0.22 + Math.abs(Math.cos(time * 2.3)) * 0.28;
      leftEcho.scale.set(1 + Math.sin(time * 1.2) * 0.012);
      rightEcho.scale.set(1 + Math.cos(time * 1.35) * 0.014);

      const fractureKick = getRevealFractureKick(stageTime);
      originiumBody.x = fractureKick;
      originiumShellMask.x = fractureKick;
      originiumRim.x = fractureKick;
      originiumCore.x = 0;
      revealPortrait.x = 0;
      originiumShards.x -= fractureKick * 0.8;
      originiumShards.y += Math.abs(fractureKick) * 0.45;
      leftEcho.x -= Math.abs(fractureKick);
      rightEcho.x += Math.abs(fractureKick);
      originiumShards.alpha = fractureKick === 0 ? 0.55 + revealEase * 0.4 : 0.45;
      originiumCoreGlow.tint = 0xffffff;
    }
  }

  return {
    outsideBackground,
    layer,
    flash,
    layout,
    selectStage(stage: Stage) {
      currentStage = stage;
      complete = false;
      calibrationLocked = false;
      calibrationFeedbackTimeline?.kill();
      calibrationFeedbackTimeline = null;
      calibrationAlert.alpha = 0;
      window.clearTimeout(flashTimer);
      updateCopy(stage);
    },
    applyStage,
    showCalibrationFeedback,
    triggerRevealFlash,
    setMuted,
    setReducedMotion(reducedMotion: boolean) {
      currentReducedMotion = reducedMotion;
      window.clearTimeout(flashTimer);
      if (!reducedMotion) return;
      calibrationFeedbackTimeline?.kill();
      calibrationFeedbackTimeline = null;
      calibrationAlert.alpha = 0;
      soundTimeline?.kill();
      soundTimeline = null;
      setMuted(currentMuted ?? false);
    },
    tick,
    show(alpha = 1) {
      layer.visible = true;
      layer.alpha = alpha;
    },
    hide() {
      layer.visible = false;
      layer.alpha = 1;
    },
    applyHandoff(progress: number) {
      layer.alpha = progress;
    },
    destroy() {
      calibrationFeedbackTimeline?.kill();
      calibrationFeedbackTimeline = null;
      soundTimeline?.kill();
      soundTimeline = null;
      window.clearTimeout(flashTimer);
    },
  };
}
