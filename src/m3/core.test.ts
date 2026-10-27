import { describe, expect, it } from 'vitest';
import { createInput, type InputFrame } from './core/input';
import { createFixedLoop } from './core/loop';
import { createMovement, decideMovement } from './core/movement';
import { createRun, finishStep, retryRun } from './core/progress';
import { RULES } from './core/rules';
import { parseLevel } from './world/level';
import { SANDBOX_ROWS } from './world/sandbox';

const idle: InputFrame = { left: false, right: false, jump: false, pressed: false, released: false };
const jump = { ...idle, jump: true, pressed: true };

function trajectory(heldFrames: number) {
  let movement = createMovement();
  let y = 0;
  let vy = 0;
  const positions: number[] = [];
  for (let frame = 0; frame < 60; frame += 1) {
    const result = decideMovement(movement, { ...idle, jump: frame < heldFrames, pressed: frame === 0, released: frame === heldFrames }, frame === 0, vy);
    movement = result.state;
    vy = Math.min(result.vy + RULES.gravity * 60, RULES.maxFall * 60);
    y += vy / 60;
    positions.push(y);
  }
  return positions;
}

describe('M3 fixed-step movement', () => {
  it('has instant horizontal movement and cancellation', () => {
    expect(decideMovement(createMovement(), { ...idle, right: true }, true, 0).vx).toBe(210);
    expect(decideMovement(createMovement(), { ...idle, left: true, right: true }, true, 0).vx).toBe(0);
    expect(decideMovement(createMovement(), idle, true, 0).vx).toBe(0);
  });
  it('simulates hold, release, apex and descent using discrete integration', () => {
    const short = trajectory(1);
    const long = trajectory(20);
    long.slice(0, 4).forEach((y, i) => expect(y).toBeCloseTo(-8.4 * (i + 1)));
    expect(Math.min(...long)).toBeCloseTo(-88.2);
    expect(Math.min(...short)).toBeCloseTo(-57.8);
    expect(long[59]).toBeGreaterThan(0);
    const first = decideMovement(createMovement(), jump, true, 0);
    const cut = decideMovement(first.state, { ...idle, released: true }, false, -504);
    expect(cut.vy).toBe(-480);
    expect(decideMovement(cut.state, idle, false, -444).vy).toBe(-444);
  });
  it('allows coyote jump for exactly five off-ground steps', () => {
    const grounded = decideMovement(createMovement(), idle, true, 0).state;
    for (const delay of [4, 5]) {
      let state = grounded;
      for (let frame = 0; frame < delay; frame += 1) state = decideMovement(state, idle, false, 60).state;
      const result = decideMovement(state, jump, false, 60);
      expect(result.vy < 0).toBe(delay === 4);
    }
  });
  it('keeps a jump buffer through five steps, expires on the sixth', () => {
    for (const delay of [4, 5]) {
      let state = createMovement();
      for (let frame = 0; frame < delay; frame += 1) state = decideMovement(state, frame === 0 ? jump : { ...idle, jump: true }, false, 60).state;
      const result = decideMovement(state, { ...idle, jump: true }, true, 0);
      expect(result.vy < 0).toBe(delay === 4);
    }
  });
  it('permits only one air jump when the ability is enabled', () => {
    const first = decideMovement(createMovement(), jump, false, 60, true);
    expect(first.vy).toBe(-540);
    expect(decideMovement(first.state, jump, false, 60, true).vy).toBe(60);
    expect(decideMovement(createMovement(), jump, false, 60, false).vy).toBe(60);
  });
  it('steps equally at 30/60/120 render Hz and limits catch-up to five', () => {
    for (const fps of [30, 60, 120]) {
      let count = 0;
      const loop = createFixedLoop(() => count++);
      for (let i = 0; i < fps; i += 1) loop.advance(1000 / fps);
      expect(count).toBe(60);
    }
    let count = 0;
    const loop = createFixedLoop(() => count++);
    loop.advance(5000);
    expect(count).toBe(5);
    loop.advance(RULES.stepMs / 2);
    loop.reset();
    loop.advance(RULES.stepMs / 2);
    expect(count).toBe(5);
  });
});

describe('M3 input and run state', () => {
  it('merges multi-touch and keyboard, consumes edges once and clears retry input', () => {
    const input = createInput();
    input.set('pointer:1', 'right', true);
    input.set('pointer:2', 'jump', true);
    input.set('Space', 'jump', true);
    expect(input.sample()).toMatchObject({ right: true, jump: true, pressed: true });
    expect(input.sample().pressed).toBe(false);
    input.set('pointer:2', 'jump', false);
    expect(input.sample()).toMatchObject({ jump: true, released: false });
    input.set('Space', 'jump', false);
    expect(input.sample().released).toBe(true);
    input.clear();
    expect(input.sample()).toEqual(idle);
  });
  it('counts recall once, prioritizes failure and preserves progress on retry', () => {
    const run = finishStep({ ...createRun(), hasDoubleJump: true }, true, true);
    expect(run).toMatchObject({ status: 'recalled', recallCount: 1 });
    expect(finishStep(run, true, false)).toBe(run);
    expect(retryRun(run)).toEqual({ status: 'playing', recallCount: 1, hasDoubleJump: true });
    expect(finishStep(createRun(), false, true).status).toBe('complete');
  });
});

describe('M3 ASCII levels', () => {
  it('loads the 30×30 sandbox and rejects malformed and unsupported data', () => {
    expect(parseLevel(SANDBOX_ROWS).platforms.length).toBeGreaterThan(0);
    expect(() => parseLevel(SANDBOX_ROWS.slice(1))).toThrow('30 × 30');
    const invalid = [...SANDBOX_ROWS] as string[];
    invalid[0] = `X${invalid[0].slice(1)}`;
    expect(() => parseLevel(invalid)).toThrow('未实现');
    invalid[0] = `S${invalid[0].slice(1)}`;
    expect(() => parseLevel(invalid)).toThrow('唯一');
    expect(() => parseLevel(SANDBOX_ROWS.map((row) => row.replace('G', '.')))).toThrow('终点');
  });
});
