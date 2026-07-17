import { Graphics, Sprite, Text, type TextStyle } from 'pixi.js';

export function addText(text: string, style: TextStyle) {
  const node = new Text({ text, style });
  node.roundPixels = true;
  return node;
}

export function fitCover(sprite: Sprite, x: number, y: number, width: number, height: number) {
  const textureWidth = sprite.texture.width || 1;
  const textureHeight = sprite.texture.height || 1;
  const scale = Math.max(width / textureWidth, height / textureHeight);
  sprite.anchor.set(0.5);
  sprite.position.set(x, y);
  sprite.scale.set(scale);
}

export function fitStretch(sprite: Sprite, x: number, y: number, width: number, height: number) {
  const textureWidth = sprite.texture.width || 1;
  const textureHeight = sprite.texture.height || 1;
  sprite.anchor.set(0.5);
  sprite.position.set(x, y);
  sprite.scale.set(width / textureWidth, height / textureHeight);
}

export function drawDiamond(graphics: Graphics, width: number, height: number, fill?: number, alpha = 1) {
  graphics.clear();
  graphics
    .moveTo(0, -height / 2)
    .lineTo(width / 2, 0)
    .lineTo(0, height / 2)
    .lineTo(-width / 2, 0)
    .closePath();

  if (fill !== undefined) graphics.fill({ color: fill, alpha });
}

/** Hollow double-diamond — the PRTS / originium mark. */
export function drawOriginiumCore(
  graphics: Graphics,
  width: number,
  height: number,
  color: number,
  alpha = 1,
  strokeWidth = 2.4,
) {
  graphics.clear();
  const outer = [
    [0, -height / 2],
    [width / 2, 0],
    [0, height / 2],
    [-width / 2, 0],
  ] as const;
  const innerScale = 0.58;
  const inner = outer.map(([x, y]) => [x * innerScale, y * innerScale] as const);

  graphics
    .moveTo(outer[0][0], outer[0][1])
    .lineTo(outer[1][0], outer[1][1])
    .lineTo(outer[2][0], outer[2][1])
    .lineTo(outer[3][0], outer[3][1])
    .closePath()
    .stroke({ width: strokeWidth, color, alpha, join: 'miter' });

  graphics
    .moveTo(inner[0][0], inner[0][1])
    .lineTo(inner[1][0], inner[1][1])
    .lineTo(inner[2][0], inner[2][1])
    .lineTo(inner[3][0], inner[3][1])
    .closePath()
    .stroke({ width: strokeWidth * 0.72, color, alpha: alpha * 0.92, join: 'miter' });
}

export function drawDiamondStroke(
  graphics: Graphics,
  width: number,
  height: number,
  color: number,
  alpha: number,
  strokeWidth: number,
) {
  graphics
    .moveTo(0, -height / 2)
    .lineTo(width / 2, 0)
    .lineTo(0, height / 2)
    .lineTo(-width / 2, 0)
    .closePath()
    .stroke({ width: strokeWidth, color, alpha, join: 'miter' });
}

export function drawPolygon(graphics: Graphics, points: Array<[number, number]>, color: number, alpha: number) {
  graphics.clear().moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) graphics.lineTo(x, y);
  graphics.closePath().fill({ color, alpha });
}

export function drawDashedCircle(graphics: Graphics, radius: number, color: number, alpha: number) {
  graphics.clear();
  const segments = 28;
  for (let index = 0; index < segments; index += 2) {
    const start = (index / segments) * Math.PI * 2;
    const end = ((index + 1) / segments) * Math.PI * 2;
    graphics.arc(0, 0, radius, start, end).stroke({ width: 1, color, alpha });
  }
}

export function drawLine(graphics: Graphics, x1: number, y1: number, x2: number, y2: number, width: number, color: number, alpha: number) {
  graphics.moveTo(x1, y1).lineTo(x2, y2).stroke({ width, color, alpha });
}

export function setCssVar(host: HTMLElement, name: string, value: number) {
  host.parentElement?.style.setProperty(name, `${Math.round(value)}px`);
}
