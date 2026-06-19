class Invader {
    // Classic 11x8 space-invader bitmap
    static PATTERN = [
        "00100000100",
        "00010001000",
        "00111111100",
        "01101110110",
        "11111111111",
        "10111111101",
        "10100000101",
        "00011011000",
    ];
    static COLOR = "#8b5cf6"; // brand-ish purple

    /** Invader size scales with the canvas width */
    static size() {
        return Math.max(48, width * 0.15);
    }

    /**
     * @param {Number} x centre x
     * @param {Number} y centre y
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() < 0.5 ? -1 : 1) * 2.2;
        this.dead = false;
    }

    get W() {
        return Invader.size();
    }
    get H() {
        return Invader.size() * 0.72;
    }

    update() {
        this.x += this.vx;
        const half = this.W / 2;
        if (this.x < half || this.x > width - half) this.vx *= -1;
    }

    /** A bullet point hit test */
    hit(px, py) {
        return (
            Math.abs(px - this.x) < this.W / 2 &&
            Math.abs(py - this.y) < this.H / 2
        );
    }

    /** AABB overlap with the doodler (slightly forgiving) */
    overlaps(doodler) {
        return (
            Math.abs(doodler.x - this.x) < this.W / 2 + Doodler.w / 4 &&
            Math.abs(doodler.y - this.y) < this.H / 2 + Doodler.h / 2
        );
    }

    render() {
        const cols = 11;
        const rows = Invader.PATTERN.length;
        const cell = this.W / cols;
        const x0 = this.x - this.W / 2;
        const y0 = this.y - (rows * cell) / 2;
        push();
        rectMode(CORNER);
        noStroke();
        fill(Invader.COLOR);
        for (let r = 0; r < rows; r++) {
            const row = Invader.PATTERN[r];
            for (let c = 0; c < cols; c++) {
                if (row[c] === "1") {
                    rect(x0 + c * cell, y0 + r * cell, cell + 0.5, cell + 0.5);
                }
            }
        }
        // Eyes
        fill(255);
        const eye = cell * 0.9;
        rect(x0 + 3 * cell, y0 + 3 * cell, eye, eye);
        rect(x0 + 7 * cell, y0 + 3 * cell, eye, eye);
        pop();
    }
}
