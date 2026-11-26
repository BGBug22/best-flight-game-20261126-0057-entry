// Senja Air — the island: terrain heights, the runway, the lighthouse,
// the beach ring and the trees. Everything the renderer and the flight
// model ask about the ground lives here, in one place.
'use strict';

function gaussianBump(x, z, cx, cz, height, spread) {
  const dx = x - cx;
  const dz = z - cz;
  const d2 = dx * dx + dz * dz;
  return height * Math.exp(-d2 / (spread * spread));
}

// Height of the ground in metres at (x, z). Sea is 0.
function terrainHeightAt(x, z) {
  const r = Math.hypot(x, z);
  // The island dome: high in the middle, falling to the sea at the coast.
  // Kept low on purpose: the ground beside the runway must stay well
  // below a climbing plane, or takeoffs end in the hillside.
  const dome = 22 * smoothstep(SENJA.islandRadius, SENJA.islandRadius * 0.45, r);
  let h = dome;
  h += gaussianBump(x, z, SENJA.mountain.x, SENJA.mountain.z, SENJA.mountain.height, SENJA.mountain.spread);
  h += gaussianBump(x, z, SENJA.secondHill.x, SENJA.secondHill.z, SENJA.secondHill.height, SENJA.secondHill.spread);
  h += gaussianBump(x, z, SENJA.lighthouse.x, SENJA.lighthouse.z, SENJA.lighthouse.baseHeight, 210);
  // A gentle beach shelf just inside the coast.
  h += 3 * smoothstep(SENJA.islandRadius * 0.98, SENJA.islandRadius * 0.9, r);

  // Flatten the runway strip (with a wide apron) so landings are fair
  // and a takeoff that drifts sideways still has flat ground under it.
  const rw = SENJA.runway;
  if (Math.abs(x - rw.x) < rw.halfWidth + 160 && z > rw.zMin - 160 && z < rw.zMax + 160) {
    const edge = smoothstep(rw.halfWidth + 160, rw.halfWidth, Math.abs(x - rw.x));
    const end = smoothstep(160, 0, Math.min(Math.abs(z - rw.zMin), Math.abs(z - rw.zMax)));
    const flat = Math.max(edge, end);
    h = lerpNumber(h, rw.height, flat);
  }
  if (r >= SENJA.islandRadius) return 0;
  return Math.max(0, h);
}

function isOverSea(x, z) {
  return Math.hypot(x, z) >= SENJA.islandRadius;
}

function isOnRunway(x, z) {
  const rw = SENJA.runway;
  return Math.abs(x - rw.x) <= rw.halfWidth && z >= rw.zMin && z <= rw.zMax;
}

// Colour of a terrain patch, by height and distance from the coast.
function terrainColourAt(x, z, height) {
  const r = Math.hypot(x, z);
  const coast = SENJA.islandRadius;
  if (height < 4 && r > coast * 0.86) return SENJA.sand;
  if (height > 300) return SENJA.snow;
  if (height > 180) return SENJA.rock;
  if (height > 90) return SENJA.grassDark;
  return SENJA.grass;
}

// Fixed decoration: palm clusters and clouds, placed once from the seed
// so the island looks identical in every run and every screenshot.
function buildIslandDecor() {
  const rand = makeSeededRandom(SENJA.worldSeed);
  const palms = [];
  for (let i = 0; i < 90; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = SENJA.islandRadius * (0.35 + rand() * 0.55);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (isOnRunway(x, z)) continue;
    const h = terrainHeightAt(x, z);
    if (h < 5 || h > 120) continue;
    palms.push({ x, z, h, size: 7 + rand() * 6, lean: (rand() - 0.5) * 0.4 });
  }
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 1200 + rand() * 4200;
    clouds.push({
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      y: 480 + rand() * 260,
      size: 120 + rand() * 180,
      puffs: 3 + Math.floor(rand() * 3),
    });
  }
  return { palms, clouds };
}

const ISLAND_DECOR = buildIslandDecor();
