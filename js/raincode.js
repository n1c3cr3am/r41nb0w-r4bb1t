/**
 * Falling rain of digits in a childlike handwriting font, drawn as a soft
 * overlay on top of the squared "school paper" background. Kept light and
 * pencil-blue so the rabbit/platform cutouts stay nicely camouflaged.
 */
class Raincode {
    static CHARS = "01".split("");
    static FONT = "Gochi Hand"; // childlike handwriting (loaded in index.html)

    constructor() {
        this.init();
    }

    init() {
        this.fs = Math.max(16, Math.floor(width / 22));
        this.cols = Math.ceil(width / this.fs) + 1;
        this.drops = [];
        this.speed = [];
        for (let i = 0; i < this.cols; i++) {
            this.drops[i] = Math.random() * -40;
            this.speed[i] = 0.2 + Math.random() * 0.35;
        }
        this.tail = 32; // digits per falling sequence
    }

    /** Stable-ish digit per cell (head changes slowly, like rewriting) */
    glyph(col, row, isHead) {
        const n = Raincode.CHARS.length;
        const seed = isHead
            ? col * 7 + row * 13 + Math.floor(frameCount / 6)
            : col * 7 + row * 13;
        return Raincode.CHARS[((seed % n) + n) % n];
    }

    /** Draw the digit rain over the already-painted paper background */
    render() {
        push();
        // Pastel rainbow, like coloured pencils: a hue per column across the
        // spectrum, soft (low saturation, high brightness)
        colorMode(HSB, 360, 100, 100, 255);
        textFont(Raincode.FONT);
        textAlign(CENTER, CENTER);
        textSize(this.fs);
        textStyle(NORMAL);
        noStroke();
        for (let i = 0; i < this.cols; i++) {
            const x = i * this.fs + this.fs / 2;
            const head = this.drops[i];
            const hue = ((i / this.cols) * 360 + 15) % 360;
            for (let t = 0; t < this.tail; t++) {
                const row = Math.floor(head) - t;
                if (row < 0) continue;
                const y = row * this.fs + this.fs / 2;
                if (y > height) continue;
                // head a touch stronger, tail fading
                const a = t === 0 ? 150 : map(t, 1, this.tail, 95, 0);
                fill(hue, 50, 85, a);
                text(this.glyph(i, row, t === 0), x, y);
            }
            this.drops[i] += this.speed[i];
            if (
                (Math.floor(this.drops[i]) - this.tail) * this.fs > height &&
                Math.random() < 0.4
            ) {
                this.drops[i] = Math.random() * -20;
                this.speed[i] = 0.2 + Math.random() * 0.35;
            }
        }
        pop();
    }
}
