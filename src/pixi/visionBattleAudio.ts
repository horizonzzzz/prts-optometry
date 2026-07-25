import battleDamageAudio from '../../assets/audio/battle-damage.wav';
import battleHitAudio from '../../assets/audio/battle-hit.wav';
import battleShotA from '../../assets/audio/battle-shot-a.wav';
import battleShotB from '../../assets/audio/battle-shot-b.wav';
import battleSubAudio from '../../assets/audio/battle-victory-sub.wav';
import battleVictoryAudio from '../../assets/audio/battle-victory-body.wav';
import battleWarningAudio from '../../assets/audio/battle-warning.wav';

const SOURCES = {
  shotA: battleShotA,
  shotB: battleShotB,
  warning: battleWarningAudio,
  hit: battleHitAudio,
  damage: battleDamageAudio,
  victoryBody: battleVictoryAudio,
  victorySub: battleSubAudio,
} as const;

type AudioKey = keyof typeof SOURCES;

export type VisionBattleAudio = {
  prime: () => void;
  playShot: () => void;
  playWarning: () => void;
  playPattern: () => void;
  playHit: () => void;
  playDamage: () => void;
  playVictory: () => void;
  setMuted: (muted: boolean) => void;
  destroy: () => void;
};

export function createVisionBattleAudio(): VisionBattleAudio {
  let context: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let muted = false;
  let disposed = false;
  let shotIndex = 0;
  const bufferPromises = new Map<AudioKey, Promise<AudioBuffer | null>>();

  function getContext() {
    if (disposed || context || typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return context;

    try {
      context = new window.AudioContext();
      masterGain = context.createGain();
      masterGain.gain.value = 0.78;
      masterGain.connect(context.destination);
    } catch {
      context = null;
      masterGain = null;
    }
    return context;
  }

  function loadBuffer(key: AudioKey) {
    const existing = bufferPromises.get(key);
    if (existing) return existing;

    const activeContext = getContext();
    if (!activeContext) return Promise.resolve(null);

    const promise = fetch(SOURCES[key])
      .then((response) => {
        if (!response.ok) throw new Error(`Battle audio request failed: ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => activeContext.decodeAudioData(data))
      .catch(() => null);
    bufferPromises.set(key, promise);
    return promise;
  }

  function prime() {
    const activeContext = getContext();
    if (!activeContext) return;
    void activeContext.resume().catch(() => undefined);
    for (const key of Object.keys(SOURCES) as AudioKey[]) void loadBuffer(key);
  }

  function playBuffer(key: AudioKey, volume: number, playbackRate = 1) {
    if (muted || disposed) return;
    const activeContext = getContext();
    const bus = masterGain;
    if (!activeContext || !bus) return;

    void activeContext.resume().catch(() => undefined);
    void loadBuffer(key).then((buffer) => {
      if (!buffer || muted || disposed || context !== activeContext || !masterGain) return;
      const source = activeContext.createBufferSource();
      const gain = activeContext.createGain();
      source.buffer = buffer;
      source.playbackRate.setValueAtTime(playbackRate, activeContext.currentTime);
      gain.gain.setValueAtTime(volume, activeContext.currentTime);
      source.connect(gain).connect(masterGain);
      source.start();
    });
  }

  function playShot() {
    const key = shotIndex++ % 2 === 0 ? 'shotA' : 'shotB';
    playBuffer(key, 0.22, key === 'shotA' ? 0.98 : 1.02);
  }

  function playWarning() {
    playBuffer('warning', 0.12, 0.94);
  }

  function playPattern() {
    playBuffer('warning', 0.075, 1.08);
  }

  function playHit() {
    playBuffer('hit', 0.11);
  }

  function playDamage() {
    playBuffer('damage', 0.16, 0.96);
  }

  function playVictory() {
    playBuffer('victorySub', 0.24, 0.92);
    playBuffer('victoryBody', 0.34, 0.98);
  }

  function setMuted(nextMuted: boolean) {
    muted = nextMuted;
    const activeContext = context;
    const bus = masterGain;
    if (!activeContext || !bus) return;
    const now = activeContext.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(muted ? 0 : 0.78, now, 0.015);
  }

  function destroy() {
    disposed = true;
    bufferPromises.clear();
    const activeContext = context;
    context = null;
    masterGain = null;
    void activeContext?.close().catch(() => undefined);
  }

  return { prime, playShot, playWarning, playPattern, playHit, playDamage, playVictory, setMuted, destroy };
}
