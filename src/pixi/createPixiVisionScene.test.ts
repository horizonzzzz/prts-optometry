import { describe, expect, it } from 'vitest';
import { getCalibrationBlurAmount, getCopyHeight, getEntryBootState, getRevealFractureKick, getSoundBarHeights, getStageReadyTime, isCalibrationClear, isWideLayout } from './createPixiVisionScene';

describe('getCopyHeight', () => {
  it('keeps the Pixi copy block aligned with the responsive DOM layout', () => {
    expect(getCopyHeight(568, false)).toBe(98);
    expect(getCopyHeight(844, false)).toBe(110);
    expect(getCopyHeight(900, false)).toBe(154);
    expect(getCopyHeight(568, true)).toBe(140);
    expect(getCopyHeight(900, true)).toBe(180);
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

describe('getRevealFractureKick', () => {
  it('keeps the reveal stable before pulsing the crystal frame only', () => {
    expect(getRevealFractureKick(1.8)).toBe(0);
    expect(getRevealFractureKick(1.8 + Math.PI / (2 * 1.65))).toBe(-6);
    expect(getRevealFractureKick(1.8 + Math.PI / (2 * 3.1))).toBe(4);
  });
});
