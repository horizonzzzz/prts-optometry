import {
  Container,
  Graphics,
  TextStyle,
} from 'pixi.js';
import { getStageCopyForStage, type Stage } from '../state';
import { addText, drawPolygon } from './visionSceneGraphics';
import { COLORS, STAGE_META } from './visionSceneModel';

export type OperationFeedbackTone = 'idle' | 'warning' | 'success' | 'error';

export type OperationFeedback = {
  message: string;
  tone: OperationFeedbackTone;
};

type OperationPanelBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const DEFAULT_STATUS: Record<Stage, OperationFeedback> = {
  intro: { message: '等待操作 / INPUT REQUIRED', tone: 'idle' },
  calibrate: { message: '焦距窗口活动中 / FOCUS READY', tone: 'idle' },
  drift: { message: '检测到异常信号 / SIGNAL ANOMALY', tone: 'warning' },
  reveal: { message: '■ ■ ■ / O%k$*L42(%', tone: 'warning' },
};

export function getOperationPanelContent(stage: Stage, feedback?: OperationFeedback) {
  const copy = getStageCopyForStage(stage);
  const status = feedback ?? DEFAULT_STATUS[stage];
  return {
    header: stage === 'reveal' ? 'PRTS // LOCAL RECORD' : 'PRTS // OPERATOR CONTROL',
    code: STAGE_META[stage].code,
    title: stage === 'reveal' ? copy.title : copy.actionLabel,
    note: stage === 'reveal' ? '记录未结束。可接入通讯终端或重新校准。' : copy.note,
    status: status.message,
    tone: status.tone,
  };
}

