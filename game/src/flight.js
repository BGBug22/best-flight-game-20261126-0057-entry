// Senja Air — flight model: arcade physics with a stall, a ground roll,
// ring passes, fuel, the timer and the win/lose rules. No external state:
// a fresh FlightState() is a fresh flight.
'use strict';

function makeFlightState() {
  return {
    // Position (metres) and attitude (degrees). Heading 0 = north (+z).
    x: 0, y: SENJA.runway.height + 1.5, z: -1350,
    heading: 0, pitch: 0, roll: 0,
    speed: 0,            // m/s along the nose
    verticalSpeed: 0,    // m/s, positive up
    throttle: 0.35,
    airborne: false,
    onGround: true,
    fuel: SENJA.fuelStart,
    timeLeft: SENJA.timeLimitSeconds,
    ringsPassed: 0,
    ringsDone: SENJA.rings.map(() => false),
    score: 0,
    status: 'ready',     // ready | flying | won | lost
    loseReason: '',
    winStats: null,
    message: '',
    messageTimer: 0,
    autopilot: false,
    apPhase: 'course',
    stallWarning: false,
    pullUpWarning: false,
    lowFuelWarning: false,
    distanceToNextRing: 0,
    nextRingIndex: 0,
    elapsed: 0,
  };
}

function nextRingOf(state) {
  for (let i = 0; i < SENJA.rings.length; i++) {
    if (!state.ringsDone[i]) return i;
  }
  return -1;
}

// Steer the plane toward the next ring: the assist a player can toggle
// with A, and the headless play-test uses to prove the course is winnable.
// After the last ring it flies a proper landing pattern: downwind, base,
// final — never a flip-flopping target, or it would circle forever.
function autopilotSteer(state, dt) {
  const target = nextRingOf(state);
  let tx, ty, tz;
  let throttleTarget = 0.85;
  let pitchGain = 0.09;
  let pitchLimit = 16;
  let pitchFeedforward = 0; // extra nose-down to track a descending slope
  if (target >= 0) {
    const ring = SENJA.rings[target];
    tx = ring.x; ty = ring.y; tz = ring.z;
    state.apPhase = 'course';
  } else {
    if (!state.apPhase || state.apPhase === 'course') state.apPhase = 'approach';
    if (state.apPhase === 'approach') {
      // Fly to the downwind entry, south-east of the runway.
      tx = 300; ty = 150; tz = -1000;
      throttleTarget = 0.7;
      if (Math.hypot(tx - state.x, ty - state.y, tz - state.z) < 160) state.apPhase = 'downwind';
    }
    if (state.apPhase === 'downwind') {
      // Downwind leg: north along the east side, opposite the landing run.
      tx = 300; ty = 150; tz = 0;
      throttleTarget = 0.7;
      if (Math.hypot(tx - state.x, ty - state.y, tz - state.z) < 160) state.apPhase = 'base';
    }
    if (state.apPhase === 'base') {
      // Base leg: turn west across the final fix, north of the threshold,
      // losing height so the final starts low.
      tx = -120; ty = 80; tz = -50;
      throttleTarget = 0.55;
      pitchGain = 0.12;
      pitchLimit = 14;
      if (Math.hypot(tx - state.x, ty - state.y, tz - state.z) < 150) state.apPhase = 'final';
    }
    if (state.apPhase === 'final') {
      // Final: a long, gentle descent down the centreline, heading south.
      // The altitude target rides a glideslope to the touchdown point
      // (0, 8, -900); past it the target stays at 8 so the plane settles
      // onto the strip instead of climbing again. The feedforward pitch
      // matches the slope's own descent rate, so the plane tracks the
      // slope instead of lagging above it forever.
      tx = 0;
      ty = state.z > -900 ? 8 + 0.09 * (state.z + 900) : 8;
      tz = -1300;
      throttleTarget = 0.45;
      pitchGain = 0.09;
      pitchLimit = 9;
      pitchFeedforward = -5.5;
      if ((state.z < -1250 && !state.onGround) || (state.y < 30 && Math.abs(state.x) > 200)) {
        state.apPhase = 'goaround';
      }
    }
    if (state.apPhase === 'goaround') {
      // Climb away and rejoin the downwind entry.
      tx = 300; ty = 170; tz = -1000;
      throttleTarget = 0.8;
      if (Math.hypot(tx - state.x, ty - state.y, tz - state.z) < 180) state.apPhase = 'downwind';
    }
  }
  const dx = tx - state.x;
  const dz = tz - state.z;
  let desiredHeading = radiansToDegrees(Math.atan2(dx, dz));
  // On final, fly the centreline itself: correct the heading by the
  // lateral offset, so an overshoot west comes back east instead of
  // flying parallel to the runway forever.
  if (state.apPhase === 'final') {
    desiredHeading = 180 + clampNumber(state.x * 0.2, -30, 30);
  }
  // Climb straight out after takeoff: no turning until safely above the
  // hills beside the runway.
  if (state.apPhase === 'course' && state.y < 95 && state.z < -700) desiredHeading = 0;
  const headingError = wrapAngleDegrees(desiredHeading - state.heading);
  const targetRoll = clampNumber(headingError * 0.9, -40, 40);
  state.roll = lerpNumber(state.roll, targetRoll, Math.min(1, dt * 1.6));
  const dy = ty - state.y;
  const targetPitch = clampNumber(dy * pitchGain + pitchFeedforward, -pitchLimit, pitchLimit);
  state.pitch = lerpNumber(state.pitch, targetPitch, Math.min(1, dt * 1.2));
  state.throttle = lerpNumber(state.throttle, throttleTarget, Math.min(1, dt * 1.5));
}

