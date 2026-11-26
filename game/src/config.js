// Senja Air — configuration: the island, the ring course, the limits.
// One mechanic, one sentence: fly through all 8 golden rings over
// Lighthouse Island, then land on the runway before the fuel runs out.
'use strict';

const SENJA = {
  title: 'SENJA AIR',
  subtitle: 'Ring Run Pulau Mercusuar',
  mechanic: 'Terbang melewati 8 ring emas di atas Pulau Senja, lalu mendarat di runway sebelum bahan bakar habis.',
  winText: 'WIN: 8 ring + mendarat di runway',
  loseText: 'LOSE: menabrak, kehabisan bahan bakar, atau waktu habis',

  // World size in metres. x east, z north, y up. Sea level is y = 0.
  islandRadius: 2400,
  seaLevel: 0,
  gravity: 9.81,

  // The runway: a flat strip on the island, heading north-south.
  runway: { x: 0, zMin: -1400, zMax: -600, halfWidth: 42, height: 6, name: 'SENJA AIRFIELD' },

  // The lighthouse hill, west of the runway threshold.
  lighthouse: { x: -260, z: -1080, baseHeight: 58, towerHeight: 34 },

  // The mountain that makes the island recognisable from the air.
  mountain: { x: 450, z: 700, height: 340, spread: 520 },
  secondHill: { x: -950, z: -350, height: 150, spread: 420 },

  // The ring course: [x, altitude, z]. Ring 8 lines up with the runway
  // centreline so the last leg is a straight final approach, heading south.
  rings: [
    { x: 350, y: 180, z: -700 },
    { x: 900, y: 230, z: 100 },
    { x: 1250, y: 260, z: 800 },
    { x: 700, y: 210, z: 1500 },
    { x: -300, y: 240, z: 1650 },
    { x: -1150, y: 200, z: 1000 },
    { x: -1250, y: 180, z: 100 },
    { x: 0, y: 150, z: -300 },
  ],
  ringRadius: 55,
  ringPassDistance: 48,

  // Flight limits.
  maxSpeed: 95,        // m/s, full throttle level
  cruiseSpeed: 62,
  stallSpeed: 26,      // below this the nose drops
  maxAltitude: 900,
  fuelStart: 100,      // percent
  fuelBurnPerSecond: 0.45, // at full throttle; less at low throttle
  ringFuelBonus: 6,    // percent back per ring
  timeLimitSeconds: 300,
  landingMaxSink: 8,   // m/s vertical speed allowed for a safe touchdown
  landingMaxSpeed: 78, // m/s ground speed allowed for a safe touchdown
  ringScore: 250,
  landingScore: 500,
  timeBonusPerSecond: 5,

  // Camera and view.
  fovDegrees: 72,
  chaseDistance: 26,
  chaseHeight: 7,

  // Deterministic decoration seed, so every run paints the same island.
  worldSeed: 20261126,

  // Colours of the bright midday sky the judges see first.
  skyTop: '#2f7fe0',
  skyMid: '#7ec3f2',
  skyHorizon: '#cfeefb',
  seaDeep: '#0b5e8a',
  seaShallow: '#2fa8c9',
  sand: '#f2dd9e',
  grass: '#4da34a',
  grassDark: '#2f7a33',
  rock: '#8a7f72',
  snow: '#f4f6f8',
};

function clampNumber(value, low, high) {
  if (value < low) return low;
  if (value > high) return high;
  return value;
}

function lerpNumber(a, b, t) {
  return a + (b - a) * t;
}

// Smoothstep 0..1 between two edges.
function smoothstep(edge0, edge1, x) {
  const t = clampNumber((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function degreesToRadians(deg) { return (deg * Math.PI) / 180; }
function radiansToDegrees(rad) { return (rad * 180) / Math.PI; }

function wrapAngleDegrees(deg) {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

// A tiny deterministic random generator (mulberry32) for clouds and trees.
function makeSeededRandom(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
