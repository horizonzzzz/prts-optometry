# PRTS Optometry

An unofficial Arknights fan page created for learning and fan creation.

## Development

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

Use `npm run preview` for a local Worker preview and `npm run deploy` to deploy.

## PRTS 菜单与 M3 原型

- `#/index`：PRTS 总菜单。
- `#/`：保留原验光入口，兼容旧二维码。
- `#/m3`：Phaser 4.2.1 + Arcade Physics 横版跳跃验证场。
- `#/legacy-dom`：验光 DOM 后备版本。

M3 使用方向键 / A·D 移动，空格 / Z / ↑ 跳跃；手机可同时按住方向和跳跃按钮。沿黄色单向平台抵达绿色出口，落入回收区后手动重试。当前是引擎验证场，正式六区与角色素材尚未制作。

新游戏位于 `src/m3/`：`core/` 保存纯逻辑，`world/` 保存 ASCII 地图，Phaser 场景负责碰撞与渲染。逻辑以 60Hz 更新，每渲染帧最多补 5 步。技术方案与后续范围见 [M3 设计文档](./docs/m3-rescue-game-design.md)。

`VITE_NEED_HIDE=true` 只锁定验光页，不阻止访问菜单和 M3。

## License and Copyright

The original code in this repository is licensed under the [MIT License](./LICENSE).

Arknights, PRTS, Rhodes Island, related characters, names, logos, images, audio, and other associated intellectual property are owned by Hypergryph. This project is non-commercial and intended only for learning and fan creation. It is not affiliated with or endorsed by Hypergryph. The MIT License does not grant rights to any Hypergryph intellectual property or included third-party assets.
