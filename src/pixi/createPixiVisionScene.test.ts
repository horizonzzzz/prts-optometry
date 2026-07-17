import { describe, expect, it } from 'vitest';
import { getCopyHeight } from './createPixiVisionScene';

describe('getCopyHeight', () => {
  it('keeps the Pixi copy block aligned with the responsive DOM layout', () => {
    expect(getCopyHeight(568, false)).toBe(90);
    expect(getCopyHeight(844, false)).toBe(110);
    expect(getCopyHeight(900, false)).toBe(154);
    expect(getCopyHeight(568, true)).toBe(140);
    expect(getCopyHeight(900, true)).toBe(180);
  });
});
