import gsap from 'gsap';
import particleAsset from '../../assets/particle.f4b76a4f.png';
import portraitAsset from '../../assets/prts-close.jpg';
import houseAsset from '../../assets/vision-house.jpg';
import {
  Application,
  Assets,
  BlurFilter,
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
  night: 0x080c0e,
  panel: 0x111719,
  ice: 0xedf2f1,
  teal: 0x9fe7ea,
  cyan: 0x00a7bd,
  red: 0xb5363d,
  paleRed: 0xf0c6c8,
  shadow: 0x020506,
};

const STAGE_CODES: Record<Stage, string> = {
  intro: '01 / 04  //  STABLE',
  calibrate: '02 / 04  //  CALIBRATING',
  drift: '03 / 04  //  DUAL',
  reveal: '04 / 04  //  RETURN',
};

const STAGE_ACCENTS: Record<Stage, number> = {
  intro: COLORS.teal,
  calibrate: 0xc6d8d5,
  drift: COLORS.red,
  reveal: COLORS.teal,
};

type SceneOptions = {
  host: HTMLElement;
  reducedMotion: boolean;
};

export type PixiVisionScene = {
  setStarted: (started: boolean) => void;
  setStage: (stage: Stage) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  reset: () => void;
  destroy: () => void;
};

function fitSprite(sprite: Sprite, width: number, height: number) {
  const textureWidth = sprite.texture.width || 1;
  const textureHeight = sprite.texture.height || 1;
  const scale = Math.max(width / textureWidth, height / textureHeight);

  sprite.anchor.set(0.5);
  sprite.scale.set(scale);
}

function drawDiamond(graphics: Graphics, size: number, fill?: number, alpha = 1) {
  graphics.clear();
  graphics
    .moveTo(0, -size)
    .lineTo(size, 0)
    .lineTo(0, size)
    .lineTo(-size, 0)
    .closePath();

  if (fill !== undefined) {
    graphics.fill({ color: fill, alpha });
  }
}

function drawDiamondHalf(graphics: Graphics, size: number, side: -1 | 1, color: number, alpha: number) {
  graphics.clear();
  graphics
    .moveTo(0, -size)
    .lineTo(side * size, 0)
    .lineTo(0, size)
    .stroke({ width: 7, color, alpha });
}

function addText(text: string, style: TextStyle) {
  const node = new Text({ text, style });
  node.roundPixels = true;
  return node;
}

