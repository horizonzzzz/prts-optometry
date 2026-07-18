# AGENTS.md

## Project overview

Mobile-first fictional vision-screening experience inspired by Arknights / PRTS. Users advance through four stages by tapping the central house view, then a PRTS reveal image.

Stack:

- React 19 + TypeScript + Vite 8
- PixiJS 8 (default visual terminal)
- GSAP 3 (stage transitions in both Pixi and legacy DOM paths)
- Sass/SCSS (no Tailwind)
- React Router 7 (`HashRouter`)
- Vitest
- Cloudflare Workers + Wrangler (`@cloudflare/vite-plugin`)

Package name: `vision-screening`. Worker name: `prts-optometry`.

This is a fictional visual effect, not a medical test. Do not add account, location, or personal-data collection.

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

Preview target viewport: about `390×844` mobile, plus wide layout checks around `960×700+`.

## Architecture

```text
src/
  main.tsx                 # HashRouter entry; default route is Pixi
  state.ts                 # pure stage/mute state machine + copy
  state.test.ts
  pages/
    PixiVisionPage.tsx     # default UX: React hit-targets + Pixi canvas host
    LegacyDomPage.tsx      # DOM/GSAP fallback at #/legacy-dom
  pixi/
    createPixiVisionScene.ts   # Application lifecycle, layout CSS vars, public API
    visionEntryScene.ts        # boot/entry terminal
    visionMainScene.ts         # main screening stages + reveal
    visionSceneAssets.ts       # texture loading
    visionSceneGraphics.ts     # draw/text helpers
    visionSceneModel.ts        # colors, layout helpers, scene types
    createPixiVisionScene.test.ts
  styles/
    main.scss              # legacy DOM styles entry
    pixi.scss              # Pixi page hit-target / loading styles
    abstracts|base|components|layout/
assets/                    # images, particle, audio
fonts/                     # local Bender / Novecento / Source Han Sans SC
```

### Routes

| Path | Page | Notes |
|------|------|--------|
| `#/` | `PixiVisionPage` | Default |
| `#/legacy-dom` | `LegacyDomPage` | GSAP + DOM implementation |
| other | redirect to `#/` | |

### Interaction contract

```text
entry start button → screening UI
tap center house: intro (clear) → calibrate (blur) → drift (anomaly) → reveal
tap reveal / reset control: reveal → reset to intro
mute toggles audio only; does not advance stages
```

State lives in pure functions:

- `createInitialState()` → `{ stage: 'intro', muted: false }`
- `advanceState(state, action)` with actions `START | CONFIRM | CONTINUE | RESET | TOGGLE_MUTE`
- `getStageCopy(state)` for Chinese UI strings

Prefer keeping stage logic in `state.ts` and covered by `state.test.ts`. Do not bury stage transitions only inside Pixi/DOM animation code.

### Pixi scene contract

`createPixiVisionScene` returns:

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

React owns hit-testing (`pixi-entry-hit`, `pixi-vision-hit`, `pixi-reset-hit`, `pixi-sound-hit`). Pixi owns drawing and writes layout anchors back to the host via CSS custom properties (`--pixi-entry-*`, `--pixi-vision-*`, `--pixi-sound-*`, `--pixi-reset-*`). Keep that split: do not move primary click handling into Pixi unless accessibility and hit-target layout are updated together.

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
- Tokens: CSS vars in `src/styles/abstracts/_variables.scss`; Pixi palette in `src/pixi/visionSceneModel.ts` (`COLORS`)
- Keep SCSS and Pixi color tokens aligned when changing brand colors

### Motion / a11y

- Honor `prefers-reduced-motion: reduce`: cancel large travel and continuous flicker; keep stage progression and final image
- Preserve screen-reader live region copy on the Pixi page
- Canvas is decorative (`aria-hidden`); controls are real buttons overlaid by CSS

## Code style

- TypeScript `strict`; prefer explicit exported types near the state/scene boundaries
- ESM only (`"type": "module"`)
- Match existing naming: camelCase functions, `PascalCase` components, SCSS partials with `_` prefix
- Keep pure layout/timing helpers testable and free of DOM/Pixi side effects when practical
- Prefer small focused modules in `src/pixi/` over growing a single scene file further
- Comments: sparse, explain non-obvious constraints (GPU cost, handoff timing, asset provenance), not obvious code
- Do not reintroduce Tailwind; styling is Sass + a small Pixi overlay stylesheet

## Testing

```bash
npm test
npm run typecheck
```

Current unit coverage is pure helpers / state:

- `src/state.test.ts`
- `src/pixi/createPixiVisionScene.test.ts`

When changing stage flow, copy keys, layout breakpoints, entry boot timing, or mute behavior, update these tests. Full canvas/WebGL e2e is not set up; manually verify in a mobile viewport after visual changes.

## Build and deploy

- `vite.config.ts`: `base: './'`, React plugin, Cloudflare plugin, `server.host = '0.0.0.0'`
- `wrangler.jsonc`: SPA `not_found_handling`, worker name `prts-optometry`, `nodejs_compat`
- Production path: `npm run deploy` (build then `wrangler deploy`)
- Local worker preview: `npm run preview`

Do not assume GitHub Pages; CI Pages deploy was removed.

## Assets and provenance

| Asset | Role |
|-------|------|
| `assets/vision-house.jpg` | Shared house view for intro/calibrate/drift |
| `assets/prts-close.jpg` | Reveal portrait only |
| `assets/official-terminal-*.jpg`, `official-rhodes-island.png` | Entry/grid/mark from public Fan Kit / site resources |
| `assets/common_mask.*.png`, `particle.*.png` | Mask / particle textures |
| `fonts/*` | Local copies of Bender, Novecento, Source Han Sans SC |
| `assets/audio/*` | Ambient + reveal loops |

Fan Kit / official resources are for this non-commercial fan experience. Before public redistribution or merch, re-check official terms:

- https://ak.hypergryph.com/#index
- https://www.arknights.global/fankit

Prefer local assets already vendored in-repo. Remote CDN fallbacks may exist in legacy DOM paths; Pixi path loads local textures via `Assets.load`.

## Fallback expectations

- Pixi/WebGL init failure: show error on `PixiVisionPage`; legacy route remains available at `#/legacy-dom`
- Audio blocked or missing: silent degrade
- Reduced motion: still allow full stage sequence without heavy animation

## PR / change guidelines

- Keep commits focused: `feat(pixi)`, `fix(audio)`, `refactor(pixi)`, etc.
- Before finishing: `npm test` and `npm run typecheck` (and `npm run build` for deploy-touching changes)
- Manual check mobile portrait first; if layout math changed, also check wide (`>=960×700`)
- Do not commit `dist/`, `.wrangler/`, secrets, or `.env*`
- Do not expand scope into real medical claims, analytics identity, or unrelated product chrome

## Common gotchas

- Default experience is Pixi, not the legacy DOM page — edit `PixiVisionPage` / `src/pixi/*` unless the task names legacy
- Stage advance actions differ by stage (`START` / `CONFIRM` / `CONTINUE`); invalid actions must no-op
- Mute must not restart or skip reveal transitions
- Pixi resolution is capped at device DPR `2` intentionally for GPU cost
- Entry handoff uses `setStarted(true, onComplete)`; do not mark React `started` before handoff completes
- Hash router means deep links use `#/…`
- `verbatimModuleSyntax` / `erasableSyntaxOnly`: use `import type` for type-only imports
