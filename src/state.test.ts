import { expect, test } from 'vitest';
import { createInitialState, advanceState, getStageCopy, getStageCopyForStage, type AppState } from './state';

test('initial state starts at the clear house scene', () => {
  const state = createInitialState();

  expect(state).toEqual({
    stage: 'intro',
    muted: false,
  });
  expect(getStageCopy(state).actionLabel).toBe('开始验光测试');
  expect(getStageCopyForStage('intro').note).toBe('点击中央图像，开始焦距校准');
});

test('each confirmation advances one scene', () => {
  let state = advanceState(createInitialState(), 'START');

  expect(state.stage).toBe('calibrate');

  state = advanceState(state, 'CONFIRM');
  expect(state).toEqual({ stage: 'drift', muted: false });
  expect(getStageCopy(state).title).toBe('测试流程出现异常');
  expect(getStageCopy(state).actionLabel).toBe('继续校准并对齐影像');
});

test('drift advances to reveal and reveal resets cleanly', () => {
  let state: AppState = { stage: 'drift', muted: false };

  state = advanceState(state, 'CONTINUE');
  expect(state).toEqual({ stage: 'reveal', muted: false });
  expect(getStageCopy(state).title).toBe('PRTS // 回传通道被占用');
  expect(getStageCopy(state).note).toContain('TO BE CONTINUED');
  expect(advanceState(state, 'START')).toBe(state);

  state = advanceState(state, 'RESET');
  expect(state).toEqual(createInitialState());
});

test('invalid actions do not mutate the current state', () => {
  const state: AppState = { stage: 'drift', muted: true };

  expect(advanceState(state, 'CONFIRM')).toEqual(state);
  expect(advanceState(state, 'UNKNOWN')).toEqual(state);
});

test('mute action toggles without changing the screening stage', () => {
  const state: AppState = { stage: 'calibrate', muted: false };

  expect(advanceState(state, 'TOGGLE_MUTE')).toEqual({
    stage: 'calibrate',
    muted: true,
  });
});
