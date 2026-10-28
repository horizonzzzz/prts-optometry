# AGENTS.md

## Project overview

移动端优先的 PRTS 同人游戏合集（fan game collection）：两个独立小游戏共用一套构建、路由、样式 token 与部署。总菜单位于 `#/index`，旧验光根路由保留以兼容已印出的二维码。

Stack:

- React 19 + TypeScript + Vite 8
- PixiJS 8（验光游戏，默认视觉终端）
- Phaser 4.2.1 + Arcade Physics（M3 横版跳跃，独立 lazy 路由）
- GSAP 3（验光的 DOM 后备版本与 stage 过渡）
- Sass/SCSS (no Tailwind)
- React Router 7 (`HashRouter`)
- Vitest
- Cloudflare Workers + Wrangler (`@cloudflare/vite-plugin`)

Package name: `prts-fan-games`. Worker name: `prts-fan-games`.

This is a fictional fan experience, not a medical test. Do not add account, location, or personal-data collection.

## Setup commands

```bash
npm install
npm run dev          # Vite dev server on 0.0.0.0
npm test             # vitest run
npm run typecheck    # tsc -b
npm run build        # tsc -b && vite build
npm run preview      # build + wrangler dev
npm run deploy       # build + wrangler deploy
```

Preview target viewport: about `390×844` mobile, plus wide layout checks around `960×700+`. M3 is checked in landscape (`844×390`); its portrait touch overlay is CSS-only (`(orientation: portrait) and (pointer: coarse)`).

## Architecture

```text
src/
  main.tsx                    # HashRouter entry; default route is the optometry game
  pages/
    IndexPage.tsx             # PRTS 总菜单（轻量 DOM）
    OptometryPage.tsx         # 验光默认 UX：React hit-targets + Pixi canvas host
    LegacyDomPage.tsx         # 验光 DOM/GSAP fallback at #/legacy-dom
    M3RescuePage.tsx          # Phaser 宿主、真实按钮、失败层
  optometry/
    state.ts                  # 验光纯 stage/mute 状态机 + copy
    state.test.ts
    createOptometryScene.ts   # Application 生命周期、layout CSS vars、public API
    optometryEntryScene.ts    # boot/entry terminal
    optometryMainScene.ts     # 主要筛查 stage + reveal
    optometryDialogueScene.ts
    optometryBattleScene.ts
    optometryBattleAudio.ts
    optometryProfileScene.ts
    optometryOperationPanel.ts
    optometrySceneAssets.ts   # texture loading
    optometrySceneGraphics.ts # draw/text helpers
    optometrySceneModel.ts    # colors, layout helpers, scene types
    createOptometryScene.test.ts
  m3/
    core/                     # 手感、输入、流程（不导入 Phaser/Pixi）
    world/                    # 48×27 横屏 ASCII 地图（768×432，16:9）
    render/                   # Phaser Graphics 占位绘制
    createM3Scene.ts          # Phaser Game / Scene、Arcade 适配和销毁
    core.test.ts
  styles/
    main.scss                 # 验光 DOM/GSAP 样式入口
    optometry.scss            # 验光 Pixi 页 hit-target / loading 样式
    terminal.scss             # 总菜单与终端页面样式
    m3.scss                   # M3 页面样式
    abstracts|base|components|layout/
assets/                       # images, particle, audio
fonts/                        # local Bender / Novecento / Source Han Sans SC
docs/                         # 各游戏设计文档
```

### Routes

| Path | Page | Notes |
|------|------|--------|
| `#/index` | `IndexPage` | PRTS 总菜单 |
| `#/` | `OptometryPage` | 验光默认入口；保留旧二维码 |
| `#/legacy-dom` | `LegacyDomPage` | 验光 GSAP + DOM 实现 |
| `#/m3` | `M3RescuePage` | Phaser + Arcade Physics 验证场 |
| other | redirect to `#/index` | |

## 验光游戏（optometry）

### Interaction contract

```text
entry start button → screening UI
tap center house: intro (clear) → calibrate (blur) → drift (anomaly) → reveal
tap reveal / reset control: reveal → reset to intro
mute toggles audio only; does not advance stages
```

State lives in pure functions in `src/optometry/state.ts`:

- `createInitialState()` → `{ stage: 'intro', muted: false }`
- `advanceState(state, action)` with actions `START | CONFIRM | CONTINUE | RESET | TOGGLE_MUTE`
- `getStageCopy(state)` for Chinese UI strings

Prefer keeping stage logic in `state.ts` and covered by `state.test.ts`. Do not bury stage transitions only inside Pixi/DOM animation code.

### Optometry scene contract

`createOptometryScene` returns:

```ts
{
  setStarted(started, onComplete?)
  setStage(stage)
  setMuted(muted)
  setReducedMotion(reducedMotion)
  reset()
  destroy()
}
```

