# Vision Screening

手机端二维码体验页：点击中心房屋视野完成清晰、失焦和异常检测，再以不稳定的源石菱形和普瑞赛斯真实影像完成揭示。

前三阶段采用明日方舟式冷白/炭黑工业终端视觉，以青色表示系统反馈、红色表示异常；最终影像保持独立的深色揭示风格。

## Development

安装依赖并启动 Vite：

```powershell
npm install
npm run dev
```

建议用 390×844 左右的移动端视口预览。

```powershell
npm test
npm run build
```

## Interaction contract

```text
点击中心房屋视野：intro（清晰）→ calibrate（失焦）→ drift（异常）→ reveal
点击最终普瑞赛斯影像：reveal → reset
```

这是虚构的视觉效果，不是医疗视力测试；页面不收集账号、定位或个人信息。

## Resources

- React：负责页面渲染与交互状态连接。
- Tailwind CSS：负责常规布局工具类；复杂阶段效果、伪元素和关键帧保留在 `src/index.css`。
- GSAP：通过 npm 安装，用于房屋失焦、异常转场和最终影像时间线。
- `assets/prts-close.jpg`：最终画面唯一使用的普瑞赛斯图像，以焦点蒙版突出头部并模糊边缘。
- `assets/vision-house.jpg`：前三幕共用的经典远距房屋视野，依次呈现清晰、失焦和异常扭曲。
- 源石菱形：内联 SVG 分段折角与位移滤镜；揭示时左右收束，稳定后偶发短促撕扯，不遮挡人物。
- 字体：从明日方舟官网 CDN 下载到 `fonts/`，来源为官网的 Bender、Novecentosanswide 和 Source Han Sans SC 文件。
- 粒子纹理与遮罩：引用明日方舟官网 CDN，加载失败时由 CSS 渐变替代。
- 环境音：用户首次点击后才尝试播放官网 CDN BGM；浏览器禁止播放或资源失败时静默降级。

资源来源参考：

- 官网：https://ak.hypergryph.com/#index
- Wiki：https://ak.mooncell.wiki/w/首页

## Fallback behavior

- 远程 GSAP 不可用时，页面仍能切换全部阶段，源石边框与 PRTS 会直接显示。
- 远程纹理不可用时，页面使用内联 SVG 和 CSS 渐变。
- `prefers-reduced-motion: reduce` 会取消大幅位移和持续闪烁，保留阶段和最终画面。
