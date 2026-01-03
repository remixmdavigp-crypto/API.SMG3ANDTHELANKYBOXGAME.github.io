export default class PipeManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.pipes = [];
    this.spawnInterval = 1000; // milliseconds (faster spawn)
    this.lastSpawnTime = 0;
    this.pipeSpeed = 4; // increased pipe horizontal speed
    this.gapHeight = 150;

    // Small background-scroll offset so background moves at pipeSpeed + bgScrollOffset.
    // You can tweak bgScrollOffset to change parallax speed (default 0.1).
    this.bgScrollOffset = 0.2; // slightly stronger parallax

    // Load enemy sprite sheet for pipes
    this.sprite = new Image();
    this.sprite.src = 'ENEMY.png';

    // Define source rectangles (from provided sheet coordinates)
    // Each entry: { sx, sy, sw, sh }
    this.frames = [
      { sx: 7,  sy: 136, sw: 105, sh: 114 }, // sheet 1
      { sx: 13, sy: 279, sw: 92,  sh: 105 }, // sheet 2
      { sx: 17, sy: 416, sw: 102, sh: 109 }  // sheet 3
    ];

    // Game-over fallback frame (use this exact rectangle when pipes are frozen / pipeSpeed === 0)
    this.gameOverFrame = { sx: 2, sy: 9, sw: 96, sh: 104 };

    // Special: treat the third sheet/frame (index 2) as a trigger frame that should render
    // using the provided rectangle (Top X:2, Top Y:9, Width:96, Height:104).
    // Keep a dedicated copy so we can reliably use it whenever frameIndex === 2.
    this.specialFrameForIndex3 = { sx: 2, sy: 9, sw: 96, sh: 104 };

    // Optional video-frame fallback: load a remote MP4 and seek to 151s to use that frame
    // as an alternative visual for the special frame (if the video becomes ready).
    this.specialVideo = document.createElement('video');
    this.specialVideo.crossOrigin = 'anonymous';
    this.specialVideo.muted = true;
    this.specialVideo.playsInline = true;
    this.specialVideo.preload = 'auto';
    // remote mp4 suggested by user
    this.specialVideo.src = 'https://files.catbox.moe/8ih792.mp4';
    this._specialVideoReady = false;

    const prepareSpecialVideoFrame = () => {
      // Do not programmatically seek the special video; leave playback position untouched.
      // Rely on loadeddata/seeked handlers to set readiness if available.
    };

    this.specialVideo.addEventListener('loadedmetadata', () => {
      prepareSpecialVideoFrame();
    });

    this.specialVideo.addEventListener('seeked', () => {
      try { this.specialVideo.pause(); } catch (e) {}
      this._specialVideoReady = true;
    });

    // Fallback when data is loaded but seeked may not fire exactly; mark ready after a short delay.
    this.specialVideo.addEventListener('loadeddata', () => {
      setTimeout(() => {
        try { this.specialVideo.pause(); } catch (e) {}
        this._specialVideoReady = true;
      }, 150);
    });

    // start loading the remote video (optional)
    try { this.specialVideo.load(); } catch (e) {}
  }

  update() {
    const currentTime = Date.now();
    
    // Spawn new pipes
    if (currentTime - this.lastSpawnTime > this.spawnInterval) {
      this.spawnPipe();
      this.lastSpawnTime = currentTime;
    }

    // Move and remove pipes
    this.pipes = this.pipes.filter(pipe => {
      pipe.x -= this.pipeSpeed;
      // remove when completely off-screen to the left based on native sprite width
      return pipe.x > -pipe.width;
    });
  }

  spawnPipe() {
    const maxY = this.canvas.height - 50 - this.gapHeight;
    const minY = 50;
    const centerY = minY + Math.random() * (maxY - minY);

    // pick a frame index to vary appearance
    const frameIndex = Math.floor(Math.random() * this.frames.length);
    const frame = this.frames[frameIndex];

    // Use the native source width as the pipe's rendered width so we don't scale horizontally
    this.pipes.push({
      x: this.canvas.width,
      centerY: centerY,
      width: frame.sw,
      height: frame.sh, // native sprite height for hitbox calculations
      gap: this.gapHeight,
      passed: false,
      scored: false,
      frameIndex: frameIndex
    });
  }

  // draw accepts cameraY so pipes render at screen Y = pipe.centerY - cameraY
  draw(ctx, cameraY = 0) {
    // Draw only the bottom pipe using the sprite frames at native size (no scaling or tiling).
    this.pipes.forEach(pipe => {
      // If pipes are frozen (pipeSpeed === 0), render the provided game-over frame;
      // otherwise use the randomized frames as before.
      const frame = (typeof this.pipeSpeed === 'number' && this.pipeSpeed === 0 && this.gameOverFrame)
        ? this.gameOverFrame
        : (this.frames[pipe.frameIndex] || this.frames[0]);

      // Logical canvas height (in logical pixels)
      const canvasH = this.canvas.height;

      // Native frame sizes (source width/height)
      const srcW = frame.sw;
      const srcH = frame.sh;

      const destX = pipe.x; // draw at native width (no horizontal scaling)

      // Compute bottom gap world position and convert to screen Y
      const bottomYWorld = pipe.centerY + pipe.gap / 2; // world y where bottom pipe starts
      const bottomYOnScreen = bottomYWorld - cameraY;

      // Draw bottom pipe at native size anchored to the top of the bottom opening.
      if (canvasH - bottomYOnScreen >= srcH) {
        const destYBottom = bottomYOnScreen; // anchor sprite top to bottomYOnScreen
        ctx.drawImage(
          this.sprite,
          frame.sx,
          frame.sy,
          srcW,
          srcH,
          destX,
          destYBottom,
          srcW,
          srcH
        );
      } else {
        // If there's not enough room for the native sprite at bottom, skip drawing to avoid scaling/tiling.
      }
    });
  }

  // Return combined background scroll speed (pipe movement + small offset) for parallax.
  getBackgroundScrollSpeed() {
    return this.pipeSpeed + (typeof this.bgScrollOffset === 'number' ? this.bgScrollOffset : 0.1);
  }

  getPipes() {
    return this.pipes;
  }
}