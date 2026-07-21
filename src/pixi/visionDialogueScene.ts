import {
  Container,
  Graphics,
  Sprite,
  TextStyle,
} from 'pixi.js';
import type { Stage } from '../state';
import type { VisionSceneTextures } from './visionSceneAssets';
import { addText, drawPolygon } from './visionSceneGraphics';
import {
  COLORS,
  type DialogueSnapshot,
  type DialogueSpeaker,
} from './visionSceneModel';

type DialogueLine = {
  speaker: DialogueSpeaker;
  text: string;
};

type DialogueBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type DialogueCursor = {
  lineIndex: number;
  visibleCharacters: number;
  complete: boolean;
};

const SPEAKERS: Record<DialogueSpeaker, { name: string; code: string }> = {
  doctor: { name: '博士', code: 'DOCTOR // C-00' },
  amiya: { name: '阿米娅', code: 'AMIYA // R-01' },
  kaltsit: { name: '凯尔希', code: 'KALTSIT // M-01' },
  priestess: { name: '普瑞赛斯', code: 'SIGNAL // UNRESOLVED' },
};

const DIALOGUE_SCRIPT: Record<Stage, readonly DialogueLine[]> = {
  intro: [
    { speaker: 'amiya', text: '博士，医疗部的远距验光终端已经准备好了。' },
    { speaker: 'kaltsit', text: '仅开放视觉反馈权限。不会读取你的医疗档案。' },
    { speaker: 'amiya', text: '请注视中央的远处影像。看清房屋的轮廓就好。' },
    { speaker: 'doctor', text: '……清晰。开始吧。' },
  ],
  calibrate: [
    { speaker: 'kaltsit', text: '开始焦距校准。读数只作参考，以你的判断为准。' },
    { speaker: 'doctor', text: '房屋在清晰和模糊之间变化。' },
    { speaker: 'amiya', text: '我会记录每一次确认，博士。' },
    { speaker: 'kaltsit', text: '在轮廓最清晰处确认。' },
  ],
  drift: [
    { speaker: 'doctor', text: '影像偏离准星。房屋轮廓与定位点不再重合。' },
    { speaker: 'amiya', text: '等一下……信号里出现了第二组回波。' },
    { speaker: 'amiya', text: '这……这不在流程里。凯尔希医生，是设备的问题吗？' },
    { speaker: 'kaltsit', text: '不是故障。影像仍然稳定。阿米娅，记录时间和读数。' },
    { speaker: 'amiya', text: '可是那里面……有另一个轮廓。博士，它——它好像在看你。' },
    { speaker: 'kaltsit', text: '博士，继续操作，把影像拉回准星。' },
  ],
  reveal: [
    { speaker: 'amiya', text: '回收程序本应结束……不对，终端拒绝退出。' },
    { speaker: 'kaltsit', text: '有人正在改写回传权限。PRTS，保留本地记录。' },
    { speaker: 'doctor', text: '……影像变了。房屋后面——那不是背景，是另一处空间。' },
    { speaker: 'priestess', text: '不要关闭它，预言家。……这条通路，我走了很久才找到。' },
    { speaker: 'priestess', text: '你丢失了一些东西。我只是……想把它还给你。' },
    { speaker: 'amiya', text: '这个声音……你是，普瑞赛斯？你想对博士做什么？' },
    { speaker: 'kaltsit', text: '身份尚未确认。不要交出任何权限。博士，继续操作，保持连接。' },
    { speaker: 'doctor', text: '明白。……都别断开。我们看完它。' },
    { speaker: 'priestess', text: '下一次……我会亲口告诉你。你曾经是谁，你答应过我什么。' },
    { speaker: 'amiya', text: '不管博士忘记了什么……我都会陪在博士身边。这一点，不会改变。' },
    { speaker: 'kaltsit', text: '记录保存。博士，断开通道连接。' },
  ],
};

const TYPE_INTERVALS: Record<DialogueSpeaker, number> = {
  doctor: 0.032,
  amiya: 0.036,
  kaltsit: 0.03,
  priestess: 0.058,
};

export function advanceDialogueCursor(cursor: DialogueCursor, lineLength: number, lineCount: number): DialogueCursor {
  if (cursor.complete) return cursor;
  if (cursor.visibleCharacters < lineLength) return { ...cursor, visibleCharacters: lineLength };
  if (cursor.lineIndex < lineCount - 1) return { lineIndex: cursor.lineIndex + 1, visibleCharacters: 0, complete: false };
  return { ...cursor, complete: true };
}

