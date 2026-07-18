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
  intro: { code: '01 / 04', index: '01', signal: 'SIGNAL / STABLE' },
  calibrate: { code: '02 / 04', index: '02', signal: 'SIGNAL / CALIBRATING' },
  drift: { code: '03 / 04', index: '03', signal: 'SIGNAL / DUAL' },
  reveal: { code: '04 / 04', index: '04', signal: 'SIGNAL / RETURNED' },
};

export const STAGE_ACCENTS: Record<Stage, number> = {
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

export function getCopyHeight(height: number, reveal: boolean) {
  if (reveal) return height <= 860 ? 140 : 180;
  if (height <= 700) return 98;
  if (height <= 860) return 110;
  return 154;
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

export type PixiVisionScene = {
  setStarted: (started: boolean, onComplete?: () => void) => void;
  setStage: (stage: Stage) => void;
  setMuted: (muted: boolean) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  reset: () => void;
  destroy: () => void;
};
