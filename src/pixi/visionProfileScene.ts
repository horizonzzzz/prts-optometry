import { gsap } from 'gsap';
import { Container, Graphics, Sprite, TextStyle, type Texture } from 'pixi.js';
import { addText, drawLine } from './visionSceneGraphics';
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
  const panelWidth = Math.min(bounds.width, bounds.wide ? 880 : 680);
  const panel = {
    left: bounds.left + (bounds.width - panelWidth) / 2,
    top: bounds.top,
    width: panelWidth,
    height: Math.max(bounds.height, 1),
  };
  const padding = bounds.wide ? 24 : 8;
  const innerLeft = panel.left + padding;
  const innerWidth = panel.width - padding * 2;
  const contentTop = panel.top + (bounds.wide ? 92 : 104);
  const footerRuleY = panel.top + panel.height - 28;
  const nodeGap = bounds.wide ? 28 : 12;
  const nodeAreaHeight = Math.max(footerRuleY - contentTop - 6, 1);
  const slotWidth = bounds.wide ? (innerWidth - nodeGap) / 2 : innerWidth;
  const slotHeight = bounds.wide ? nodeAreaHeight : (nodeAreaHeight - nodeGap) / 2;

  const nodes: ProfileNodeLayout[] = [0, 1].map((index) => {
    const slotLeft = bounds.wide ? innerLeft + index * (slotWidth + nodeGap) : innerLeft;
    const slotTop = bounds.wide ? contentTop : contentTop + index * (slotHeight + nodeGap);
    const width = Math.min(bounds.wide ? 260 : 232, slotWidth);
    const qrSize = Math.max(1, Math.min(bounds.wide ? 196 : 188, width - 36, slotHeight - 42));
    const height = qrSize + 42;
    const left = slotLeft + (slotWidth - width) / 2;
    const top = slotTop + (slotHeight - height) / 2;
    return {
      left,
      top,
      width,
      height,
      qrLeft: left + (width - qrSize) / 2,
      qrTop: top + 4,
      qrSize,
    };
  });

  return { panel, nodes, footerRuleY };
}

