export type Stage = 'intro' | 'calibrate' | 'drift' | 'reveal';

export type Action = 'START' | 'CONFIRM' | 'CONTINUE' | 'RESET' | 'TOGGLE_MUTE' | string;

export type AppState = {
  stage: Stage;
  muted: boolean;
};

export type StageCopy = {
  eyebrow: string;
  title: string;
  note: string;
  actionLabel: string;
};

const COPY: Readonly<Record<Stage, Readonly<StageCopy>>> = Object.freeze({
  intro: Object.freeze({
    eyebrow: 'INTAKE / 远距辨认',
    title: '请注视远处的房屋',
    note: '保持手机距离，确认房屋轮廓',
    actionLabel: '开始焦距校准',
  }),
  calibrate: Object.freeze({
    eyebrow: 'CALIBRATE / 焦距校准',
    title: '焦距校准中',
    note: '画面会短暂失焦，请继续注视房屋',
    actionLabel: '继续校准',
  }),
  drift: Object.freeze({
    eyebrow: 'ANOMALY / 视觉偏移',
    title: '房屋位置发生偏移',
    note: '视觉信号偏离基线，请不要移开视线',
    actionLabel: '确认异常影像',
  }),
  reveal: Object.freeze({
    eyebrow: 'REVEAL / 影像回收',
    title: 'PRTS // 视觉回收完成',
    note: '你看到的，从来不止一层。',
    actionLabel: '重新校准',
  }),
});

export function createInitialState(): AppState {
  return { stage: 'intro', muted: false };
}

export function getStageCopy(state: AppState): StageCopy {
  return COPY[state.stage] ?? COPY.intro;
}

export function advanceState(state: AppState, action: Action): AppState {
  if (action === 'TOGGLE_MUTE') {
    return { ...state, muted: !state.muted };
  }

  if (action === 'RESET') {
    return createInitialState();
  }

  if (state.stage === 'intro' && action === 'START') {
    return { ...state, stage: 'calibrate' };
  }

  if (state.stage === 'calibrate' && action === 'CONFIRM') {
    return { ...state, stage: 'drift' };
  }

  if (state.stage === 'drift' && action === 'CONTINUE') {
    return { ...state, stage: 'reveal' };
  }

  return state;
}
