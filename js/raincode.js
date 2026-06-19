/**
 * Elegant Matrix-style "raincode" background.
 * Columns of glyphs fall with a bright head and a fading green tail.
 * Drawn fresh each frame (the game repaints the whole canvas), so the trail
 * is rendered explicitly rather than relying on canvas persistence.
 */
class Raincode {
    // Glyph set: katakana-ish marks, digits, and brand letters H / C
    static CHARS = "アカサタナハマヤラ0123456789HＣ+=*<>".split("");
    static BG = "#070b08"; // near-black base

    constructor() {
        this.init();
    }

    init() {
        this.fs = Math.max(13, Math.floor(width / 28));
        this.cols = Math.ceil(width / this.fs) + 1;
        this.drops = [];
        this.speed = [];
        for (let i = 0; i < this.cols; i++) {
            this.drops[i] = Math.random() * -40; // start above screen, staggered
            this.speed[i] = 0.25 + Math.random() * 0.4; // rows per frame
        }
        this.tail = 14;
    }

    /** A stable-ish glyph for a given cell (head flickers a little) */
    glyph(col, row, isHead) {
        const n = Raincode.CHARS.length;
        const seed = isHead
            ? col * 31 + row * 17 + Math.floor(frameCount / 3)
            : col * 31 + row * 17;
        return Raincode.CHARS[((seed % n) + n) % n];
    }

    render() {
        background(Raincode.BG);
        push();
        textAlign(CENTER, CENTER);
        textSize(this.fs);
        textStyle(NORMAL);
        noStroke();
        for (let i = 0; i < this.cols; i++) {
            const x = i * this.fs + this.fs / 2;
            const head = this.drops[i];
            for (let t = 0; t < this.tail; t++) {
                const row = Math.floor(head) - t;
                if (row < 0) continue;
                const y = row * this.fs + this.fs / 2;
                if (y > height) continue;
                if (t === 0) {
                    fill(210, 255, 220, 230); // bright, slightly white head
                } else {
                    // soft green tail, fading out — kept dim for elegance
                    const a = map(t, 1, this.tail, 120, 0);
                    fill(70, 200, 110, a);
                }
                text(this.glyph(i, row, t === 0), x, y);
            }
            // advance the column
            this.drops[i] += this.speed[i];
            // recycle once fully off the bottom (staggered)
            if (
                (Math.floor(this.drops[i]) - this.tail) * this.fs > height &&
                Math.random() < 0.4
            ) {
                this.drops[i] = Math.random() * -20;
                this.speed[i] = 0.25 + Math.random() * 0.4;
            }
        }
        pop();
    }
}
