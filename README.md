# PRTS Fan Games

An unofficial Arknights fan game collection, created for learning and fan creation.

每个游戏独立成一个目录、一个路由、一套引擎：验光体验用 PixiJS，横版跳跃用 Phaser + Arcade Physics。两者共用构建、路由、字体、配色 token 和 Cloudflare Workers 部署。

## Development

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

Use `npm run preview` for a local Worker preview and `npm run deploy` to deploy.

## 游戏目录

| 路由 | 游戏 | 引擎 | 代码 |
|------|------|------|------|
| `#/index` | PRTS 终端目录 | React | `src/pages/IndexPage.tsx` |
| `#/` | 光学诊断终端（验光） | PixiJS 8 | `src/optometry/`、`src/pages/OptometryPage.tsx` |
| `#/legacy-dom` | 验光 DOM 后备版 | DOM + GSAP | `src/pages/LegacyDomPage.tsx` |
| `#/m3` | 代管责任 · M3（横版跳跃） | Phaser 4.2.1 | `src/m3/`、`src/pages/M3RescuePage.tsx` |

`#/` 保留验光入口，兼容已印出去的二维码；验光入口首页左上角有返回目录的入口，进入流程后隐藏。

## 两个游戏的代码约定

两个游戏目录都不依赖第三个共享状态文件：验光的状态机在 `src/optometry/state.ts`，M3 的流程状态在 `src/m3/core/progress.ts`。跨游戏只共享样式 token（`src/styles/abstracts/_variables.scss`）与构建配置，不共享运行时逻辑。

验光游戏通过 `createOptometryScene` 创建 Pixi 场景，路由卸载时销毁；M3 通过 `createM3Scene` 创建 Phaser 场景，`core/` 与 `world/` 不导入任何引擎，逻辑以 60Hz 更新，每渲染帧最多补 5 步。

M3 当前是引擎验证场：方向键 / A·D 移动，空格 / Z / ↑ 跳跃；手机可同时按住方向和跳跃按钮。沿黄色单向平台抵达绿色出口，落入回收区后手动重试。正式六区与角色素材尚未制作，规划见 [M3 设计文档](./docs/m3-rescue-game-design.md)。

`VITE_NEED_HIDE=true` 只锁定验光页，不阻止访问目录和 M3。

## License and Copyright

The original code in this repository is licensed under the [MIT License](./LICENSE).

Arknights, PRTS, Rhodes Island, related characters, names, logos, images, audio, and other associated intellectual property are owned by Hypergryph. This project is non-commercial and intended only for learning and fan creation. It is not affiliated with or endorsed by Hypergryph. The MIT License does not grant rights to any Hypergryph intellectual property or included third-party assets.
