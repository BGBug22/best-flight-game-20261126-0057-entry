// Senja Air — deterministic screenshot states. A ?shot= URL picks a
// frozen moment of the game (title, mid-flight, landing, victory) so the
// screenshots are real renders of the game's own code, stable every time.
'use strict';

const Shots = {
  frozen: false,
  name: null,

  applyShot(flight) {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (!shot) return false;
    this.name = shot;
    this.frozen = true;
    if (shot === 'start') {
      // Title screen over the runway, plane waiting at the threshold.
      flight.x = 0; flight.y = SENJA.runway.height + 1.5; flight.z = -1350;
      flight.heading = 0; flight.pitch = 0; flight.roll = 0;
      flight.speed = 0; flight.throttle = 0.35;
      flight.status = 'ready';
      return 'title';
    }
    if (shot === 'play') {
      // Mid-course chase view: banking toward ring 3, the lighthouse and
      // the mountain behind, two rings already banked.
      flight.x = 1050; flight.y = 250; flight.z = 500;
      flight.heading = 34; flight.pitch = 2; flight.roll = 14;
      flight.speed = 62; flight.throttle = 0.8;
      flight.airborne = true; flight.onGround = false;
      flight.ringsDone[0] = true; flight.ringsDone[1] = true;
      flight.ringsPassed = 2;
      flight.score = 500;
      flight.fuel = 88;
      flight.timeLeft = 240;
      flight.status = 'flying';
      flight.nextRingIndex = 2;
      flight.distanceToNextRing = Math.hypot(1250 - 1050, 260 - 250, 800 - 500);
      return 'play';
    }
    if (shot === 'landing') {
      // Final approach: all rings done, the runway strip big ahead, low and slow.
      flight.x = 0; flight.y = 55; flight.z = -350;
      flight.heading = 180; flight.pitch = -3; flight.roll = 0;
      flight.speed = 50; flight.throttle = 0.3;
      flight.airborne = true; flight.onGround = false;
      flight.ringsDone = SENJA.rings.map(() => true);
      flight.ringsPassed = 8;
      flight.score = 2000;
      flight.fuel = 34;
      flight.timeLeft = 90;
      flight.status = 'flying';
      flight.nextRingIndex = -1;
      return 'play';
    }
    if (shot === 'win') {
      // Victory screen over the runway after a perfect landing.
      flight.x = 0; flight.y = SENJA.runway.height + 1.5; flight.z = -1000;
      flight.heading = 180; flight.pitch = 0; flight.roll = 0;
      flight.speed = 0; flight.throttle = 0;
      flight.airborne = false; flight.onGround = true;
      flight.ringsDone = SENJA.rings.map(() => true);
      flight.ringsPassed = 8;
      flight.score = 3120;
      flight.fuel = 31;
      flight.timeLeft = 96;
      flight.status = 'won';
      flight.winStats = { timeUsed: 204, timeLeft: 96, fuelLeft: 31, timeBonus: 480, grade: 'A', score: 3120 };
      return 'end';
    }
    return false;
  },
};