function updateFlight(state, dt) {
  if (state.status === 'won' || state.status === 'lost') return;
  state.elapsed += dt;

  if (state.status === 'ready') {
    // Rolling on the runway is allowed; the clock starts at liftoff.
    if (state.airborne) state.status = 'flying';
  }
  if (state.status === 'flying') {
    // The mission clock runs from liftoff, not from the runway roll.
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      return loseFlight(state, 'Waktu habis — bahan bakar dan waktu tidak cukup untuk menyelesaikan misi.');
    }
  }

  const stick = state.autopilot ? { pitch: 0, roll: 0 } : Input.readStick();
  if (state.autopilot) autopilotSteer(state, dt);
  state.throttle = clampNumber(state.throttle + Input.readThrottleChange(dt), 0, 1);

  // Attitude follows the stick, eased so the plane feels heavy, not twitchy.
  const pitchRate = 26;
  const rollRate = 55;
  if (!state.autopilot) {
    state.pitch = clampNumber(state.pitch + stick.pitch * pitchRate * dt, -28, 28);
    state.roll = clampNumber(state.roll + stick.roll * rollRate * dt, -65, 65);
    // Gentle self-levelling when the stick is released.
    if (stick.pitch === 0) state.pitch = lerpNumber(state.pitch, 0, Math.min(1, dt * 0.5));
    if (stick.roll === 0) state.roll = lerpNumber(state.roll, 0, Math.min(1, dt * 0.8));
  }

  // Speed: throttle pushes forward, drag and climbs hold it back.
  const targetSpeed = state.throttle * SENJA.maxSpeed;
  const drag = state.onGround ? 0.5 : 0.55;
  state.speed = lerpNumber(state.speed, targetSpeed, Math.min(1, dt * drag));
  if (state.onGround && state.speed > SENJA.stallSpeed + 6 && state.pitch > 4) {
    state.airborne = true;
    state.onGround = false;
  }

  // Stall: too slow in the air and the nose drops on its own.
  const stalled = state.airborne && state.speed < SENJA.stallSpeed;
  state.stallWarning = stalled;
  let pitchEffect = state.pitch;
  if (stalled) pitchEffect = -12;

  // Heading follows the bank: a banked turn, like a real plane.
  const turnRate = degreesToRadians(state.roll) * (state.speed / 55) * 0.9;
  state.heading = (state.heading + radiansToDegrees(turnRate) * dt + 360) % 360;

  // Climb and sink from pitch and speed; a stall sinks fast.
  const climb = Math.sin(degreesToRadians(pitchEffect)) * state.speed;
  state.verticalSpeed = stalled ? -14 : climb;
  const headingRad = degreesToRadians(state.heading);
  const forwardX = Math.sin(headingRad);
  const forwardZ = Math.cos(headingRad);
  state.x += forwardX * state.speed * dt;
  state.z += forwardZ * state.speed * dt;
  state.y += state.verticalSpeed * dt;
  if (state.y > SENJA.maxAltitude) { state.y = SENJA.maxAltitude; state.verticalSpeed = 0; }

  // Fuel burns with throttle; rings give some back.
  const burn = SENJA.fuelBurnPerSecond * (0.25 + state.throttle) * dt;
  state.fuel = Math.max(0, state.fuel - burn);
  state.lowFuelWarning = state.fuel < 18;
  if (state.fuel <= 0 && state.throttle > 0) state.throttle = 0;

  // Ring passes: close to the centre of the next ring counts.
  const next = nextRingOf(state);
  state.nextRingIndex = next;
  if (next >= 0) {
    const ring = SENJA.rings[next];
    const dist = Math.hypot(state.x - ring.x, state.y - ring.y, state.z - ring.z);
    state.distanceToNextRing = dist;
    if (dist < SENJA.ringPassDistance) {
      state.ringsDone[next] = true;
      state.ringsPassed++;
      state.score += SENJA.ringScore;
      state.fuel = Math.min(100, state.fuel + SENJA.ringFuelBonus);
      state.message = 'RING ' + (next + 1) + ' LEWAT!  +' + SENJA.ringScore + ' poin  •  +' + SENJA.ringFuelBonus + '% bahan bakar';
      state.messageTimer = 2.5;
      AudioEngine.ringChime();
    }
  } else {
    state.distanceToNextRing = Math.hypot(state.x - 0, state.z - (-1000));
  }
  if (state.messageTimer > 0) state.messageTimer -= dt;

  // Ground contact: the terrain decides between a landing and a crash.
  const ground = terrainHeightAt(state.x, state.z);
  state.pullUpWarning = state.airborne && state.y - ground < 35 && state.verticalSpeed < -2;
  if (state.y <= ground + 1.2) {
    state.y = ground + 1.2;
    if (state.airborne) {
      const onStrip = isOnRunway(state.x, state.z);
      const gentle = Math.abs(state.verticalSpeed) <= SENJA.landingMaxSink;
      const slowEnough = state.speed <= SENJA.landingMaxSpeed;
      const aligned = Math.abs(wrapAngleDegrees(state.heading - 180)) < 35 || Math.abs(wrapAngleDegrees(state.heading)) < 35;
      if (onStrip && gentle && slowEnough && aligned) {
        landFlight(state);
      } else {
        const where = isOverSea(state.x, state.z) ? 'laut' : 'tanah';
        return loseFlight(state, 'Menabrak ' + where + ' — pesawat hancur. Terbang lebih tinggi dan jaga kecepatan.');
      }
    } else {
      // Rolling on the ground: slow to a stop if the throttle is cut.
      if (state.throttle < 0.05) state.speed = lerpNumber(state.speed, 0, Math.min(1, dt * 1.2));
    }
  }
  AudioEngine.update(state.throttle, state.speed, state.airborne);
}

