import {
  Container,
  Graphics,
  GraphicsContext,
  Sprite,
  type Texture,
} from 'pixi.js';
import battleShotAudio from '../../assets/audio/battle-shot.wav';
import battleVictoryAudio from '../../assets/audio/battle-victory.wav';
import { COLORS } from './visionSceneModel';

type BattleBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type BattleTimelinePhase = 'enter' | 'query' | 'archive' | 'overwrite' | 'disconnect';

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
const QUERY_TIME = 1.7;
const ARCHIVE_TIME = 5.2;
const OVERWRITE_TIME = 9.6;
const DISCONNECT_TIME = 14.4;
const MIN_EXPLOSION_TIME = 15.5;
const FORCE_EXPLOSION_TIME = 16.8;
const EXPLOSION_TIME = 1.1;
const REQUIRED_HITS = 40;
const CURTAIN_GAPS = [2, 5, 3, 6, 4] as const;
const SHOT_VOLUME = 0.3;
const VICTORY_VOLUME = 0.5;

export function circlesOverlap(ax: number, ay: number, ar: number, bx: number, by: number, br: number) {
  return Math.hypot(ax - bx, ay - by) <= ar + br;
}

export function shouldBattleExplode(elapsed: number, hits: number) {
  return elapsed >= FORCE_EXPLOSION_TIME || (elapsed >= MIN_EXPLOSION_TIME && hits >= REQUIRED_HITS);
}

export function getBattleTimelinePhase(elapsed: number): BattleTimelinePhase {
  if (elapsed < QUERY_TIME) return 'enter';
  if (elapsed < ARCHIVE_TIME) return 'query';
  if (elapsed < OVERWRITE_TIME) return 'archive';
  if (elapsed < DISCONNECT_TIME) return 'overwrite';
  return 'disconnect';
}

export function getCurtainSafeGapIndex(waveIndex: number) {
  return CURTAIN_GAPS[Math.max(Math.floor(waveIndex), 0) % CURTAIN_GAPS.length];
}

export function isCircularGapIndex(index: number, center: number, count: number) {
  const distance = Math.abs(index - center);
  return Math.min(distance, count - distance) <= 1;
}

