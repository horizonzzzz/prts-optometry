import {
  Container,
  Graphics,
  GraphicsContext,
  Sprite,
  type Texture,
} from 'pixi.js';
import { COLORS } from './visionSceneModel';

type BattleBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Bullet = {
  view: Graphics;
  active: boolean;
  vx: number;
  vy: number;
  radius: number;
  age: number;
  wave: number;
  phase: number;
};

type Shard = {
  view: Graphics;
  vx: number;
  vy: number;
  spin: number;
};

const ENTER_TIME = 1;
const MIN_EXPLOSION_TIME = 15.5;
const FORCE_EXPLOSION_TIME = 16.8;
const EXPLOSION_TIME = 1.1;
const REQUIRED_HITS = 40;

export function circlesOverlap(ax: number, ay: number, ar: number, bx: number, by: number, br: number) {
  return Math.hypot(ax - bx, ay - by) <= ar + br;
}

export function shouldBattleExplode(elapsed: number, hits: number) {
  return elapsed >= FORCE_EXPLOSION_TIME || (elapsed >= MIN_EXPLOSION_TIME && hits >= REQUIRED_HITS);
}

export function createVisionBattleScene(landshipTexture: Texture, initialReducedMotion: boolean) {
  const layer = new Container({ label: 'vision-battle' });
  const field = new Graphics();
  const enemyBulletLayer = new Container();
  const playerBulletLayer = new Container();
  const boss = new Container({ label: 'priestess-battle-core' });
  const bossAura = new Graphics();
  const bossBody = new Graphics();
  const bossCore = new Graphics();
  const thruster = new Graphics();
  const landship = new Sprite(landshipTexture);
  const player = new Container({ label: 'rhodes-landship' });
  const playerHitRing = new Graphics();
  const explosionLayer = new Container();
  const flash = new Graphics();

  layer.addChild(field, enemyBulletLayer, playerBulletLayer, boss, player, playerHitRing, explosionLayer, flash);
  boss.addChild(bossAura, bossBody, bossCore);
  player.addChild(thruster, landship);
  landship.anchor.set(0.5);
  layer.visible = false;

  bossAura
    .moveTo(0, -58).lineTo(46, 0).lineTo(0, 58).lineTo(-46, 0).closePath()
    .stroke({ width: 8, color: COLORS.originium, alpha: 0.16 });
  bossBody
    .moveTo(0, -48).lineTo(36, 0).lineTo(0, 48).lineTo(-36, 0).closePath()
    .fill({ color: 0x14191c, alpha: 0.98 })
    .stroke({ width: 3, color: COLORS.originiumSoft, alpha: 0.92 });
  bossCore
    .moveTo(0, -19).lineTo(14, 0).lineTo(0, 19).lineTo(-14, 0).closePath()
    .fill({ color: COLORS.originium, alpha: 0.94 })
    .stroke({ width: 2, color: 0xffffff, alpha: 0.72 });
  thruster
    .moveTo(-17, 30).lineTo(-8, 58).lineTo(0, 34).lineTo(8, 58).lineTo(17, 30)
    .stroke({ width: 5, color: COLORS.yellow, alpha: 0.82 });
  playerHitRing.circle(0, 0, 34).stroke({ width: 3, color: COLORS.red, alpha: 1 });
  playerHitRing.visible = false;

  const playerBulletContext = new GraphicsContext()
    .roundRect(-2.5, -10, 5, 20, 2.5)
    .fill({ color: COLORS.cyan, alpha: 1 });
  const enemyBulletContext = new GraphicsContext()
    .circle(0, 0, 5)
    .fill({ color: COLORS.yellow, alpha: 0.96 })
    .circle(0, 0, 8)
    .stroke({ width: 1, color: COLORS.originiumSoft, alpha: 0.42 });
  const shardContext = new GraphicsContext()
    .moveTo(0, -8).lineTo(5, 5).lineTo(0, 9).lineTo(-4, 4).closePath()
    .fill({ color: COLORS.originium, alpha: 0.94 });

  function makePool(count: number, context: GraphicsContext, parent: Container) {
    return Array.from({ length: count }, () => {
      const view = new Graphics(context);
      view.visible = false;
      parent.addChild(view);
      return { view, active: false, vx: 0, vy: 0, radius: 5, age: 0, wave: 0, phase: 0 } satisfies Bullet;
    });
  }

  const playerBullets = makePool(48, playerBulletContext, playerBulletLayer);
  const enemyBullets = makePool(180, enemyBulletContext, enemyBulletLayer);
  const shards: Shard[] = Array.from({ length: 28 }, (_, index) => {
    const view = new Graphics(shardContext);
    view.visible = false;
    explosionLayer.addChild(view);
    const angle = (index / 28) * Math.PI * 2;
    const speed = 90 + (index % 7) * 18;
    return { view, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, spin: index % 2 ? 4 : -4 };
  });

  let bounds: BattleBounds = { left: 20, top: 56, width: 350, height: 770 };
  let reducedMotion = initialReducedMotion;
  let muted = false;
  let active = false;
  let exploding = false;
  let elapsed = 0;
  let explosionElapsed = 0;
  let lastTime = 0;
  let hits = 0;
  let playerInvulnerability = 0;
  let playerHitElapsed = 0;
  let bossHitElapsed = 0;
  let nextPlayerShot = ENTER_TIME + 0.1;
  let nextFan = ENTER_TIME + 0.7;
  let nextRing = ENTER_TIME + 1.5;
  let nextCurtain = ENTER_TIME + 2.4;
  let onComplete: (() => void) | undefined;
  let reducedMotionTimer = 0;
  let audioContext: AudioContext | null = null;
  let masterGain: GainNode | null = null;

  function primeAudio() {
    if (muted || audioContext) return;
    try {
      audioContext = new AudioContext();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.22;
      masterGain.connect(audioContext.destination);
      void audioContext.resume().catch(() => undefined);
    } catch {
      audioContext = null;
      masterGain = null;
    }
  }

  function playTone(startFrequency: number, endFrequency: number, duration: number, volume: number, type: OscillatorType) {
    if (muted) return;
    primeAudio();
    if (!audioContext || !masterGain) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function playExplosion() {
    if (muted) return;
    primeAudio();
    if (!audioContext || !masterGain) return;
    playTone(130, 34, 0.72, 0.42, 'sawtooth');
    const length = Math.floor(audioContext.sampleRate * 0.65);
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = audioContext.createBufferSource();
    const filterNode = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = 1100;
    gain.gain.value = 0.38;
    source.buffer = buffer;
    source.connect(filterNode).connect(gain).connect(masterGain);
    source.start();
  }

  // ponytail: bounded pools make linear lookup cheaper than owning free-list machinery here.
  function take(pool: Bullet[]) {
    return pool.find((bullet) => !bullet.active);
  }

  function spawn(pool: Bullet[], x: number, y: number, vx: number, vy: number, radius = 5, wave = 0, phase = 0) {
    const bullet = take(pool);
    if (!bullet) return;
    bullet.active = true;
    bullet.vx = vx;
    bullet.vy = vy;
    bullet.radius = radius;
    bullet.age = 0;
    bullet.wave = wave;
    bullet.phase = phase;
    bullet.view.position.set(x, y);
    bullet.view.visible = true;
  }

  function release(bullet: Bullet) {
    bullet.active = false;
    bullet.view.visible = false;
  }

  function clearBullets() {
    for (const bullet of [...playerBullets, ...enemyBullets]) release(bullet);
  }

  function spawnPlayerShot() {
    const dx = boss.x - player.x;
    const dy = boss.y - (player.y - 34);
    const length = Math.max(Math.hypot(dx, dy), 1);
    spawn(playerBullets, player.x, player.y - 34, (dx / length) * 430, (dy / length) * 430, 4);
    playTone(780, 420, 0.045, 0.12, 'square');
  }

  function spawnFan() {
    const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
    for (const offset of [-0.5, -0.25, 0, 0.25, 0.5]) {
      const angle = aim + offset;
      spawn(enemyBullets, boss.x, boss.y + 24, Math.cos(angle) * 116, Math.sin(angle) * 116, 5);
    }
  }

  function spawnRing() {
    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2 + elapsed * 0.4;
      spawn(enemyBullets, boss.x, boss.y, Math.cos(angle) * 84, Math.sin(angle) * 84, 5);
    }
  }

  function spawnCurtain() {
    const gap = bounds.width / 8;
    for (let index = 0; index < 9; index += 1) {
      spawn(enemyBullets, bounds.left + index * gap, bounds.top - 8, 0, 104 + (index % 2) * 18, 5, 30, index * 0.7);
    }
  }

  function beginExplosion() {
    if (exploding) return;
    exploding = true;
    explosionElapsed = 0;
    clearBullets();
    playExplosion();
    for (const shard of shards) {
      shard.view.position.copyFrom(boss.position);
      shard.view.rotation = 0;
      shard.view.alpha = 1;
      shard.view.visible = true;
    }
  }

  function finish() {
    if (!active) return;
    active = false;
    exploding = false;
    window.clearTimeout(reducedMotionTimer);
    const complete = onComplete;
    onComplete = undefined;
    complete?.();
  }

  function layout(nextBounds: BattleBounds) {
    bounds = nextBounds;
    field.clear().rect(bounds.left, bounds.top, bounds.width, bounds.height).fill({ color: COLORS.night, alpha: 0.98 });
    for (let x = bounds.left; x <= bounds.left + bounds.width; x += 28) {
      field.moveTo(x, bounds.top).lineTo(x, bounds.top + bounds.height).stroke({ width: 1, color: COLORS.teal, alpha: 0.035 });
    }
    for (let y = bounds.top; y <= bounds.top + bounds.height; y += 28) {
      field.moveTo(bounds.left, y).lineTo(bounds.left + bounds.width, y).stroke({ width: 1, color: COLORS.teal, alpha: 0.035 });
    }
    field.rect(bounds.left, bounds.top, bounds.width, bounds.height).stroke({ width: 1, color: COLORS.originiumDeep, alpha: 0.42 });
    flash.clear().rect(bounds.left, bounds.top, bounds.width, bounds.height).fill({ color: 0xffffff, alpha: 1 });
    flash.alpha = 0;
    const shipWidth = Math.min(bounds.width * 0.24, 96);
    landship.scale.set(shipWidth / Math.max(landship.texture.width, 1));
    if (!active) player.position.set(bounds.left + bounds.width / 2, bounds.top + bounds.height * 0.84);
    player.x = Math.max(bounds.left + 34, Math.min(bounds.left + bounds.width - 34, player.x));
    player.y = Math.max(bounds.top + bounds.height * 0.46, Math.min(bounds.top + bounds.height - 42, player.y));
    boss.position.set(bounds.left + bounds.width / 2, bounds.top + Math.min(bounds.height * 0.16, 112));
  }

  function start(complete: () => void) {
    if (active) return;
    window.clearTimeout(reducedMotionTimer);
    active = true;
    exploding = false;
    elapsed = 0;
    explosionElapsed = 0;
    lastTime = 0;
    hits = 0;
    playerInvulnerability = 0;
    playerHitElapsed = 0;
    bossHitElapsed = 0;
    nextPlayerShot = ENTER_TIME + 0.1;
    nextFan = ENTER_TIME + 0.7;
    nextRing = ENTER_TIME + 1.5;
    nextCurtain = ENTER_TIME + 2.4;
    onComplete = complete;
    clearBullets();
    layer.visible = true;
    layer.alpha = 1;
    boss.visible = true;
    boss.alpha = 1;
    player.visible = true;
    player.alpha = 1;
    player.position.set(bounds.left + bounds.width / 2, bounds.top + bounds.height + 80);
    for (const shard of shards) shard.view.visible = false;
    primeAudio();

    if (reducedMotion) {
      boss.scale.set(1);
      player.position.set(bounds.left + bounds.width / 2, bounds.top + bounds.height * 0.84);
      reducedMotionTimer = window.setTimeout(() => {
        playExplosion();
        finish();
      }, 450);
    }
  }

  function moveBy(deltaX: number, deltaY: number) {
    if (!active || exploding || !Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;
    player.x = Math.max(bounds.left + 34, Math.min(bounds.left + bounds.width - 34, player.x + deltaX));
    player.y = Math.max(bounds.top + bounds.height * 0.46, Math.min(bounds.top + bounds.height - 42, player.y + deltaY));
  }

  function updateBullets(delta: number) {
    const margin = 50;
    for (const bullet of playerBullets) {
      if (!bullet.active) continue;
      bullet.view.x += bullet.vx * delta;
      bullet.view.y += bullet.vy * delta;
      if (Math.abs(bullet.view.x - boss.x) <= 38 && Math.abs(bullet.view.y - boss.y) <= 50) {
        release(bullet);
        hits += 1;
        bossHitElapsed = 0.1;
      } else if (bullet.view.y < bounds.top - margin) {
        release(bullet);
      }
    }

    for (const bullet of enemyBullets) {
      if (!bullet.active) continue;
      bullet.age += delta;
      bullet.view.x += (bullet.vx + Math.sin(bullet.age * 3.2 + bullet.phase) * bullet.wave) * delta;
      bullet.view.y += bullet.vy * delta;
      bullet.view.rotation += delta * 2.2;
      if (circlesOverlap(bullet.view.x, bullet.view.y, bullet.radius, player.x, player.y, 17)) {
        release(bullet);
        if (playerInvulnerability <= 0) {
          playerInvulnerability = 0.42;
          playerHitElapsed = 0.24;
          playerHitRing.position.copyFrom(player.position);
          playerHitRing.visible = true;
          playerHitRing.alpha = 1;
          playerHitRing.scale.set(0.72);
          playTone(150, 72, 0.1, 0.24, 'sawtooth');
        }
      } else if (
        bullet.view.x < bounds.left - margin
        || bullet.view.x > bounds.left + bounds.width + margin
        || bullet.view.y < bounds.top - margin
        || bullet.view.y > bounds.top + bounds.height + margin
      ) {
        release(bullet);
      }
    }
  }

  function tick(time: number) {
    if (!active || reducedMotion) return;
    const delta = lastTime === 0 ? 0 : Math.min(Math.max(time - lastTime, 0), 0.05);
    lastTime = time;
    elapsed += delta;

    if (exploding) {
      explosionElapsed += delta;
      boss.alpha = Math.max(1 - explosionElapsed * 3.5, 0);
      flash.alpha = Math.max(0.72 - explosionElapsed * 1.7, 0);
      for (const shard of shards) {
        shard.view.x += shard.vx * delta;
        shard.view.y += shard.vy * delta;
        shard.view.rotation += shard.spin * delta;
        shard.view.alpha = Math.max(1 - explosionElapsed / EXPLOSION_TIME, 0);
      }
      if (explosionElapsed >= EXPLOSION_TIME) finish();
      return;
    }

    const enterProgress = Math.min(elapsed / ENTER_TIME, 1);
    const eased = 1 - Math.pow(1 - enterProgress, 3);
    boss.y = bounds.top + bounds.height * 0.48 + (Math.min(bounds.height * 0.16, 112) - bounds.height * 0.48) * eased;
    player.y = bounds.top + bounds.height + 80 + (bounds.top + bounds.height * 0.84 - bounds.top - bounds.height - 80) * eased;
    const bossScale = 2.7 - eased * 1.7;
    boss.scale.set(bossScale * (bossHitElapsed > 0 ? 1.08 : 1));
    bossAura.alpha = 0.45 + Math.abs(Math.sin(time * 2.4)) * 0.42;
    bossCore.scale.set(1 + Math.abs(Math.sin(time * 4.1)) * 0.12);
    thruster.alpha = 0.58 + Math.abs(Math.sin(time * 12)) * 0.42;
    playerInvulnerability = Math.max(playerInvulnerability - delta, 0);
    playerHitElapsed = Math.max(playerHitElapsed - delta, 0);
    bossHitElapsed = Math.max(bossHitElapsed - delta, 0);
    landship.tint = playerHitElapsed > 0 ? COLORS.red : 0xffffff;
    player.alpha = playerInvulnerability > 0 && Math.sin(time * 34) > 0.1 ? 0.5 : 1;
    if (playerHitRing.visible) {
      playerHitRing.alpha = Math.max(playerHitElapsed / 0.24, 0);
      playerHitRing.scale.set(0.72 + (1 - playerHitElapsed / 0.24) * 0.65);
      if (playerHitElapsed === 0) playerHitRing.visible = false;
    }

    if (elapsed >= ENTER_TIME) {
      while (elapsed >= nextPlayerShot) {
        spawnPlayerShot();
        nextPlayerShot += 0.24;
      }
      if (elapsed >= nextFan) {
        spawnFan();
        nextFan += 1.05;
      }
      if (elapsed >= nextRing) {
        spawnRing();
        nextRing += 2.35;
      }
      if (elapsed >= nextCurtain) {
        spawnCurtain();
        nextCurtain += 2.8;
      }
      updateBullets(delta);
    }

    if (shouldBattleExplode(elapsed, hits)) beginExplosion();
  }

  function reset() {
    window.clearTimeout(reducedMotionTimer);
    active = false;
    exploding = false;
    onComplete = undefined;
    clearBullets();
    layer.visible = false;
    playerHitRing.visible = false;
    for (const shard of shards) shard.view.visible = false;
  }

  return {
    layer,
    layout,
    primeAudio,
    start,
    moveBy,
    tick,
    hide() {
      layer.visible = false;
    },
    setMuted(nextMuted: boolean) {
      muted = nextMuted;
      if (!muted) primeAudio();
      if (masterGain) masterGain.gain.value = muted ? 0 : 0.22;
    },
    setReducedMotion(nextReducedMotion: boolean) {
      reducedMotion = nextReducedMotion;
      if (reducedMotion && active) {
        window.clearTimeout(reducedMotionTimer);
        reducedMotionTimer = window.setTimeout(finish, 120);
      }
    },
    reset,
    destroy() {
      reset();
      void audioContext?.close().catch(() => undefined);
      audioContext = null;
      masterGain = null;
    },
  };
}
