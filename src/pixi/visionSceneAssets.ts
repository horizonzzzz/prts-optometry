import maskAsset from '../../assets/common_mask.55fff2e9.png';
import blueprintAsset from '../../assets/official-terminal-blueprint.jpg';
import gridAsset from '../../assets/official-terminal-grid.jpg';
import rhodesAsset from '../../assets/official-rhodes-island.png';
import particleAsset from '../../assets/particle.f4b76a4f.png';
import portraitAsset from '../../assets/prts-close.jpg';
import houseAsset from '../../assets/vision-house.jpg';
import { Assets, type Texture } from 'pixi.js';

export async function loadVisionSceneTextures() {
  const [grid, blueprint, mask, rhodes, particle, house, portrait] = await Promise.all([
    Assets.load<Texture>(gridAsset),
    Assets.load<Texture>(blueprintAsset),
    Assets.load<Texture>(maskAsset),
    Assets.load<Texture>(rhodesAsset),
    Assets.load<Texture>(particleAsset),
    Assets.load<Texture>(houseAsset),
    Assets.load<Texture>(portraitAsset),
  ]);

  return { grid, blueprint, mask, rhodes, particle, house, portrait };
}

export type VisionSceneTextures = Awaited<ReturnType<typeof loadVisionSceneTextures>>;
