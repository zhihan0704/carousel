import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildAnatomy } from './horse-anatomy.js';
import { buildHorseDetail, buildHorseSurfaceSampler } from './horse-detail.js';
import { buildHorseTack } from './horse-tack.js';

function combine(parts) {
  const geometries = parts.filter(Boolean).map((geometry) => {
    // This sculpture uses solid, untextured materials. Keep the indices and sculpted normals.
    for (const name of Object.keys(geometry.attributes)) {
      if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
    }
    if (geometry.index) return geometry;
    const indexed = mergeVertices(geometry);
    geometry.dispose();
    return indexed;
  });
  if (geometries.length === 1) return geometries[0];
  const result = mergeGeometries(geometries);
  if (!result) throw new Error('Unable to assemble the horse sculpture');
  geometries.forEach((geometry) => geometry.dispose());
  return result;
}

function buildVariant(pose) {
  const anatomy = buildAnatomy(pose);
  const sampler = buildHorseSurfaceSampler(anatomy.body);
  const details = buildHorseDetail(pose, anatomy, sampler);
  const tack = buildHorseTack(anatomy, sampler);
  return {
    mount: tack.mount,
    parts: {
      ivory: combine([anatomy.body, details.ivory]),
      hooves: combine([anatomy.hooves]),
      hair: combine([details.hair]),
      inset: combine([details.inset]),
      dark: combine([details.dark]),
      gold: combine([anatomy.shoeTrim, details.gold, ...tack.gold]),
      cloth: combine(tack.cloth),
      leather: combine(tack.leather)
    }
  };
}

export function createHorseAssets(envMap, gold) {
  const surface = (params) => new THREE.MeshPhysicalMaterial({ envMap, ...params });
  const materials = {
    ivory: surface({
      color: 0xe9dcc5, metalness: 0, roughness: 0.43, clearcoat: 0.32,
      clearcoatRoughness: 0.38, envMapIntensity: 0.86
    }),
    hooves: surface({
      color: 0x59443b, metalness: 0.06, roughness: 0.49, clearcoat: 0.20,
      clearcoatRoughness: 0.48, envMapIntensity: 0.68
    }),
    hair: surface({
      color: 0x7d5e4d, metalness: 0.06, roughness: 0.45, clearcoat: 0.20,
      clearcoatRoughness: 0.44, envMapIntensity: 0.72
    }),
    inset: surface({ color: 0xa88276, roughness: 0.62, envMapIntensity: 0.66 }),
    dark: surface({
      color: 0x211718, metalness: 0, roughness: 0.22, clearcoat: 0.40,
      clearcoatRoughness: 0.22, envMapIntensity: 0.95
    }),
    gold,
    cloth: surface({
      roughness: 0.71, sheen: 0.44, sheenColor: new THREE.Color(0xc897a4),
      sheenRoughness: 0.66, envMapIntensity: 0.6
    }),
    leather: surface({
      color: 0x51333a, roughness: 0.54, clearcoat: 0.22,
      clearcoatRoughness: 0.49, envMapIntensity: 0.68
    })
  };
  for (const [name, material] of Object.entries(materials)) {
    if (name !== 'gold') material.name = `horse-${name}`;
  }
  const saddleColors = [0xb77e91, 0x92796c, 0xb29a80].map((hex) => new THREE.Color(hex));
  return { variants: [buildVariant(0), buildVariant(1)], materials, saddleColors };
}
