import { Container, Graphics, Sprite, TextStyle } from 'pixi.js';
import type { VisionSceneTextures } from './visionSceneAssets';
import { addText, drawLine, drawPolygon, fitCover } from './visionSceneGraphics';
import { COLORS, getEntryBootState, isWideLayout } from './visionSceneModel';

type EntrySceneOptions = {
  textures: VisionSceneTextures;
  onReady?: () => void;
};

export function createVisionEntryScene({ textures, onReady }: EntrySceneOptions) {
  const layer = new Container({ label: 'entry-scene' });
  const chrome = new Container({ label: 'entry-chrome' });
  const bootCurtain = new Graphics();
  const bootLine = new Graphics();
  const backdrop = new Sprite(textures.blueprint);
  const shade = new Graphics();
  const grid = new Graphics();
  const rule = new Graphics();
  const noise = new Graphics();
  const scan = new Graphics();
  const topLine = new Graphics();
  const bottomLine = new Graphics();
  const sequenceBg = new Graphics();
  const mark = new Sprite(textures.rhodes);
  const prts = addText('PRTS', new TextStyle({ fill: 0xe8edeb, fontFamily: 'Bender, sans-serif', fontSize: 16, fontWeight: '700' }));
  const sub = addText('PERSONAL RECORD TERMINAL', new TextStyle({ fill: 0xb3bfbd, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.3 }));
  const sequence = addText('SYS / 00', new TextStyle({ fill: COLORS.night, fontFamily: 'Bender, sans-serif', fontSize: 7, fontWeight: '700', letterSpacing: 1.1 }));
  const kicker = addText('RHODES ISLAND / OPTICAL SERVICE', new TextStyle({ fill: COLORS.teal, fontFamily: 'Bender, sans-serif', fontSize: 8, letterSpacing: 1.35 }));
  const title = addText('PRTS', new TextStyle({ fill: { color: 0x101516, alpha: 0.2 }, stroke: { color: 0xe8edeb, width: 1 }, fontFamily: 'Novecento, Bender, sans-serif', fontSize: 100, fontWeight: '700' }));
  const chinese = addText('验光终端', new TextStyle({ fill: 0xe8edeb, fontFamily: "SourceHan, 'Noto Sans SC', sans-serif", fontSize: 42, letterSpacing: 8 }));
  const intro = addText('保持设备与双眼平齐，进入后请注视视野中央。', new TextStyle({ fill: 0xb4c0be, fontFamily: "SourceHan, 'Noto Sans SC', sans-serif", fontSize: 12, letterSpacing: 0.7, lineHeight: 22, wordWrap: true }));
  const button = new Container({ label: 'entry-action' });
  const buttonShadow = new Graphics();
  const buttonBg = new Graphics();
  const buttonIndex = addText('01', new TextStyle({ fill: COLORS.night, fontFamily: 'Bender, sans-serif', fontSize: 10, fontWeight: '700', letterSpacing: 1 }));
  const buttonLabel = addText('开始验光', new TextStyle({ fill: COLORS.night, fontFamily: "SourceHan, 'Noto Sans SC', sans-serif", fontSize: 16, letterSpacing: 2 }));
  const buttonHint = addText('BEGIN OPTICAL TEST', new TextStyle({ fill: COLORS.night, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.25 }));
  const buttonArrow = addText('→', new TextStyle({ fill: COLORS.night, fontFamily: 'Bender, sans-serif', fontSize: 23 }));
  const reticle = new Container({ label: 'entry-reticle' });
  const reticleOuter = new Graphics();
  const reticleInner = new Graphics();
  const reticleCross = new Graphics();
  const footerLeft = addText('OPTICAL ARRAY / RI-07', new TextStyle({ fill: 0xb3bfbd, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.15 }));
  const footerRight = addText('●  TERMINAL READY', new TextStyle({ fill: 0xd4e0dd, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 1.15 }));
  const optical = addText('OPTICAL', new TextStyle({ fill: 0xe8edeb, fontFamily: 'Novecento, Bender, sans-serif', fontSize: 78 }));

  layer.addChild(backdrop, shade, grid, rule, noise, scan, topLine, bottomLine, chrome);
  chrome.addChild(mark, prts, sub, sequenceBg, sequence, kicker, title, chinese, intro, button, reticle, optical, footerLeft, footerRight);
  button.addChild(buttonShadow, buttonBg, buttonIndex, buttonLabel, buttonHint, buttonArrow);
  reticle.addChild(reticleOuter, reticleInner, reticleCross);

  let width = 1;
  let height = 1;
  let buttonBaseY = 0;
  let reticleBaseScale = 1;
  let bootComplete = false;

  function drawReticle(size: number) {
    reticleOuter.clear();
    reticleInner.clear();
    reticleCross.clear();
    reticleOuter.circle(0, 0, size / 2).stroke({ width: 1, color: COLORS.teal, alpha: 0.5 });
    reticleOuter.arc(0, 0, size / 2, -1.4, -1.35).stroke({ width: 5, color: COLORS.teal, alpha: 0.9 });
    reticleOuter.arc(0, 0, size / 2, 0.6, 0.65).stroke({ width: 5, color: COLORS.yellow, alpha: 0.9 });
    reticleOuter.arc(0, 0, size / 2, 2.6, 2.66).stroke({ width: 3, color: COLORS.pale, alpha: 0.7 });
    reticleInner.circle(0, 0, size * 0.32).stroke({ width: 1, color: COLORS.teal, alpha: 0.45 });
    reticleInner.arc(0, 0, size * 0.32, 1.2, 1.28).stroke({ width: 3, color: COLORS.pale, alpha: 0.7 });
    drawLine(reticleCross, -33, 0, -5, 0, 1, COLORS.pale, 0.72);
    drawLine(reticleCross, 5, 0, 33, 0, 1, COLORS.pale, 0.72);
    drawLine(reticleCross, 0, -33, 0, -5, 1, COLORS.pale, 0.72);
    drawLine(reticleCross, 0, 5, 0, 33, 1, COLORS.pale, 0.72);
  }

  function drawButton(x: number, y: number, buttonWidth: number) {
    const buttonHeight = 70;
    const points: Array<[number, number]> = [[0, 0], [buttonWidth - 13, 0], [buttonWidth, 13], [buttonWidth, buttonHeight], [13, buttonHeight], [0, buttonHeight - 13]];
    button.position.set(x, y);
    buttonShadow.clear();
    drawPolygon(buttonShadow, points.map(([px, py]) => [px + 7, py + 7]), COLORS.cyan, 0.28);
    drawPolygon(buttonBg, points, COLORS.yellow, 1);
    buttonIndex.position.set(12, 25);
    buttonLabel.position.set(49, 13);
    buttonHint.position.set(49, 40);
    buttonArrow.position.set(buttonWidth - 36, 22);
    buttonBg.alpha = 1;
  }

  function drawGrid() {
    grid.clear();
    for (let x = 0; x <= width; x += 24) drawLine(grid, x, 0, x, height, 1, COLORS.pale, 0.07);
    for (let y = 0; y <= height; y += 24) drawLine(grid, 0, y, width, y, 1, COLORS.pale, 0.07);
    grid.alpha = 0.9;
  }

  function layout(nextWidth: number, nextHeight: number) {
    width = nextWidth;
    height = nextHeight;
    const wideLayout = isWideLayout(width, height);
    const maxContentWidth = wideLayout ? 1040 : 680;
    const contentX = Math.max(20, (width - maxContentWidth) / 2);
    const contentWidth = Math.min(width - contentX * 2, maxContentWidth);
    const buttonWidth = Math.min(contentWidth, 350);
    const buttonY = Math.min(height - 118, Math.max(height * 0.65, height - 236));
    const titleSize = width < 600 ? 92 : wideLayout ? 126 : 108;
    const chineseSize = width < 600 ? 36 : wideLayout ? 50 : 42;
    const reticleSize = width < 600 ? 180 : wideLayout ? 300 : 260;
    buttonBaseY = buttonY;

    fitCover(backdrop, width / 2, height / 2, width, height);
    layer.origin.set(width / 2, height / 2);
    shade.clear().rect(0, 0, width, height).fill({ color: COLORS.night, alpha: 0.78 });
    drawGrid();
    rule.clear();
    rule.rect(contentX, height * 0.17, 1, height * 0.71).fill({ color: COLORS.pale, alpha: 0.18 });
    rule.rect(contentX + contentWidth, height * 0.17, 3, height * 0.71).fill({ color: COLORS.cyan, alpha: 0.86 });
    rule.rect(contentX + contentWidth, height * 0.17 + height * 0.71 * 0.58, 3, height * 0.08).fill({ color: COLORS.yellow, alpha: 0.9 });
    noise.clear();
    for (let lineY = 0; lineY < height; lineY += 7) noise.rect(0, lineY, width, 1).fill({ color: COLORS.pale, alpha: 0.07 });
    scan.clear().rect(contentX, height * 0.15, contentWidth, 1).fill({ color: COLORS.teal, alpha: 0.86 });
    topLine.clear().rect(contentX, 59, contentWidth, 1).fill({ color: COLORS.pale, alpha: 0.38 });
    topLine.rect(contentX + contentWidth * 0.71, 58, contentWidth * 0.29, 3).fill({ color: COLORS.cyan, alpha: 1 });
    bottomLine.clear().rect(contentX, height - 52, contentWidth, 1).fill({ color: COLORS.pale, alpha: 0.24 });
    mark.position.set(contentX + 15, 35);
    mark.anchor.set(0.5);
    mark.scale.set(29 / (mark.texture.width || 1), 25 / (mark.texture.height || 1));
    prts.position.set(contentX + 36, 21);
    sub.position.set(contentX + 36, 42);
    sequence.position.set(contentX + contentWidth - 49, 29);
    sequence.anchor.set(0.5);
    sequence.style.fill = COLORS.night;
    sequenceBg.clear().rect(contentX + contentWidth - 78, 17, 58, 24).fill({ color: COLORS.yellow, alpha: 1 });
    kicker.position.set(contentX, height * 0.27);
    title.position.set(contentX, height * 0.31);
    title.style.fontSize = titleSize;
    chinese.position.set(contentX, height * 0.31 + titleSize * 0.72 + 28);
    chinese.style.fontSize = chineseSize;
    intro.position.set(contentX + 12, height * 0.31 + titleSize * 0.72 + 82);
    intro.style.wordWrapWidth = Math.min(contentWidth * (wideLayout ? 0.48 : 0.68), wideLayout ? 400 : 340);
    button.position.set(contentX, buttonY);
    drawButton(contentX, buttonY, buttonWidth);
    optical.position.set(contentX + contentWidth - 30, height * 0.22);
    optical.rotation = Math.PI / 2;
    optical.alpha = 0.08;
    reticle.position.set(contentX + contentWidth - reticleSize * 0.18, height * 0.43);
    reticleBaseScale = reticleSize / 300;
    reticle.scale.set(reticleBaseScale);
    reticle.alpha = 0.82;
    drawReticle(300);
    footerLeft.position.set(contentX, height - 43);
    footerRight.position.set(contentX + contentWidth - 130, height - 43);
    bootCurtain.clear().rect(0, 0, width, height).fill({ color: COLORS.night, alpha: 1 });
    bootLine.clear();
    bootLine.rect(-contentWidth / 2, -1, contentWidth, 2).fill({ color: COLORS.teal, alpha: 0.92 });
    bootLine.rect(contentWidth * 0.21, -2, contentWidth * 0.14, 4).fill({ color: COLORS.yellow, alpha: 0.96 });
    bootLine.position.set(width / 2, height / 2);

    return { buttonX: contentX, buttonY, buttonWidth };
  }

  function finishBoot() {
    if (bootComplete) return;
    bootComplete = true;
    layer.alpha = 1;
    layer.scale.set(1);
    chrome.alpha = 1;
    chrome.y = 0;
    kicker.alpha = 1;
    title.alpha = 1;
    title.scale.set(1);
    chinese.alpha = 1;
    intro.alpha = 1;
    button.alpha = 1;
    button.y = buttonBaseY;
    reticle.alpha = 0.82;
    reticle.scale.set(reticleBaseScale);
    optical.alpha = 0.08;
    footerLeft.alpha = 1;
    footerRight.alpha = 1;
    bootCurtain.visible = false;
    bootLine.visible = false;
    onReady?.();
  }

  function applyBoot(elapsedMs: number) {
    const boot = getEntryBootState(elapsedMs);
    layer.alpha = 0.28 + boot.aperture * 0.72;
    layer.scale.set(1.02 - boot.aperture * 0.02, 0.018 + boot.aperture * 0.982);
    chrome.alpha = boot.chrome;
    chrome.y = 8 * (1 - boot.chrome);
    kicker.alpha = boot.title;
    title.alpha = boot.title;
    title.scale.set(0.96 + boot.title * 0.04);
    chinese.alpha = boot.title;
    intro.alpha = boot.action;
    button.alpha = boot.action;
    button.y = buttonBaseY + 14 * (1 - boot.action);
    reticle.alpha = 0.82 * boot.reticle;
    reticle.scale.set(reticleBaseScale * (0.72 + boot.reticle * 0.28));
    optical.alpha = 0.08 * boot.reticle;
    footerLeft.alpha = boot.action;
    footerRight.alpha = boot.action;
    bootCurtain.visible = true;
    bootCurtain.alpha = boot.curtain;
    bootLine.visible = boot.lineAlpha > 0;
    bootLine.alpha = boot.lineAlpha;
    bootLine.scale.x = boot.line;
    if (boot.complete) finishBoot();
  }

  function resetChrome() {
    chrome.alpha = 1;
    chrome.y = 0;
    reticle.scale.set(1);
    reticle.alpha = 0.82;
  }

  return {
    layer,
    bootCurtain,
    bootLine,
    layout,
    applyBoot,
    finishBoot,
    isBootComplete: () => bootComplete,
    show() {
      layer.visible = true;
      layer.alpha = 1;
      resetChrome();
    },
    prepareHandoff() {
      layer.visible = true;
      layer.alpha = 1;
      resetChrome();
    },
    applyHandoff(progress: number) {
      layer.alpha = 1 - progress;
      chrome.y = -28 * progress;
      chrome.alpha = 1 - progress;
      reticle.scale.set(1 + progress * 0.34);
      reticle.alpha = 0.82 * (1 - progress);
    },
    finishHandoff() {
      layer.visible = false;
      layer.alpha = 1;
      resetChrome();
    },
    tick(time: number) {
      scan.y = (time * 72) % Math.max(height, 1);
      reticleOuter.rotation = time * 0.08;
      reticleInner.rotation = -time * 0.12;
    },
  };
}