function landFlight(state) {
  state.airborne = false;
  state.onGround = true;
  state.verticalSpeed = 0;
  AudioEngine.touchdownThud();
  if (state.ringsPassed >= SENJA.rings.length) {
    const timeBonus = Math.round(state.timeLeft) * SENJA.timeBonusPerSecond;
    state.score += SENJA.landingScore + timeBonus;
    const grade = state.timeLeft > 120 ? 'S' : state.timeLeft > 60 ? 'A' : state.timeLeft > 20 ? 'B' : 'C';
    state.winStats = {
      timeUsed: Math.round(state.elapsed),
      timeLeft: Math.round(state.timeLeft),
      fuelLeft: Math.round(state.fuel),
      timeBonus,
      grade,
      score: state.score,
    };
    state.status = 'won';
    AudioEngine.winFanfare();
  } else {
    state.message = 'Mendarat — tapi ring belum lengkap (' + state.ringsPassed + '/8). Gas lagi dan lanjutkan!';
    state.messageTimer = 4;
    // A touch-and-go: the plane may take off again and keep the rings.
    state.speed = Math.max(state.speed, 10);
  }
}

function loseFlight(state, reason) {
  state.status = 'lost';
  state.loseReason = reason;
  AudioEngine.crashSound();
  AudioEngine.loseTone();
}

function resetFlight() {
  const fresh = makeFlightState();
  Object.keys(fresh).forEach((key) => { Flight[key] = fresh[key]; });
}