export async function createPixiVisionScene({ host, reducedMotion: initialReducedMotion }: SceneOptions) {
  const app = new Application();
  await app.init({
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0,
    preference: 'webgl',
    resolution: Math.min(window.devicePixelRatio || 1, 1.5),
    resizeTo: host,
  });

  host.appendChild(app.canvas);
  app.canvas.setAttribute('aria-hidden', 'true');

  let houseTexture: Texture;
  let portraitTexture: Texture;
  let particleTexture: Texture;

  try {
    [houseTexture, portraitTexture, particleTexture] = await Promise.all([
      Assets.load<Texture>(houseAsset),
      Assets.load<Texture>(portraitAsset),
      Assets.load<Texture>(particleAsset),
    ]);
  } catch (error) {
    const canvas = app.canvas;
    app.destroy({ removeView: true }, { children: true });
    if (host.contains(canvas)) host.removeChild(canvas);
    throw error;
  }

  const background = new Graphics();
  const grid = new Graphics();
  const grain = new Graphics();
  const scanline = new Graphics();
  const particles = new Container();
  const entryLayer = new Container();
  const contentLayer = new Container();
  const typography = new Container();
  const visualLayer = new Container();
  const houseGroup = new Container();
  const revealGroup = new Container();
  const revealPortrait = new Container();
  const revealFrame = new Container();
  const glitchBars = new Graphics();
  const revealScan = new Graphics();
  const revealGlow = new Graphics();
  const leftHalf = new Graphics();
  const rightHalf = new Graphics();
  const leftEcho = new Graphics();
  const rightEcho = new Graphics();
  const glint = new Graphics();
  const portraitMask = new Graphics();
  const houseMask = new Graphics();
  const houseFrame = new Graphics();
  const reticle = new Graphics();
  const houseBase = new Sprite(houseTexture);
  const houseGlitch = new Sprite(houseTexture);
  const portrait = new Sprite(portraitTexture);
  const portraitBlur = new BlurFilter({ strength: 8 });
  const houseBlur = new BlurFilter({ strength: 0 });
  const houseNoise = new NoiseFilter({ noise: 0.08, seed: 0.15 });
  const frameBlur = new BlurFilter({ strength: 12 });

  const stageCode = addText(
    STAGE_CODES.intro,
    new TextStyle({
      fill: COLORS.ice,
      fontFamily: 'Bender, sans-serif',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 2.4,
    }),
  );
  const eyebrow = addText(
    'INTAKE / 远距辨认',
    new TextStyle({
      fill: COLORS.teal,
      fontFamily: 'Bender, Source Han Sans SC, sans-serif',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 2.2,
    }),
  );
  const title = addText(
    '请注视远处的房屋',
    new TextStyle({
      align: 'center',
      fill: COLORS.ice,
      fontFamily: 'Source Han Sans SC, sans-serif',
      fontSize: 27,
      fontWeight: '700',
      letterSpacing: 1.5,
      lineHeight: 38,
      wordWrap: true,
      wordWrapWidth: 360,
    }),
  );
  const note = addText(
    '保持手机距离，确认房屋轮廓',
    new TextStyle({
      align: 'center',
      fill: 0xb7c5c2,
      fontFamily: 'Source Han Sans SC, sans-serif',
      fontSize: 12,
      letterSpacing: 1,
      wordWrap: true,
      wordWrapWidth: 360,
    }),
  );
  const signal = addText(
    'SIGNAL / 00.4.04   //   OBSERVE BEFORE RESPONSE',
    new TextStyle({
      fill: 0x6e8583,
      fontFamily: 'Bender, sans-serif',
      fontSize: 8,
      letterSpacing: 1.8,
    }),
  );
  const entryTitle = addText(
    'ORIGINUM // DISTANCE SCREENING',
    new TextStyle({
      align: 'center',
      fill: COLORS.ice,
      fontFamily: 'Bender, sans-serif',
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: 2.5,
    }),
  );
  const entryNote = addText(
    'A PRTS VISUAL RECOVERY TERMINAL',
    new TextStyle({
      align: 'center',
      fill: COLORS.teal,
      fontFamily: 'Bender, sans-serif',
      fontSize: 10,
      letterSpacing: 2,
    }),
  );
  const entryHint = addText(
    'KEEP THE FRAME QUIET / THEN CONFIRM THE SIGNAL',
    new TextStyle({
      align: 'center',
      fill: 0x8aa19e,
      fontFamily: 'Bender, sans-serif',
      fontSize: 9,
      letterSpacing: 1.6,
    }),
  );

  app.stage.addChild(background, grid, grain, particles, entryLayer, contentLayer);
  contentLayer.addChild(visualLayer, typography, scanline);
  visualLayer.addChild(houseGroup, revealGroup);
  typography.addChild(stageCode, eyebrow, title, note, signal);
  entryLayer.addChild(entryTitle, entryNote, entryHint);

  houseGroup.addChild(houseMask, houseBase, houseGlitch, houseFrame, reticle);
  houseMask.renderable = false;
  houseGroup.mask = houseMask;
  houseBase.filters = [houseBlur, houseNoise];
  houseGlitch.alpha = 0.08;
  houseGlitch.tint = 0xff5665;

  revealPortrait.addChild(portraitMask, portrait);
  portraitMask.renderable = false;
  revealPortrait.mask = portraitMask;
  portrait.filters = [portraitBlur];

  revealFrame.addChild(revealGlow, leftEcho, rightEcho, leftHalf, rightHalf, glint, glitchBars, revealScan);
  revealGlow.filters = [frameBlur];
  revealGroup.addChild(revealPortrait, revealFrame);
  revealGroup.visible = false;
  revealPortrait.alpha = 0;
  revealFrame.alpha = 0;

  const particleNodes = Array.from({ length: 24 }, (_, index) => {
    const node = new Sprite(particleTexture);
    node.anchor.set(0.5);
    node.alpha = 0.08 + (index % 4) * 0.03;
    node.scale.set(0.018 + (index % 3) * 0.009);
    particles.addChild(node);
    return node;
  });

  let width = 1;
  let height = 1;
  let radius = 120;
  let currentStage: Stage = 'intro';
  let currentReducedMotion = initialReducedMotion;
  let timeline: gsap.core.Timeline | null = null;
  let time = 0;
  let destroyed = false;

  function drawGrid() {
    grid.clear();
    for (let x = 0; x <= width; x += 32) {
      grid.moveTo(x, 0).lineTo(x, height).stroke({ width: 1, color: 0x9bbdb9, alpha: 0.07 });
    }
    for (let y = 0; y <= height; y += 32) {
      grid.moveTo(0, y).lineTo(width, y).stroke({ width: 1, color: 0x9bbdb9, alpha: 0.07 });
    }
  }

  function drawGrain() {
    grain.clear();
    for (let index = 0; index < 110; index += 1) {
      const x = (index * 83) % Math.max(width, 1);
      const y = (index * 47) % Math.max(height, 1);
      const size = index % 3 === 0 ? 2 : 1;
      grain.rect(x, y, size, size).fill({ color: index % 5 === 0 ? COLORS.red : COLORS.ice, alpha: 0.035 });
    }
  }

  function drawHouse(radiusValue: number) {
    houseMask.clear().circle(0, 0, radiusValue).fill({ color: 0xffffff });
    houseFrame
      .clear()
      .circle(0, 0, radiusValue + 11)
      .stroke({ width: 1, color: 0xacc3bf, alpha: 0.35 })
      .circle(0, 0, radiusValue + 19)
      .stroke({ width: 1, color: COLORS.cyan, alpha: 0.16 });
    reticle
      .clear()
      .moveTo(-radiusValue - 34, 0)
      .lineTo(-radiusValue - 10, 0)
      .moveTo(radiusValue + 10, 0)
      .lineTo(radiusValue + 34, 0)
      .moveTo(0, -radiusValue - 34)
      .lineTo(0, -radiusValue - 10)
      .moveTo(0, radiusValue + 10)
      .lineTo(0, radiusValue + 34)
      .stroke({ width: 1, color: COLORS.ice, alpha: 0.48 });

    fitSprite(houseBase, radiusValue * 2.18, radiusValue * 2.18);
    fitSprite(houseGlitch, radiusValue * 2.18, radiusValue * 2.18);
  }

  function drawReveal(size: number) {
    drawDiamond(portraitMask, size, 0xffffff);
    drawDiamond(revealGlow, size + 4);
    revealGlow.stroke({ width: 18, color: COLORS.teal, alpha: 0.18 });
    drawDiamondHalf(leftHalf, size, -1, COLORS.ice, 0.96);
    drawDiamondHalf(rightHalf, size, 1, COLORS.ice, 0.96);
    drawDiamondHalf(leftEcho, size + 12, -1, COLORS.cyan, 0.48);
    drawDiamondHalf(rightEcho, size + 12, 1, COLORS.red, 0.38);

    glint
      .clear()
      .moveTo(-size * 0.74, -size * 0.74)
      .lineTo(0, -size)
      .lineTo(size * 0.74, -size * 0.74)
      .stroke({ width: 2, color: COLORS.ice, alpha: 0.9 });

    glitchBars.clear();
    for (let index = 0; index < 12; index += 1) {
      const y = -size + ((index * 19) % Math.max(size * 2, 1));
      const barWidth = size * (0.35 + (index % 4) * 0.12);
      glitchBars.rect(-barWidth / 2, y, barWidth, index % 3 === 0 ? 2 : 1).fill({
        color: index % 2 === 0 ? COLORS.cyan : COLORS.red,
        alpha: 0.22,
      });
    }

    revealScan
      .clear()
      .rect(-size * 0.72, -4, size * 1.44, 8)
      .fill({ color: COLORS.ice, alpha: 0.3 });
    fitSprite(portrait, size * 1.72, size * 1.72);
  }

  function layout() {
    width = Math.max(host.clientWidth, 1);
    height = Math.max(host.clientHeight, 1);
    radius = Math.min(width * 0.31, height * 0.19, 154);
    const visualY = Math.min(height * 0.46, height - 320);
    const revealSize = Math.min(width * 0.31, height * 0.22, 154);

    background
      .clear()
      .rect(0, 0, width, height)
      .fill({ color: currentStage === 'drift' ? 0x100c10 : COLORS.night });
    background
      .circle(width * 0.5, visualY, Math.max(radius * 2.1, 160))
      .fill({ color: currentStage === 'drift' ? COLORS.red : COLORS.cyan, alpha: currentStage === 'drift' ? 0.12 : 0.07 });
    background
      .circle(width * 0.5, visualY, Math.max(radius * 1.3, 100))
      .fill({ color: COLORS.panel, alpha: 0.28 });

    drawGrid();
    drawGrain();
    drawHouse(radius);
    drawReveal(revealSize);

    houseGroup.position.set(width * 0.5, visualY);
    revealGroup.position.set(width * 0.5, visualY);
    scanline.clear().rect(0, 0, width, 3).fill({ color: COLORS.ice, alpha: 0.08 });
    scanline.position.set(0, 0);

    stageCode.anchor.set(1, 0);
    stageCode.position.set(width - 20, 20);
    eyebrow.anchor.set(0.5, 0);
    eyebrow.position.set(width * 0.5, Math.max(62, height * 0.08));
    title.anchor.set(0.5, 0);
    title.style.wordWrapWidth = Math.min(width - 40, 460);
    title.position.set(width * 0.5, Math.max(66, height * 0.57));
    note.anchor.set(0.5, 0);
    note.style.wordWrapWidth = Math.min(width - 44, 420);
    note.position.set(width * 0.5, Math.max(110, height * 0.67));
    signal.position.set(20, height - 29);

    entryTitle.anchor.set(0.5);
    entryTitle.position.set(width * 0.5, height * 0.42);
    entryNote.anchor.set(0.5);
    entryNote.position.set(width * 0.5, height * 0.48);
    entryHint.anchor.set(0.5);
    entryHint.position.set(width * 0.5, height * 0.57);

    revealScan.position.set(0, 0);
    glitchBars.position.set(0, 0);
    particleNodes.forEach((node, index) => {
      node.position.set(
        width * (0.08 + ((index * 0.173) % 0.84)),
        height * (0.14 + ((index * 0.317) % 0.7)),
      );
    });
  }

  function updateCopy(stage: Stage) {
    const nextCopy = ({
      intro: { eyebrow: 'INTAKE / 远距辨认', title: '请注视远处的房屋', note: '保持手机距离，确认房屋轮廓' },
      calibrate: { eyebrow: 'CALIBRATE / 焦距校准', title: '焦距校准中', note: '画面会短暂失焦，请继续注视房屋' },
      drift: { eyebrow: 'ANOMALY / 视觉偏移', title: '房屋位置发生偏移', note: '视觉信号偏离基线，请不要移开视线' },
      reveal: { eyebrow: 'REVEAL / 影像回收', title: 'PRTS // 视觉回收完成', note: '你看到的，从来不止一层。' },
    }[stage]);

    eyebrow.text = nextCopy.eyebrow;
    title.text = nextCopy.title;
    note.text = nextCopy.note;
    stageCode.text = STAGE_CODES[stage];
    eyebrow.style.fill = STAGE_ACCENTS[stage];
  }

  function applyImmediate(stage: Stage) {
    const isReveal = stage === 'reveal';
    const isDrift = stage === 'drift';
    const isCalibrate = stage === 'calibrate';

    houseGroup.visible = !isReveal;
    revealGroup.visible = isReveal;
    houseBlur.strength = isCalibrate ? 3.5 : isDrift ? 1.8 : 0;
    houseNoise.noise = isDrift ? 0.16 : isCalibrate ? 0.08 : 0.04;
    houseBase.alpha = isDrift ? 0.72 : 1;
    houseBase.tint = isDrift ? 0xc9d5d1 : COLORS.ice;
    houseGlitch.alpha = isDrift ? 0.7 : isCalibrate ? 0.18 : 0.08;
    houseGroup.scale.set(isDrift ? 1.035 : 1);
    grid.alpha = isDrift ? 1.2 : 1;
    revealPortrait.alpha = isReveal ? 1 : 0;
    revealFrame.alpha = isReveal ? 1 : 0;
    revealPortrait.scale.set(1);
    revealFrame.scale.set(1);
    revealFrame.position.set(0, 0);
    leftHalf.x = 0;
    rightHalf.x = 0;
    leftEcho.x = 0;
    rightEcho.x = 0;
    revealScan.x = isReveal ? 0 : -260;
  }

  function setStage(stage: Stage) {
    currentStage = stage;
    updateCopy(stage);
    layout();
    timeline?.kill();
    timeline = null;

    if (currentReducedMotion) {
      applyImmediate(stage);
      return;
    }

    if (stage === 'reveal') {
      applyImmediate('intro');
      houseGroup.visible = false;
      revealGroup.visible = true;
      revealPortrait.alpha = 0;
      revealPortrait.scale.set(0.88);
      revealFrame.alpha = 0;
      revealFrame.scale.set(1.08);
      leftHalf.x = -42;
      rightHalf.x = 42;
      leftEcho.x = -58;
      rightEcho.x = 58;
      revealScan.x = -260;
      timeline = gsap.timeline({
        onComplete: () => {
          revealFrame.alpha = 1;
        },
      });
      timeline
        .to(revealPortrait, { alpha: 1, scale: 1, duration: 0.68, ease: 'power3.out' })
        .to(revealFrame, { alpha: 1, scale: 1, duration: 0.42, ease: 'power2.out' }, '<0.08')
        .to(leftHalf, { x: 0, duration: 0.34, ease: 'power3.inOut' }, '<0.02')
        .to(rightHalf, { x: 0, duration: 0.34, ease: 'power3.inOut' }, '<0.02')
        .to(leftEcho, { x: 0, duration: 0.4, ease: 'power2.out' }, '<')
        .to(rightEcho, { x: 0, duration: 0.4, ease: 'power2.out' }, '<')
        .to(revealScan, { x: 260, duration: 0.64, ease: 'power1.inOut' }, '<0.06');
      return;
    }

    applyImmediate(stage === 'drift' ? 'calibrate' : stage);
    timeline = gsap.timeline();
    timeline
      .to(houseBlur, { strength: stage === 'calibrate' ? 3.5 : stage === 'drift' ? 1.8 : 0, duration: 0.72, ease: 'power2.inOut' })
      .to(houseGroup.scale, { x: stage === 'drift' ? 1.035 : 1, y: stage === 'drift' ? 1.035 : 1, duration: 0.72, ease: 'power2.inOut' }, '<')
      .to(houseGlitch, { alpha: stage === 'drift' ? 0.7 : stage === 'calibrate' ? 0.18 : 0.08, duration: 0.4 }, '<');
  }

  function setStarted(started: boolean) {
    entryLayer.visible = !started;
    contentLayer.visible = started;
    if (started && !currentReducedMotion) {
      gsap.fromTo(contentLayer, { alpha: 0 }, { alpha: 1, duration: 0.6, ease: 'power2.out' });
    }
  }

  function setReducedMotion(reducedMotion: boolean) {
    currentReducedMotion = reducedMotion;
    timeline?.kill();
    timeline = null;
    if (reducedMotion) {
      app.ticker.stop();
      applyImmediate(currentStage);
    } else {
      app.ticker.start();
      setStage(currentStage);
    }
  }

  function reset() {
    setStage('intro');
  }

  function tick() {
    if (currentReducedMotion || destroyed) return;

    time += 0.016;
    scanline.y = (time * (currentStage === 'drift' ? 180 : 72)) % Math.max(height + 40, 1);
    particles.children.forEach((node, index) => {
      node.y += 0.12 + (index % 3) * 0.04;
      if (node.y > height + 8) node.y = -8;
    });

    if (currentStage === 'drift') {
      houseGlitch.x = Math.sin(time * 26) * 3.5;
      houseGlitch.y = Math.cos(time * 18) * 1.2;
      houseGlitch.skew.x = Math.sin(time * 14) * 0.018;
      glitchBars.alpha = 0.26 + Math.abs(Math.sin(time * 11)) * 0.24;
    } else {
      houseGlitch.x = 0;
      houseGlitch.y = 0;
      houseGlitch.skew.x = 0;
      glitchBars.alpha = currentStage === 'reveal' ? 0.12 : 0;
    }

    houseNoise.seed = (time * 0.17) % 1;
    if (currentStage === 'reveal') {
      revealFrame.rotation = Math.sin(time * 0.8) * 0.004;
      glint.alpha = 0.42 + Math.abs(Math.sin(time * 1.7)) * 0.42;
      revealScan.alpha = 0.12 + Math.abs(Math.sin(time * 2.2)) * 0.14;
    }
  }

  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(host);
  app.ticker.add(tick);
  layout();
  setStage('intro');
  setStarted(false);
  if (currentReducedMotion) app.ticker.stop();

  return {
    setStarted,
    setStage,
    setReducedMotion,
    reset,
    destroy() {
      destroyed = true;
      timeline?.kill();
      resizeObserver.disconnect();
      app.ticker.remove(tick);
      app.ticker.stop();
      const canvas = app.canvas;
      app.destroy({ removeView: true }, { children: true });
      if (host.contains(canvas)) host.removeChild(canvas);
    },
  } satisfies PixiVisionScene;
}
