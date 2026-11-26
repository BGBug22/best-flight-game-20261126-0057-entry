// Senja Air — the renderer: a small software 3D projection (no library)
// that paints the bright midday sky, the sea, the island, the runway,
// the lighthouse, the golden rings and the chase-view plane onto a canvas.
'use strict';

const Renderer = {
  canvas: null,
  ctx: null,
  width: 1280,
  height: 720,
  focal: 600,
  camPos: { x: 0, y: 0, z: 0 },
  camFwd: { x: 0, y: 0, z: 1 },
  camRight: { x: 1, y: 0, z: 0 },
  camUp: { x: 0, y: 1, z: 0 },
  horizonY: 360,
  time: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  },

  resize() {
    const w = this.canvas.clientWidth || 1280;
    const h = this.canvas.clientHeight || 720;
    this.canvas.width = w;
    this.canvas.height = h;
    this.width = w;
    this.height = h;
    this.focal = (h / 2) / Math.tan(degreesToRadians(SENJA.fovDegrees / 2));
  },

  // Build the camera from the plane: chase position, look ahead, roll
  // with the plane so banks feel real.
  updateCamera(state) {
    const headingRad = degreesToRadians(state.heading);
    const pitchRad = degreesToRadians(state.pitch);
    const fwd = {
      x: Math.sin(headingRad) * Math.cos(pitchRad),
      y: Math.sin(pitchRad),
      z: Math.cos(headingRad) * Math.cos(pitchRad),
    };
    const right0 = { x: Math.cos(headingRad), y: 0, z: -Math.sin(headingRad) };
    const rollRad = degreesToRadians(state.roll) * 0.55;
    const cosR = Math.cos(rollRad);
    const sinR = Math.sin(rollRad);
    const up0 = { x: 0, y: 1, z: 0 };
    // Rotate right/up around the forward axis by the bank angle.
    const right = {
      x: right0.x * cosR + up0.x * sinR,
      y: right0.y * cosR + up0.y * sinR,
      z: right0.z * cosR + up0.z * sinR,
    };
    const up = {
      x: -right0.x * sinR + up0.x * cosR,
      y: -right0.y * sinR + up0.y * cosR,
      z: -right0.z * sinR + up0.z * cosR,
    };
    this.camFwd = fwd;
    this.camRight = right;
    this.camUp = up;
    this.camPos = {
      x: state.x - fwd.x * SENJA.chaseDistance,
      y: state.y + SENJA.chaseHeight - fwd.y * SENJA.chaseDistance,
      z: state.z - fwd.z * SENJA.chaseDistance,
    };
    const horizon = this.projectPoint(
      this.camPos.x + fwd.x * 20000,
      this.camPos.y + fwd.y * 20000,
      this.camPos.z + fwd.z * 20000,
    );
    this.horizonY = horizon ? horizon.y : this.height * 0.52;
  },

  // World point -> screen point, or null when behind the camera.
  projectPoint(x, y, z) {
    const dx = x - this.camPos.x;
    const dy = y - this.camPos.y;
    const dz = z - this.camPos.z;
    const cx = dx * this.camRight.x + dy * this.camRight.y + dz * this.camRight.z;
    const cy = dx * this.camUp.x + dy * this.camUp.y + dz * this.camUp.z;
    const cz = dx * this.camFwd.x + dy * this.camFwd.y + dz * this.camFwd.z;
    if (cz < 2) return null;
    const scale = this.focal / cz;
    return {
      x: this.width / 2 + cx * scale,
      y: this.height * 0.52 - cy * scale,
      scale,
      depth: cz,
    };
  },

  drawPolygon(points, fill) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  },

  drawSkyAndSun() {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, SENJA.skyTop);
    grad.addColorStop(0.45, SENJA.skyMid);
    grad.addColorStop(0.62, SENJA.skyHorizon);
    grad.addColorStop(1, '#9fd8ef');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    // The sun: fixed in the north-east sky, high and bright.
    const sun = this.projectPoint(this.camPos.x + 9000, this.camPos.y + 5200, this.camPos.z + 9000);
    if (sun) {
      const glow = ctx.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 130);
      glow.addColorStop(0, 'rgba(255,250,210,0.95)');
      glow.addColorStop(0.25, 'rgba(255,240,170,0.55)');
      glow.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sun.x - 140, sun.y - 140, 280, 280);
      ctx.fillStyle = '#fff8d0';
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drawSea() {
    const ctx = this.ctx;
    const top = Math.max(0, this.horizonY);
    const grad = ctx.createLinearGradient(0, top, 0, this.height);
    grad.addColorStop(0, SENJA.seaShallow);
    grad.addColorStop(0.25, '#1b8ab5');
    grad.addColorStop(1, SENJA.seaDeep);
    ctx.fillStyle = grad;
    ctx.fillRect(0, top, this.width, this.height - top);
    // Sun glitter on the water.
    const sun = this.projectPoint(this.camPos.x + 9000, 0, this.camPos.z + 9000);
    if (sun && sun.y > top) {
      ctx.fillStyle = 'rgba(255,246,190,0.35)';
      for (let i = 0; i < 14; i++) {
        const w = 30 + Math.random() * 90;
        ctx.fillRect(sun.x - w / 2 + (Math.random() - 0.5) * 160, sun.y + i * 14, w, 3);
      }
    }
  },

  drawClouds() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    for (const cloud of ISLAND_DECOR.clouds) {
      const p = this.projectPoint(cloud.x, cloud.y, cloud.z);
      if (!p) continue;
      const s = cloud.size * p.scale * 0.9;
      if (s < 4) continue;
      for (let i = 0; i < cloud.puffs; i++) {
        const px = p.x + (i - cloud.puffs / 2) * s * 0.55;
        const py = p.y + Math.sin(i * 2.1) * s * 0.12;
        ctx.beginPath();
        ctx.ellipse(px, py, s * 0.55, s * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  drawTerrain() {
    const step = 200;
    const extent = 2600;
    const quads = [];
    for (let gx = -extent; gx < extent; gx += step) {
      for (let gz = -extent; gz < extent; gz += step) {
        const cx = gx + step / 2;
        const cz = gz + step / 2;
        const dist = Math.hypot(cx - this.camPos.x, cz - this.camPos.z);
        if (dist > 6500) continue;
        const h00 = terrainHeightAt(gx, gz);
        const h10 = terrainHeightAt(gx + step, gz);
        const h11 = terrainHeightAt(gx + step, gz + step);
        const h01 = terrainHeightAt(gx, gz + step);
        if (h00 <= 0 && h10 <= 0 && h11 <= 0 && h01 <= 0) continue;
        quads.push({
          depth: dist,
          colour: terrainColourAt(cx, cz, (h00 + h10 + h11 + h01) / 4),
          pts: [[gx, h00, gz], [gx + step, h10, gz], [gx + step, h11, gz + step], [gx, h01, gz + step]],
        });
      }
    }
    quads.sort((a, b) => b.depth - a.depth);
    for (const quad of quads) {
      const projected = [];
      let ok = true;
      for (const pt of quad.pts) {
        const p = this.projectPoint(pt[0], pt[1], pt[2]);
        if (!p) { ok = false; break; }
        projected.push(p);
      }
      if (ok) this.drawPolygon(projected, quad.colour);
    }
  },

  drawRunway() {
    const rw = SENJA.runway;
    const y = rw.height + 0.4;
    const corners = [
      this.projectPoint(rw.x - rw.halfWidth, y, rw.zMin),
      this.projectPoint(rw.x + rw.halfWidth, y, rw.zMin),
      this.projectPoint(rw.x + rw.halfWidth, y, rw.zMax),
      this.projectPoint(rw.x - rw.halfWidth, y, rw.zMax),
    ];
    if (corners.some((c) => !c)) return;
    this.drawPolygon(corners, '#3c4148');
    // White edge lines and the dashed centreline.
    const left = [this.projectPoint(rw.x - rw.halfWidth + 3, y + 0.2, rw.zMin), this.projectPoint(rw.x - rw.halfWidth + 3, y + 0.2, rw.zMax)];
    const right = [this.projectPoint(rw.x + rw.halfWidth - 3, y + 0.2, rw.zMin), this.projectPoint(rw.x + rw.halfWidth - 3, y + 0.2, rw.zMax)];
    const ctx = this.ctx;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    for (const line of [left, right]) {
      if (line[0] && line[1]) {
        ctx.beginPath(); ctx.moveTo(line[0].x, line[0].y); ctx.lineTo(line[1].x, line[1].y); ctx.stroke();
      }
    }
    // Centreline dashes.
    ctx.fillStyle = '#f8fafc';
    for (let z = rw.zMin + 40; z < rw.zMax - 20; z += 80) {
      const a = this.projectPoint(rw.x - 2.5, y + 0.2, z);
      const b = this.projectPoint(rw.x + 2.5, y + 0.2, z);
      const c = this.projectPoint(rw.x + 2.5, y + 0.2, z + 40);
      const d = this.projectPoint(rw.x - 2.5, y + 0.2, z + 40);
      if (a && b && c && d) this.drawPolygon([a, b, c, d], '#f8fafc');
    }
    // Threshold bars at both ends.
    ctx.fillStyle = '#ffffff';
    for (const zEnd of [rw.zMin + 12, rw.zMax - 12]) {
      for (let k = -3; k <= 3; k++) {
        const a = this.projectPoint(rw.x + k * 10 - 3, y + 0.2, zEnd);
        const b = this.projectPoint(rw.x + k * 10 + 3, y + 0.2, zEnd);
        const c = this.projectPoint(rw.x + k * 10 + 3, y + 0.2, zEnd + (zEnd === rw.zMin + 12 ? 22 : -22));
        const d = this.projectPoint(rw.x + k * 10 - 3, y + 0.2, zEnd + (zEnd === rw.zMin + 12 ? 22 : -22));
        if (a && b && c && d) this.drawPolygon([a, b, c, d], '#ffffff');
      }
    }
    // The big runway name, painted on the strip so it reads from the air.
    const label = this.projectPoint(rw.x, y + 0.3, (rw.zMin + rw.zMax) / 2);
    if (label && label.scale > 0.15) {
      ctx.save();
      ctx.translate(label.x, label.y);
      ctx.rotate(0);
      ctx.font = `900 ${Math.max(10, label.scale * 90)}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText('SENJA', 0, 0);
      ctx.restore();
    }
  },

  drawLighthouse() {
    const lh = SENJA.lighthouse;
    const base = terrainHeightAt(lh.x, lh.z);
    const top = base + lh.towerHeight;
    const half = 7;
    // Tower: a tapered quad with red-white bands.
    const towerBase = [
      this.projectPoint(lh.x - half, base, lh.z - half),
      this.projectPoint(lh.x + half, base, lh.z - half),
      this.projectPoint(lh.x + half, base, lh.z + half),
      this.projectPoint(lh.x - half, base, lh.z + half),
    ];
    const towerTop = [
      this.projectPoint(lh.x - half * 0.7, top, lh.z - half * 0.7),
      this.projectPoint(lh.x + half * 0.7, top, lh.z - half * 0.7),
      this.projectPoint(lh.x + half * 0.7, top, lh.z + half * 0.7),
      this.projectPoint(lh.x - half * 0.7, top, lh.z + half * 0.7),
    ];
    if (towerBase.some((c) => !c) || towerTop.some((c) => !c)) return;
    const ctx = this.ctx;
    // Front face, banded red and white.
    const bands = 5;
    for (let i = 0; i < bands; i++) {
      const t0 = i / bands;
      const t1 = (i + 1) / bands;
      const lerpPt = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      const p0 = lerpPt(towerBase[0], towerTop[0], t0);
      const p1 = lerpPt(towerBase[1], towerTop[1], t0);
      const p2 = lerpPt(towerBase[1], towerTop[1], t1);
      const p3 = lerpPt(towerBase[0], towerTop[0], t1);
      this.drawPolygon([p0, p1, p2, p3], i % 2 === 0 ? '#e23b3b' : '#f8fafc');
    }
    // The lamp room and its rotating beam.
    const lamp = this.projectPoint(lh.x, top + 4, lh.z);
    if (lamp) {
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, Math.max(3, lamp.scale * 7), 0, Math.PI * 2);
      ctx.fill();
      const beamAngle = this.time * 0.7;
      const beamEnd = this.projectPoint(
        lh.x + Math.cos(beamAngle) * 900,
        top + 2,
        lh.z + Math.sin(beamAngle) * 900,
      );
      if (beamEnd) {
        const grad = ctx.createLinearGradient(lamp.x, lamp.y, beamEnd.x, beamEnd.y);
        grad.addColorStop(0, 'rgba(255,244,180,0.55)');
        grad.addColorStop(1, 'rgba(255,244,180,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(lamp.x, lamp.y - 4);
        ctx.lineTo(beamEnd.x, beamEnd.y - 26);
        ctx.lineTo(beamEnd.x, beamEnd.y + 26);
        ctx.lineTo(lamp.x, lamp.y + 4);
        ctx.closePath();
        ctx.fill();
      }
    }
  },

  drawSignboard() {
    // A big welcome board beside the runway threshold: the island's name,
    // readable from the air and from the title screen. It stands east of
    // the strip so it never blocks the final approach.
    const p = this.projectPoint(320, terrainHeightAt(320, -700) + 24, -700);
    if (!p || p.scale < 0.05) return;
    const ctx = this.ctx;
    const w = p.scale * 200;
    const h = p.scale * 52;
    if (w < 24) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = '#123a5c';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = Math.max(1, p.scale * 4);
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, Math.max(2, h * 0.18));
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = `900 ${Math.max(8, h * 0.42)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✈  SENJA AIRFIELD  •  PULAU MERCUSUAR', 0, 0);
    ctx.restore();
  },

  drawPalms() {
    const ctx = this.ctx;
    for (const palm of ISLAND_DECOR.palms) {
      const p = this.projectPoint(palm.x, palm.h, palm.z);
      if (!p || p.scale < 0.08) continue;
      const s = palm.size * p.scale;
      if (s < 2) continue;
      ctx.strokeStyle = '#6b4a2f';
      ctx.lineWidth = Math.max(1, s * 0.12);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + palm.lean * s, p.y - s);
      ctx.stroke();
      ctx.fillStyle = '#2f7a33';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + palm.lean;
        ctx.beginPath();
        ctx.ellipse(
          p.x + palm.lean * s + Math.cos(a) * s * 0.45,
          p.y - s + Math.sin(a) * s * 0.22,
          s * 0.5, s * 0.16, a, 0, Math.PI * 2,
        );
        ctx.fill();
      }
    }
  },

  ringFacing(ring, prevPoint) {
    const dx = ring.x - prevPoint.x;
    const dy = ring.y - prevPoint.y;
    const dz = ring.z - prevPoint.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    return { x: dx / len, y: dy / len, z: dz / len };
  },

  drawRings(state) {
    const ctx = this.ctx;
    for (let i = 0; i < SENJA.rings.length; i++) {
      const ring = SENJA.rings[i];
      const prev = i === 0 ? { x: 0, y: 20, z: -1350 } : SENJA.rings[i - 1];
      const normal = this.ringFacing(ring, prev);
      // Two in-plane axes for the circle.
      const up = Math.abs(normal.y) > 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
      const axisA = {
        x: up.y * normal.z - up.z * normal.y,
        y: up.z * normal.x - up.x * normal.z,
        z: up.x * normal.y - up.y * normal.x,
      };
      const axisB = {
        x: normal.y * axisA.z - normal.z * axisA.y,
        y: normal.z * axisA.x - normal.x * axisA.z,
        z: normal.x * axisA.y - normal.y * axisA.x,
      };
      const done = state.ringsDone[i];
      const isNext = i === state.nextRingIndex;
      const points = [];
      let visible = true;
      for (let k = 0; k <= 28; k++) {
        const a = (k / 28) * Math.PI * 2;
        const px = ring.x + (Math.cos(a) * axisA.x + Math.sin(a) * axisB.x) * SENJA.ringRadius;
        const py = ring.y + (Math.cos(a) * axisA.y + Math.sin(a) * axisB.y) * SENJA.ringRadius;
        const pz = ring.z + (Math.cos(a) * axisA.z + Math.sin(a) * axisB.z) * SENJA.ringRadius;
        const p = this.projectPoint(px, py, pz);
        if (!p) { visible = false; break; }
        points.push(p);
      }
      if (!visible) continue;
      const glow = isNext ? 'rgba(255,209,102,0.9)' : done ? 'rgba(74,222,128,0.55)' : 'rgba(255,209,102,0.45)';
      const core = isNext ? '#ffd166' : done ? '#4ade80' : '#e8b64c';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = glow;
      ctx.lineWidth = isNext ? 10 : 6;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (const p of points) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.strokeStyle = core;
      ctx.lineWidth = isNext ? 4 : 3;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (const p of points) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      // The ring number, floating in its centre.
      const centre = this.projectPoint(ring.x, ring.y, ring.z);
      if (centre && centre.scale > 0.06) {
        ctx.font = `900 ${Math.max(11, centre.scale * 70)}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isNext ? '#fff7d6' : 'rgba(255,255,255,0.75)';
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 3;
        ctx.strokeText(String(i + 1), centre.x, centre.y);
        ctx.fillText(String(i + 1), centre.x, centre.y);
      }
    }
  },

  drawWindStreaks(state) {
    // Short white streaks rushing past the camera: the feeling of speed.
    const ctx = this.ctx;
    const speed = state.speed;
    if (speed < 25) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.5;
    const rand = makeSeededRandom(99);
    for (let i = 0; i < 26; i++) {
      const rx = (rand() - 0.5) * 90;
      const ry = (rand() - 0.5) * 55;
      const rz = 30 + rand() * 60;
      const a = this.projectPoint(
        this.camPos.x + this.camRight.x * rx + this.camUp.x * ry + this.camFwd.x * rz,
        this.camPos.y + this.camRight.y * rx + this.camUp.y * ry + this.camFwd.y * rz,
        this.camPos.z + this.camRight.z * rx + this.camUp.z * ry + this.camFwd.z * rz,
      );
      if (!a) continue;
      const len = clampNumber((speed - 20) / 60, 0.2, 1) * 26;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(a.x, a.y + len);
      ctx.stroke();
    }
  },

  // The chase-view plane, drawn in screen space: banking with the roll,
  // nose rising with the pitch, wingtip lights blinking.
  drawPlane(state) {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height * 0.56 + state.pitch * 1.4;
    const s = this.width / 1280;
    const blink = Math.floor(this.time * 2) % 2 === 0;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(degreesToRadians(state.roll) * 0.9);
    ctx.scale(s, s);
    // Wings: broad, with dihedral and red/green tip lights.
    ctx.fillStyle = '#e8edf2';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-150, 6); ctx.lineTo(-34, -6); ctx.lineTo(34, -6); ctx.lineTo(150, 6);
    ctx.lineTo(132, 16); ctx.lineTo(0, 10); ctx.lineTo(-132, 16);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Tailplane and fin.
    ctx.fillStyle = '#dbe4ec';
    ctx.beginPath();
    ctx.moveTo(-58, -58); ctx.lineTo(-18, -52); ctx.lineTo(18, -52); ctx.lineTo(58, -58);
    ctx.lineTo(48, -46); ctx.lineTo(0, -42); ctx.lineTo(-48, -46);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-8, -46); ctx.lineTo(8, -46); ctx.lineTo(14, -96); ctx.lineTo(-14, -96);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#123a5c';
    ctx.font = '900 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SENJA', 0, -62);
    // Fuselage, seen from behind: tapering to the tail.
    const fus = ctx.createLinearGradient(-26, 0, 26, 0);
    fus.addColorStop(0, '#f8fafc');
    fus.addColorStop(0.5, '#ffffff');
    fus.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = fus;
    ctx.beginPath();
    ctx.moveTo(-24, -52); ctx.lineTo(24, -52);
    ctx.lineTo(30, 34); ctx.lineTo(16, 52); ctx.lineTo(-16, 52); ctx.lineTo(-30, 34);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Engine glow at the tail.
    const glow = ctx.createRadialGradient(0, 46, 2, 0, 46, 26 + state.throttle * 22);
    glow.addColorStop(0, `rgba(255,180,60,${0.35 + state.throttle * 0.5})`);
    glow.addColorStop(1, 'rgba(255,180,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 46, 26 + state.throttle * 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.ellipse(0, 46, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
    // Wingtip navigation lights.
    if (blink) {
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath(); ctx.arc(-152, 10, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#34c759';
      ctx.beginPath(); ctx.arc(152, 10, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  drawNextRingArrow(state) {
    // When the next ring is off-screen, point at it from the screen edge.
    if (state.nextRingIndex < 0 || state.status !== 'flying') return;
    const ring = SENJA.rings[state.nextRingIndex];
    const p = this.projectPoint(ring.x, ring.y, ring.z);
    const ctx = this.ctx;
    let ax = p ? p.x : this.width / 2;
    let ay = p ? p.y : this.height / 2;
    const onScreen = p && ax > 60 && ax < this.width - 60 && ay > 60 && ay < this.height - 140;
    if (onScreen) return;
    ax = clampNumber(ax, 70, this.width - 70);
    ay = clampNumber(ay, 70, this.height - 150);
    ctx.save();
    ctx.translate(ax, ay);
    const angle = Math.atan2(
      (p ? p.y : this.height / 2) - ay,
      (p ? p.x : this.width / 2) - ax,
    );
    ctx.rotate(angle);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(-10, -11); ctx.lineTo(-4, 0); ctx.lineTo(-10, 11);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.font = '900 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.fillText('RING ' + (state.nextRingIndex + 1) + '  •  ' + Math.round(state.distanceToNextRing) + ' m', ax, ay + 26);
  },

  render(state, screen) {
    this.time += 1 / 60;
    this.updateCamera(state);
    this.drawSkyAndSun();
    this.drawClouds();
    this.drawSea();
    this.drawTerrain();
    this.drawRunway();
    this.drawLighthouse();
    this.drawSignboard();
    this.drawPalms();
    this.drawRings(state);
    this.drawWindStreaks(state);
    if (screen === 'play') this.drawPlane(state);
    this.drawNextRingArrow(state);
  },
};
