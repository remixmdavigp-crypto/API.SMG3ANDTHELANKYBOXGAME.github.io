export default class Piggy {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 50;
    // Use logical pixels for initial placement; game.js will re-center on init
    this.y = canvas.height / 2;
    this.width = 50;
    this.height = 50;

    // Smooth movement state (vertical)
    this.moveAmount = 40; // base pixels per press (snappier)
    this.targetY = this.y; // desired y we interpolate toward
    this.moveEase = 0.22; // easing factor (0 - 1). Higher = snappier.

    // Smooth horizontal movement state
    this.moveAmountX = 40; // horizontal pixels per press
    this.targetX = this.x;
    this.moveEaseX = 0.16; // slightly faster horizontal easing

    // Falling (physics) state
    this.isFalling = false;
    this.vy = 0;          // vertical velocity (pixels per frame, logical pixels)
    this.ay = 0.45;       // gravity acceleration (pixels per frame^2)
    this.vx = 0;          // optional horizontal velocity during fall
    this.rotation = 0;    // radians
    this.rotationSpeed = 0; // radians per frame
    this.maxRotation = Math.PI * 0.9; // cap rotation to near 90 degrees

    // Load pig images
    this.normalPigImage = new Image();
    this.normalPigImage.src = 'Minion_pig_copy.webp';
    
    this.sadPigImage = new Image();
    this.sadPigImage.src = 'Sad_Minion_Pig.webp';
    
    this.currentImage = this.normalPigImage;
  }

  // Update interpolates y and x toward targets for smooth movement or applies physics when falling
  update() {
    if (this.isFalling) {
      // While falling we no longer directly change vertical position here;
      // the game loop drives vertical motion via cameraY so the pig appears to fall
      // relative to the world while remaining visually stable on screen.
      // Apply rotation only (no horizontal drift).

      // Increase rotation speed a bit based on current vertical velocity (vy still used as magnitude)
      this.rotationSpeed += 0.001 * Math.abs(this.vy);
      this.rotation += this.rotationSpeed;
      if (this.rotation > this.maxRotation) this.rotation = this.maxRotation;

      // Keep pig inside horizontal bounds while falling
      const leftLimit = this.width / 2;
      const rightLimit = (this.canvas.width / (window.devicePixelRatio || 1)) - this.width / 2;
      if (this.x < leftLimit) this.x = leftLimit;
      if (this.x > rightLimit) this.x = rightLimit;

      // Do not modify this.y here; camera movement will create the vertical fall illusion.
    } else {
      // Vertical interpolation (non-falling / normal control)
      const dy = this.targetY - this.y;
      if (Math.abs(dy) < 0.5) {
        this.y = this.targetY;
      } else {
        this.y += dy * this.moveEase;
      }

      // Horizontal interpolation
      const dx = this.targetX - this.x;
      if (Math.abs(dx) < 0.5) {
        this.x = this.targetX;
      } else {
        this.x += dx * this.moveEaseX;
      }

      // Ensure clamped within bounds each frame
      this._clampToCanvas();
    }
  }

  // Request an upward move by adjusting targetY (smooth)
  // vertical limits removed so the character can move beyond canvas top/bottom edges
  moveUp() {
    const newTarget = this.targetY - this.moveAmount;
    this.targetY = newTarget;
  }

  // Request a downward move by adjusting targetY (smooth)
  // vertical limits removed so the character can move beyond canvas top/bottom edges
  moveDown() {
    const newTarget = this.targetY + this.moveAmount;
    this.targetY = newTarget;
  }

  // Request a leftward move by adjusting targetX (smooth)
  moveLeft() {
    const newTarget = this.targetX - this.moveAmountX;
    this.targetX = Math.max(this.width / 2, newTarget);
  }

  // Request a rightward move by adjusting targetX (smooth)
  moveRight() {
    const canvasW = this.canvas.width / (window.devicePixelRatio || 1);
    const newTarget = this.targetX + this.moveAmountX;
    this.targetX = Math.min(canvasW - this.width / 2, newTarget);
  }

  // Called when score increases to optionally tweak responsiveness
  updateSpeed(score) {
    // Keep method for compatibility — adjust moveAmount slightly with score
    const speedLevel = Math.floor(score / 10);
    this.moveAmount = 28 + speedLevel * 2;
    this.moveAmountX = 28 + speedLevel * 1; // slight horizontal change with score
    // Also slightly tighten easing as game progresses
    this.moveEase = Math.min(0.32, 0.18 + speedLevel * 0.01);
    this.moveEaseX = Math.min(0.2, 0.12 + speedLevel * 0.005);
  }

  draw(ctx) {
    // Draw with rotation when falling for dramatic effect
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.drawImage(
      this.currentImage,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height
    );
    ctx.restore();
  }

  setGameOverImage() {
    this.currentImage = this.sadPigImage;
  }

  // Start physics fall: called by game when game over occurs
  startFall() {
    if (this.isFalling) return;
    this.isFalling = true;
    this.vy = 2 + Math.random() * 2;  // give an initial downward kick
    this.vx = 0; // remove horizontal drift during fall
    this.rotationSpeed = 0.02 + Math.random() * 0.02;
    // Ensure current image is the "sad" frame for the start of the fall
    this.setGameOverImage();
  }

  resetToNormalImage() {
    this.currentImage = this.normalPigImage;
    // Reset movement targets so pig appears centered again
    this.targetY = this.y;
    this.targetX = this.x;
    // Reset physics fall state
    this.isFalling = false;
    this.vy = 0;
    this.vx = 0;
    this.rotation = 0;
    this.rotationSpeed = 0;
  }

  getBoundingBox() {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y - this.height / 2,
      bottom: this.y + this.height / 2
    };
  }

  // updated to accept cameraY so pipe vertical position is compared in screen space
  checkCollisionWithPipe(pipe, cameraY = 0) {
    const pigBox = this.getBoundingBox();
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + pipe.width;
    // convert pipe centerY (world) into screen Y by subtracting cameraY
    const bottomGapTopOnScreen = (pipe.centerY + pipe.gap / 2) - cameraY;

    const bottomPipeBox = {
      left: pipeLeft,
      right: pipeRight,
      top: bottomGapTopOnScreen,
      bottom: bottomGapTopOnScreen + (pipe.height || 0)
    };

    const checkBoxCollision = (a, b) => {
      return !(
        a.right < b.left ||
        a.left > b.right ||
        a.bottom < b.top ||
        a.top > b.bottom
      );
    };

    return checkBoxCollision(pigBox, bottomPipeBox);
  }

  _clampToCanvas() {
    // Remove vertical clamping so the pig can move beyond the canvas top/bottom.
    // Keep horizontal clamping to ensure it stays within left/right bounds.
    const leftLimit = this.width / 2;
    const rightLimit = (this.canvas.width / (window.devicePixelRatio || 1)) - this.width / 2;
    if (this.targetX < leftLimit) this.targetX = leftLimit;
    if (this.targetX > rightLimit) this.targetX = rightLimit;
    if (this.x < leftLimit) this.x = leftLimit;
    if (this.x > rightLimit) this.x = rightLimit;
  }
}