export function createVisionDialogueScene(textures: VisionSceneTextures, initialReducedMotion: boolean) {
  const layer = new Container({ label: 'dialogue-scene' });
  const panelShadow = new Graphics();
  const panel = new Graphics();
  const panelGrid = new Graphics();
  const panelAccent = new Graphics();
  const scanline = new Graphics();
  const portraitCyan = new Sprite(textures.dialogueAmiya);
  const portraitRed = new Sprite(textures.dialogueAmiya);
  const portrait = new Sprite(textures.dialogueAmiya);
  const speakerTag = new Graphics();
  const speakerName = addText('阿米娅', new TextStyle({
    fill: COLORS.night,
    fontFamily: "SourceHan, 'Noto Sans SC', sans-serif",
    fontSize: 13,
    fontWeight: '700',
  }));
  const speakerCode = addText('AMIYA // R-01', new TextStyle({
    fill: COLORS.teal,
    fontFamily: 'Bender, sans-serif',
    fontSize: 8,
    letterSpacing: 1.1,
  }));
  const dialogueText = addText('', new TextStyle({
    fill: COLORS.pale,
    fontFamily: "SourceHan, 'Noto Sans SC', sans-serif",
    fontSize: 16,
    lineHeight: 23,
    wordWrap: true,
    breakWords: true,
  }));
  const lineCounter = addText('01 / 03', new TextStyle({
    fill: 0x7d8d8a,
    fontFamily: 'Bender, sans-serif',
    fontSize: 8,
    letterSpacing: 1.2,
  }));
  const footer = addText('FICTIONAL VISUAL EFFECT / NOT A MEDICAL TEST', new TextStyle({
    fill: 0x71817e,
    fontFamily: 'Bender, sans-serif',
    fontSize: 7,
    letterSpacing: 0.9,
  }));
  const continueMark = new Graphics();

  layer.addChild(
    panelShadow,
    panel,
    panelGrid,
    panelAccent,
    scanline,
    portraitCyan,
    portraitRed,
    portrait,
    speakerTag,
    speakerName,
    speakerCode,
    dialogueText,
    lineCounter,
    footer,
    continueMark,
  );

  for (const sprite of [portraitCyan, portraitRed, portrait]) {
    sprite.anchor.set(0.5, 1);
    sprite.roundPixels = true;
  }
  portraitCyan.blendMode = 'screen';
  portraitRed.blendMode = 'screen';
  portraitCyan.tint = COLORS.cyan;
  portraitRed.tint = COLORS.red;

  let stage: Stage = 'intro';
  let cursor: DialogueCursor = { lineIndex: 0, visibleCharacters: 0, complete: false };
  let currentReducedMotion = initialReducedMotion;
  let characters: string[] = [];
  let active = false;
  let dismissing = false;
  let lastTime = 0;
  let lineElapsed = 0;
  let typeElapsed = 0;
  let dismissElapsed = 0;
  let portraitScale = 1;
  let portraitY = 0;
  let bounds: DialogueBounds = { left: 20, top: 640, width: 350, height: 176 };

  function lines() {
    return DIALOGUE_SCRIPT[stage];
  }

  function line() {
    return lines()[cursor.lineIndex];
  }

  function snapshot(): DialogueSnapshot {
    const currentLine = line();
    return {
      speaker: currentLine.speaker,
      speakerName: SPEAKERS[currentLine.speaker].name,
      text: currentLine.text,
      lineIndex: cursor.lineIndex,
      lineCount: lines().length,
      complete: cursor.complete,
    };
  }

  function updateVisibleText() {
    dialogueText.text = characters.slice(0, cursor.visibleCharacters).join('');
  }

  function setPortrait(speaker: DialogueSpeaker) {
    const texture = {
      doctor: textures.dialogueDoctor,
      amiya: textures.dialogueAmiya,
      kaltsit: textures.dialogueKaltsit,
      priestess: textures.dialoguePriestess,
    }[speaker];
    portrait.texture = texture;
    portraitCyan.texture = texture;
    portraitRed.texture = texture;
  }

  function applyLine() {
    const currentLine = line();
    const speaker = SPEAKERS[currentLine.speaker];
    characters = Array.from(currentLine.text);
    cursor.visibleCharacters = currentReducedMotion ? characters.length : 0;
    speakerName.text = speaker.name;
    speakerCode.text = speaker.code;
    lineCounter.text = `${String(cursor.lineIndex + 1).padStart(2, '0')} / ${String(lines().length).padStart(2, '0')}`;
    setPortrait(currentLine.speaker);
    updateVisibleText();
    lineElapsed = 0;
    typeElapsed = 0;
    layout(bounds);
  }

  function drawPanel() {
    const { left, top, width, height } = bounds;
    const right = left + width;
    const bottom = top + height;
    const points: Array<[number, number]> = [
      [left + 14, top],
      [right - 22, top],
      [right, top + 22],
      [right, bottom],
      [left + 18, bottom],
      [left, bottom - 18],
      [left, top + 14],
    ];
    const shadowPoints = points.map(([x, y]) => [x + 7, y + 8] as [number, number]);
    const accent = stage === 'drift' ? COLORS.red : stage === 'reveal' ? COLORS.originiumSoft : COLORS.cyan;

    panelShadow.clear();
    drawPolygon(panelShadow, shadowPoints, COLORS.shadow, 0.46);
    panel.clear();
    drawPolygon(panel, points, COLORS.night, stage === 'reveal' ? 0.97 : 0.94);
    panel.stroke({ width: 1, color: stage === 'reveal' ? COLORS.originiumSoft : COLORS.pale, alpha: 0.58 });
    panelAccent.clear().rect(left + 14, top, Math.max(width * 0.42, 80), 4).fill({ color: accent, alpha: 1 });
    panelAccent.rect(right - 7, top + 27, 7, Math.max(height - 27, 1)).fill({ color: accent, alpha: 0.62 });

    panelGrid.clear();
    for (let x = left + 18; x < right - 18; x += 18) {
      panelGrid.rect(x, top + 5, 1, height - 10).fill({ color: COLORS.teal, alpha: 0.025 });
    }
    for (let y = top + 17; y < bottom - 8; y += 17) {
      panelGrid.rect(left + 6, y, width - 12, 1).fill({ color: COLORS.teal, alpha: 0.025 });
    }
    scanline.clear().rect(left + 7, top + 6, width - 14, 2).fill({ color: accent, alpha: 0.12 });
  }

  function layout(nextBounds: DialogueBounds) {
    bounds = nextBounds;
    const { left, top, width, height } = bounds;
    const portraitHeight = Math.min(height * 1.42, width >= 360 ? 248 : 226);
    portraitScale = portraitHeight / Math.max(portrait.texture.height, 1);
    portraitY = top + height - 5;
    const portraitX = left + width - Math.min(width * 0.2, 72);
    const portraitSpace = Math.min(width * 0.37, 138);
    const textX = left + 16;
    const textWidth = Math.max(width - portraitSpace - 32, 116);
    const compact = width < 320 || height <= 155;
    const nameY = top + 17;
    const bodyY = top + (compact ? 52 : 58);

    drawPanel();
    portrait.position.set(portraitX, portraitY);
    portraitCyan.position.set(portraitX - 3, portraitY + 1);
    portraitRed.position.set(portraitX + 3, portraitY - 1);
    portrait.scale.set(portraitScale);
    portraitCyan.scale.set(portraitScale);
    portraitRed.scale.set(portraitScale);

    speakerTag.clear();
    drawPolygon(speakerTag, [
      [textX, nameY - 3],
      [textX + 64, nameY - 3],
      [textX + 72, nameY + 5],
      [textX + 64, nameY + 24],
      [textX, nameY + 24],
    ], stage === 'drift' ? COLORS.red : COLORS.teal, 1);
    speakerName.position.set(textX + 10, nameY + 2);
    speakerCode.position.set(textX + 82, nameY + 4);
    dialogueText.position.set(textX, bodyY);
    dialogueText.style.fontSize = compact ? 14 : 16;
    dialogueText.style.lineHeight = compact ? 20 : 23;
    dialogueText.style.wordWrapWidth = textWidth;
    lineCounter.anchor.set(1, 0);
    lineCounter.position.set(left + width - 12, top + 10);
    footer.position.set(textX, top + height - 17);

    continueMark.clear();
    const markX = textX + textWidth - 10;
    const markY = top + height - 31;
    continueMark.moveTo(markX, markY).lineTo(markX + 9, markY).lineTo(markX + 4.5, markY + 7).closePath().fill({ color: COLORS.teal, alpha: 1 });
  }

  function selectStage(nextStage: Stage) {
    stage = nextStage;
    cursor = { lineIndex: 0, visibleCharacters: 0, complete: false };
    active = false;
    dismissing = false;
    layer.visible = false;
    layer.alpha = 1;
    lastTime = 0;
    applyLine();
  }

  function start() {
    active = true;
    dismissing = false;
    layer.visible = true;
    layer.alpha = 1;
    lastTime = 0;
    lineElapsed = 0;
    typeElapsed = 0;
    if (currentReducedMotion) {
      cursor.visibleCharacters = characters.length;
      updateVisibleText();
    }
  }

  function advance() {
    if (!active) return snapshot();
    const previousLine = cursor.lineIndex;
    cursor = advanceDialogueCursor(cursor, characters.length, lines().length);
    if (cursor.lineIndex !== previousLine) {
      applyLine();
    } else {
      updateVisibleText();
    }

    if (cursor.complete) {
      active = false;
      dismissing = true;
      dismissElapsed = 0;
      continueMark.visible = false;
      if (currentReducedMotion) layer.visible = false;
    }
    return snapshot();
  }

  function setReducedMotion(reducedMotion: boolean) {
    currentReducedMotion = reducedMotion;
    lastTime = 0;
    if (reducedMotion && active) {
      cursor.visibleCharacters = characters.length;
      updateVisibleText();
      portrait.alpha = 1;
      portraitCyan.alpha = 0;
      portraitRed.alpha = 0;
      scanline.alpha = 0.08;
      continueMark.alpha = 1;
    }
  }

  function tick(time: number) {
    if (!layer.visible) return;
    const delta = lastTime === 0 ? 0 : Math.min(Math.max(time - lastTime, 0), 0.1);
    lastTime = time;

    if (dismissing) {
      dismissElapsed += delta;
      layer.alpha = Math.max(1 - dismissElapsed / 0.18, 0);
      if (layer.alpha === 0) layer.visible = false;
      return;
    }

    lineElapsed += delta;
    const currentSpeaker = line().speaker;
    const isPriestess = currentSpeaker === 'priestess';
    const typeInterval = TYPE_INTERVALS[currentSpeaker];
    if (active && !currentReducedMotion && cursor.visibleCharacters < characters.length) {
      typeElapsed += delta;
      const nextCount = Math.min(characters.length, cursor.visibleCharacters + Math.floor(typeElapsed / typeInterval));
      if (nextCount !== cursor.visibleCharacters) {
        typeElapsed %= typeInterval;
        cursor.visibleCharacters = nextCount;
        updateVisibleText();
      }
    }

    if (currentReducedMotion) return;
    const enter = Math.min(lineElapsed / 0.22, 1);
    const eased = 1 - Math.pow(1 - enter, 3);
    const bob = Math.sin(time * 2.2) * 1.2;
    const aberration = isPriestess ? 7 : stage === 'drift' ? 5 : 3;
    const signalJitter = isPriestess ? Math.sin(time * 31) * 1.2 : 0;
    portrait.y = portraitY + bob;
    portrait.alpha = isPriestess ? eased * (0.9 + Math.sin(time * 17) * 0.1) : eased;
    portrait.scale.set(portraitScale * (0.95 + eased * 0.05));
    portraitCyan.position.set(portrait.x - aberration - (1 - eased) * 5 + signalJitter, portraitY + 1 + bob);
    portraitRed.position.set(portrait.x + aberration + (1 - eased) * 5 - signalJitter, portraitY - 1 + bob);
    portraitCyan.scale.set(portrait.scale.x);
    portraitRed.scale.set(portrait.scale.x);
    portraitCyan.alpha = 0.06 + Math.abs(Math.sin(time * 3.1)) * 0.09;
    portraitRed.alpha = 0.04 + Math.abs(Math.cos(time * 2.7)) * 0.07;
    scanline.y = (time * 34) % Math.max(bounds.height - 8, 1);
    continueMark.visible = cursor.visibleCharacters >= characters.length;
    continueMark.alpha = 0.42 + Math.abs(Math.sin(time * 3.8)) * 0.58;
  }

  selectStage('intro');

  return {
    layer,
    layout,
    selectStage,
    start,
    advance,
    getSnapshot: snapshot,
    setReducedMotion,
    tick,
  };
}
