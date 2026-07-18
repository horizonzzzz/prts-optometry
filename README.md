# Vision Screening / PRTS Optometry

Mobile-first fictional vision-screening experience inspired by Arknights / PRTS.

Tap the central house view to move through clear focus, blur calibration, and anomaly drift, then open an unstable originium-framed PRTS reveal. Acts 1–3 use a cold white / charcoal industrial terminal look (cyan for system feedback, red for anomaly). The final act keeps its own dark reveal style.

> [!IMPORTANT]
> This is a **fictional visual effect**, not a medical eye test. The page does not collect accounts, location, or personal data.

## Features

- Four-stage interaction: `intro → calibrate → drift → reveal`, then reset
- Default **PixiJS 8** visual terminal with overlaid accessible hit targets
- Legacy **DOM + GSAP** implementation retained at `#/legacy-dom`
- Local ambient / reveal audio after the first user gesture, with mute support
- `prefers-reduced-motion` friendly stage progression
- Deployable as a Cloudflare Workers SPA

## Quick start

```bash
npm install
npm run dev
```

Open the dev server and preview around **390×844** (mobile portrait). For a wider two-column layout check, use roughly **960×700+**.

```bash
npm test
npm run typecheck
npm run build
```

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server (`0.0.0.0`) |
| `npm test` | Vitest unit tests |
| `npm run typecheck` | TypeScript project build check |
| `npm run build` | Production bundle |
| `npm run preview` | Build + local Wrangler preview |
| `npm run deploy` | Build + `wrangler deploy` |

## Interaction

```text
Entry “start” control
  → screening UI

Tap center house view
  intro (clear) → calibrate (blur) → drift (anomaly) → reveal

Reveal reset control
  reveal → intro

Mute
  toggles audio only (does not change stage)
```

Routes (HashRouter):

| URL | Experience |
|-----|------------|
| `#/` | Pixi terminal (default) |
| `#/legacy-dom` | Original DOM / GSAP page |

## Stack

- **React 19** + **TypeScript** + **Vite 8** — app shell and routing
- **PixiJS 8** — default canvas terminal (`src/pixi/`)
- **GSAP** — stage transitions (Pixi main scene + legacy DOM page)
- **Sass** — legacy DOM styling and Pixi overlay hit-target layout
- **Vitest** — pure state / layout helper tests
- **Cloudflare Workers** (`wrangler`, `@cloudflare/vite-plugin`) — hosting

## Project layout

```text
src/
  main.tsx                 # routes
  state.ts                 # stage machine + copy
  pages/
    PixiVisionPage.tsx     # default experience
    LegacyDomPage.tsx      # DOM fallback
  pixi/                    # scene modules, assets, layout helpers
  styles/                  # SCSS entrypoints + partials
assets/                    # images, particles, audio
fonts/                     # Bender, Novecento, Source Han Sans SC
```

Agent-oriented setup, architecture notes, and contribution guardrails live in [`AGENTS.md`](./AGENTS.md).

## Resources

| Asset | Use |
|-------|-----|
| `assets/vision-house.jpg` | Shared far-house view for the first three acts |
| `assets/prts-close.jpg` | Reveal portrait (focus mask on the head) |
| `assets/official-terminal-blueprint.jpg` | Entry blueprint texture |
| `assets/official-terminal-grid.jpg` | Detection grid texture |
| `assets/official-rhodes-island.png` | Rhodes Island mark |
| `assets/audio/bgm.ea4286.mp3` | Ambient loop after start |
| `assets/audio/luanxu.mp3` | Reveal loop |
| `fonts/*` | Local Bender / Novecento / Source Han Sans SC |

Originium framing is drawn in-scene (segmented chevrons / displacement), closing in on reveal and occasionally tearing without covering the portrait.

Reference sources:

- Official site: https://ak.hypergryph.com/#index
- Fan Kit: https://www.arknights.global/fankit
- Wiki: https://ak.mooncell.wiki/w/首页

Fan Kit materials are used only for this non-commercial fan experience. Re-check official terms before public redistribution or merch.

## Fallback behavior

- If Pixi / WebGL fails to initialize, the default page shows an error; the legacy DOM route remains available at `#/legacy-dom`
- If audio is blocked or fails to load, playback degrades silently
- `prefers-reduced-motion: reduce` removes large travel and continuous flicker while keeping stage changes and the final image
- Missing remote textures (legacy path) fall back to inline SVG / CSS gradients where applicable

## Deploy

Production target is Cloudflare Workers (`prts-optometry` in `wrangler.jsonc`), configured as a single-page app:

```bash
npm run deploy
```

Local worker-style preview:

```bash
npm run preview
```
