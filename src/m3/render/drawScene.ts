import type Phaser from 'phaser';
import type { Level } from '../world/level';
import { RULES } from '../core/rules';
import { THEME } from './theme';

export function drawScene(scene: Phaser.Scene, level: Level) {
  const terrain = scene.add.graphics();
  const w = RULES.width;
  const h = RULES.height;
  terrain.fillGradientStyle(THEME.background, THEME.background, THEME.skyLow, THEME.skyLow).fillRect(0, 0, w, h);
  terrain.fillStyle(THEME.sun, .2).fillCircle(571, 93, 65);
  terrain.fillStyle(THEME.sun, .4).fillCircle(571, 93, 43);
  terrain.fillStyle(0xfff0b8).fillCircle(571, 93, 28);
  for (const [x, y, scale] of [[56, 117, 1], [291, 66, .65], [637, 143, .8]]) {
    terrain.fillStyle(THEME.cloud, .8);
    terrain.fillRoundedRect(x, y, 112 * scale, 20 * scale, 10 * scale);
    terrain.fillCircle(x + 33 * scale, y, 19 * scale).fillCircle(x + 65 * scale, y - 6 * scale, 26 * scale);
  }
  // 远景的低对比轮廓与暖色可落脚面分开，避免把装饰误认成平台。
  terrain.fillStyle(THEME.distant).fillTriangle(0, 284, 160, 208, 300, 284);
  terrain.fillTriangle(200, 291, 435, 215, 660, 291).fillRect(0, 281, w, 151);
  terrain.fillStyle(THEME.hull).fillRect(6, 253, 203, 110).fillRect(28, 213, 153, 42);
  terrain.fillStyle(0xc8d5c1).fillRect(39, 206, 126, 9).fillRect(16, 248, 185, 8);
  terrain.fillStyle(THEME.window);
  for (let x = 44; x < 160; x += 24) terrain.fillRect(x, 224, 17, 12);
  terrain.lineStyle(3, THEME.hull).lineBetween(93, 213, 93, 148).lineBetween(68, 166, 120, 166);
  terrain.lineStyle(1, THEME.hull).lineBetween(93, 148, 145, 211);
  terrain.fillStyle(0xdbe0cb).fillTriangle(83, 264, 98, 241, 113, 264);
  scene.add.text(48, 277, 'RHODES ISLAND', { fontFamily: 'sans-serif', fontSize: '9px', color: '#dce3cc', letterSpacing: 2 });
  terrain.fillStyle(THEME.hull, .55).fillRect(397, 311, 248, 78);
  for (let x = 412; x < 640; x += 38) terrain.fillStyle(THEME.window, .5).fillRect(x, 326, 23, 42);
  terrain.lineStyle(5, THEME.hull).lineBetween(662, 306, 662, 84).lineBetween(596, 86, 751, 86);
  terrain.lineStyle(2, THEME.hull).lineBetween(662, 105, 724, 86).lineBetween(735, 86, 735, 125);
  terrain.fillStyle(THEME.hull).fillRect(728, 125, 14, 8);
  terrain.fillStyle(THEME.cloud, .3).fillRect(0, 351, w, 81);

  const solids = new Set(level.solids.map(({ x, y }) => `${x},${y}`));
  for (const tile of level.solids) {
    terrain.fillStyle(THEME.steel).fillRect(tile.x, tile.y, tile.width, tile.height);
    terrain.fillStyle(THEME.shadow, .35).fillRect(tile.x, tile.y + 12, tile.width, 4);
    terrain.lineStyle(1, THEME.shadow, .4).strokeRect(tile.x, tile.y, tile.width, tile.height);
    if (!solids.has(`${tile.x},${tile.y - RULES.tile}`)) {
      terrain.fillStyle(THEME.deck).fillRect(tile.x, tile.y, tile.width, 6);
      terrain.fillStyle(THEME.edge).fillRect(tile.x, tile.y, tile.width, 2);
      terrain.fillStyle(THEME.shadow).fillCircle(tile.x + 8, tile.y + 10, 1);
    }
  }
  // 连续的平台瓦片合成一块吊板，仅改变绘制，不改变碰撞边界。
  for (const platform of level.platforms) {
    terrain.fillStyle(THEME.shadow).fillRect(platform.x, platform.y + 4, platform.width, 4);
    terrain.fillStyle(THEME.yellow).fillRect(platform.x, platform.y, platform.width, 4);
    terrain.fillStyle(THEME.cloud).fillRect(platform.x, platform.y, platform.width, 1);
    if (!level.platforms.some((other) => other.y === platform.y && other.x === platform.x - RULES.tile)) {
      let right = platform.x + platform.width;
      while (level.platforms.some((other) => other.y === platform.y && other.x === right)) right += RULES.tile;
      right -= 6;
      terrain.lineStyle(1, THEME.shadow, .6).lineBetween(platform.x + 6, platform.y, platform.x + 6, platform.y - 30);
      terrain.lineBetween(right, platform.y, right, platform.y - 30);
      terrain.fillStyle(THEME.shadow).fillCircle(platform.x + 6, platform.y + 3, 1).fillCircle(right, platform.y + 3, 1);
    }
  }
  for (const hazard of level.hazards) {
    terrain.fillStyle(THEME.shadow).fillRect(hazard.x, hazard.y + 12, hazard.width, 4);
    terrain.fillStyle(THEME.hazard).fillTriangle(hazard.x, hazard.y + 16, hazard.x + 8, hazard.y + 4, hazard.x + 16, hazard.y + 16);
    terrain.fillStyle(THEME.edge).fillTriangle(hazard.x + 5, hazard.y + 10, hazard.x + 8, hazard.y + 4, hazard.x + 11, hazard.y + 10);
  }
  const gx = level.goal.x + 8;
  const gy = level.goal.y + 16;
  terrain.fillStyle(THEME.cloud).fillRect(gx, gy - 45, 3, 45);
  terrain.fillStyle(THEME.hazard).fillTriangle(gx + 3, gy - 44, gx + 29, gy - 36, gx + 3, gy - 28);
  terrain.fillStyle(THEME.edge).fillCircle(gx + 1, gy - 47, 3);
  scene.add.text(gx - 38, gy - 72, '这边！', { fontFamily: 'sans-serif', fontSize: '12px', color: '#80533b', backgroundColor: '#fff5d9', padding: { x: 8, y: 4 } });
  const player = scene.add.graphics();
  player.fillStyle(THEME.cat).fillRoundedRect(-2, -3, 16, 17, 4);
  player.fillTriangle(-2, 0, -3, -9, 4, -4).fillTriangle(8, -4, 15, -9, 14, 0);
  player.fillStyle(THEME.hazard).fillTriangle(0, -4, 0, -7, 3, -4).fillTriangle(10, -4, 13, -7, 13, -4);
  player.fillStyle(THEME.green).fillRect(1, 1, 3, 3).fillRect(8, 1, 3, 3);
  player.fillStyle(THEME.cloud).fillRect(2, 1, 1, 1).fillRect(9, 1, 1, 1);
  player.fillStyle(THEME.yellow).fillTriangle(0, 7, -6, 5, -4, 10).fillRect(0, 6, 12, 2);
  player.lineStyle(3, THEME.cat).lineBetween(-1, 10, -6, 8).lineBetween(-6, 8, -7, 2);
  player.fillStyle(THEME.cat).fillRect(0, 12, 4, 3).fillRect(8, 12, 4, 3);
  // 临时角色的绘制范围约为 x:-7..15、y:-9..15，按碰撞盒中心和脚底定位。
  const playerOffsetX = RULES.bodyWidth / 2 - 4;
  const playerOffsetY = RULES.bodyHeight - 15;
  return (x: number, y: number) => { player.setPosition(Math.round(x + playerOffsetX), Math.round(y + playerOffsetY)); };
}
