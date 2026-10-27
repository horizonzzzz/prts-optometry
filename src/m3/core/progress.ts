export type Run = Readonly<{
  status: 'playing' | 'recalled' | 'complete';
  hasDoubleJump: boolean;
  recallCount: number;
}>;
export function createRun(): Run {
  return { status: 'playing', hasDoubleJump: false, recallCount: 0 };
}
export function finishStep(run: Run, failed: boolean, reachedGoal: boolean): Run {
  if (run.status !== 'playing') return run;
  return {
    ...run,
    status: failed ? 'recalled' : reachedGoal ? 'complete' : 'playing',
    recallCount: run.recallCount + Number(failed),
  };
}
export function retryRun(run: Run): Run {
  return { ...run, status: 'playing' };
}