export function createVisionProfileScene(qrTextures: readonly [Texture, Texture], initialReducedMotion: boolean) {
  const layer = new Container({ label: 'personal-profile' });
  const field = new Graphics();
  const axis = new Graphics();
  const rules = new Graphics();
  const eyebrow = addText('PRTS // LINKAGE ARCHIVE', new TextStyle({ fill: COLORS.originiumSoft, fontFamily: 'Bender, sans-serif', fontSize: 8, letterSpacing: 1.6 }));
  const title = addText('通讯链路已解锁', new TextStyle({ fill: 0xe7ece9, fontFamily: "Bender, SourceHan, 'Noto Sans SC', sans-serif", fontSize: 24, fontWeight: '600' }));
  const description = addText('IDENTITY VERIFIED // 欢迎加好友（', new TextStyle({ fill: 0x91a09d, fontFamily: "Bender, SourceHan, 'Noto Sans SC', sans-serif", fontSize: 10, letterSpacing: 0.4 }));
  const customCopy = addText('梦到啥做啥，OOC致歉', new TextStyle({ fill: 0xb7c2bf, fontFamily: "SourceHan, 'Noto Sans SC', sans-serif", fontSize: 10, lineHeight: 12, wordWrap: true }));
  const channelIndex = addText('02', new TextStyle({ fill: COLORS.pale, fontFamily: 'Novecento, Bender, sans-serif', fontSize: 72, fontWeight: '700' }));
  const footerLeft = addText('LINK STATUS // 02 NODES ONLINE', new TextStyle({ fill: 0x66716f, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 0.8 }));
  const footerRight = addText('RHODES ISLAND / EXTERNAL RELAY', new TextStyle({ fill: 0x66716f, fontFamily: 'Bender, sans-serif', fontSize: 7, letterSpacing: 0.8 }));
  channelIndex.anchor.set(1, 0);
  channelIndex.alpha = 0.04;
  footerRight.anchor.set(1, 0);

  const nodes = qrTextures.map((texture, index) => {
    const nodeLayer = new Container({ label: `profile-node-${index + 1}` });
    const nodeFrame = new Graphics();
    const qrBacking = new Graphics();
    const qr = new Sprite(texture);
    const scan = new Graphics();
    const accent = index === 0 ? COLORS.teal : COLORS.originiumSoft;
    const code = addText(`NODE // 0${index + 1}`, new TextStyle({ fill: accent, fontFamily: 'Bender, sans-serif', fontSize: 8, letterSpacing: 1.25 }));
    const name = addText(index === 0 ? 'QQ CHANNEL' : 'SENKONGDAO CHANNEL', new TextStyle({ fill: 0xc4cdca, fontFamily: 'Bender, sans-serif', fontSize: 9, letterSpacing: 0.8 }));
    name.anchor.set(1, 0);
    nodeLayer.addChild(qrBacking, qr, scan, nodeFrame, code, name);
    layer.addChild(nodeLayer);
    return { layer: nodeLayer, frame: nodeFrame, qrBacking, qr, scan, code, name, accent, scanTop: 0, scanTravel: 1 };
  });

  layer.addChildAt(field, 0);
  layer.addChildAt(axis, 1);
  layer.addChildAt(rules, 2);
  layer.addChild(eyebrow, title, description, customCopy, channelIndex, footerLeft, footerRight);
  layer.visible = false;
  let reducedMotion = initialReducedMotion;

  function layout(bounds: VisionProfileBounds) {
    const profileLayout = getVisionProfileLayout(bounds);
    const { panel, footerRuleY } = profileLayout;
    const panelRight = panel.left + panel.width;
    const panelBottom = panel.top + panel.height;

    field.clear().rect(panel.left, panel.top, panel.width, 68).fill({ color: COLORS.night, alpha: 0.18 });
    const gridStep = bounds.wide ? 34 : 28;
    for (let x = panel.left; x <= panelRight; x += gridStep) {
      drawLine(field, x, panel.top, x, panelBottom, 1, COLORS.pale, 0.025);
    }
    for (let y = panel.top; y <= panelBottom; y += gridStep) {
      drawLine(field, panel.left, y, panelRight, y, 1, COLORS.pale, 0.025);
    }

    rules.clear();
    drawLine(rules, panel.left, panel.top, panel.left + 40, panel.top, 1, COLORS.teal, 0.72);
    drawLine(rules, panel.left, panel.top, panel.left, panel.top + 11, 1, COLORS.teal, 0.72);
    drawLine(rules, panelRight - 40, panel.top, panelRight, panel.top, 1, COLORS.originiumSoft, 0.6);
    drawLine(rules, panelRight, panel.top, panelRight, panel.top + 11, 1, COLORS.originiumSoft, 0.6);
    drawLine(rules, panel.left, panel.top + 74, panelRight, panel.top + 74, 1, COLORS.pale, 0.14);
    drawLine(rules, panel.left, footerRuleY, panelRight, footerRuleY, 1, COLORS.pale, 0.14);
    rules.rect(panel.left, panel.top, 46, 2).fill({ color: COLORS.teal, alpha: 0.86 });
    rules.rect(panelRight - 8, panel.top, 8, 2).fill({ color: COLORS.originiumSoft, alpha: 0.8 });

    axis.clear();
    if (bounds.wide) {
      const axisY = profileLayout.nodes[0].top + profileLayout.nodes[0].height / 2;
      drawLine(axis, panel.left + 8, axisY, panelRight - 8, axisY, 1, COLORS.teal, 0.16);
      profileLayout.nodes.forEach((placement) => {
        const nodeX = placement.left + placement.width / 2;
        drawLine(axis, nodeX, axisY - 14, nodeX, axisY + 14, 1, COLORS.originiumSoft, 0.44);
        axis.circle(nodeX, axisY, 3).fill({ color: COLORS.originiumSoft, alpha: 0.82 });
        axis.circle(nodeX, axisY, 8).stroke({ width: 1, color: COLORS.originiumSoft, alpha: 0.24 });
      });
    } else {
      const axisX = panel.left + panel.width / 2;
      drawLine(axis, axisX, panel.top + 86, axisX, footerRuleY - 8, 1, COLORS.teal, 0.16);
      profileLayout.nodes.forEach((placement) => {
        const nodeY = placement.top + placement.height / 2;
        drawLine(axis, axisX - 14, nodeY, axisX + 14, nodeY, 1, COLORS.originiumSoft, 0.44);
        axis.circle(axisX, nodeY, 3).fill({ color: COLORS.originiumSoft, alpha: 0.82 });
        axis.circle(axisX, nodeY, 8).stroke({ width: 1, color: COLORS.originiumSoft, alpha: 0.24 });
      });
    }

    eyebrow.position.set(panel.left + 8, panel.top + 6);
    title.position.set(panel.left + 8, panel.top + 24);
    description.position.set(panel.left + 8, panel.top + 58);
    customCopy.style.wordWrapWidth = panel.width - 16;
    customCopy.position.set(panel.left + 8, panel.top + 79);
    channelIndex.position.set(panelRight - 7, panel.top - 10);
    footerLeft.position.set(panel.left + 2, footerRuleY + 10);
    footerRight.position.set(panelRight - 2, footerRuleY + 10);

    nodes.forEach((node, index) => {
      const placement = profileLayout.nodes[index];
      const qrLeft = placement.qrLeft - placement.left;
      const qrTop = placement.qrTop - placement.top;
      const qrRight = qrLeft + placement.qrSize;
      const qrBottom = qrTop + placement.qrSize;
      const corner = 15;
      const offset = 5;
      node.layer.position.set(placement.left, placement.top);
      node.qrBacking.clear().rect(qrLeft - 3, qrTop - 3, placement.qrSize + 6, placement.qrSize + 6).fill({ color: 0x020607, alpha: 0.72 });
      node.frame.clear();
      drawLine(node.frame, qrLeft - offset, qrTop - offset, qrLeft + corner, qrTop - offset, 1, node.accent, 0.82);
      drawLine(node.frame, qrLeft - offset, qrTop - offset, qrLeft - offset, qrTop + corner, 1, node.accent, 0.82);
      drawLine(node.frame, qrRight - corner, qrTop - offset, qrRight + offset, qrTop - offset, 1, node.accent, 0.82);
      drawLine(node.frame, qrRight + offset, qrTop - offset, qrRight + offset, qrTop + corner, 1, node.accent, 0.82);
      drawLine(node.frame, qrLeft - offset, qrBottom - corner, qrLeft - offset, qrBottom + offset, 1, node.accent, 0.82);
      drawLine(node.frame, qrLeft - offset, qrBottom + offset, qrLeft + corner, qrBottom + offset, 1, node.accent, 0.82);
      drawLine(node.frame, qrRight + offset, qrBottom - corner, qrRight + offset, qrBottom + offset, 1, node.accent, 0.82);
      drawLine(node.frame, qrRight - corner, qrBottom + offset, qrRight + offset, qrBottom + offset, 1, node.accent, 0.82);
      drawLine(node.frame, 0, placement.height - 24, placement.width, placement.height - 24, 1, COLORS.pale, 0.14);
      const qrScale = Math.min(placement.qrSize / (node.qr.texture.width || 1), placement.qrSize / (node.qr.texture.height || 1));
      node.qr.anchor.set(0.5);
      node.qr.position.set(placement.width / 2, qrTop + placement.qrSize / 2);
      node.qr.scale.set(qrScale);
      node.scan.clear().rect(qrLeft, 0, placement.qrSize, 2).fill({ color: node.accent, alpha: 0.72 });
      node.scanTop = qrTop;
      node.scanTravel = Math.max(placement.qrSize - 2, 1);
      node.scan.y = qrTop + node.scanTravel / 2;
      node.scan.visible = !reducedMotion;
      node.code.position.set(1, placement.height - 18);
      node.name.position.set(placement.width - 1, placement.height - 18);
    });
  }

  function show() {
    gsap.killTweensOf(layer);
    nodes.forEach((node) => { gsap.killTweensOf(node.layer); });
    layer.visible = true;
    if (reducedMotion) {
      layer.alpha = 1;
      layer.y = 0;
      nodes.forEach((node) => { node.layer.alpha = 1; });
      return;
    }
    gsap.fromTo(layer, { alpha: 0, y: 8 }, { alpha: 1, y: 0, duration: 0.24, ease: 'power2.out' });
    gsap.fromTo(nodes.map((node) => node.layer), { alpha: 0 }, { alpha: 1, duration: 0.24, stagger: 0.07, delay: 0.05, ease: 'power2.out' });
  }

  function hide() {
    gsap.killTweensOf(layer);
    nodes.forEach((node) => {
      gsap.killTweensOf(node.layer);
      node.layer.alpha = 1;
    });
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
      axis.alpha = 0.78 + Math.abs(Math.sin(time * 0.9)) * 0.22;
      channelIndex.alpha = 0.035 + Math.abs(Math.sin(time * 0.48)) * 0.015;
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
      nodes.forEach((node) => {
        gsap.killTweensOf(node.layer);
        node.layer.alpha = 1;
      });
      layer.alpha = 1;
      layer.y = 0;
      axis.alpha = 1;
      channelIndex.alpha = 0.04;
    },
    destroy() {
      gsap.killTweensOf(layer);
      nodes.forEach((node) => { gsap.killTweensOf(node.layer); });
    },
  };
}