export function createVisionBattleScene(landshipTexture: Texture, portraitTexture: Texture, initialReducedMotion: boolean) {
  const layer = new Container({ label: 'vision-battle' });
  const effectAudio = new Audio(battleShotAudio);
  const field = new Graphics();
  const curtainWarningLayer = new Container();
  const enemyBulletLayer = new Container();
  const playerBulletLayer = new Container();
  const boss = new Container({ label: 'priestess-battle-core' });
  const bossAura = new Graphics();
  const bossBody = new Graphics();
  const bossPortraitGroup = new Container();
  const bossPortraitMask = new Graphics();
  const bossPortraitCyan = new Sprite(portraitTexture);
  const bossPortraitRed = new Sprite(portraitTexture);
  const bossPortrait = new Sprite(portraitTexture);
  const bossFractures = new Graphics();
  const bossCore = new Graphics();
  const landship = new Sprite(landshipTexture);
  const player = new Container({ label: 'rhodes-landship' });
  const playerCore = new Graphics();
  const playerHitRing = new Graphics();
  const explosionLayer = new Container();
  const flash = new Graphics();

  layer.addChild(field, curtainWarningLayer, enemyBulletLayer, playerBulletLayer, boss, player, playerHitRing, explosionLayer, flash);
  boss.addChild(bossAura, bossBody, bossPortraitGroup, bossFractures, bossCore);
  bossPortraitGroup.addChild(bossPortraitMask, bossPortraitCyan, bossPortraitRed, bossPortrait);
  player.addChild(landship, playerCore);
  const bossPortraitScale = Math.max(68 / Math.max(portraitTexture.width, 1), 104 / Math.max(portraitTexture.height, 1));
  for (const sprite of [bossPortraitCyan, bossPortraitRed, bossPortrait]) {
    sprite.anchor.set(0.5);
    sprite.scale.set(bossPortraitScale);
    sprite.y = 9;
  }
  landship.anchor.set(0.5);
  layer.visible = false;

  bossAura
    .moveTo(0, -64).lineTo(31, -27)
    .moveTo(44, -12).lineTo(50, 0).lineTo(31, 27)
    .moveTo(18, 43).lineTo(0, 64).lineTo(-18, 43)
    .moveTo(-31, 27).lineTo(-50, 0).lineTo(-44, -12)
    .moveTo(-31, -27).lineTo(0, -64)
    .stroke({ width: 6, color: COLORS.originium, alpha: 0.24 });
  bossBody
    .moveTo(0, -48).lineTo(36, 0).lineTo(0, 48).lineTo(-36, 0).closePath()
    .fill({ color: 0x14191c, alpha: 0.88 })
    .stroke({ width: 3, color: COLORS.originiumSoft, alpha: 0.92 });
  bossPortraitMask
    .moveTo(0, -42).lineTo(31, 0).lineTo(0, 42).lineTo(-31, 0).closePath()
    .fill(0xffffff);
  bossPortraitMask.renderable = true;
  bossPortraitMask.alpha = 0;
  bossPortraitGroup.mask = bossPortraitMask;
  bossPortraitCyan.tint = COLORS.cyan;
  bossPortraitRed.tint = COLORS.red;
  bossPortraitCyan.blendMode = 'screen';
  bossPortraitRed.blendMode = 'screen';
  bossFractures
    .moveTo(-25, -18).lineTo(-8, -4).lineTo(-17, 12)
    .moveTo(24, -25).lineTo(9, -10).lineTo(18, 6).lineTo(7, 21)
    .moveTo(-8, 28).lineTo(2, 13).lineTo(12, 30)
    .stroke({ width: 1.5, color: COLORS.ice, alpha: 0.9 });
  bossCore
    .moveTo(0, -15).lineTo(10, 0).lineTo(0, 15).lineTo(-10, 0).closePath()
    .fill({ color: COLORS.originium, alpha: 0.94 })
    .stroke({ width: 2, color: 0xffffff, alpha: 0.72 });
  playerCore
    .circle(0, 0, 7)
    .fill({ color: COLORS.night, alpha: 0.88 })
    .stroke({ width: 2, color: COLORS.cyan, alpha: 1 })
    .moveTo(0, -12).lineTo(0, -8)
    .moveTo(12, 0).lineTo(8, 0)
    .moveTo(0, 12).lineTo(0, 8)
    .moveTo(-12, 0).lineTo(-8, 0)
    .stroke({ width: 2, color: COLORS.pale, alpha: 0.9 });
  playerHitRing.circle(0, 0, 34).stroke({ width: 3, color: COLORS.red, alpha: 1 });
  playerHitRing.visible = false;

  const playerBulletContext = new GraphicsContext()
    .roundRect(-2, -11, 4, 22, 2)
    .fill({ color: COLORS.pale, alpha: 1 })
    .roundRect(-3.5, -12, 7, 24, 3)
    .stroke({ width: 1, color: COLORS.cyan, alpha: 0.86 });
  const enemyBulletContext = new GraphicsContext()
    .moveTo(0, -9).lineTo(5, 0).lineTo(0, 9).lineTo(-5, 0).closePath()
    .fill({ color: COLORS.originium, alpha: 0.96 })
    .stroke({ width: 1.5, color: COLORS.shadow, alpha: 0.88 })
    .moveTo(0, -5).lineTo(0, 5)
    .stroke({ width: 1, color: COLORS.pale, alpha: 0.72 });
  const curtainWarningContext = new GraphicsContext()
    .moveTo(0, 0).lineTo(6, 8).lineTo(0, 16).lineTo(-6, 8).closePath()
    .stroke({ width: 1.5, color: COLORS.originiumSoft, alpha: 0.92 });
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
  const curtainWarnings = Array.from({ length: 9 }, () => {
    const view = new Graphics(curtainWarningContext);
    view.visible = false;
    curtainWarningLayer.addChild(view);
    return view;
  });
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
  let shipHalfWidth = 42;
  let shipHalfHeight = 42;
  let nextPlayerShot = ENTER_TIME + 0.1;
  let nextQuery = QUERY_TIME;
  let nextArchive = ARCHIVE_TIME;
  let nextOverwrite = OVERWRITE_TIME;
  let nextDisconnect = DISCONNECT_TIME;
  let curtainWave = 0;
  let disconnectWave = 0;
  let pendingCurtainWave = -1;
  let pendingCurtainAt = Number.POSITIVE_INFINITY;
  let onComplete: (() => void) | undefined;
  let reducedMotionTimer = 0;
  let effectSource = battleShotAudio;

  effectAudio.preload = 'auto';

  function primeAudio() {
    playEffect(battleShotAudio, SHOT_VOLUME);
  }

  function playEffect(source: string, volume: number) {
    if (muted) return;
    if (effectSource !== source) {
      effectSource = source;
      effectAudio.src = source;
    }
    effectAudio.volume = volume;
    effectAudio.currentTime = 0;
    void effectAudio.play().catch(() => undefined);
  }

  function playExplosion() {
    playEffect(battleVictoryAudio, VICTORY_VOLUME);
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
    bullet.view.rotation = 0;
    bullet.view.alpha = 1;
    bullet.view.scale.set(1);
    bullet.view.visible = true;
  }

  function release(bullet: Bullet) {
    bullet.active = false;
    bullet.view.visible = false;
  }

  function clearBullets() {
    for (const bullet of [...playerBullets, ...enemyBullets]) release(bullet);
  }

  function clearCurtainWarning() {
    for (const warning of curtainWarnings) warning.visible = false;
    pendingCurtainWave = -1;
    pendingCurtainAt = Number.POSITIVE_INFINITY;
  }

  function spawnPlayerShot() {
    const shotY = player.y - shipHalfHeight * 0.78;
    const dx = boss.x - player.x;
    const dy = boss.y - shotY;
    const length = Math.max(Math.hypot(dx, dy), 1);
    spawn(playerBullets, player.x, shotY, (dx / length) * 430, (dy / length) * 430, 4);
    playEffect(battleShotAudio, SHOT_VOLUME);
  }

  function spawnFan() {
    const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
    for (const offset of [-0.5, -0.25, 0, 0.25, 0.5]) {
      const angle = aim + offset;
      spawn(enemyBullets, boss.x, boss.y + 24, Math.cos(angle) * 116, Math.sin(angle) * 116, 5);
    }
  }

  function spawnRing() {
    const count = 18;
    const rotation = elapsed * 0.35;
    const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
    const normalizedAim = ((aim - rotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const gapCenter = Math.round((normalizedAim / (Math.PI * 2)) * count) % count;
    for (let index = 0; index < count; index += 1) {
      if (isCircularGapIndex(index, gapCenter, count)) continue;
      const angle = (index / count) * Math.PI * 2 + rotation;
      spawn(enemyBullets, boss.x, boss.y, Math.cos(angle) * 84, Math.sin(angle) * 84, 5);
    }
  }

  function showCurtainWarning(waveIndex: number) {
    const safeGap = getCurtainSafeGapIndex(waveIndex);
    for (let index = 0; index < curtainWarnings.length; index += 1) {
      curtainWarnings[index].visible = index !== safeGap;
      curtainWarnings[index].alpha = 1;
    }
    pendingCurtainWave = waveIndex;
    pendingCurtainAt = elapsed + 0.35;
  }

  function spawnCurtain(waveIndex: number) {
    const gap = bounds.width / 8;
    const safeGap = getCurtainSafeGapIndex(waveIndex);
    for (let index = 0; index < 9; index += 1) {
      if (index === safeGap) continue;
      spawn(enemyBullets, bounds.left + index * gap, bounds.top - 8, 0, 104 + (index % 2) * 18, 5, 30, index * 0.7);
    }
    clearCurtainWarning();
  }

  function beginExplosion() {
    if (exploding) return;
    exploding = true;
    explosionElapsed = 0;
    clearBullets();
    clearCurtainWarning();
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
    clearBullets();
    clearCurtainWarning();
    const complete = onComplete;
    onComplete = undefined;
    complete?.();
  }

  function clampPlayerPosition() {
    player.x = Math.max(bounds.left + shipHalfWidth, Math.min(bounds.left + bounds.width - shipHalfWidth, player.x));
    player.y = Math.max(bounds.top + bounds.height * 0.46, Math.min(bounds.top + bounds.height - shipHalfHeight, player.y));
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
    flash.clear().rect(bounds.left, bounds.top, bounds.width, bounds.height).fill({ color: COLORS.originium, alpha: 1 });
    flash.alpha = 0;
    const curtainGap = bounds.width / 8;
    for (let index = 0; index < curtainWarnings.length; index += 1) {
      curtainWarnings[index].position.set(bounds.left + index * curtainGap, bounds.top + 5);
    }
    const shipWidth = Math.min(bounds.width * 0.24, 96);
    const shipScale = shipWidth / Math.max(landship.texture.width, 1);
    landship.scale.set(shipScale);
    shipHalfWidth = shipWidth / 2;
    shipHalfHeight = landship.texture.height * shipScale / 2;
    if (!active) player.position.set(bounds.left + bounds.width / 2, bounds.top + bounds.height * 0.84);
    clampPlayerPosition();
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
    nextQuery = QUERY_TIME;
    nextArchive = ARCHIVE_TIME;
    nextOverwrite = OVERWRITE_TIME;
    nextDisconnect = DISCONNECT_TIME;
    curtainWave = 0;
    disconnectWave = 0;
    pendingCurtainWave = -1;
    pendingCurtainAt = Number.POSITIVE_INFINITY;
    onComplete = complete;
    clearBullets();
    clearCurtainWarning();
    layer.visible = true;
    layer.alpha = 1;
    boss.visible = true;
    boss.alpha = 1;
    boss.scale.set(2.7);
    boss.rotation = 0;
    bossAura.rotation = 0;
    bossBody.rotation = 0;
    bossPortraitGroup.alpha = 1;
    bossPortraitGroup.scale.set(1);
    bossPortraitCyan.position.set(-2, 9);
    bossPortraitRed.position.set(2, 9);
    bossPortrait.position.set(0, 9);
    bossPortraitCyan.alpha = 0.15;
    bossPortraitRed.alpha = 0.12;
    bossPortrait.alpha = 0.72;
    bossFractures.alpha = 0.08;
    bossCore.alpha = 1;
    bossCore.rotation = 0;
    bossCore.scale.set(1);
    player.visible = true;
    player.alpha = 1;
    landship.tint = 0xffffff;
    playerCore.tint = 0xffffff;
    playerCore.alpha = 1;
    playerCore.scale.set(1);
    flash.alpha = 0;
    player.position.set(bounds.left + bounds.width / 2, bounds.top + bounds.height + 80);
    for (const shard of shards) shard.view.visible = false;

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
    player.x += deltaX;
    player.y += deltaY;
    clampPlayerPosition();
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
      const collapse = Math.min(explosionElapsed / 0.62, 1);
      boss.scale.set(Math.max(1 - collapse * 0.94, 0.06), 1 + collapse * 0.12);
      boss.alpha = explosionElapsed < 0.5 ? 1 : Math.max(1 - (explosionElapsed - 0.5) * 2.4, 0);
      bossPortraitGroup.alpha = Math.max(1 - collapse * 1.3, 0);
      flash.alpha = Math.max(0.62 - explosionElapsed * 1.5, 0);
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
    const damageProgress = Math.min(hits / REQUIRED_HITS, 1);
    const hitScale = bossHitElapsed > 0 ? 1.045 : 1;
    const hitJitter = bossHitElapsed > 0 ? Math.sin(time * 90) * 3.2 : 0;
    boss.scale.set(bossScale * hitScale);
    bossAura.rotation = -time * 0.08;
    bossAura.alpha = 0.45 + Math.abs(Math.sin(time * 2.4)) * 0.42;
    bossBody.rotation = Math.sin(time * 1.1) * 0.012 * damageProgress;
    bossPortraitCyan.x = -2 - hitJitter;
    bossPortraitRed.x = 2 + hitJitter;
    bossPortrait.alpha = 0.72 - damageProgress * 0.22;
    bossFractures.alpha = 0.08 + damageProgress * 0.9;
    bossCore.scale.set(1 + Math.abs(Math.sin(time * 4.1)) * 0.12);
    bossCore.rotation = time * 0.22;
    playerInvulnerability = Math.max(playerInvulnerability - delta, 0);
    playerHitElapsed = Math.max(playerHitElapsed - delta, 0);
    bossHitElapsed = Math.max(bossHitElapsed - delta, 0);
    landship.tint = playerHitElapsed > 0 ? COLORS.red : 0xffffff;
    playerCore.tint = playerHitElapsed > 0 ? COLORS.red : 0xffffff;
    playerCore.alpha = 0.72 + Math.abs(Math.sin(time * 5.5)) * 0.28;
    playerCore.scale.set(playerHitElapsed > 0 ? 1.2 : 1);
    player.alpha = playerInvulnerability > 0 && Math.sin(time * 34) > 0.1 ? 0.5 : 1;
    for (const warning of curtainWarnings) {
      if (warning.visible) warning.alpha = 0.5 + Math.abs(Math.sin(time * 18)) * 0.5;
    }
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
      if (pendingCurtainWave >= 0 && elapsed >= pendingCurtainAt) spawnCurtain(pendingCurtainWave);

      const timelinePhase = getBattleTimelinePhase(elapsed);
      if (timelinePhase === 'query' && elapsed >= nextQuery) {
        spawnFan();
        nextQuery += 0.95;
      } else if (timelinePhase === 'archive' && elapsed >= nextArchive) {
        spawnRing();
        nextArchive += 1.55;
      } else if (timelinePhase === 'overwrite' && elapsed >= nextOverwrite && pendingCurtainWave < 0) {
        showCurtainWarning(curtainWave);
        curtainWave += 1;
        nextOverwrite += 2;
      } else if (timelinePhase === 'disconnect' && elapsed >= nextDisconnect) {
        if (disconnectWave % 2 === 0) spawnFan();
        else spawnRing();
        disconnectWave += 1;
        nextDisconnect += 0.8;
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
    clearCurtainWarning();
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
      effectAudio.muted = muted;
      if (muted) effectAudio.pause();
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
      effectAudio.pause();
      effectAudio.currentTime = 0;
    },
  };
}
