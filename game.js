import Piggy from './bird.js';
import PipeManager from './ENEMY.js';
import ScoreManager from './score.js';
import CoinManager from './coins.js';

class FlappyPiggyGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.startOverlay = document.getElementById('startOverlay');
    this.startButton = document.getElementById('startButton');

    // Language UI elements
    this.langSelect = document.getElementById('langSelect');
    this.gameTitleEl = document.getElementById('gameTitle');
    this.startHintEl = document.getElementById('startHint');

    // translations map (small representative set — additional languages can be added)
    this.translations = {
      en: {
        title: 'Flying SMG3',
        startHint: 'Tap or click to start the game and enable sounds!',
        startButton: 'Start Game',
        tryAgain: 'Try Again',
        scoreLabel: (n) => `score = ${n}`,
        levelLines: (score) => [
          `match level 1: 1 + 1 = ${1 + 1}`,
          `match level 2: 10 + 10 = ${10 + 10}`,
          `match level 3: 20 x 20 = ${20 * 20}`,
          `match level 4: 90 + 90 = ${90 + 90} (${score})`
        ]
      },
      pt: {
        title: 'Flying SMG3',
        startHint: 'Toque ou clique para iniciar o jogo e ativar sons!',
        startButton: 'Iniciar Jogo',
        tryAgain: 'Tentar Novamente',
        scoreLabel: (n) => `pontuação = ${n}`,
        levelLines: (score) => [
          `match nível 1: 1 + 1 = ${1 + 1}`,
          `match nível 2: 10 + 10 = ${10 + 10}`,
          `match nível 3: 20 x 20 = ${20 * 20}`,
          `match nível 4: 90 + 90 = ${90 + 90} (${score})`
        ]
      },
      es: {
        title: 'Flying SMG3',
        startHint: 'Toca o haz clic para iniciar el juego y activar sonido!',
        startButton: 'Iniciar Juego',
        tryAgain: 'Intentar de Nuevo',
        scoreLabel: (n) => `puntuación = ${n}`,
        levelLines: (score) => [
          `match nivel 1: 1 + 1 = ${1 + 1}`,
          `match nivel 2: 10 + 10 = ${10 + 10}`,
          `match nivel 3: 20 x 20 = ${20 * 20}`,
          `match nivel 4: 90 + 90 = ${90 + 90} (${score})`
        ]
      },
      fr: {
        title: 'Flying SMG3',
        startHint: 'Appuyez ou cliquez pour démarrer le jeu et activer les sons !',
        startButton: 'Démarrer',
        tryAgain: 'Réessayer',
        scoreLabel: (n) => `score = ${n}`,
        levelLines: (score) => [
          `match niveau 1: 1 + 1 = ${1 + 1}`,
          `match niveau 2: 10 + 10 = ${10 + 10}`,
          `match niveau 3: 20 x 20 = ${20 * 20}`,
          `match niveau 4: 90 + 90 = ${90 + 90} (${score})`
        ]
      },
      de: {
        title: 'Flying SMG3',
        startHint: 'Tippe oder klicke, um das Spiel zu starten und Ton zu aktivieren!',
        startButton: 'Spiel Starten',
        tryAgain: 'Nochmals versuchen',
        scoreLabel: (n) => `punktzahl = ${n}`,
        levelLines: (score) => [
          `match level 1: 1 + 1 = ${1 + 1}`,
          `match level 2: 10 + 10 = ${10 + 10}`,
          `match level 3: 20 x 20 = ${20 * 20}`,
          `match level 4: 90 + 90 = ${90 + 90} (${score})`
        ]
      }
      // Additional languages from your list can be appended here with the same shape.
    };

    // helper to get current translation object (falls back to English)
    this.getT = (code) => {
      if (!code || code === 'auto') {
        const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
        code = (nav && nav.split && nav.split('-')[0]) || 'en';
      }
      return this.translations[code] || this.translations[code.split && code.split('-')[0]] || this.translations.en;
    };

    // apply initial language (read from storage or auto)
    this.currentLang = (localStorage.getItem('gameLang')) || 'auto';
    if (this.langSelect) {
      // set select control to stored value if present, otherwise keep 'auto'
      this.langSelect.value = this.currentLang || 'auto';
      this.langSelect.addEventListener('change', () => {
        const chosen = this.langSelect.value || 'auto';
        this.currentLang = chosen;
        // persist choice so reload can restore language
        try { localStorage.setItem('gameLang', chosen); } catch (e) {}
        // update document title immediately to reflect choice, then reload to fully apply
        try {
          const t = this.getT(chosen);
          if (t && t.title) document.title = t.title;
        } catch (e) {}
        // reload page to apply language globally and reinitialize with saved language
        try { location.reload(); } catch (e) { /* ignore */ }
      });
    }
    // apply language UI once DOM refs available (use stored currentLang)
    this.applyLanguage();

    // Device pixel ratio aware sizing
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.resizeCanvas();

    // Resize handler
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      // update managers with new canvas ref if needed
      if (this.piggy) {
        // keep pig inside bounds
        this.piggy.canvas = this.canvas;
        this.piggy.x = Math.min(this.piggy.x, this.canvas.width - this.piggy.width / 2);
        this.piggy.y = Math.min(this.piggy.y, this.canvas.height - this.piggy.height / 2);
      }
      if (this.pipeManager) this.pipeManager.canvas = this.canvas;
      if (this.coinManager) this.coinManager.canvas = this.canvas;
    });

    // Load sound effects with better error handling, including fall sequence sounds
    this.sounds = {
      jump: this.createAudio('jump.wav'),
      hit: this.createAudio('Minecraft - Hit (Sound Effect).mp3'),
      gameOver: this.createAudio('game over - sound effect [ ezmp3.cc ].mp3'),
      pigDeath: this.createAudio('pig-death-(minecraft-sound)-sound-effect-for-editing-made-with-Voicemod.mp3'),
      coinCollect: this.createAudio('sun_collect.mp3'),
      coinOink: this.createAudio('piglette oink a1.wav'),
      bgm: this.createAudio('BGM.mp3'),
      // Match/happy sound effect (course clear)
      courseClear: this.createAudio('47. Course Clear.mp3'),
      // Falling sequence: an initial impact cue, a looping descent ambience, and final death sound
      fallStart: this.createAudio('fall.wav'),
      fallingLoop: this.createAudio('falling.wav'),
      dead: this.createAudio('dead.wav')
    };

    // Ensure fallingLoop is set to loop while descending
    try {
      if (this.sounds.fallingLoop) {
        this.sounds.fallingLoop.loop = true;
      }
    } catch (e) {
      // ignore
    }
    
    // Load background images + paused video frame background
    this.backgroundImages = {}; // removed external image backgrounds; use video or solid color

    // Create a video element to use a frozen frame as the default background.
    // We'll load the provided mp4 and also prepare additional frozen frames for
    // angry/happy/final overlays used at game-over and level-match displays.
    this.backgroundVideo = document.createElement('video');
    this.backgroundVideo.crossOrigin = 'anonymous';
    this.backgroundVideo.muted = true;
    this.backgroundVideo.playsInline = true;
    this.backgroundVideo.preload = 'auto';
    this.backgroundVideo.src = 'https://files.catbox.moe/c0bi7o.mp4';
    this._bgVideoReady = false;

    // Additional frozen videos for game-over "match" visuals
    this.angryVideo = document.createElement('video');   // shows "angry" frozen frame at 6.7s
    this.happyVideo = document.createElement('video');   // shows "happy" frozen frame at 6.7s
    this.finalVideo = document.createElement('video');   // final cleared frame at 151s

    [this.angryVideo, this.happyVideo, this.finalVideo].forEach(v => {
      v.crossOrigin = 'anonymous';
      v.muted = true;
      v.playsInline = true;
      v.preload = 'auto';
    });

    this.angryVideo.src = 'https://files.catbox.moe/ge3y58.mp4';
    this.happyVideo.src = 'https://files.catbox.moe/8ih792.mp4';
    this.finalVideo.src = 'https://files.catbox.moe/8ih792.mp4'; // reuse same host if desired for final frame

    // readiness flags
    this._bgVideoReady = false;
    this._angryReady = false;
    this._happyReady = false;
    this._finalReady = false;

    // helper to seek-and-pause to capture a frozen frame time when possible
    const seekAndPause = (video, time, onReadyFlagSetter) => {
      const safeSeek = () => {
        try {
          // attempt to set time and pause to capture frame
          video.currentTime = time;
        } catch (e) {
          // ignore seeking errors (some browsers restrict programmatic seeks)
        }
      };
      video.addEventListener('loadedmetadata', () => {
        safeSeek();
      });
      video.addEventListener('seeked', () => {
        try { video.pause(); } catch (e) {}
        try { onReadyFlagSetter(true); } catch (e) {}
      });
      video.addEventListener('loadeddata', () => {
        // fallback: pause shortly after data is available and mark ready
        setTimeout(() => {
          try { video.pause(); } catch (e) {}
          try { onReadyFlagSetter(true); } catch (e) {}
        }, 150);
      });
      try { video.load(); } catch (e) {}
    };

    // Prepare background default (no forced seek time)
    this.backgroundVideo.addEventListener('loadeddata', () => {
      setTimeout(() => {
        try { this.backgroundVideo.pause(); } catch (e) {}
        this._bgVideoReady = true;
      }, 150);
    });
    try { this.backgroundVideo.load(); } catch (e) {}

    // Prepare angry/happy/final frozen frames at specified times
    seekAndPause(this.angryVideo, 6.7, (v) => { this._angryReady = v; });
    seekAndPause(this.happyVideo, 6.7, (v) => { this._happyReady = v; });
    seekAndPause(this.finalVideo, 151.0, (v) => { this._finalReady = v; });
    
    // Set up initial event listeners
    this.setupInitialListeners();
    // Extra background speed added on top of pipe speed (can be tweaked via window.BG_EXTRA_SPEED before init)
    this.bgExtraSpeed = (typeof window.BG_EXTRA_SPEED === 'number') ? window.BG_EXTRA_SPEED : 0.5;
    this.cameraX = 0;
    // Vertical camera follow for falling effect
    this.cameraY = 0; // logical pixels
    this.cameraYTarget = 0;
    this.cameraYEase = 0.08; // easing for smooth vertical follow

    // Game-over ground spawning tweak:
    // set the delay in milliseconds before a visible "ground" is spawned after gameOver() is called.
    // You can change this value at runtime (e.g. game.gameOverGroundDelay = 800) before triggering a game over.
    this.gameOverGroundDelay = 1200; // ms default delay before ground appears
    this.gameOverGroundSpawnAt = null; // timestamp when ground should appear (time-based fallback)
    this.groundSpawnWorldY = null; // world Y coordinate where the ground will exist (logical pixels)
    this.groundVisible = false; // toggles drawing/ground collision
    this.groundHeight = 60; // px height of the spawned ground surface (logical pixels)
    this.groundImage = this.loadImage('wood.png'); // visual ground (fallback to color if unavailable)
    // match character videos to show above ground (frozen frames at requested times)
    this.matchVideos = {
      angry: document.createElement('video'),
      happy: document.createElement('video'),
      final: document.createElement('video')
    };
    Object.values(this.matchVideos).forEach(v => {
      v.crossOrigin = 'anonymous';
      v.muted = true;
      v.playsInline = true;
      v.preload = 'auto';
    });
    this.matchVideos.angry.src = 'https://files.catbox.moe/ge3y58.mp4';
    this.matchVideos.happy.src = 'https://files.catbox.moe/8ih792.mp4';
    this.matchVideos.final.src = 'https://files.catbox.moe/8ih792.mp4';
    this._matchAngryReady = false;
    this._matchHappyReady = false;
    this._matchFinalReady = false;
    const markReady = (v, flagSetter) => {
      v.addEventListener('loadeddata', () => { setTimeout(() => flagSetter(true), 120); });
      v.addEventListener('seeked', () => { try { v.pause(); } catch (e){} flagSetter(true); });
      try { v.load(); } catch (e) {}
    };
    markReady(this.matchVideos.angry, (v)=>{ this._matchAngryReady = v; });
    markReady(this.matchVideos.happy, (v)=>{ this._matchHappyReady = v; });
    markReady(this.matchVideos.final, (v)=>{ this._matchFinalReady = v; });
  }

  loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  createAudio(src) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    return audio;
  }

  resizeCanvas() {
    // Size canvas to viewport with DPR scaling
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    this.canvas.style.width = vw + 'px';
    this.canvas.style.height = vh + 'px';
    this.canvas.width = Math.round(vw * this.dpr);
    this.canvas.height = Math.round(vh * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setupInitialListeners() {
    this.startButton.addEventListener('click', () => {
      this.startOverlay.style.display = 'none';
      this.init();
    });

    // Allow tapping anywhere to start on mobile (while overlay shows)
    this.startOverlay.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startButton.click();
    }, {passive: false});

    // Canvas click / touch handler for Try Again button (world-anchored at 1511)
    this.canvas.addEventListener('click', (ev) => {
      try {
        if (!this.tryAgainButtonRect || !this.tryAgainButtonRect.visible) return;
        const rect = this.canvas.getBoundingClientRect();
        const cx = (ev.clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
        const cy = (ev.clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;
        const r = this.tryAgainButtonRect;
        if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
          if (this.fallFinalized || this.isGameOver) this.restart();
        }
      } catch (e) {}
    }, { passive: true });

    this.canvas.addEventListener('touchstart', (ev) => {
      try {
        if (!this.tryAgainButtonRect || !this.tryAgainButtonRect.visible) return;
        const touch = ev.touches[0];
        if (!touch) return;
        const rect = this.canvas.getBoundingClientRect();
        const cx = (touch.clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
        const cy = (touch.clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;
        const r = this.tryAgainButtonRect;
        if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
          if (this.fallFinalized || this.isGameOver) {
            ev.preventDefault();
            this.restart();
          }
        }
      } catch (e) {}
    }, { passive: false });

    // change cursor when hovering Try Again button
    this.canvas.addEventListener('mousemove', (ev) => {
      try {
        if (!this.tryAgainButtonRect || !this.tryAgainButtonRect.visible) {
          this.canvas.style.cursor = 'default';
          return;
        }
        const rect = this.canvas.getBoundingClientRect();
        const cx = (ev.clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
        const cy = (ev.clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;
        const r = this.tryAgainButtonRect;
        if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
          this.canvas.style.cursor = 'pointer';
        } else {
          this.canvas.style.cursor = 'default';
        }
      } catch (e) {
        this.canvas.style.cursor = 'default';
      }
    }, { passive: true });
  }

  init() {
    // Reset camera + ground/fall state so restarting always begins from a clean, camera-relative baseline.
    this.cameraX = 0;
    this.cameraY = 0;
    this.cameraYTarget = 0;
    this.cameraYEase = 0.08;

    this.gameOverGroundSpawnAt = null;
    this.groundSpawnWorldY = null;
    this.groundVisible = false;
    this.fallFinalized = false;
    this._fallHandled = false;
    this.isFalling = false;
    this.isGameOver = false;

    this.piggy = new Piggy(this.canvas);
    // position piggy vertically as 200 + current cameraY (logical pixels) and sync target
    this.piggy.y = 200 + this.cameraY;
    this.piggy.targetY = this.piggy.y;
    this.piggy.resetToNormalImage();

    this.pipeManager = new PipeManager(this.canvas);
    this.scoreManager = new ScoreManager();
    this.coinManager = new CoinManager(this.canvas);

    // Re-apply language strings into any UI that may persist between restarts
    this.applyLanguage();

    // Start background music (user has already interacted to dismiss overlay)
    try {
      const bgm = this.sounds.bgm;
      if (bgm) {
        bgm.loop = true;
        bgm.volume = 0.4;
        bgm.currentTime = 0;
        bgm.play().catch(() => {});
      }
    } catch (e) {
      console.warn('BGM start failed', e);
    }

    // Remove previous listeners to avoid duplicates
    // Wire up on-screen Up/Down buttons and input handling for parenting controls
    const btnUp = document.getElementById('btnUp');
    const btnDown = document.getElementById('btnDown');

    if (btnUp) {
      btnUp.addEventListener('click', (e) => { e.preventDefault(); this.handleMoveUp(); });
      btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleMoveUp(); }, {passive:false});
    }
    if (btnDown) {
      btnDown.addEventListener('click', (e) => { e.preventDefault(); this.handleMoveDown(); });
      btnDown.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleMoveDown(); }, {passive:false});
    }

    // Left/Right buttons
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');

    if (btnLeft) {
      btnLeft.addEventListener('click', (e) => { e.preventDefault(); this.handleMoveLeft(); });
      btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleMoveLeft(); }, {passive:false});
    }
    if (btnRight) {
      btnRight.addEventListener('click', (e) => { e.preventDefault(); this.handleMoveRight(); });
      btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleMoveRight(); }, {passive:false});
    }

    // Also allow arrow keys for desktop
    document.onkeydown = (e) => this.handleKeyPress(e);
    
    this.setupGameLoop();
  }

  handleMoveUp() {
    if (!this.isGameOver && this.piggy) {
      this.piggy.moveUp();
      this.safePlaySound(this.sounds.jump);
    }
  }

  handleMoveDown() {
    if (!this.isGameOver && this.piggy) {
      this.piggy.moveDown();
      this.safePlaySound(this.sounds.jump);
    }
  }

  handleMoveLeft() {
    if (!this.isGameOver && this.piggy) {
      this.piggy.moveLeft();
      this.safePlaySound(this.sounds.jump);
    }
  }

  handleMoveRight() {
    if (!this.isGameOver && this.piggy) {
      this.piggy.moveRight();
      this.safePlaySound(this.sounds.jump);
    }
  }

  handleKeyPress(e) {
    // Up/Down arrow keys control parenting movement
    if (!this.isGameOver) {
      if (e.code === 'ArrowUp') {
        this.handleMoveUp();
      } else if (e.code === 'ArrowDown') {
        this.handleMoveDown();
      } else if (e.code === 'ArrowLeft') {
        this.handleMoveLeft();
      } else if (e.code === 'ArrowRight') {
        this.handleMoveRight();
      }
    }

    // Restart on 'R' key when game is over
    if (e.key && e.key.toLowerCase() === 'r' && this.isGameOver) {
      this.restart();
    }
  }

  safePlaySound(sound) {
    try {
      sound.currentTime = 0;
      sound.play().catch(error => {
        console.warn('Audio play failed:', error);
      });
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }

  restart() {
    // Reset the game state
    this.startOverlay.style.display = 'none';
    if (this.piggy) this.piggy.resetToNormalImage();
    
    // Stop and reset all sounds BEFORE init so init() can start BGM cleanly
    Object.values(this.sounds).forEach(sound => {
      try {
        sound.pause();
        sound.currentTime = 0;
      } catch (e) {
        // ignore
      }
    });

    // Reset background video/frame to normal starting state so the restart shows the usual background
    try {
      if (this.backgroundVideo) {
        // Do not change video currentTime on restart; just ensure it's paused and flagged ready.
        this.backgroundVideo.pause();
        this._bgVideoReady = true;
      }
    } catch (e) {
      // ignore background reset errors
    }

    this.init();
  }

  // Apply current language to visible DOM UI and document title
  applyLanguage() {
    const t = this.getT(this.currentLang);
    try {
      if (this.gameTitleEl && t && t.title) this.gameTitleEl.textContent = t.title;
      if (this.startHintEl && t && t.startHint) this.startHintEl.textContent = t.startHint;
      if (this.startButton && t && t.startButton) this.startButton.textContent = t.startButton;
      // also update the document title to match selected language
      if (t && t.title) {
        try { document.title = t.title; } catch (e) {}
      }
    } catch (e) {}
  }

  setupGameLoop() {
    const animate = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.piggy.update();
      this.pipeManager.update();
      this.coinManager.update();

      // If the pig is in falling (game-over) physics mode, apply vertical physics to the cameraY
      // so the world scrolls down and the pig appears to fall relative to the scene.
      if (this.piggy && this.piggy.isFalling) {
        // Integrate vertical physics on the pig's vy, but move cameraY instead of pig.y
        this.piggy.vy += this.piggy.ay;
        // apply camera vertical movement using pig's vy (logical pixels)
        this.cameraY += this.piggy.vy;

        // Keep pig rotation progression in sync (also cap it)
        this.piggy.rotationSpeed += 0.001 * Math.abs(this.piggy.vy);
        this.piggy.rotation += this.piggy.rotationSpeed;
        if (this.piggy.rotation > this.piggy.maxRotation) this.piggy.rotation = this.piggy.maxRotation;
      }

      // If a ground spawn time is scheduled, activate the ground when its timestamp passes.
      if (!this.groundVisible && this.gameOverGroundSpawnAt && Date.now() >= this.gameOverGroundSpawnAt) {
        this.groundVisible = true;
        // When ground becomes visible, ensure camera target adjusts so pig lands into view
        try {
          const h = this.canvas.height / this.dpr;
          this.cameraYTarget = Math.max(0, this.piggy.y - h * 0.35);
          // nudge pig target down a little to make landing visible
          this.piggy.vy = Math.max(2, this.piggy.vy);
        } catch (e) {}
      }

      // advance camera X by pipe speed + adjustable extra background speed (so background = pipeSpeed + extra)
      if (this.pipeManager && typeof this.pipeManager.pipeSpeed === 'number') {
        this.cameraX += this.pipeManager.pipeSpeed + this.bgExtraSpeed;
      } else if (this.pipeManager && typeof this.pipeManager.getBackgroundScrollSpeed === 'function') {
        // fallback to original combined method if pipeSpeed isn't directly available
        this.cameraX += this.pipeManager.getBackgroundScrollSpeed() + this.bgExtraSpeed;
      }

      // Update vertical camera target and smoothly follow pig when falling (or generally keep pig centered)
      try {
        const h = this.canvas.height / this.dpr;

        if (this.piggy) {
          if (this.isFalling) {
            // When falling, bias the pig toward the upper third of the screen so the fall feels cinematic.
            // Use a stronger easing for a flowing camera follow.
            const upperBias = 0.35; // pig will be placed at ~35% from top
            this.cameraYTarget = this.piggy.y - h * upperBias;
            // increase follow speed slightly during fall for more responsive tracking
            this.cameraYEase = 0.12;
          } else {
            // Normal gameplay: keep pig roughly centered
            this.cameraYTarget = this.piggy.y - h / 2;
            // restore default ease for regular play
            this.cameraYEase = 0.08;
          }
        }

        // clamp so camera doesn't show negative space above top or too far below ground
        // use the requested max position expression: -200 + cameraY - 0.1
        const maxCameraY = Math.max(0, -200 + (this.cameraY || 0) - 0.1);
        if (this.cameraYTarget < 0) this.cameraYTarget = 0;
        if (this.cameraYTarget > maxCameraY) this.cameraYTarget = maxCameraY;

        // ease toward target (keeps motion smooth and flowing)
        this.cameraY += (this.cameraYTarget - this.cameraY) * this.cameraYEase;
      } catch (e) {
        // ignore camera follow errors
      }

      this.drawBackground();
      // draw pipes and coins with cameraY so they move vertically with the camera
      this.pipeManager.draw(this.ctx, this.cameraY);
      this.piggy.draw(this.ctx);
      this.coinManager.draw(this.ctx, this.cameraY);
      
      this.checkCollisions();
      this.scoreManager.draw(this.ctx);
      
      // Continue animating while the fall/death sequence is running so the pig visibly falls.
      if (!this.fallFinalized) {
        requestAnimationFrame(animate);
      } else {
        // Once finalized, draw the final overlay once (no further animation loop)
        this.drawGameOver();
      }
    };
    
    animate();
  }

  drawBackground() {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const score = (this.scoreManager && typeof this.scoreManager.score === 'number') ? this.scoreManager.score : 0;

    // draw base background (prefer video frame)
    let imageSource = (this.backgroundVideo && this._bgVideoReady) ? this.backgroundVideo : null;
    if (!imageSource) {
      this.ctx.fillStyle = '#70c5ce';
      this.ctx.fillRect(0, 0, w, h);
    } else {
      const srcW = (imageSource.videoWidth) ? imageSource.videoWidth : (imageSource.width || w);
      const srcH = (imageSource.videoHeight) ? imageSource.videoHeight : (imageSource.height || h);
      const scale = h / srcH;
      const drawW = srcW * scale;
      const drawH = srcH * scale;

      const camYFactor = Math.max(0, Math.min(2, (this.cameraY || 0) / 1000));
      const speedMultiplier = 1 + camYFactor * 0.6;
      let offset = ((this.cameraX * speedMultiplier) % drawW + drawW) % drawW;
      if (this.isGameOver || this.fallFinalized) offset = 0;
      for (let x = -offset; x < w; x += drawW) {
        try {
          this.ctx.drawImage(imageSource, 0, 0, srcW, srcH, x, 0, drawW, drawH);
        } catch (e) {
          this.ctx.fillStyle = '#70c5ce';
          this.ctx.fillRect(0, 0, w, h);
          break;
        }
      }
      if (drawH < h) {
        this.ctx.fillStyle = '#70c5ce';
        this.ctx.fillRect(0, drawH, w, h - drawH);
      }
    }

    // If ground is visible, draw ground and overlay the frozen "match" visuals based on score thresholds
    if (this.groundVisible) {
      // Determine world/top Y of the ground (in world coordinates) and convert to screen space
      const worldGroundTop = (typeof this.groundSpawnWorldY === 'number')
        ? this.groundSpawnWorldY
        : ((this.canvas.height / this.dpr) + this.cameraY - this.groundHeight);
      const groundTopOnScreen = worldGroundTop - this.cameraY;
      // drawY is where we render the ground on screen; do NOT clamp when positioning the match character above it
      const drawY = Math.max(-this.groundHeight, Math.min(groundTopOnScreen, h));

      // draw ground (image or color)
      if (this.groundImage && this.groundImage.complete && this.groundImage.naturalWidth > 0) {
        const imgW = this.groundImage.width || 64;
        const imgH = this.groundImage.height || this.groundHeight;
        const scale = this.groundHeight / imgH;
        const drawW = imgW * scale;
        for (let x = 0; x < w + drawW; x += drawW) {
          try {
            this.ctx.drawImage(this.groundImage, 0, 0, imgW, imgH, x, drawY, drawW, this.groundHeight);
          } catch (e) {
            this.ctx.fillStyle = '#8B5A2B';
            this.ctx.fillRect(0, drawY, w, this.groundHeight);
            break;
          }
        }
      } else {
        this.ctx.fillStyle = '#8B5A2B';
        this.ctx.fillRect(0, drawY, w, this.groundHeight);
      }

      // Draw the "match character" using frozen video frames anchored above the ground top.
      try {
        // choose match video based on score
        let matchVid = null;
        if (this.scoreManager && typeof this.scoreManager.score === 'number') {
          const sc = this.scoreManager.score;
          if (sc >= 90 && this.matchVideos.final && this._matchFinalReady) matchVid = this.matchVideos.final;
          else if (sc >= 10 && this.matchVideos.happy && this._matchHappyReady) matchVid = this.matchVideos.happy;
          else if (this.matchVideos.angry && this._matchAngryReady) matchVid = this.matchVideos.angry;
        } else if (this.matchVideos.angry && this._matchAngryReady) {
          matchVid = this.matchVideos.angry;
        }

        if (matchVid) {
          const mcW = Math.min(w * 0.36, 220);
          const mcH = (matchVid.videoHeight && matchVid.videoWidth) ? mcW * (matchVid.videoHeight / matchVid.videoWidth) : mcW * 0.75;

          const mcX = (w - mcW) / 2;
          const charBottomScreenY = worldGroundTop - this.cameraY;
          const mcTopY = charBottomScreenY - mcH - 6;

          // try to set desired frame time and pause so we draw a frozen frame
          try {
            if (matchVid === this.matchVideos.angry) {
              try { matchVid.currentTime = 6.7; } catch(e) {}
            } else if (matchVid === this.matchVideos.happy) {
              try { matchVid.currentTime = 6.7; } catch(e) {}
            } else if (matchVid === this.matchVideos.final) {
              try { matchVid.currentTime = 151.0; } catch(e) {}
            }
            try { matchVid.pause(); } catch(e) {}
          } catch (e) {}

          try {
            this.ctx.drawImage(matchVid, 0, 0, matchVid.videoWidth || mcW, matchVid.videoHeight || mcH, mcX, mcTopY, mcW, mcH);
          } catch (e) {
            // fallback: do nothing
          }
        }
      } catch (e) {
        // ignore video draw errors
      }

      // Determine which frozen overlay to draw:
      // - score < 10: use angry (6.7s)
      // - 10 <= score < 20: use happy (6.7s)
      // - 20 <= score < 90: use happy (6.7s)
      // - score >= 90: use final (151s)
      let overlayVideo = null;
      if (score >= 90 && this.finalVideo && this._finalReady) overlayVideo = this.finalVideo;
      else if (score >= 10 && this.happyVideo && this._happyReady) overlayVideo = this.happyVideo;
      else if (this.angryVideo && this._angryReady) overlayVideo = this.angryVideo;

      if (overlayVideo) {
        try {
          // draw overlay centered above ground area; anchor to the ground top (world -> screen)
          const ovW = Math.min(w * 0.7, overlayVideo.videoWidth || w);
          const ovH = (overlayVideo.videoHeight && overlayVideo.videoWidth) ? ovW * (overlayVideo.videoHeight / overlayVideo.videoWidth) : ovW * 0.56;
          const ox = (w - ovW) / 2;
          // base overlay Y above the drawn ground top; include a subtle cameraY influence so the overlay
          // visually follows the scene vertical movement during fall sequences.
          const cameraInfluence = (this.cameraY || 0) * 0.02; // small parallax factor
          const oy = drawY - ovH - 12 + cameraInfluence;
          this.ctx.drawImage(overlayVideo, 0, 0, overlayVideo.videoWidth || ovW, overlayVideo.videoHeight || ovH, ox, oy, ovW, ovH);
        } catch (e) {
          // ignore overlay draw errors
        }
      }

      // Draw world-anchored score label and Try Again button (as before) at world Y = 1511
      try {
        const worldScoreY = 1511;
        const scoreScreenY = worldScoreY - this.cameraY;
        if (scoreScreenY >= -200 && scoreScreenY <= h + 200) {
          const text = (this.getT(this.currentLang) && this.getT(this.currentLang).scoreLabel)
            ? this.getT(this.currentLang).scoreLabel(this.scoreManager ? this.scoreManager.score : 0)
            : `score = ${this.scoreManager ? this.scoreManager.score : 0}`;
          this.ctx.font = '20px Comic Sans MS';
          const metrics = this.ctx.measureText(text);
          const pad = 10;
          const textW = metrics.width + pad * 2;
          const textH = 28 + pad;
          const tx = (w - textW) / 2;
          const ty = scoreScreenY - textH - 16;

          this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
          this.ctx.fillRect(tx, ty, textW, textH);

          this.ctx.fillStyle = 'white';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(text, w / 2, ty + textH / 2);

          const btnW = 160;
          const btnH = 42;
          const btnX = (w - btnW) / 2;
          const btnY = scoreScreenY + 8;

          this.ctx.fillStyle = 'rgba(255,255,255,0.95)';
          this.ctx.fillRect(btnX, btnY, btnW, btnH);

          this.ctx.strokeStyle = '#333';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(btnX, btnY, btnW, btnH);

          this.ctx.fillStyle = '#111';
          this.ctx.font = '18px Comic Sans MS';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          const tryText = (this.getT(this.currentLang) && this.getT(this.currentLang).tryAgain) ? this.getT(this.currentLang).tryAgain : 'Try Again';
          this.ctx.fillText(tryText, btnX + btnW / 2, btnY + btnH / 2);

          this.tryAgainButtonRect = { x: btnX, y: btnY, w: btnW, h: btnH, visible: true, worldY: worldScoreY };

          // Draw the "match level" breakdown text below the Try Again button.
          // Format the calculations as requested:
          // match level 1: 1 + 1
          // match level 2: 10 + 10
          // match level 3: 20 x 20
          // match level 4: 90 + 90 = <score value>
          const breakdownX = w / 2;
          let startY = btnY + btnH + 14;
          this.ctx.textAlign = 'center';
          this.ctx.fillStyle = 'white';
          this.ctx.font = '16px Comic Sans MS';
          // localized breakdown lines (fallback to English)
          let lines = (this.getT(this.currentLang) && this.getT(this.currentLang).levelLines)
            ? this.getT(this.currentLang).levelLines(score)
            : [
              `match level 1: 1 + 1 = ${1 + 1}`,
              `match level 2: 10 + 10 = ${10 + 10}`,
              `match level 3: 20 x 20 = ${20 * 20}`,
              `match level 4: 90 + 90 = ${90 + 90} (${score})`
            ];
          lines.forEach((ln, i) => {
            this.ctx.fillText(ln, breakdownX, startY + i * 20);
          });
        } else {
          if (this.tryAgainButtonRect) this.tryAgainButtonRect.visible = false;
        }
      } catch (e) {
        // ignore rendering errors for the world score/button/levels label
      }
    }
  }

  checkCollisions() {
    // Check pipe collisions (only while not already falling)
    const pipes = this.pipeManager.getPipes();
    pipes.forEach(pipe => {
      // pass cameraY so pipe collision uses correct vertical screen position
      if (!this.isFalling && this.piggy.checkCollisionWithPipe(pipe, this.cameraY)) {
        this.gameOver();
      }
    });

    // Check ground collision only if the ground has been spawned (visible)
    // Use the ground's world Y (this.groundSpawnWorldY) converted to screen space so collisions match the drawn ground.
    if (this.groundVisible) {
      try {
        // Determine world Y for the top of the ground. If groundSpawnWorldY is set use it,
        // otherwise default to anchoring ground to the bottom of the world.
        const canvasH = this.canvas.height / this.dpr;
        const worldGroundTop = (typeof this.groundSpawnWorldY === 'number')
          ? this.groundSpawnWorldY
          : ((canvasH) + this.cameraY - this.groundHeight);

        // Convert the ground world Y to a screen Y by subtracting cameraY.
        const groundTopOnScreen = worldGroundTop - this.cameraY;

        // Pig bottom in screen coordinates
        const pigBottomOnScreen = this.piggy.y + this.piggy.height / 2;

        if (pigBottomOnScreen >= groundTopOnScreen) {
          // Snap pig to ground top in screen coords to ensure a clean touchdown frame
          this.piggy.y = groundTopOnScreen - this.piggy.height / 2;
          // finalize the fall immediately (don't re-enter gameOver which triggers another fall)
          this.handleLandingTouch();
        }
      } catch (e) {
        // fallback to previous bottom-anchored behavior if anything goes wrong
        const groundTopOnScreen = (this.canvas.height / this.dpr) - this.groundHeight;
        const pigBottomOnScreen = this.piggy.y + this.piggy.height / 2;
        if (pigBottomOnScreen >= groundTopOnScreen) {
          this.piggy.y = groundTopOnScreen - this.piggy.height / 2;
          this.handleLandingTouch();
        }
      }
    } else {
      // If ground isn't visible yet, do not finalize on world bottom - let the pig continue falling until ground appears
      // (this prevents premature finalization on small screens where cameraY hasn't moved enough).
    }

    // Check score and update piggy speed
    pipes.forEach(pipe => {
      if (pipe.x + pipe.width < this.piggy.x && !pipe.passed) {
        this.scoreManager.increment();
        this.piggy.updateSpeed(this.scoreManager.score);  
        this.safePlaySound(this.sounds.coinCollect);
        pipe.passed = true;
      }
    });

    // Coin collection
    // pass cameraY so coin collisions use world->screen conversion
    const collectedCoins = this.coinManager.checkCoinCollision(this.piggy, this.cameraY);
    collectedCoins.forEach(coin => {
      this.scoreManager.increment();
      this.piggy.updateSpeed(this.scoreManager.score);  
      this.safePlaySound(this.sounds.coinOink);
    });

    // If we are in the falling-over sequence, watch for touchdown to finalize the sequence.
    // Also: if the ground hasn't been spawned yet, trigger it as soon as the pig reaches a low world Y
    // so the fall always ends with a ground appearing under the pig.
    if (this.isFalling && !this.fallFinalized) {
      // If ground not visible yet, compute pig world Y and trigger ground spawn when pig nears the bottom.
      if (!this.groundVisible) {
        try {
          // pig world Y = cameraY + pig's screen Y
          const pigWorldY = this.cameraY + (this.piggy.y + this.piggy.height / 2);
          // threshold: when pig world Y is within 200px of the bottom of the world, spawn ground immediately
          const worldBottom = (this.canvas.height / this.dpr) + this.cameraY;
          const spawnThreshold = worldBottom - 200;
          if (pigWorldY >= spawnThreshold) {
            this.groundVisible = true;
            // ensure camera target nudges so pig lands into view
            try {
              const h = this.canvas.height / this.dpr;
              this.cameraYTarget = Math.max(0, this.piggy.y - h * 0.35);
              this.piggy.vy = Math.max(2, this.piggy.vy);
            } catch (e) {}
          }
        } catch (e) {}
      }

      // bottom world limit when ground exists uses the groundTopInWorld, otherwise fallback to the screen bottom
      const bottomWorldLimit = this.groundVisible
        ? ((this.canvas.height / this.dpr) + this.cameraY - this.groundHeight) + this.piggy.height / 2
        : ((this.canvas.height / this.dpr) + this.cameraY);

      if (Math.abs((this.piggy.y + this.piggy.height / 2) - bottomWorldLimit) < 1.5) {
        // Stop the falling loop sound and play the dead sound, swap to final image, then finalize.
        try {
          if (this.sounds.fallingLoop) {
            this.sounds.fallingLoop.pause();
            this.sounds.fallingLoop.currentTime = 0;
          }
        } catch (e) {}

        // play dead.wav then finalize when it ends
        const finalizeAfterDead = () => {
          try {
            if (this.sounds.dead) {
              this.sounds.dead.removeEventListener('ended', finalizeAfterDead);
            }
          } catch (e) {}
          // mark finalized so animation loop stops after drawGameOver
          this.fallFinalized = true;
          // ensure pig shows final failed image
          try {
            const finalImg = new Image();
            finalImg.src = 'Mition_Failled.webp';
            this.piggy.currentImage = finalImg;
          } catch (e) {}
        };

        // swap to final image immediately for the landing frame
        try {
          const finalImg = new Image();
          finalImg.src = 'Mition_Failled.webp';
          this.piggy.currentImage = finalImg;
        } catch (e) {}

        // play dead sound
        try {
          if (this.sounds.dead) {
            this.sounds.dead.currentTime = 0;
            this.sounds.dead.addEventListener('ended', finalizeAfterDead);
            this.sounds.dead.play().catch(() => {
              // If playback fails, finalize anyway after a short timeout
              setTimeout(finalizeAfterDead, 800);
            });
          } else {
            // no dead sound; finalize immediately
            finalizeAfterDead();
          }
        } catch (e) {
          finalizeAfterDead();
        }
      }
    }
  }

  gameOver() {
    // Start the falling-based game over sequence only once
    if (this._fallHandled) return;
    this._fallHandled = true;

    // mark game over and falling state
    this.isGameOver = true;
    this.isFalling = true;
    // stop automatic pipe spawning/movement by zeroing their speed (keeps existing pipes on-screen)
    if (this.pipeManager && typeof this.pipeManager.pipeSpeed === 'number') {
      this.pipeManager.pipeSpeed = 0;
    }

    // Pause background music immediately
    try {
      if (this.sounds.bgm) this.sounds.bgm.pause();
    } catch (e) {}

    // Freeze the background video to frame at 134s (seek and pause)
    try {
      if (this.backgroundVideo) {
        // Do not change the video's playback position on game over; just pause and mark ready.
        this.backgroundVideo.pause();
        this._bgVideoReady = true;
      }
    } catch (e) {
      console.warn('Background video pause failed', e);
    }

    // Ensure pig uses sad image and start physics fall for a realistic drop (rotation, acceleration)
    try {
      if (this.piggy) {
        // Set sad image immediately and kick off physics falling
        this.piggy.setGameOverImage();
        // Put pig's target below so camera can follow; startFall switches to physics mode
        const bottomLimit = (this.canvas.height / (window.devicePixelRatio || 1)) - this.piggy.height / 2;
        // nudge pig a bit upward so the fall is visible if it's already near the ground
        if (this.piggy.y > bottomLimit - 10) this.piggy.y = bottomLimit - 60;
        this.piggy.startFall();

        // Make the camera follow the pig more dramatically during the fall:
        // set camera target to pig immediately with a bias so the pig appears higher on screen,
        // and increase easing so the camera fluidly tracks the descent.
        try {
          const h = this.canvas.height / this.dpr;
          this.cameraYEase = 0.12;
          this.cameraYTarget = this.piggy.y - h * 0.35;
        } catch (e) {}
      }
    } catch (e) {}

    // Seek and freeze match character videos to their designated frames so the match character
    // appears immediately when the ground/spawn overlay is shown.
    try {
      if (this.matchVideos && this.matchVideos.angry) {
        try { this.matchVideos.angry.currentTime = 6.7; } catch (e) {}
        try { this.matchVideos.angry.pause(); } catch (e) {}
        this._matchAngryReady = true;
      }
      if (this.matchVideos && this.matchVideos.happy) {
        try { this.matchVideos.happy.currentTime = 6.7; } catch (e) {}
        try { this.matchVideos.happy.pause(); } catch (e) {}
        this._matchHappyReady = true;
        // play happy/match sound once when happy frame is prepared
        try { this.safePlaySound(this.sounds.courseClear); } catch (e) {}
      }
      if (this.matchVideos && this.matchVideos.final) {
        try { this.matchVideos.final.currentTime = 151.0; } catch (e) {}
        try { this.matchVideos.final.pause(); } catch (e) {}
        this._matchFinalReady = true;
      }
    } catch (e) {
      // ignore any seeking/pausing errors
    }

    // Schedule ground spawn: set a future timestamp when the ground becomes visible.
    // Adjust spawn timing so the ground appears relative to cameraY: add (-200 + cameraY)
    // to the configured delay (clamped to >= 0) so higher cameraY shortens the wait.
    try {
      const baseDelay = (typeof this.gameOverGroundDelay === 'number' ? this.gameOverGroundDelay : 1200);
      // Force the ground world Y to a fixed value (1601) and schedule spawn after configured delay.
      this.groundSpawnWorldY = 1601;
      this.gameOverGroundSpawnAt = Date.now() + baseDelay;
    } catch (e) {
      // Fallback: still ensure the fixed world Y is used and schedule spawn with default delay.
      this.groundSpawnWorldY = 1601;
      this.gameOverGroundSpawnAt = Date.now() + (typeof this.gameOverGroundDelay === 'number' ? this.gameOverGroundDelay : 1200);
    }

    // Begin the fall audio sequence:
    // 1) play fallStart once (short cue)
    // 2) when it ends, start the looping fallingLoop ambience
    // We'll stop the fallingLoop once the pig touches ground and then play dead.wav
    const playFallingLoop = () => {
      try {
        if (this.sounds.fallingLoop) {
          this.sounds.fallingLoop.currentTime = 0;
          this.sounds.fallingLoop.play().catch(() => {});
        }
      } catch (e) {}
    };

    const onFallStartEnd = () => {
      // play the looping falling ambience
      playFallingLoop();
      // remove handler
      try {
        if (this.sounds.fallStart) {
          this.sounds.fallStart.removeEventListener('ended', onFallStartEnd);
        }
      } catch (e) {}
    };

    try {
      if (this.sounds.fallStart) {
        // play initial fall cue, then start the loop
        this.sounds.fallStart.currentTime = 0;
        this.sounds.fallStart.addEventListener('ended', onFallStartEnd);
        this.sounds.fallStart.play().catch(() => {
          // fallback: if cannot play, try to start loop directly
          playFallingLoop();
        });
      } else {
        playFallingLoop();
      }
    } catch (e) {
      playFallingLoop();
    }

    // Play a hit/pigDeath cue immediately for extra feedback
    this.safePlaySound(this.sounds.hit);
    this.safePlaySound(this.sounds.pigDeath);

    // Keep animating so the pig visibly falls; finalization occurs in the main loop when pig hits ground.
  }

  // Called when the pig actually contacts the spawned ground — finalize the fall and end the animation loop.
  handleLandingTouch() {
    // If we've already finalized or are not in falling state, ignore.
    if (this.fallFinalized) return;

    // Immediately stop any falling ambience loop
    try {
      if (this.sounds.fallingLoop) {
        this.sounds.fallingLoop.pause();
        this.sounds.fallingLoop.currentTime = 0;
      }
    } catch (e) {}

    // Swap to final failed image immediately for the landing frame
    try {
      const finalImg = new Image();
      finalImg.src = 'Mition_Failled.webp';
      this.piggy.currentImage = finalImg;
    } catch (e) {}

    // Immediately mark finalized so the main animation loop stops scheduling further frames,
    // then draw the Game Over overlay right away for an immediate stop effect.
    this.fallFinalized = true;
    try {
      this.drawGameOver();
    } catch (e) {}

    // Play dead sound but do not wait on it to stop rendering — game is already finalized.
    try {
      if (this.sounds.dead) {
        this.sounds.dead.currentTime = 0;
        this.sounds.dead.play().catch(() => {});
      }
    } catch (e) {}
  }

  drawGameOver() {
    // Intentionally left blank to avoid drawing a game-over menu overlay.
    // Game over state is still handled internally (sounds, try-again button, etc.)
    return;
  }
}

// Instantiate the game when the page loads
window.addEventListener('load', () => {
  new FlappyPiggyGame();
});