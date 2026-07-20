import { describe, expect, it } from 'vitest';
import { getCalibrationBlurAmount, getCopyHeight, getEntryBootState, getRevealFractureKick, getSoundBarHeights, getStageReadyTime, isCalibrationClear, isDriftAligned, isWideLayout } from './createPixiVisionScene';
import { getInitialDriftOffset } from './visionSceneModel';
import { advanceDialogueCursor } from './visionDialogueScene';

describe('getCopyHeight', () => {
  it('keeps the Pixi copy block aligned with the responsive DOM layout', () => {
    expect(getCopyHeight(568, false)).toBe(150);
    expect(getCopyHeight(844, false)).toBe(176);
    expect(getCopyHeight(900, false)).toBe(196);
    expect(getCopyHeight(568, true)).toBe(150);
    expect(getCopyHeight(900, true)).toBe(210);
  });
});

describe('dialogue progression', () => {
  it('reveals the current line before advancing and unlocks after the final line', () => {
    let cursor = { lineIndex: 0, visibleCharacters: 2, complete: false };

    cursor = advanceDialogueCursor(cursor, 5, 3);
    expect(cursor).toEqual({ lineIndex: 0, visibleCharacters: 5, complete: false });

    cursor = advanceDialogueCursor(cursor, 5, 3);
    expect(cursor).toEqual({ lineIndex: 1, visibleCharacters: 0, complete: false });

    cursor = advanceDialogueCursor({ ...cursor, visibleCharacters: 4 }, 4, 3);
    expect(cursor).toEqual({ lineIndex: 2, visibleCharacters: 0, complete: false });

    cursor = advanceDialogueCursor({ ...cursor, visibleCharacters: 6 }, 6, 3);
    expect(cursor).toEqual({ lineIndex: 2, visibleCharacters: 6, complete: true });
  });
});

describe('isWideLayout', () => {
  it('uses two columns only when both dimensions can support them', () => {
    expect(isWideLayout(1440, 900)).toBe(true);
    expect(isWideLayout(390, 844)).toBe(false);
    expect(isWideLayout(1440, 640)).toBe(false);
  });
});

describe('getEntryBootState', () => {
  it('sequences the terminal aperture before its title and controls', () => {
    expect(getEntryBootState(0)).toMatchObject({ aperture: 0, chrome: 0, title: 0, action: 0, complete: false });
    expect(getEntryBootState(500).aperture).toBeGreaterThan(0.99);
    expect(getEntryBootState(500).title).toBeGreaterThan(0);
    expect(getEntryBootState(500).action).toBe(0);
    expect(getEntryBootState(1080)).toMatchObject({ aperture: 1, chrome: 1, title: 1, action: 1, complete: true });
  });
});

describe('getSoundBarHeights', () => {
  it('maps the audio state to the three stable meter bars', () => {
    expect(getSoundBarHeights(false)).toEqual([5, 12, 8]);
    expect(getSoundBarHeights(true)).toEqual([2, 2, 2]);
  });
});

describe('getStageReadyTime', () => {
  it('holds each animated stage until its key feedback is visible', () => {
    expect(getStageReadyTime('intro')).toBe(0);
    expect(getStageReadyTime('calibrate')).toBe(0);
    expect(getStageReadyTime('drift')).toBe(0.75);
    expect(getStageReadyTime('reveal')).toBe(0.9);
    expect(getStageReadyTime('reveal', true)).toBe(0);
  });
});

describe('calibration focus cycle', () => {
  it('opens a forgiving clear window around the middle of each cycle', () => {
    expect(getCalibrationBlurAmount(0)).toBe(1);
    expect(getCalibrationBlurAmount(1.3)).toBe(0);
    expect(getCalibrationBlurAmount(2.6)).toBe(1);
    expect(isCalibrationClear(0.9)).toBe(false);
    expect(isCalibrationClear(1.3)).toBe(true);
  });
});

describe('drift alignment', () => {
  it('accepts a forgiving center radius without accepting a diagonal near miss', () => {
    expect(isDriftAligned(0, 0)).toBe(true);
    expect(isDriftAligned(0.03, 0.03)).toBe(true);
    expect(isDriftAligned(0.04, 0.04)).toBe(false);
  });
});

describe('initial drift offset', () => {
  it('varies the direction while keeping the image outside the aligned center', () => {
    const east = getInitialDriftOffset(() => 0);
    const west = getInitialDriftOffset(() => 0.5);

    expect(east).not.toEqual(west);
    expect(Math.hypot(east.x, east.y)).toBeCloseTo(0.14);
    expect(Math.hypot(west.x, west.y)).toBeCloseTo(0.18);
    expect(isDriftAligned(east.x, east.y)).toBe(false);
    expect(isDriftAligned(west.x, west.y)).toBe(false);
  });
});

describe('getRevealFractureKick', () => {
  it('keeps the reveal stable before pulsing the crystal frame only', () => {
    expect(getRevealFractureKick(1.8)).toBe(0);
    expect(getRevealFractureKick(1.8 + Math.PI / (2 * 1.65))).toBe(-6);
    expect(getRevealFractureKick(1.8 + Math.PI / (2 * 3.1))).toBe(4);
  });
});
