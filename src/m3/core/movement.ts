import { RULES } from './rules';
import type { InputFrame } from './input';

export type Movement = {
  coyote: number; buffer: number; hold: number; cut: boolean;
  airJumpUsed: boolean; wasGrounded: boolean;
};
export function createMovement(): Movement {
  return { coyote: 0, buffer: 0, hold: 0, cut: false, airJumpUsed: false, wasGrounded: false };
}

/** 速度输入/输出为 px/s；计时器只在固定物理步调用时递进。 */
export function decideMovement(previous: Movement, input: InputFrame, grounded: boolean, velocityY: number, hasDoubleJump = false) {
  const state = { ...previous };
  if (grounded || state.wasGrounded) state.coyote = RULES.coyoteFrames;
  if (grounded) state.airJumpUsed = false;
  if (input.pressed) state.buffer = RULES.bufferFrames;
  const groundJump = grounded || state.coyote > 0;
  let vy = velocityY;
  if (state.buffer > 0 && (groundJump || (hasDoubleJump && !state.airJumpUsed))) {
    vy = -RULES.jump * 60;
    state.hold = 0;
    state.cut = false;
    state.buffer = 0;
    state.coyote = 0;
    if (!groundJump) state.airJumpUsed = true;
  }
  if (input.jump && vy < 0 && state.hold < RULES.holdFrames && !state.cut) {
    vy = Math.min(vy, -RULES.jump * 60);
    state.hold += 1;
  }
  if ((!input.jump || input.released) && vy < 0 && !state.cut) {
    vy = Math.max(vy, -(RULES.jump - RULES.cut) * 60);
    state.cut = true;
  }
  state.coyote = Math.max(0, state.coyote - 1);
  state.buffer = Math.max(0, state.buffer - 1);
  state.wasGrounded = grounded && vy >= 0;
  return { state, vx: (Number(input.right) - Number(input.left)) * RULES.runSpeed * 60, vy };
}