React owns hit-testing (`optometry-entry-hit`, `optometry-vision-hit`, `optometry-reset-hit`, `optometry-sound-hit`, `optometry-index-hit`). Pixi owns drawing and writes layout anchors back to the host via CSS custom properties (`--optometry-entry-*`, `--optometry-vision-*`, `--optometry-sound-*`, `--optometry-reset-*`, `--optometry-index-*`). Keep that split: do not move primary click handling into Pixi unless accessibility and hit-target layout are updated together.

The `← INDEX` back control is drawn by the Pixi entry scene (inside the `chrome` container, so it fades in with `boot.action` and slides out with the handoff), and React renders only a transparent `Link.optometry-index-hit` over it. That hit box is deliberately taller than the drawn row (44px vs 24px) for touch; it renders only while `entryReady && !started`.

Layout helpers under test:

- `getCopyHeight`, `isWideLayout`, `getEntryBootState`, `getSoundBarHeights`

### Audio

- Ambient: `assets/audio/bgm.ea4286.mp3`
- Reveal: `assets/audio/luanxu.mp3`
- Start only after first user gesture
- Mute pauses both tracks; reveal swaps ambient → reveal loop
- Failed `play()` must fail silently

### Visual language

- Acts 1–3: cold white / charcoal industrial terminal; cyan = system feedback; red = anomaly
- Act 4 reveal: independent dark style with originium framing and PRTS portrait focus
- Tokens: CSS vars in `src/styles/abstracts/_variables.scss`; Pixi palette in `src/optometry/optometrySceneModel.ts` (`COLORS`)
- Keep SCSS and Pixi color tokens aligned when changing brand colors

## M3 横版跳跃（m3）

- `src/m3/core/` 和 `src/m3/world/` 不导入 Phaser/Pixi；手感决策、输入、流程与地图均可单测。
- `createM3Scene.ts` 使用 Arcade 碰撞，关闭自动物理 update，通过 60Hz 累加器推进，每渲染帧最多 5 步。
- `src/m3/render/` 使用 Phaser Graphics 占位绘制；React 提供真实触控按钮和重试层，Canvas 为 `aria-hidden`。
- Phaser 速度单位为 px/s，文档 px/帧速度乘 60、重力乘 3600；跳跃 HOLD/CUT/coyote/buffer 按物理步计时。
- 保留 Arcade 默认垂直优先分离，`forceX=true` 会让相邻地砖接缝卡住角色。
- M3 横屏优先：画布用 Phaser `Scale.FIT + CENTER_BOTH` 随宿主等比缩放居中；触控按钮覆盖在画面左下（←/→）与右下（跳跃）；竖屏触屏显示 `.m3-rotate` 遮罩，React 在 orientation 变化时清空输入。
- M3 使用独立的晴天暖色舰桥美术和游戏内界面，不使用 PRTS 页眉页脚或 `terminal.scss`。页面铺满视口，左上角保留返回、可选浏览器全屏和操作说明；全屏失败时允许继续游玩。Phaser 与 SCSS 的 M3 配色独立维护。
- M3 目前只有验证场，不包含正式六区和救援剧情；详细规划见 `docs/m3-rescue-game-design.md`。

## 跨游戏的共享边界

两个游戏只在构建、路由、本地字体和部署上共享，不共享运行时逻辑：

- 验光的状态机在 `src/optometry/state.ts`，M3 的流程状态在 `src/m3/core/progress.ts`，互不导入。
- 引擎按路由 lazy 加载；总菜单不初始化任何引擎。
- 新增游戏时按同样结构落地：`src/pages/<Game>Page.tsx` + `src/<game>/` + 独立设计文档，并在 `index.html`、README、本文件的目录结构中登记。

## Motion / a11y

- Honor `prefers-reduced-motion: reduce`: cancel large travel and continuous flicker; keep stage progression and final image
- Preserve screen-reader live region copy on the optometry page
- Canvas is decorative (`aria-hidden`); controls are real buttons overlaid by CSS

## Code style

- TypeScript `strict`; prefer explicit exported types near the state/scene boundaries
- ESM only (`"type": "module"`)
- Match existing naming: camelCase functions, `PascalCase` components, SCSS partials with `_` prefix
- Keep pure layout/timing helpers testable and free of DOM/Pixi side effects when practical
- Prefer small focused modules in `src/optometry/` over growing a single scene file further
- Comments: sparse, explain non-obvious constraints (GPU cost, handoff timing, asset provenance), not obvious code
- Do not reintroduce Tailwind; styling is Sass + small engine overlay stylesheets

## Testing

```bash
npm test
npm run typecheck
```

Current unit coverage is pure helpers / state:

