import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  advanceState,
  getStageCopy,
} from './state.js';

test('initial state starts at the clear house scene', () => {
  const state = createInitialState();

  assert.deepEqual(state, {
    stage: 'intro',
    muted: false,
  });
  assert.equal(getStageCopy(state).actionLabel, '开始焦距校准');
});

test('each confirmation advances one scene', () => {
  let state = advanceState(createInitialState(), 'START');

  assert.equal(state.stage, 'calibrate');

  state = advanceState(state, 'CONFIRM');
  assert.deepEqual(state, { stage: 'drift', muted: false });
  assert.equal(getStageCopy(state).title, '房屋位置发生偏移');
});

test('drift advances to reveal and reveal resets cleanly', () => {
  let state = { stage: 'drift', muted: false };

  state = advanceState(state, 'CONTINUE');
  assert.deepEqual(state, { stage: 'reveal', muted: false });

  state = advanceState(state, 'RESET');
  assert.deepEqual(state, createInitialState());
});

test('invalid actions do not mutate the current state', () => {
  const state = { stage: 'drift', muted: true };

  assert.deepEqual(advanceState(state, 'CONFIRM'), state);
  assert.deepEqual(advanceState(state, 'UNKNOWN'), state);
});

test('mute action toggles without changing the screening stage', () => {
  const state = { stage: 'calibrate', muted: false };

  assert.deepEqual(advanceState(state, 'TOGGLE_MUTE'), {
    stage: 'calibrate',
    muted: true,
  });
});
