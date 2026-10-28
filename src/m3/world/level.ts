import { RULES } from '../core/rules';

export type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type Level = Readonly<{
  solids: readonly Rect[];
  platforms: readonly Rect[];
  hazards: readonly Rect[];
  spawn: Readonly<{ x: number; y: number }>;
  goal: Rect;
}>;

/** 验证场只接受已实现的字符，避免将未来陷阱静默解析为空地。 */
export function parseLevel(rows: readonly string[]): Level {
  const gridCols = RULES.width / RULES.tile;
  const gridRows = RULES.height / RULES.tile;
  if (rows.length !== gridRows || rows.some((row) => row.length !== gridCols)) {
    throw new Error(`关卡必须为 ${gridCols} × ${gridRows} 格`);
  }
  const solids: Rect[] = [];
  const platforms: Rect[] = [];
  const hazards: Rect[] = [];
  let spawn: Level['spawn'] | undefined;
  let goal: Rect | undefined;
  rows.forEach((row, y) => [...row].forEach((tile, x) => {
    const rect = { x: x * RULES.tile, y: y * RULES.tile, width: RULES.tile, height: RULES.tile };
    switch (tile) {
      case '.': break;
      case '#': solids.push(rect); break;
      case '=': platforms.push({ ...rect, height: 4 }); break;
      case '^': hazards.push(rect); break;
      case 'S':
        if (spawn) throw new Error('出生点必须唯一');
        spawn = {
          x: rect.x + (RULES.tile - RULES.bodyWidth) / 2,
          y: rect.y + RULES.tile - RULES.bodyHeight,
        };
        break;
      case 'G':
        if (goal) throw new Error('终点必须唯一');
        goal = rect;
        break;
      default: throw new Error(`未实现的关卡字符：${tile} (${x}, ${y})`);
    }
  }));
  if (!spawn || !goal) throw new Error('关卡必须有出生点和终点');
  const spawnBody = { ...spawn, width: RULES.bodyWidth, height: RULES.bodyHeight };
  const goalRect = goal;
  if (solids.some((rect) => overlaps(spawnBody, rect) || overlaps(goalRect, rect))) {
    throw new Error('出生点和终点不能与实体砖重叠');
  }
  return { solids, platforms, hazards, spawn, goal };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
