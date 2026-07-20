import type { Stage } from '../state';

export const COLORS = {
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
  // Originium amber — pale gold used by PRTS crystal debris / core marks
  originium: 0xf0d878,
  originiumSoft: 0xe8c86a,
  originiumDeep: 0xc9a84a,
  shadow: 0x080c0e,
};

export const STAGE_META: Record<Stage, { code: string; index: string; signal: string }> = {
  intro: { code: '01 / 04', index: '01', signal: 'TRACE RI-07 / STABLE' },
  calibrate: { code: '02 / 04', index: '02', signal: 'TRACE RI-07 / ALIGN' },
  drift: { code: '03 / 04', index: '03', signal: 'TRACE RI-07 / DUAL' },
  reveal: { code: '04 / 04', index: '04', signal: 'TRACE RI-07 / RETURN' },
};

export const STAGE_ACCENTS: Record<Stage, number> = {
  intro: COLORS.cyan,
  calibrate: COLORS.cyan,
  drift: COLORS.red,
  reveal: COLORS.ice,
};

const STAGE_READY_TIME: Record<Stage, number> = {
  intro: 0,
  calibrate: 0,
  drift: 0.75,
  reveal: 0.9,
};

const CALIBRATION_CYCLE_TIME = 2.6;
const CALIBRATION_CLEAR_MAX = 0.2;
const DRIFT_ALIGNMENT_MAX = 0.055;

export function getStageReadyTime(stage: Stage, reducedMotion = false) {
  return reducedMotion ? 0 : STAGE_READY_TIME[stage];
}

export function getCalibrationBlurAmount(stageTime: number) {
  const cycle = Math.max(stageTime, 0) % CALIBRATION_CYCLE_TIME;
  return (Math.cos((cycle / CALIBRATION_CYCLE_TIME) * Math.PI * 2) + 1) / 2;
}

export function isCalibrationClear(stageTime: number) {
  return getCalibrationBlurAmount(stageTime) <= CALIBRATION_CLEAR_MAX;
}

export function isDriftAligned(offsetX: number, offsetY: number) {
  return Math.hypot(offsetX, offsetY) <= DRIFT_ALIGNMENT_MAX;
}

export function getInitialDriftOffset(random = Math.random) {
  const angle = random() * Math.PI * 2;
  const distance = 0.14 + random() * 0.08;
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
}

export function getRevealFractureKick(stageTime: number) {
  const fractureTime = stageTime - 1.8;
  if (fractureTime <= 0) return 0;
  if (Math.sin(fractureTime * 1.65) > 0.94) return -6;
  return Math.sin(fractureTime * 3.1) > 0.97 ? 4 : 0;
}

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

export function getCopyHeight(height: number, reveal: boolean) {
  if (height <= 700) return 150;
  if (height <= 860) return 176;
  return reveal ? 210 : 196;
}

export function isWideLayout(width: number, height: number) {
  return width >= 960 && height >= 700;
}

export function getSoundBarHeights(muted: boolean) {
  return muted ? [2, 2, 2] : [5, 12, 8];
}

export type SceneOptions = {
  host: HTMLElement;
  reducedMotion: boolean;
  onEntryReady?: () => void;
};

export type DialogueSpeaker = 'doctor' | 'amiya' | 'kaltsit' | 'priestess';

export type DialogueSnapshot = {
  speaker: DialogueSpeaker;
  speakerName: string;
  text: string;
  lineIndex: number;
  lineCount: number;
  complete: boolean;
};

export type PixiVisionScene = {
  setStarted: (started: boolean, onComplete?: () => void) => void;
  setStage: (stage: Stage, onReady?: () => void) => void;
  confirmCalibration: (bypassTiming?: boolean) => boolean;
  moveDriftBy: (deltaX: number, deltaY: number) => void;
  confirmDrift: (bypassAlignment?: boolean) => boolean;
  advanceDialogue: () => DialogueSnapshot;
  getDialogueSnapshot: () => DialogueSnapshot;
  setMuted: (muted: boolean) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  reset: () => void;
  destroy: () => void;
};
