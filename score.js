export default class ScoreManager {
  constructor() {
    this.score = 0;
  }

  increment() {
    this.score++;
  }

  draw(ctx) {
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, 10, 30);
  }
}