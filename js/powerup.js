class PowerUp {
    static TYPES = { SHIELD: "shield", BOOST: "boost", SLOWMO: "slowmo" };
    // Emoji placeholders — swap for GPT art via PowerUp.images[type] later
    static EMOJI = { shield: "🛡️", boost: "🌈", slowmo: "🕶️" };
    // type -> p5.Image (optional; falls back to emoji when absent)
    static images = {};

    /** A random power-up type */
    static randomType() {
        const t = [
            PowerUp.TYPES.SHIELD,
            PowerUp.TYPES.BOOST,
            PowerUp.TYPES.SLOWMO,
        ];
        return t[Math.floor(Math.random() * t.length)];
    }

    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.dead = false;
        this.bob = Math.random() * TWO_PI; // bob phase
    }

    get size() {
        return Math.max(34, width * 0.1);
    }

    /** Overlap with the doodler (pickup test) */
    overlaps(doodler) {
        return (
            Math.abs(doodler.x - this.x) < this.size / 2 + Doodler.w / 3 &&
            Math.abs(doodler.y - this.y) < this.size / 2 + Doodler.h / 2
        );
    }

    render() {
        const yy = this.y + Math.sin(frameCount * 0.1 + this.bob) * 4;
        const img = PowerUp.images[this.type];
        if (img) {
            image(
                img,
                this.x - this.size / 2,
                yy - this.size / 2,
                this.size,
                this.size
            );
        } else {
            push();
            textAlign(CENTER, CENTER);
            textSize(this.size);
            text(PowerUp.EMOJI[this.type] || "?", this.x, yy);
            pop();
        }
    }
}
