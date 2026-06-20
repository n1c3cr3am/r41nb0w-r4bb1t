class Blackhole {
  static w = 80;
  static h = 80;
  // Minimum safe distance near blackhole
  static ROCHE_LIMIT = Blackhole.h * 0.75;

  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = 0;
  }

  render() {
    this.angle += 0.08; // spins on itself
    const R = Blackhole.w / 2;
    const cell = Blackhole.w / 10; // chunky pixel block size
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    rectMode(CENTER);
    noStroke();
    fill(0);
    // Dense black spiral arms -> reads as a solid spinning pinwheel
    const arms = 3;
    for (let arm = 0; arm < arms; arm++) {
      const base = (arm / arms) * TWO_PI;
      for (let r = 0; r <= R; r += cell * 0.28) {
        const a = base + r * 0.14; // spiral tightness
        rect(Math.cos(a) * r, Math.sin(a) * r, cell, cell);
      }
    }
    // Solid black core
    rect(0, 0, cell * 2, cell * 2);
    pop();
  }
}
