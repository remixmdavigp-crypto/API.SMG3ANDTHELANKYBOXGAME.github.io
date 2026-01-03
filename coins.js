export default class CoinManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.coins = [];
    this.spawnInterval = 1000; // milliseconds (more frequent)
    this.lastSpawnTime = 0;
    this.coinSize = 25;
    this.coinSpeed = 4; // faster horizontal movement

    // Load coin image as an actual DOM <img> so the GIF animation runs reliably,
    // then draw that image onto the canvas each frame. Keep a hidden copy in the DOM
    // so some browsers continue animating the GIF even when used only via canvas.
    this.coinImage = document.createElement('img');
    this.coinImage.src = 'mario-coins.gif';
    this.coinImage.decoding = 'async';
    this.coinImage.alt = 'coin';
    this.coinImage.style.position = 'absolute';
    this.coinImage.style.width = '1px';
    this.coinImage.style.height = '1px';
    this.coinImage.style.opacity = '0';
    this.coinImage.style.pointerEvents = 'none';
    // Append hidden image to ensure the browser keeps animating the GIF
    // (some engines only animate images that are in the DOM).
    document.body.appendChild(this.coinImage);
  }

  update() {
    const currentTime = Date.now();
    
    // Spawn new coins
    if (currentTime - this.lastSpawnTime > this.spawnInterval) {
      this.spawnCoin();
      this.lastSpawnTime = currentTime;
    }

    // Move and remove coins (horizontal movement only; vertical is world-based)
    this.coins = this.coins.filter(coin => {
      coin.x -= this.coinSpeed;
      return coin.x > -this.coinSize;
    });
  }

  // spawnCoin uses world Y so coins move vertically relative to cameraY
  spawnCoin() {
    const maxY = (this.canvas.height - this.coinSize);
    const minY = 0;
    const worldY = minY + Math.random() * (maxY - minY);

    this.coins.push({
      x: this.canvas.width,
      worldY: worldY, // store as world coordinate
      width: this.coinSize,
      height: this.coinSize,
      collected: false
    });
  }

  // draw accepts cameraY so coins render at screen Y = worldY - cameraY
  draw(ctx, cameraY = 0) {
    this.coins.forEach(coin => {
      const screenY = coin.worldY - cameraY;
      ctx.drawImage(
        this.coinImage,
        coin.x, 
        screenY, 
        coin.width, 
        coin.height
      );
    });
  }

  getCoin() {
    return this.coins;
  }

  // checkCoinCollision now compares pig (screen) against coin world -> screen position
  checkCoinCollision(piggy, cameraY = 0) {
    const pigBox = piggy.getBoundingBox();

    return this.coins.filter(coin => {
      if (coin.collected) return false;

      const coinTop = coin.worldY - cameraY;
      const coinBox = {
        left: coin.x,
        right: coin.x + coin.width,
        top: coinTop,
        bottom: coinTop + coin.height
      };

      const collision = !(
        pigBox.right < coinBox.left || 
        pigBox.left > coinBox.right || 
        pigBox.bottom < coinBox.top || 
        pigBox.top > coinBox.bottom
      );

      if (collision) {
        coin.collected = true;
      }

      return collision;
    });
  }
}