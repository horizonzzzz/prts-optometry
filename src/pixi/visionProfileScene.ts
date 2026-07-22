import { gsap } from 'gsap';
import { Container, Graphics, Sprite, TextStyle, type Texture } from 'pixi.js';
import { addText, drawLine, drawPolygon } from './visionSceneGraphics';
import { COLORS } from './visionSceneModel';

export type VisionProfileBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
  wide: boolean;
};

type ProfileNodeLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  qrLeft: number;
  qrTop: number;
  qrSize: number;
};

export function getVisionProfileLayout(bounds: VisionProfileBounds) {
  const panelWidth = Math.min(bounds.width, 680);
  const panel = {
    left: bounds.left + (bounds.width - panelWidth) / 2,
    top: bounds.top,
    width: panelWidth,
    height: Math.max(bounds.height, 1),
  };
  const padding = bounds.wide ? 20 : 14;
  const innerLeft = panel.left + padding;
  const innerWidth = panel.width - padding * 2;
  const contentTop = panel.top + 104;
  const footerRuleY = panel.top + panel.height - 38;
  const nodeGap = bounds.wide ? 14 : 10;
  const nodeAreaHeight = Math.max(footerRuleY - contentTop - 10, 1);
  const slotWidth = bounds.wide ? (innerWidth - nodeGap) / 2 : innerWidth;
  const slotHeight = bounds.wide ? nodeAreaHeight : (nodeAreaHeight - nodeGap) / 2;

  const nodes: ProfileNodeLayout[] = [0, 1].map((index) => {
    const slotLeft = bounds.wide ? innerLeft + index * (slotWidth + nodeGap) : innerLeft;
    const slotTop = bounds.wide ? contentTop : contentTop + index * (slotHeight + nodeGap);
    const width = Math.min(218, slotWidth);
    const qrSize = Math.max(1, Math.min(200, width - 18, slotHeight - 38));
    const height = qrSize + 38;
    const left = slotLeft + (slotWidth - width) / 2;
    const top = slotTop + (slotHeight - height) / 2;
    return {
      left,
      top,
      width,
      height,
      qrLeft: left + (width - qrSize) / 2,
      qrTop: top + 9,
      qrSize,
    };
  });

  return { panel, nodes, footerRuleY };
}

