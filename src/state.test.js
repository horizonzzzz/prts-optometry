import { expect, test } from 'vitest';
import { createInitialState, advanceState, getStageCopy } from './state.js';

test('initial state starts at the clear house scene', () => {
  const state = createInitialState();

  expect(state).toEqual({
    stage: 'intro',
    muted: false,
  });
  expect(getStageCopy(state).actionLabel).toBe('开始焦距校准');
});

test('each confirmation advances one scene', () => {
  let state = advanceState(createInitialState(), 'START');

  expect(state.stage).toBe('calibrate');

  state = advanceState(state, 'CONFIRM');
  expect(state).toEqual({ stage: 'drift', muted: false });
  expect(getStageCopy(state).title).toBe('房屋位置发生偏移');
});

test('drift advances to reveal and reveal resets cleanly', () => {
  let state = { stage: 'drift', muted: false };

  state = advanceState(state, 'CONTINUE');
  expect(state).toEqual({ stage: 'reveal', muted: false });

  state = advanceState(state, 'RESET');
  expect(state).toEqual(createInitialState());
});

test('invalid actions do not mutate the current state', () => {
  const state = { stage: 'drift', muted: true };

  expect(advanceState(state, 'CONFIRM')).toEqual(state);
  expect(advanceState(state, 'UNKNOWN')).toEqual(state);
});

test('mute action toggles without changing the screening stage', () => {
  const state = { stage: 'calibrate', muted: false };

  expect(advanceState(state, 'TOGGLE_MUTE')).toEqual({
    stage: 'calibrate',
    muted: true,
  });
});