- `src/optometry/state.test.ts`
- `src/optometry/createOptometryScene.test.ts`
- `src/m3/core.test.ts`
- `src/pages/OptometryPage.test.tsx`
- `src/pages/M3RescuePage.test.tsx`

When changing stage flow, copy keys, layout breakpoints, entry boot timing, or mute behavior, update these tests. Full canvas/WebGL e2e is not set up; manually verify in a mobile viewport after visual changes.

## Build and deploy

- `vite.config.ts`: `base: './'`, React plugin, Cloudflare plugin, `server.host = '0.0.0.0'`
- `wrangler.jsonc`: SPA `not_found_handling`, worker name `prts-fan-games`, `nodejs_compat`
- Production path: `npm run deploy` (build then `wrangler deploy`)
- Local worker preview: `npm run preview`

Deploy uses a custom domain, so the Worker name is not part of the public URL. Changing the name still creates a new Worker: confirm the custom domain binding after the first deploy.

Do not assume GitHub Pages; CI Pages deploy was removed.

## Assets and provenance

| Asset | Role |
|-------|------|
| `assets/vision-house.jpg` | 验光 intro/calibrate/drift 共用的房屋视图 |
| `assets/prts-close.jpg` | 验光 reveal 肖像 |
| `assets/official-terminal-*.jpg`, `official-rhodes-island.png` | Entry/grid/mark from public Fan Kit / site resources |
| `assets/common_mask.*.png`, `particle.*.png` | Mask / particle textures |
| `fonts/*` | Local copies of Bender, Novecento, Source Han Sans SC |
| `assets/audio/*` | Ambient + reveal loops |

Fan Kit / official resources are for this non-commercial fan experience. Before public redistribution or merch, re-check official terms:

- https://ak.hypergryph.com/#index
- https://www.arknights.global/fankit

Prefer local assets already vendored in-repo. Remote CDN fallbacks may exist in legacy DOM paths; the Pixi path loads local textures via `Assets.load`. AI-generated art for M3 goes to `assets/ai/` with an `ATTRIBUTIONS.md` record.
Drafts stay in `assets/ai/_drafts/` and are ignored by Git. Visual constraints, review checklist, and prompt templates live in `docs/m3-art/style-bible.md`.

### Asset sourcing order

Look for an existing suitable asset before generating one: check the official Fan Kit, assets already vendored in this repo, and permissively licensed sources on the web. Confirm the license and record the source. Only generate with AI when no suitable asset exists or the existing one cannot be adapted; this keeps cost and visual drift down.

Image generation uses the project-level `baoyu-image-gen` skill, with `OPENAI_BASE_URL`, `OPENAI_API_KEY`, and `OPENAI_IMAGE_MODEL` supplied by the environment. Never commit keys or write them into project files. Generated output goes to `assets/ai/` and is recorded in `ATTRIBUTIONS.md` with prompt, model, and source.

### Reading image assets

In this project the main agent may open local image files directly, including assets downloaded from the web and AI-generated output, instead of delegating every image to a read-only vision subagent. Judge composition, palette, and readability from the image itself. This project rule overrides the global `AGENTS.md` image-delegation rule for local asset and generation review.

## Fallback expectations

- Pixi/WebGL init failure: show error on `OptometryPage`; legacy route remains available at `#/legacy-dom`
- Phaser/WebGL init failure: show error on `M3RescuePage`; the menu stays reachable
- Audio blocked or missing: silent degrade
- Reduced motion: still allow full stage sequence without heavy animation

## PR / change guidelines

- Keep commits focused: `feat(optometry)`, `feat(m3)`, `fix(audio)`, `refactor(optometry)`, etc.
- Before finishing: `npm test` and `npm run typecheck` (and `npm run build` for deploy-touching changes)
- Manual check mobile portrait first; if layout math changed, also check wide (`>=960×700`)
- Do not commit `dist/`, `.wrangler/`, secrets, or `.env*`
- Do not expand scope into real medical claims, analytics identity, or unrelated product chrome

## Common gotchas

- Default experience at `#/` is the optometry Pixi game, not the legacy DOM page — edit `OptometryPage` / `src/optometry/*` unless the task names legacy
- Stage advance actions differ by stage (`START` / `CONFIRM` / `CONTINUE`); invalid actions must no-op
- Mute must not restart or skip reveal transitions
- Pixi resolution is capped at device DPR `2` intentionally for GPU cost
- Entry handoff uses `setStarted(true, onComplete)`; do not mark React `started` before handoff completes
- The `← INDEX` control on `#/` is Pixi-drawn and DOM-hit-tested: keep the drawing inside `chrome` so it inherits the boot fade and handoff slide; the legacy DOM route keeps its own fixed link
- Hash router means deep links use `#/…`
- `verbatimModuleSyntax` / `erasableSyntaxOnly`: use `import type` for type-only imports

> AI生成
