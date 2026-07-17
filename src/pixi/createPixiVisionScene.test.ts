import { describe, expect, it } from 'vitest';
import { getCopyHeight, getEntryBootState, getSoundBarHeights } from './createPixiVisionScene';

describe('getCopyHeight', () => {
  it('keeps the Pixi copy block aligned with the responsive DOM layout', () => {
    expect(getCopyHeight(568, false)).toBe(90);
    expect(getCopyHeight(844, false)).toBe(110);
    expect(getCopyHeight(900, false)).toBe(154);
    expect(getCopyHeight(568, true)).toBe(140);
    expect(getCopyHeight(900, true)).toBe(180);
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
