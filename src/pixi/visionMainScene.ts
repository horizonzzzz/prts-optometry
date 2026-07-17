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
  drawLine,
  drawPolygon,
  fitCover,
  fitStretch,
} from './visionSceneGraphics';
import {
  COLORS,
  getCopyHeight,
  getSoundBarHeights,
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
  const houseGroup = new Container({ label: 'house-visual' });
  const houseMask = new Graphics();
  const houseViewport = new Container();
  const houseBase = new Sprite(textures.house);
  const houseGlitch = new Sprite(textures.house);
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

  const revealGroup = new Container({ label: 'reveal-visual' });
  const revealPortrait = new Container();
  const portraitMask = new Graphics();
  const portraitBackdrop = new Sprite(textures.portrait);
  const portrait = new Sprite(textures.portrait);
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

  layer.addChild(backdrop, shade, mask, diagonal, grid, stageGlow, body, copy, chrome, grain, scanline, filter);
  body.addChild(bodyBorder, bodyNumber, metaTopDot, metaTop, metaRuleTop, metaSignal, metaBottomDot, metaBottom, metaRuleBottom, metaPhase, haloShadow, halo, houseGroup, revealGroup, moduleTag, moduleText);
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
  let currentMuted: boolean | null = null;
  let soundTimeline: gsap.core.Timeline | null = null;
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
    if (!reveal) return undefined;

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
    return { left: resetX, top: resetY, width: resetWidth, height: resetHeight };
  }

  function layout(nextWidth: number, nextHeight: number) {
    width = nextWidth;
    height = nextHeight;
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
    drawPolygon(haloShadow, [[-haloSize / 2 + 23, -haloSize / 2 + 11], [haloSize / 2 + 11, -haloSize / 2 + 11], [haloSize / 2 + 11, haloSize / 2 - 1], [haloSize / 2 - 1, haloSize / 2 + 11], [-haloSize / 2 + 11, haloSize / 2 + 11], [-haloSize / 2 + 11, -haloSize / 2 + 23]], currentStage === 'drift' ? COLORS.red : COLORS.graphite, currentStage === 'drift' ? 0.1 : 0.12);
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

    const reset = drawCopy(copyTop, contentWidth, panelX + padding);

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

    scanline.clear();
    for (let lineY = 0; lineY < height; lineY += 14) scanline.rect(panelX, lineY, panelWidth, 1).fill({ color: currentStage === 'drift' ? COLORS.red : COLORS.graphite, alpha: currentStage === 'drift' ? 0.26 : 0 });
    scanline.alpha = currentStage === 'drift' ? 0.4 : 1;
    flash.clear().rect(0, 0, width, height).fill({ color: 0xeffff8, alpha: 1 });
    flash.alpha = 0;

    const soundRight = panelX + panelWidth - padding;
    const soundLeft = soundRight - soundLabel.width - 24;
    return {
      visionLeft: panelX + panelWidth / 2 - frameSize / 2,
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
      intro: { eyebrow: 'INTAKE / 远距辨认', title: '请注视远处的房屋', note: '保持手机距离，确认房屋轮廓' },
      calibrate: { eyebrow: 'CALIBRATE / 焦距校准', title: '焦距校准中', note: '画面会短暂失焦，请继续注视房屋' },
      drift: { eyebrow: 'ANOMALY / 视觉偏移', title: '房屋位置发生偏移', note: '视觉信号偏离基线，请不要移开视线' },
      reveal: { eyebrow: 'REVEAL / 影像回收', title: 'PRTS // 视觉回收完成', note: '你看到的，从来不止一层。' },
    }[stage];
    copyHeading.text = stageCopy.eyebrow;
    copyHeading.style.fill = STAGE_ACCENTS[stage];
    copyTitle.text = stageCopy.title;
    copyNote.text = stageCopy.note;
    copyIndex.text = STAGE_META[stage].index;
    metaSignal.text = STAGE_META[stage].signal;
    metaPhase.text = `PHASE / ${STAGE_META[stage].index}`;
  }

  function applyStage() {
    const stage = currentStage;
    complete = currentReducedMotion && stage === 'reveal';
    body.x = 0;
    body.y = 0;
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
      const calibration = (Math.sin(stageTime * Math.PI / 1.17) + 1) / 2;
      houseBlur.strength = 3.5 + calibration * 5.5;
      houseGroup.scale.set(1.015 + calibration * 0.015);
    }
    scanline.y = (time * (currentStage === 'drift' ? 180 : 72)) % Math.max(height + 40, 1);
    grain.rotation = Math.sin(time * 0.12) * 0.01;
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

  return {
    outsideBackground,
    layer,
    flash,
    layout,
    selectStage(stage: Stage) {
      currentStage = stage;
      complete = false;
      window.clearTimeout(flashTimer);
      updateCopy(stage);
    },
    applyStage,
    triggerRevealFlash,
    setMuted,
    setReducedMotion(reducedMotion: boolean) {
      currentReducedMotion = reducedMotion;
      window.clearTimeout(flashTimer);
      if (!reducedMotion) return;
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
      soundTimeline?.kill();
      soundTimeline = null;
      window.clearTimeout(flashTimer);
    },
  };
}
