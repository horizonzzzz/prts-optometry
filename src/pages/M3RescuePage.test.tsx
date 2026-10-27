/* @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createM3Scene, type M3Scene } from '../m3/createM3Scene';
import { createRun } from '../m3/core/progress';
import type { GameInput } from '../m3/core/input';
import M3RescuePage from './M3RescuePage';

vi.mock('../m3/createM3Scene', () => ({ createM3Scene: vi.fn() }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let container: HTMLDivElement | undefined;
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })),
  });
});
afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  vi.resetAllMocks();
});

it('clears held keyboard input on blur and retry, focuses retry, destroys on unmount', async () => {
  let input!: GameInput;
  let report!: Parameters<typeof createM3Scene>[2];
  const scene: M3Scene = { destroy: vi.fn(), retry: vi.fn(() => report({ ...createRun(), recallCount: 1 })) };
  vi.mocked(createM3Scene).mockImplementation(async (_host, controls, onStatus) => {
    input = controls;
    report = onStatus;
    report(createRun());
    return scene;
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(<MemoryRouter><M3RescuePage /></MemoryRouter>));
  const area = container.querySelector<HTMLElement>('.m3-play')!;
  expect(container.querySelector('.terminal-header, .terminal-footer')).toBeNull();
  const fullscreen = container.querySelector<HTMLButtonElement>('[aria-label="切换全屏"]')!;
  const requestFullscreen = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(area, 'requestFullscreen', { configurable: true, value: requestFullscreen });
  await act(async () => fullscreen.click());
  expect(requestFullscreen).toHaveBeenCalledOnce();
  requestFullscreen.mockRejectedValueOnce(new Error('denied'));
  await act(async () => fullscreen.click());
  expect(container.textContent).toContain('未能进入全屏，可横屏继续游玩。');
  Object.defineProperty(area, 'requestFullscreen', { configurable: true, value: undefined });
  await act(async () => fullscreen.click());
  expect(container.textContent).toContain('当前浏览器不支持全屏，可横屏继续游玩。');
  const key = (code: string) => area.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  key('ArrowRight'); key('Space');
  expect(input.sample()).toMatchObject({ right: true, jump: true, pressed: true });
  window.dispatchEvent(new Event('blur'));
  expect(input.sample()).toMatchObject({ right: false, jump: false });
  key('ArrowLeft');
  await act(async () => report({ ...createRun(), status: 'recalled', recallCount: 1 }));
  const retry = container.querySelector<HTMLButtonElement>('.m3-action')!;
  expect(document.activeElement).toBe(retry);
  await act(async () => retry.click());
  expect(scene.retry).toHaveBeenCalledOnce();
  expect(input.sample()).toMatchObject({ left: false, pressed: false });
  expect(document.activeElement).toBe(area);
  await act(async () => root!.unmount());
  root = undefined;
  expect(scene.destroy).toHaveBeenCalledOnce();
});

it('destroys a scene that finishes loading after route unmount', async () => {
  let finish!: (scene: M3Scene) => void;
  vi.mocked(createM3Scene).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  container = document.createElement('div');
  root = createRoot(container);
  await act(async () => root!.render(<MemoryRouter><M3RescuePage /></MemoryRouter>));
  await act(async () => root!.unmount());
  root = undefined;
  const scene = { retry: vi.fn(), destroy: vi.fn() };
  await act(async () => finish(scene));
  expect(scene.destroy).toHaveBeenCalledOnce();
});
