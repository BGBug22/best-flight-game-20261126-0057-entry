// Senja Air — the screens: title, pause, win and lose. Each one is drawn
// over the live 3D scene so the screenshots always show the game itself.
'use strict';

const Screens = {
  button(ctx, x, y, w, h, label, primary) {
    ctx.save();
    ctx.fillStyle = primary ? '#f59e0b' : 'rgba(5,11,18,0.8)';
    ctx.strokeStyle = primary ? '#ffd166' : '#5b7a99';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = primary ? '#1a1206' : '#e8f4ff';
    ctx.font = '900 18px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 1);
    ctx.restore();
    return { x: x - w / 2, y: y - h / 2, w, h };
  },

  clickedInside(click, box) {
    return !!click && click.x >= box.x && click.x <= box.x + box.w && click.y >= box.y && click.y <= box.y + box.h;
  },

  drawTitle(ctx, state) {
    const W = Renderer.width;
    const H = Renderer.height;
    ctx.save();
    // A dark veil at the top and bottom so the text reads over the sky.
    const topGrad = ctx.createLinearGradient(0, 0, 0, 240);
    topGrad.addColorStop(0, 'rgba(4,12,22,0.72)');
    topGrad.addColorStop(1, 'rgba(4,12,22,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 240);
    const botGrad = ctx.createLinearGradient(0, H - 220, 0, H);
    botGrad.addColorStop(0, 'rgba(4,12,22,0)');
    botGrad.addColorStop(1, 'rgba(4,12,22,0.78)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, H - 220, W, 220);
    // Title.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = '900 76px Arial, sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 14;
    ctx.fillText('✈  SENJA AIR', W / 2, 108);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8f4ff';
    ctx.font = '900 26px Arial, sans-serif';
    ctx.fillText('RING RUN PULAU MERCUSUAR', W / 2, 148);
    // The mechanic, in one sentence, and the win/lose lines.
    ctx.font = '700 17px Arial, sans-serif';
    ctx.fillStyle = '#fff7d6';
    ctx.fillText(SENJA.mechanic, W / 2, 186);
    ctx.fillStyle = '#a8e6a3';
    ctx.font = '700 15px Arial, sans-serif';
    ctx.fillText(SENJA.winText + '     •     ' + SENJA.loseText, W / 2, 212);
    // Controls.
    ctx.fillStyle = '#cfe6f7';
    ctx.font = '700 15px Arial, sans-serif';
    ctx.fillText('↑ / ↓  pitch     ← / →  belok     W / S  throttle     A  autopilot     M  suara     P  jeda', W / 2, H - 168);
    ctx.fillText('Mouse: klik tombol, atau tahan dan seret untuk mengemudi.', W / 2, H - 144);
    const startBox = this.button(ctx, W / 2, H - 96, 340, 56, '▶  TERBANG SEKARANG', true);
    ctx.restore();
    return { startBox };
  },

  drawPause(ctx) {
    const W = Renderer.width;
    const H = Renderer.height;
    ctx.save();
    ctx.fillStyle = 'rgba(4,12,22,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8f4ff';
    ctx.font = '900 44px Arial, sans-serif';
    ctx.fillText('JEDA', W / 2, H / 2 - 40);
    ctx.font = '700 17px Arial, sans-serif';
    ctx.fillStyle = '#cfe6f7';
    ctx.fillText('Tekan P atau klik Lanjutkan untuk terbang lagi.', W / 2, H / 2 - 6);
    const resumeBox = this.button(ctx, W / 2, H / 2 + 48, 260, 52, '▶  LANJUTKAN', true);
    const restartBox = this.button(ctx, W / 2, H / 2 + 116, 260, 52, '↻  ULANG DARI AWAL', false);
    ctx.restore();
    return { resumeBox, restartBox };
  },

  drawWin(ctx, state) {
    const W = Renderer.width;
    const H = Renderer.height;
    const stats = state.winStats || { timeUsed: 0, timeLeft: 0, fuelLeft: 0, timeBonus: 0, grade: 'A', score: state.score };
    ctx.save();
    ctx.fillStyle = 'rgba(4,12,22,0.62)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = '900 54px Arial, sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    ctx.fillText('★  MISI SELESAI!  ★', W / 2, 130);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8f4ff';
    ctx.font = '700 20px Arial, sans-serif';
    ctx.fillText('8 ring emas dilewati dan mendarat mulus di Runway Senja.', W / 2, 172);
    // The stats card.
    ctx.fillStyle = 'rgba(5,11,18,0.85)';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(W / 2 - 260, 210, 520, 210, 14); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7fb8e8';
    ctx.font = '700 15px Arial, sans-serif';
    const rows = [
      ['SKOR AKHIR', String(stats.score)],
      ['WAKTU TERBANG', stats.timeUsed + ' dtk  •  sisa ' + stats.timeLeft + ' dtk'],
      ['BONUS WAKTU', '+' + stats.timeBonus],
      ['BAHAN BAKAR SISA', stats.fuelLeft + '%'],
      ['RING', '8 / 8'],
    ];
    rows.forEach((row, i) => {
      const y = 248 + i * 34;
      ctx.fillText(row[0], W / 2 - 230, y);
      ctx.fillStyle = '#e8f4ff';
      ctx.font = '900 17px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(row[1], W / 2 + 230, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#7fb8e8';
      ctx.font = '700 15px Arial, sans-serif';
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = '900 40px Arial, sans-serif';
    ctx.fillText('GRADE ' + stats.grade, W / 2, 470);
    const againBox = this.button(ctx, W / 2, 540, 320, 54, '↻  TERBANG LAGI', true);
    ctx.restore();
    return { againBox };
  },

  drawLose(ctx, state) {
    const W = Renderer.width;
    const H = Renderer.height;
    ctx.save();
    ctx.fillStyle = 'rgba(20,4,6,0.62)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8a80';
    ctx.font = '900 48px Arial, sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    ctx.fillText('MISI GAGAL', W / 2, 150);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe9e7';
    ctx.font = '700 19px Arial, sans-serif';
    ctx.fillText(state.loseReason || 'Pesawat tidak sampai ke runway.', W / 2, 196);
    ctx.fillStyle = '#cfe6f7';
    ctx.font = '700 16px Arial, sans-serif';
    ctx.fillText('Ring dilewati: ' + state.ringsPassed + ' / 8     •     Skor: ' + state.score, W / 2, 232);
    ctx.fillText('Tips: jaga kecepatan di atas 26 m/s, ikuti panah emas ke ring berikutnya,', W / 2, 268);
    ctx.fillText('dan turun perlahan ke runway dengan throttle rendah.', W / 2, 292);
    const retryBox = this.button(ctx, W / 2, 360, 320, 54, '↻  COBA LAGI  (R)', true);
    ctx.restore();
    return { retryBox };
  },
};
