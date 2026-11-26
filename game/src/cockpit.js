// Senja Air — cockpit and HUD: the lit instruments, the altitude / speed /
// heading readouts, the fuel and throttle bars, the ring progress, the
// timer, the score and the island minimap. Everything a pilot needs,
// readable at a glance when the screenshot is shrunk.
'use strict';

const Cockpit = {
  // A round dial with a glowing needle.
  drawDial(ctx, x, y, radius, label, valueText, fraction, colour) {
    ctx.save();
    ctx.translate(x, y);
    const face = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
    face.addColorStop(0, '#0f1e2e');
    face.addColorStop(1, '#050b12');
    ctx.fillStyle = face;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5b7a99';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (radius - 3), Math.sin(a) * (radius - 3));
      ctx.lineTo(Math.cos(a) * (radius - 8), Math.sin(a) * (radius - 8));
      ctx.stroke();
    }
    const needleAngle = Math.PI * 0.75 + clampNumber(fraction, 0, 1) * Math.PI * 1.5;
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = colour;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(needleAngle) * (radius - 9), Math.sin(needleAngle) * (radius - 9));
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8f4ff';
    ctx.font = '700 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, radius * 0.45);
    ctx.font = '900 13px Arial, sans-serif';
    ctx.fillStyle = colour;
    ctx.fillText(valueText, 0, radius * 0.75);
    ctx.restore();
  },

  // The attitude ball: blue sky, brown ground, rolling with the plane.
  drawAttitude(ctx, x, y, radius, pitch, roll) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.clip();
    ctx.rotate(degreesToRadians(-roll));
    const offsetY = clampNumber(pitch, -30, 30) * (radius / 30);
    ctx.fillStyle = '#3f8fd2';
    ctx.fillRect(-radius, -radius + offsetY, radius * 2, radius - offsetY + 1);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(-radius, offsetY, radius * 2, radius - offsetY + 1);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-radius, offsetY); ctx.lineTo(radius, offsetY); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#5b7a99';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-radius * 0.55, 0); ctx.lineTo(-radius * 0.15, 0); ctx.moveTo(radius * 0.15, 0); ctx.lineTo(radius * 0.55, 0); ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  drawBar(ctx, x, y, width, height, fraction, colour, label) {
    ctx.save();
    ctx.fillStyle = 'rgba(5,11,18,0.85)';
    ctx.beginPath(); ctx.roundRect(x, y, width, height, 4); ctx.fill();
    ctx.fillStyle = colour;
    const inner = Math.max(0, (width - 4) * clampNumber(fraction, 0, 1));
    if (inner > 0) {
      ctx.beginPath(); ctx.roundRect(x + 2, y + 2, inner, height - 4, 3); ctx.fill();
    }
    ctx.fillStyle = '#e8f4ff';
    ctx.font = '700 11px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 5, y + height / 2 + 4);
    ctx.restore();
  },

  drawCompassStrip(ctx, width, heading) {
    const y = 46;
    const centreX = width / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(5,11,18,0.72)';
    ctx.fillRect(centreX - 190, y - 15, 380, 30);
    ctx.strokeStyle = '#5b7a99';
    ctx.lineWidth = 1;
    ctx.strokeRect(centreX - 190, y - 15, 380, 30);
    const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    for (let d = -90; d <= 90; d += 30) {
      const hdg = (Math.round(heading) + d + 360) % 360;
      const x = centreX + d * 1.9;
      ctx.fillStyle = d === 0 ? '#ffd166' : '#cfe6f7';
      ctx.font = d === 0 ? '900 14px Arial, sans-serif' : '700 12px Arial, sans-serif';
      ctx.textAlign = 'center';
      const label = names[hdg] || String(hdg);
      ctx.fillText(label, x, y + 4);
      ctx.strokeStyle = '#cfe6f7';
      ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 12); ctx.stroke();
    }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(centreX, y - 18); ctx.lineTo(centreX - 6, y - 28); ctx.lineTo(centreX + 6, y - 28);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  drawMinimap(ctx, state, x, y, size) {
    const scale = size / (SENJA.islandRadius * 2.4);
    const toMap = (wx, wz) => ({ x: x + size / 2 + wx * scale, y: y + size / 2 + wz * scale });
    ctx.save();
    ctx.fillStyle = 'rgba(5,11,18,0.78)';
    ctx.beginPath(); ctx.roundRect(x, y, size, size, 10); ctx.fill();
    ctx.strokeStyle = '#5b7a99';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Sea and island.
    ctx.fillStyle = '#0b5e8a';
    ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, SENJA.islandRadius * scale, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4da34a';
    ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, SENJA.islandRadius * scale * 0.98, 0, Math.PI * 2); ctx.fill();
    // Runway.
    const rw = SENJA.runway;
    const a = toMap(rw.x, rw.zMin);
    const b = toMap(rw.x, rw.zMax);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    // Rings: passed green, next one gold and pulsing, the rest dim.
    SENJA.rings.forEach((ring, i) => {
      const p = toMap(ring.x, ring.z);
      ctx.fillStyle = state.ringsDone[i] ? '#4ade80' : i === state.nextRingIndex ? '#ffd166' : 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(p.x, p.y, i === state.nextRingIndex ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
    });
    // The lighthouse.
    const lh = toMap(SENJA.lighthouse.x, SENJA.lighthouse.z);
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath(); ctx.arc(lh.x, lh.y, 4, 0, Math.PI * 2); ctx.fill();
    // The plane, pointing along its heading (north is up on the map).
    const plane = toMap(state.x, state.z);
    ctx.save();
    ctx.translate(plane.x, plane.y);
    ctx.rotate(degreesToRadians(state.heading));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#cfe6f7';
    ctx.font = '700 10px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PULAU SENJA', x + 8, y + 13);
    ctx.restore();
  },

  drawHud(state, screen) {
    const ctx = Renderer.ctx;
    const W = Renderer.width;
    const H = Renderer.height;
    const knots = Math.round(state.speed * 1.944);
    const feet = Math.round(state.y * 3.281);
    const heading = Math.round(state.heading);

    // Top bar: ALT / SPD / HDG in big lit figures.
    ctx.save();
    ctx.fillStyle = 'rgba(5,11,18,0.72)';
    ctx.beginPath(); ctx.roundRect(12, 10, 300, 64, 10); ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7fb8e8';
    ctx.font = '700 11px Arial, sans-serif';
    ctx.fillText('ALT', 26, 30);
    ctx.fillText('SPD', 126, 30);
    ctx.fillText('HDG', 226, 30);
    ctx.fillStyle = '#e8f4ff';
    ctx.font = '900 24px Arial, sans-serif';
    ctx.fillText(String(feet), 26, 58);
    ctx.fillText(String(knots), 126, 58);
    ctx.fillStyle = '#ffd166';
    ctx.fillText(String(heading).padStart(3, '0') + '°', 226, 58);
    ctx.fillStyle = '#7fb8e8';
    ctx.font = '700 10px Arial, sans-serif';
    ctx.fillText('ft', 96, 58);
    ctx.fillText('kt', 196, 58);
    ctx.restore();
    this.drawCompassStrip(ctx, W, state.heading);

    // Score, timer and rings, top right.
    ctx.save();
    ctx.fillStyle = 'rgba(5,11,18,0.72)';
    ctx.beginPath(); ctx.roundRect(W - 322, 10, 310, 64, 10); ctx.fill();
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7fb8e8';
    ctx.font = '700 11px Arial, sans-serif';
    ctx.fillText('SKOR', W - 216, 30);
    ctx.fillText('WAKTU', W - 116, 30);
    ctx.fillText('RING', W - 26, 30);
    ctx.fillStyle = '#e8f4ff';
    ctx.font = '900 24px Arial, sans-serif';
    ctx.fillText(String(state.score), W - 216, 58);
    const mm = Math.floor(state.timeLeft / 60);
    const ss = Math.floor(state.timeLeft % 60);
    ctx.fillStyle = state.timeLeft < 45 ? '#ff6b6b' : '#e8f4ff';
    ctx.fillText(mm + ':' + String(ss).padStart(2, '0'), W - 116, 58);
    ctx.fillStyle = '#ffd166';
    ctx.fillText(state.ringsPassed + '/8', W - 26, 58);
    ctx.restore();

    // Minimap, right edge under the score bar.
    this.drawMinimap(ctx, state, W - 178, 86, 166);

    // The mission line, under the compass: always visible while flying.
    if (screen === 'play') {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '700 14px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,247,214,0.95)';
      ctx.fillText(SENJA.mechanic, W / 2, 92);
      ctx.restore();
    }

    // Warnings, centre screen.
    const warnings = [];
    if (state.stallWarning) warnings.push('⚠ STALL — TURUNKAN HIDUNG, TAMBAH GAS');
    if (state.pullUpWarning) warnings.push('⚠ PULL UP — TANAH DEKAT!');
    if (state.lowFuelWarning) warnings.push('⚠ BAHAN BAKAR RENDAH — RING BERIKUTNYA +6%');
    if (warnings.length > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '900 18px Arial, sans-serif';
      ctx.fillStyle = '#ff6b6b';
      ctx.shadowColor = '#ff6b6b';
      ctx.shadowBlur = 10;
      warnings.forEach((w, i) => ctx.fillText(w, W / 2, 150 + i * 26));
      ctx.restore();
    }

    // Ring message, briefly after each pass.
    if (state.messageTimer > 0 && state.message) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '900 22px Arial, sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.fillText(state.message, W / 2, H - 190);
      ctx.restore();
    }

    // The cockpit panel: lit instruments along the bottom.
    const panelY = H - 108;
    ctx.save();
    const panelGrad = ctx.createLinearGradient(0, panelY, 0, H);
    panelGrad.addColorStop(0, '#16242f');
    panelGrad.addColorStop(1, '#0a141d');
    ctx.fillStyle = panelGrad;
    ctx.fillRect(0, panelY, W, 108);
    ctx.strokeStyle = '#3d5a74';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, panelY); ctx.lineTo(W, panelY); ctx.stroke();
    // Instrument cluster, left.
    this.drawAttitude(ctx, 76, panelY + 54, 40, state.pitch, state.roll);
    this.drawDial(ctx, 168, panelY + 54, 40, 'SPEED', String(knots), state.speed / SENJA.maxSpeed, '#4ade80');
    this.drawDial(ctx, 260, panelY + 54, 40, 'ALT', String(feet), state.y / SENJA.maxAltitude, '#7fb8e8');
    this.drawDial(ctx, 352, panelY + 54, 40, 'VERT', (state.verticalSpeed >= 0 ? '+' : '') + Math.round(state.verticalSpeed), clampNumber((state.verticalSpeed + 15) / 30, 0, 1), '#ffd166');
    // Fuel and throttle bars, centre.
    this.drawBar(ctx, 420, panelY + 22, 220, 20, state.fuel / 100, state.fuel < 18 ? '#ff6b6b' : '#4ade80', 'BAHAN BAKAR ' + Math.round(state.fuel) + '%');
    this.drawBar(ctx, 420, panelY + 56, 220, 20, state.throttle, '#f59e0b', 'THROTTLE ' + Math.round(state.throttle * 100) + '%');
    ctx.fillStyle = '#7fb8e8';
    ctx.font = '700 11px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('W/S throttle  •  ←→ belok  •  ↑↓ pitch  •  A autopilot  •  M suara', 420, panelY + 96);
    // Next ring readout, right.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7fb8e8';
    ctx.font = '700 11px Arial, sans-serif';
    if (state.nextRingIndex >= 0) {
      ctx.fillText('RING BERIKUTNYA', W - 24, panelY + 30);
      ctx.fillStyle = '#ffd166';
      ctx.font = '900 22px Arial, sans-serif';
      ctx.fillText('RING ' + (state.nextRingIndex + 1) + '  •  ' + Math.round(state.distanceToNextRing) + ' m', W - 24, panelY + 58);
    } else {
      ctx.fillText('SEMUA RING LEWAT', W - 24, panelY + 30);
      ctx.fillStyle = '#4ade80';
      ctx.font = '900 22px Arial, sans-serif';
      ctx.fillText('MENDARAT DI RUNWAY!', W - 24, panelY + 58);
    }
    ctx.restore();
  },
};
