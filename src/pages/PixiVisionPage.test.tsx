/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPixiVisionScene, type DialogueSnapshot, type PixiVisionScene } from '../pixi/createPixiVisionScene';
import PixiVisionPage from './PixiVisionPage';

vi.mock('../pixi/createPixiVisionScene', () => ({
  createPixiVisionScene: vi.fn(),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function createScene(): PixiVisionScene {
  return {
    advanceDialogue: vi.fn(),
    confirmCalibration: vi.fn(),
    confirmDrift: vi.fn(),
    destroy: vi.fn(),
    getDialogueSnapshot: vi.fn((): DialogueSnapshot => ({ complete: true, lineCount: 1, lineIndex: 0, speaker: 'doctor', speakerName: '', text: '' })),
    moveDriftBy: vi.fn(),
    reset: vi.fn(),
    setMuted: vi.fn(),
    setReducedMotion: vi.fn(),
    setStage: vi.fn((_stage, onReady) => onReady?.()),
    setStarted: vi.fn((_started, onComplete) => onComplete?.()),
  };
}

async function renderPage() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<PixiVisionPage />);
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.mocked(createPixiVisionScene).mockReset();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })),
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.restoreAllMocks();
});

describe('PixiVisionPage', () => {
  it('moves focus to the primary control after the entry handoff', async () => {
    const scene = createScene();
    vi.mocked(createPixiVisionScene).mockImplementation(async ({ onEntryReady }) => {
      onEntryReady?.();
      return scene;
    });

    await renderPage();
    const start = container?.querySelector<HTMLButtonElement>('[aria-label="开始验光"]');
    const vision = container?.querySelector<HTMLButtonElement>('.pixi-vision-hit');
    expect(start?.disabled).toBe(false);

    await act(async () => {
      start?.click();
      await Promise.resolve();
    });

    expect(vision?.disabled).toBe(false);
    expect(document.activeElement).toBe(vision);
  });

  it('shows the supported fallback when Pixi initialization fails', async () => {
    vi.mocked(createPixiVisionScene).mockRejectedValue(new Error('WebGL unavailable'));

    await renderPage();
    await act(async () => {
      await Promise.resolve();
    });

    expect(container?.querySelector('.pixi-error')?.textContent).toContain('WebGL');
  });
});
