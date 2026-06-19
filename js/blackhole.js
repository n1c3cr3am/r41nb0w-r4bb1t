class Blackhole {
  static w = 160;
  static h = 160;
  // Minimum safe distance near blackhole
  static ROCHE_LIMIT = Blackhole.h * 0.75;

  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = 0;
  }

  render() {
    this.angle += 0.05;
    const R = Blackhole.w / 2;
    const cell = Blackhole.w / 13; // pixel block size (~13 blocks across)
    push();
    translate(this.x, this.y);
    rectMode(CENTER);
    noStroke();

    // Circular pixel body: purple rim -> dark -> black core
    for (let gy = -6; gy <= 6; gy++) {
      for (let gx = -6; gx <= 6; gx++) {
        const cx = gx * cell;
        const cy = gy * cell;
        const d = Math.sqrt(cx * cx + cy * cy);
        if (d > R) continue;
        if (d > R * 0.8) fill("#7c3aed"); // violet rim
        else if (d > R * 0.5) fill("#2a0a4a"); // deep purple
        else fill("#050007"); // black core
        rect(cx, cy, cell * 0.96, cell * 0.96);
      }
    }

    // Two rotating spiral arms (Matrix green) for the vortex
    rotate(this.angle);
    for (let arm = 0; arm < 2; arm++) {
      const base = arm * Math.PI;
      fill(arm === 0 ? "#39d98a" : "#9b6cff");
      for (let r = cell; r < R * 0.72; r += cell) {
        const a = r * 0.07 + base;
        rect(Math.cos(a) * r, Math.sin(a) * r, cell * 0.85, cell * 0.85);
      }
    }
    pop();
  }
}