export function createVisionProfileScene(qrTextures: readonly [Texture, Texture], initialReducedMotion: boolean) {
  const layer = new Container({ label: 'personal-profile' });
  const frame = new Graphics();
  const rules = new Graphics();
  const eyebrow = addText('PRTS // EXTERNAL CHANNEL', new TextStyle({ fill: COLORS.teal, fontFamily: 'Bender, sans-serif', fontSize: 8, letterSpacing: 1.6 }));
  const title = addText('通讯终端接入', new TextStyle({ fill: 0xe7ece9, fontFamily: "Bender, SourceHan, 'Noto Sans SC', sans-serif", fontSize: 26, fontWeight: '600' }));
  const description = addText('欢迎加好友（）', new TextStyle({ fill: 0xa3aeac, fontFamily: "SourceHan, 'Noto Sans SC', sans-serif", fontSize: 12 }));
  const footerLeft = addText('SCAN STATUS // STANDBY', new TextStyle({ fill: 0x66716f, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 0.8 }));
  const footerRight = addText('ENCRYPTED CHANNEL / 02', new TextStyle({ fill: 0x66716f, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 0.8 }));
  footerRight.anchor.set(1, 0);

  const nodes = qrTextures.map((texture, index) => {
    const nodeLayer = new Container({ label: `profile-node-${index + 1}` });
    const nodeFrame = new Graphics();
    const codeBackground = new Graphics();
    const qr = new Sprite(texture);
    const scan = new Graphics();
    const code = addText(`NODE // 0${index + 1}`, new TextStyle({ fill: COLORS.teal, fontFamily: 'Bender, sans-serif', fontSize: 8, letterSpacing: 1.25 }));
    const name = addText(`通讯节点 ${index === 0 ? 'A' : 'B'}`, new TextStyle({ fill: 0xc4cdca, fontFamily: "Bender, SourceHan, 'Noto Sans SC', sans-serif", fontSize: 10 }));
    name.anchor.set(1, 0);
    nodeLayer.addChild(nodeFrame, codeBackground, qr, scan, code, name);
    layer.addChild(nodeLayer);
    return { layer: nodeLayer, frame: nodeFrame, codeBackground, qr, scan, code, name, scanTop: 0, scanTravel: 1 };
  });

  layer.addChildAt(frame, 0);
  layer.addChildAt(rules, 1);
  layer.addChild(eyebrow, title, description, footerLeft, footerRight);
  layer.visible = false;
  let reducedMotion = initialReducedMotion;

  function layout(bounds: VisionProfileBounds) {
    const profileLayout = getVisionProfileLayout(bounds);
    const { panel, footerRuleY } = profileLayout;
    const panelRight = panel.left + panel.width;
    const panelBottom = panel.top + panel.height;
    const corners: Array<[number, number]> = [
      [panel.left, panel.top],
      [panelRight - 24, panel.top],
      [panelRight, panel.top + 24],
      [panelRight, panelBottom],
      [panel.left + 24, panelBottom],
      [panel.left, panelBottom - 24],
    ];
    drawPolygon(frame, corners, 0x081011, 0.97);
    frame.stroke({ width: 1, color: COLORS.teal, alpha: 0.58 });

    rules.clear();
    drawLine(rules, panel.left + 14, panel.top + 66, panelRight - 14, panel.top + 66, 1, COLORS.pale, 0.14);
    drawLine(rules, panel.left + 14, footerRuleY, panelRight - 14, footerRuleY, 1, COLORS.pale, 0.14);
    rules.rect(panel.left, panel.top, 72, 2).fill({ color: COLORS.teal, alpha: 0.82 });

    eyebrow.position.set(panel.left + 18, panel.top + 14);
    title.position.set(panel.left + 18, panel.top + 31);
    description.position.set(panel.left + 18, panel.top + 77);
    footerLeft.position.set(panel.left + 18, footerRuleY + 13);
    footerRight.position.set(panelRight - 18, footerRuleY + 13);

    nodes.forEach((node, index) => {
      const placement = profileLayout.nodes[index];
      const qrLeft = placement.qrLeft - placement.left;
      const qrTop = placement.qrTop - placement.top;
      node.layer.position.set(placement.left, placement.top);
      node.frame.clear().rect(0, 0, placement.width, placement.height).fill({ color: 0x020708, alpha: 0.72 }).stroke({ width: 1, color: COLORS.originiumDeep, alpha: 0.42 });
      node.codeBackground.clear().rect(qrLeft, qrTop, placement.qrSize, placement.qrSize).fill(0xffffff).stroke({ width: 1, color: COLORS.pale, alpha: 0.2 });
      const qrScale = Math.min(placement.qrSize / (node.qr.texture.width || 1), placement.qrSize / (node.qr.texture.height || 1));
      node.qr.anchor.set(0.5);
      node.qr.position.set(placement.width / 2, qrTop + placement.qrSize / 2);
      node.qr.scale.set(qrScale);
      node.scan.clear().rect(qrLeft, 0, placement.qrSize, 2).fill({ color: COLORS.teal, alpha: 0.72 });
      node.scanTop = qrTop;
      node.scanTravel = Math.max(placement.qrSize - 2, 1);
      node.scan.y = qrTop + node.scanTravel / 2;
      node.scan.visible = !reducedMotion;
      node.code.position.set(11, placement.height - 21);
      node.name.position.set(placement.width - 11, placement.height - 22);
    });
  }

  function show() {
    gsap.killTweensOf(layer);
    layer.visible = true;
    if (reducedMotion) {
      layer.alpha = 1;
      layer.y = 0;
      return;
    }
    gsap.fromTo(layer, { alpha: 0, y: 10 }, { alpha: 1, y: 0, duration: 0.2, ease: 'power2.out' });
  }

  function hide() {
    gsap.killTweensOf(layer);
    layer.visible = false;
    layer.alpha = 1;
    layer.y = 0;
  }

  return {
    layer,
    layout,
    show,
    hide,
    tick(time: number) {
      if (!layer.visible || reducedMotion) return;
      nodes.forEach((node, index) => {
        node.scan.y = node.scanTop + ((time * 54 + index * node.scanTravel * 0.46) % node.scanTravel);
        node.scan.alpha = 0.28 + Math.abs(Math.sin(time * 1.7 + index)) * 0.2;
      });
    },
    setReducedMotion(nextReducedMotion: boolean) {
      reducedMotion = nextReducedMotion;
      nodes.forEach((node) => { node.scan.visible = !reducedMotion; });
      if (!reducedMotion) return;
      gsap.killTweensOf(layer);
      layer.alpha = 1;
      layer.y = 0;
    },
    destroy() {
      gsap.killTweensOf(layer);
    },
  };
}
