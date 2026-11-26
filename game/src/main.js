// Senja Air — the game loop: screens, the flight update, the render,
// and the wiring between them. Title -> fly the rings -> land -> win/lose,
// with restart on R and autopilot on A.
'use strict';

let Flight = makeFlightState();
let Screen = 'title';
let LastBoxes = {};

function startFlight() {
  resetFlight();
  Screen = 'play';
  AudioEngine.unlock();
}

function backToTitle() {
  resetFlight();
  Screen = 'title';
}

function togglePause() {
  if (Screen === 'play') Screen = 'pause';
  else if (Screen === 'pause') Screen = 'play';
}

function handleKeys() {
  if (Input.pressed('enter')) {
    if (Screen === 'title') startFlight();
    else if (Screen === 'end') startFlight();
  }
  if (Input.pressed('r')) {
    if (Screen === 'end' || Screen === 'pause' || Screen === 'play') startFlight();
  }
  if (Input.pressed('p') || Input.pressed('escape')) {
    if (Screen === 'play' || Screen === 'pause') togglePause();
  }
  if (Input.pressed('m')) {
    AudioEngine.setMuted(!AudioEngine.muted);
  }
  if (Input.pressed('a')) {
    if (Screen === 'play') {
      Flight.autopilot = !Flight.autopilot;
      Flight.message = Flight.autopilot ? 'AUTOPILOT AKTIF — duduk manis, pilot otomatis yang terbang' : 'Autopilot mati — kendali di tanganmu';
      Flight.messageTimer = 2.5;
    }
  }
}

function handleClicks() {
  const click = Input.consumeClick();
  if (!click) return;
  if (Screen === 'title' && LastBoxes.startBox && Screens.clickedInside(click, LastBoxes.startBox)) {
    startFlight();
  } else if (Screen === 'pause') {
    if (LastBoxes.resumeBox && Screens.clickedInside(click, LastBoxes.resumeBox)) togglePause();
    else if (LastBoxes.restartBox && Screens.clickedInside(click, LastBoxes.restartBox)) startFlight();
  } else if (Screen === 'end') {
    if ((LastBoxes.againBox && Screens.clickedInside(click, LastBoxes.againBox)) ||
        (LastBoxes.retryBox && Screens.clickedInside(click, LastBoxes.retryBox))) {
      startFlight();
    }
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (frame.last || now)) / 1000 || 0.016);
  frame.last = now;

  handleKeys();
  handleClicks();

  if (Screen === 'play' && !Shots.frozen) {
    updateFlight(Flight, dt);
    if (Flight.status === 'won' || Flight.status === 'lost') Screen = 'end';
  }

  const ctx = Renderer.ctx;
  Renderer.render(Flight, Screen === 'play' || Screen === 'pause' ? 'play' : Screen);
  if (Screen === 'play' || Screen === 'pause') {
    Cockpit.drawHud(Flight, 'play');
    if (Screen === 'pause') LastBoxes = Screens.drawPause(ctx);
  } else if (Screen === 'title') {
    LastBoxes = Screens.drawTitle(ctx, Flight);
  } else if (Screen === 'end') {
    if (Flight.status === 'won') LastBoxes = Screens.drawWin(ctx, Flight);
    else LastBoxes = Screens.drawLose(ctx, Flight);
  }
}

function bootSenjaAir() {
  const canvas = document.getElementById('game-canvas');
  Input.install(canvas);
  Renderer.init(canvas);
  Renderer.resize();
  window.addEventListener('resize', () => Renderer.resize());

  // A screenshot URL freezes one moment of the game for the camera.
  const shotScreen = Shots.applyShot(Flight);
  if (shotScreen) Screen = shotScreen;

  // ?autoplay=1 starts the game with the autopilot flying the course:
  // the headless play-test that proves the mission can be won.
  const params = new URLSearchParams(window.location.search);
  if (params.get('autoplay') === '1') {
    Flight.autopilot = true;
    Screen = 'play';
  }

  // Test hook: the play-test reads the live state from here.
  window.__senja = {
    get flight() { return Flight; },
    get screen() { return Screen; },
    get frozen() { return Shots.frozen; },
  };
  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', bootSenjaAir);
