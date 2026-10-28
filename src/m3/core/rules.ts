export const RULES = Object.freeze({
  // 768 × 432 = 48 × 27 格，精确 16:9：横版跳跃的预判方向在水平轴。
  width: 768, height: 432, tile: 16, stepMs: 1000 / 60, maxSteps: 5,
  gravity: 0.6, jump: 9, maxFall: 9, runSpeed: 3.5,
  holdFrames: 4, cut: 1, coyoteFrames: 5, bufferFrames: 5,
  bodyWidth: 20, bodyHeight: 26,
});
