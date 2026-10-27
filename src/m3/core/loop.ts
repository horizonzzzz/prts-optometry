import { RULES } from './rules';

/** 超出补帧预算的时间直接丢弃；恢复页面时不会追赶后台积压。 */
export function createFixedLoop(step: () => void) {
  let accumulated = 0;
  return {
    advance(elapsedMs: number) {
      if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
      accumulated += Math.min(elapsedMs, RULES.stepMs * RULES.maxSteps);
      let steps = 0;
      while (accumulated + 1e-7 >= RULES.stepMs && steps < RULES.maxSteps) {
        step();
        accumulated = Math.max(0, accumulated - RULES.stepMs);
        steps += 1;
      }
    },
    reset() { accumulated = 0; },
  };
}
