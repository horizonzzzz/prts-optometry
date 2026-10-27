import Phaser from 'phaser';
import { createFixedLoop } from './core/loop';
import { createRun, finishStep, retryRun, type Run } from './core/progress';
import { createMovement, decideMovement } from './core/movement';
import type { GameInput } from './core/input';
import { RULES } from './core/rules';
import { drawScene } from './render/drawScene';
import { THEME } from './render/theme';
import { overlaps } from './world/level';
import { SANDBOX } from './world/sandbox';

export type M3Scene = { retry(): void; destroy(): void };

export function createM3Scene(host: HTMLDivElement, input: GameInput, onStatus: (run: Run) => void): Promise<M3Scene> {
  return new Promise((resolve, reject) => {
    let disposed = false;
    class SandboxScene extends Phaser.Scene {
      private player!: Phaser.GameObjects.Rectangle;
      private body!: Phaser.Physics.Arcade.Body;
      private drawPlayer!: (x: number, y: number) => void;
      private run = createRun();
      private movement = createMovement();
      private loop = createFixedLoop(() => this.fixedStep());

      create() {
        if (disposed) return;
        try {
          const world = this.physics.world;
          // 相邻地砖先做 X 分离会把脚底接缝当成侧墙，保留重力方向优先。
          world.forceX = false;
          this.drawPlayer = drawScene(this, SANDBOX);
          this.player = this.add.rectangle(SANDBOX.spawn.x, SANDBOX.spawn.y, RULES.bodyWidth, RULES.bodyHeight, 0, 0).setOrigin(0);
          this.physics.add.existing(this.player);
          this.body = this.player.body as Phaser.Physics.Arcade.Body;
          this.body.setAllowGravity(true).setMaxVelocity(1000, RULES.maxFall * 60);
          this.body.setCollideWorldBounds(true);
          // 画面上下各留一屏缓冲供跳跃/坠落越过屏幕边缘，左右则作为地图外墙。
          world.setBounds(0, -RULES.height, RULES.width, RULES.height * 3, true, true, false, false);
          const solids = this.physics.add.staticGroup();
          const platforms = this.physics.add.staticGroup();
          for (const tile of SANDBOX.solids) {
            const object = this.add.rectangle(tile.x, tile.y, tile.width, tile.height, 0, 0).setOrigin(0);
            solids.add(object);
          }
          for (const tile of SANDBOX.platforms) {
            const object = this.add.rectangle(tile.x, tile.y, tile.width, tile.height, 0, 0).setOrigin(0);
            platforms.add(object);
            const body = object.body as Phaser.Physics.Arcade.StaticBody;
            body.checkCollision.down = false;
            body.checkCollision.left = false;
            body.checkCollision.right = false;
          }
          this.physics.add.collider(this.player, solids);
          this.physics.add.collider(this.player, platforms, undefined, (_player, platform) => {
            const surface = (platform as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody;
            return this.body.velocity.y >= 0 && this.body.prev.y + this.body.height <= surface.top + 1;
          });
          this.game.events.on(Phaser.Core.Events.BLUR, this.clearClock, this);
          this.game.events.on(Phaser.Core.Events.HIDDEN, this.clearClock, this);
          this.game.events.on(Phaser.Core.Events.VISIBLE, this.clearClock, this);
          this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.game.events.off(Phaser.Core.Events.BLUR, this.clearClock, this);
            this.game.events.off(Phaser.Core.Events.HIDDEN, this.clearClock, this);
            this.game.events.off(Phaser.Core.Events.VISIBLE, this.clearClock, this);
          });
          host.querySelector('canvas')?.setAttribute('aria-hidden', 'true');
          this.drawPlayer(this.body.x, this.body.y);
          onStatus(this.run);
          resolve({
            retry: () => this.retry(),
            destroy: () => { disposed = true; input.clear(); game.destroy(true); },
          });
        } catch (error) {
          disposed = true;
          game.destroy(true);
          reject(error);
        }
      }

      private clearClock() { input.clear(); this.loop.reset(); }

      private fixedStep() {
        if (this.run.status !== 'playing') return;
        const decision = decideMovement(this.movement, input.sample(), this.body.blocked.down || this.body.touching.down, this.body.velocity.y, this.run.hasDoubleJump);
        this.movement = decision.state;
        this.body.setVelocity(decision.vx, decision.vy);
        // 每步同步一次 GameObject；否则补多步时 preUpdate 会从旧渲染位置重置 Body。
        this.physics.world.update(0, RULES.stepMs);
        this.physics.world.postUpdate();
        if (this.body.blocked.up) { this.movement.cut = true; this.movement.hold = RULES.holdFrames; }
        const rect = { x: this.body.x, y: this.body.y, width: this.body.width, height: this.body.height };
        const failed = this.body.y > RULES.height || SANDBOX.hazards.some((hazard) => overlaps(rect, hazard));
        const next = finishStep(this.run, failed, overlaps(rect, SANDBOX.goal));
        if (next.status !== this.run.status) {
          input.clear();
          this.run = next;
          onStatus(next);
        }
      }

      private retry() {
        this.clearClock();
        this.movement = createMovement();
        this.run = retryRun(this.run);
        this.body.reset(SANDBOX.spawn.x, SANDBOX.spawn.y);
        this.body.setVelocity(0, 0);
        this.drawPlayer(this.body.x, this.body.y);
        onStatus(this.run);
      }

      update(_time: number, delta: number) {
        if (disposed || !this.body) return;
        if (!document.hidden && document.hasFocus()) this.loop.advance(delta);
        this.drawPlayer(this.body.x, this.body.y);
      }
    }
    let game: Phaser.Game;
    try {
      game = new Phaser.Game({
        type: Phaser.AUTO, parent: host, width: RULES.width, height: RULES.height,
        // FIT + CENTER_BOTH：按宿主容器等比缩放居中，宽屏左右留白由宿主晴空渐变承接。
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        backgroundColor: THEME.background, pixelArt: true,
        banner: false, audio: { noAudio: true },
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: RULES.gravity * 3600 }, fixedStep: true, fps: 60, customUpdate: true } },
        scene: SandboxScene,
      });
    } catch (error) { reject(error); }
  });
}
