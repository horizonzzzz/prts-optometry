import type Phaser from 'phaser';
import type { Level } from '../world/level';
import { THEME } from './theme';

export function drawScene(scene: Phaser.Scene, level: Level) {
  const terrain = scene.add.graphics();
  terrain.fillStyle(THEME.background).fillRect(0, 0, 480, 480);
  terrain.lineStyle(0.5, THEME.grid);
  for (let n = 0; n <= 480; n += 16) {
    terrain.lineBetween(n, 0, n, 480).lineBetween(0, n, 480, n);
  }
  terrain.lineStyle(1, THEME.steel).strokeRect(24, 52, 432, 152);
  for (let x = 32; x < 456; x += 48) terrain.lineStyle(2, THEME.grid).lineBetween(x, 52, x, 204);
  for (const tile of level.solids) {
    terrain.fillStyle(THEME.steel).fillRect(tile.x, tile.y, tile.width, tile.height);
    terrain.fillStyle(THEME.edge).fillRect(tile.x, tile.y, tile.width, 2);
    terrain.fillStyle(THEME.background).fillCircle(tile.x + 4, tile.y + 6, 1);
  }
  for (const platform of level.platforms) {
    terrain.fillStyle(THEME.yellow).fillRect(platform.x, platform.y, platform.width, 4);
    terrain.fillStyle(THEME.steel).fillRect(platform.x + 2, platform.y + 5, platform.width - 4, 2);
  }
  for (const hazard of level.hazards) {
    terrain.fillStyle(THEME.hazard).fillTriangle(hazard.x, hazard.y + 16, hazard.x + 8, hazard.y + 4, hazard.x + 16, hazard.y + 16);
  }
  terrain.lineStyle(2, THEME.green).strokeRect(level.goal.x - 2, level.goal.y - 16, 20, 32);
  terrain.fillStyle(THEME.green).fillTriangle(level.goal.x + 3, level.goal.y - 3, level.goal.x + 11, level.goal.y + 2, level.goal.x + 3, level.goal.y + 7);
  const player = scene.add.graphics();
  player.fillStyle(THEME.cat).fillRect(0, 0, 12, 14);
  player.fillTriangle(0, 2, 0, -4, 5, 0).fillTriangle(8, 0, 12, -4, 12, 2);
  player.fillStyle(THEME.green).fillRect(2, 3, 2, 2).fillRect(8, 3, 2, 2);
  player.lineStyle(2, THEME.cat).lineBetween(0, 10, -4, 8).lineBetween(-4, 8, -5, 3);
  return (x: number, y: number) => { player.setPosition(Math.round(x), Math.round(y)); };
}
