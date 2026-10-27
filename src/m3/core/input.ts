export type InputFrame = Readonly<{ left: boolean; right: boolean; jump: boolean; pressed: boolean; released: boolean }>;

export type InputAction = 'left' | 'right' | 'jump';
export const KEY_ACTIONS: Readonly<Record<string, InputAction>> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'jump', KeyZ: 'jump', ArrowUp: 'jump',
};

/** 按来源记录状态，松开一个触点或按键不会取消另一个来源的按压。 */
export function createInput() {
  const sources = new Map<string, InputAction>();
  let pressed = false;
  let released = false;
  const held = (action: InputAction) => [...sources.values()].includes(action);
  return {
    set(source: string, action: InputAction, down: boolean) {
      const wasJumping = held('jump');
      if (down) sources.set(source, action);
      else sources.delete(source);
      if (!wasJumping && held('jump')) pressed = true;
      if (wasJumping && !held('jump')) released = true;
    },
    sample(): InputFrame {
      const frame = { left: held('left'), right: held('right'), jump: held('jump'), pressed, released };
      pressed = false;
      released = false;
      return frame;
    },
    clear() { sources.clear(); pressed = false; released = false; },
  };
}
export type GameInput = ReturnType<typeof createInput>;