export function createVisionOperationPanel() {
  const layer = new Container({ label: 'operation-panel' });
  const shadow = new Graphics();
  const panel = new Graphics();
  const grid = new Graphics();
  const accent = new Graphics();
  const statusBand = new Graphics();
  const statusMark = new Graphics();
  const header = addText('PRTS // OPERATOR CONTROL', new TextStyle({
    fill: COLORS.muted,
    fontFamily: 'Bender, sans-serif',
    fontSize: 14,
    fontWeight: '700',
  }));
  const stageCode = addText('01 / 04', new TextStyle({
    fill: COLORS.muted,
    fontFamily: 'Bender, sans-serif',
    fontSize: 14,
    fontWeight: '700',
  }));
  const disclaimer = addText('FICTIONAL EFFECT // 非医疗测试', new TextStyle({
    fill: COLORS.muted,
    fontFamily: "Bender, SourceHan, 'Noto Sans SC', sans-serif",
    fontSize: 14,
  }));
  const title = addText('', new TextStyle({
    fill: COLORS.graphite,
    fontFamily: "SourceHan, 'Noto Sans SC', sans-serif",
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    wordWrap: true,
    breakWords: true,
  }));
  const note = addText('', new TextStyle({
    fill: COLORS.muted,
    fontFamily: "SourceHan, 'Noto Sans SC', sans-serif",
    fontSize: 14,
    lineHeight: 18,
    wordWrap: true,
    breakWords: true,
  }));
  const statusText = addText('', new TextStyle({
    fill: COLORS.graphite,
    fontFamily: "Bender, SourceHan, 'Noto Sans SC', sans-serif",
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 17,
    wordWrap: true,
    breakWords: true,
  }));
  const watermark = addText('01', new TextStyle({
    fill: COLORS.graphite,
    fontFamily: 'Novecento, Bender, sans-serif',
    fontSize: 88,
    fontWeight: '700',
  }));

  layer.addChild(
    shadow,
    panel,
    grid,
    watermark,
    accent,
    statusBand,
    statusMark,
    header,
    stageCode,
    disclaimer,
    title,
    note,
    statusText,
  );

  let stage: Stage = 'intro';
  let feedback: OperationFeedback | undefined;
  let bounds: OperationPanelBounds = { left: 20, top: 640, width: 350, height: 176 };

  function toneColor(tone: OperationFeedbackTone) {
    if (tone === 'error') return COLORS.red;
    if (tone === 'success') return COLORS.cyan;
    if (tone === 'warning') return stage === 'reveal' ? COLORS.originiumSoft : COLORS.red;
    return COLORS.cyan;
  }

  function updateText() {
    const content = getOperationPanelContent(stage, feedback);
    header.text = content.header;
    stageCode.text = content.code;
    title.text = content.title;
    note.text = content.note;
    statusText.text = content.status;
    watermark.text = STAGE_META[stage].index;
  }

  function drawStatus(left: number, top: number, width: number, height: number, dark: boolean) {
    const tone = getOperationPanelContent(stage, feedback).tone;
    const color = toneColor(tone);
    const points: Array<[number, number]> = [
      [left + 8, top],
      [left + width, top],
      [left + width - 8, top + height],
      [left, top + height],
      [left, top + 8],
    ];
    drawPolygon(statusBand, points, color, dark ? 0.16 : 0.1);
    statusBand.stroke({ width: 1, color, alpha: 0.64 });

    const markX = left + 14;
    const markY = top + height / 2;
    statusMark.clear();
    if (tone === 'error' || tone === 'warning') {
      statusMark.moveTo(markX, markY - 6).lineTo(markX + 6, markY + 5).lineTo(markX - 6, markY + 5).closePath().fill({ color, alpha: 1 });
    } else if (tone === 'success') {
      statusMark.moveTo(markX, markY - 6).lineTo(markX + 6, markY).lineTo(markX, markY + 6).lineTo(markX - 6, markY).closePath().fill({ color, alpha: 1 });
    } else {
      statusMark.rect(markX - 5, markY - 5, 10, 10).fill({ color, alpha: 1 });
    }
  }

  function layout(nextBounds: OperationPanelBounds) {
    bounds = nextBounds;
    updateText();
    const { left, top, width, height } = bounds;
    const right = left + width;
    const bottom = top + height;
    const dark = stage === 'drift' || stage === 'reveal';
    const compact = width < 320 || height <= 155;
    const tall = height >= 220;
    const primary = dark ? COLORS.pale : COLORS.graphite;
    const secondary = dark ? 0xa9b6b3 : COLORS.muted;
    const panelAccent = stage === 'drift' ? COLORS.red : stage === 'reveal' ? COLORS.originiumSoft : COLORS.cyan;
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

    drawPolygon(shadow, shadowPoints, COLORS.shadow, 0.32);
    drawPolygon(panel, points, dark ? COLORS.night : 0xf5f7f6, dark ? 0.96 : 0.92);
    panel.stroke({ width: 1, color: dark ? COLORS.pale : COLORS.graphite, alpha: dark ? 0.58 : 0.82 });
    accent.clear().rect(left + 14, top, Math.max(width * 0.44, 96), 4).fill({ color: panelAccent, alpha: 1 });
    accent.rect(right - 7, top + 27, 7, Math.max(height - 27, 1)).fill({ color: panelAccent, alpha: 0.64 });

    grid.clear();
    for (let x = left + 18; x < right - 18; x += 22) {
      grid.rect(x, top + 6, 1, height - 12).fill({ color: dark ? COLORS.teal : COLORS.graphite, alpha: dark ? 0.025 : 0.03 });
    }
    for (let y = top + 18; y < bottom - 10; y += 22) {
      grid.rect(left + 7, y, width - 14, 1).fill({ color: dark ? COLORS.teal : COLORS.graphite, alpha: dark ? 0.025 : 0.03 });
    }

    header.style.fill = secondary;
    stageCode.style.fill = panelAccent;
    disclaimer.style.fill = secondary;
    title.style.fill = primary;
    note.style.fill = secondary;
    statusText.style.fill = primary;
    title.style.fontSize = compact ? 18 : 20;
    title.style.lineHeight = compact ? 22 : 24;
    title.style.wordWrapWidth = width - 32;
    note.style.wordWrapWidth = width - 32;
    statusText.style.wordWrapWidth = width - 58;

    const headerY = top + (tall ? 18 : 13);
    header.position.set(left + 16, headerY);
    stageCode.anchor.set(1, 0);
    stageCode.position.set(right - 14, headerY);
    disclaimer.position.set(left + 16, headerY + 21);
    title.position.set(left + 16, top + (tall ? 72 : compact ? 49 : 53));
    note.position.set(left + 16, top + (tall ? 108 : compact ? 75 : 82));

    const revealStatusVisible = stage !== 'reveal' || height > 155;
    const statusHeight = stage === 'reveal' && !tall ? 22 : compact ? 24 : 28;
    const statusY = stage === 'reveal'
      ? tall ? bottom - 92 : bottom - statusHeight - 56
      : bottom - statusHeight - 18;
    statusBand.visible = revealStatusVisible;
    statusMark.visible = revealStatusVisible;
    statusText.visible = revealStatusVisible;
    if (revealStatusVisible) {
      drawStatus(left + 14, statusY, width - 28, statusHeight, dark);
      statusText.position.set(left + 39, statusY + (statusHeight - 17) / 2);
    }

    watermark.visible = tall;
    watermark.style.fill = primary;
    watermark.alpha = dark ? 0.08 : 0.055;
    watermark.anchor.set(1, 1);
    watermark.position.set(right - 18, bottom - 54);
  }

  function selectStage(nextStage: Stage) {
    stage = nextStage;
    feedback = undefined;
    layer.visible = false;
    layer.alpha = 1;
    layout(bounds);
  }

  function setFeedback(message: string, tone: OperationFeedbackTone) {
    feedback = { message, tone };
    layout(bounds);
  }

  function clearFeedback() {
    if (!feedback) return;
    feedback = undefined;
    layout(bounds);
  }

  selectStage('intro');

  return {
    layer,
    layout,
    selectStage,
    show() {
      layer.visible = true;
      layer.alpha = 1;
    },
    setFeedback,
    clearFeedback,
  };
}
