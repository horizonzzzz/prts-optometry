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
    eyebrow: 'INTAKE / 例行验光',
    title: '请注视远处的房屋',
    note: '阿米娅与凯尔希将引导你完成测试',
    actionLabel: '开始验光测试',
  }),
  calibrate: Object.freeze({
    eyebrow: 'CALIBRATE / 焦距校准',
    title: '焦距校准中',
    note: '观察焦距变化，在房屋最清晰时点击中央图像',
    actionLabel: '在图像清晰时确认焦距',
  }),
  drift: Object.freeze({
    eyebrow: 'ANOMALY / 未知视觉偏移',
    title: '测试流程出现异常',
    note: '保留终端连接，将影像拖回中央准星',
    actionLabel: '继续校准并对齐影像',
  }),
  reveal: Object.freeze({
    eyebrow: 'REVEAL / 未授权连接',
    title: 'PRTS // 回传通道被占用',
    note: '记录尚未结束。继续观察。TO BE CONTINUED.',
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
