import maskAsset from '../../assets/common_mask.55fff2e9.png';
import dialogueAmiyaAsset from '../../assets/dialogue/amiya.png';
import dialogueDoctorAsset from '../../assets/dialogue/doctor.png';
import dialogueKaltsitAsset from '../../assets/dialogue/kaltsit.png';
import dialoguePriestessAsset from '../../assets/dialogue/priestess.png';
import qrNode01Asset from '../../assets/7521a33230186fc1435c3077c4449634.png';
import qrNode02Asset from '../../assets/b3a33055da1d8f99363e4042f4df035f.jpg';
import blueprintAsset from '../../assets/official-terminal-blueprint.jpg';
import gridAsset from '../../assets/official-terminal-grid.jpg';
import rhodesAsset from '../../assets/official-rhodes-island.png';
import particleAsset from '../../assets/particle.f4b76a4f.png';
import portraitAsset from '../../assets/prts-close.jpg';
import landshipAsset from '../../assets/rhodes-landship.png';
import houseAsset from '../../assets/vision-house.jpg';
import { Assets, type Texture } from 'pixi.js';

export async function loadVisionSceneTextures() {
  const [grid, blueprint, mask, rhodes, particle, house, portrait, landship, dialogueDoctor, dialogueAmiya, dialogueKaltsit, dialoguePriestess, qrNode01, qrNode02] = await Promise.all([
    Assets.load<Texture>(gridAsset),
    Assets.load<Texture>(blueprintAsset),
    Assets.load<Texture>(maskAsset),
    Assets.load<Texture>(rhodesAsset),
    Assets.load<Texture>(particleAsset),
    Assets.load<Texture>(houseAsset),
    Assets.load<Texture>(portraitAsset),
    Assets.load<Texture>(landshipAsset),
    Assets.load<Texture>({ src: dialogueDoctorAsset, data: { scaleMode: 'nearest' } }),
    Assets.load<Texture>({ src: dialogueAmiyaAsset, data: { scaleMode: 'nearest' } }),
    Assets.load<Texture>({ src: dialogueKaltsitAsset, data: { scaleMode: 'nearest' } }),
    Assets.load<Texture>({ src: dialoguePriestessAsset, data: { scaleMode: 'nearest' } }),
    Assets.load<Texture>(qrNode01Asset),
    Assets.load<Texture>(qrNode02Asset),
  ]);

  return { grid, blueprint, mask, rhodes, particle, house, portrait, landship, dialogueDoctor, dialogueAmiya, dialogueKaltsit, dialoguePriestess, qrNode01, qrNode02 };
}

export type VisionSceneTextures = Awaited<ReturnType<typeof loadVisionSceneTextures>>;
