class Bullet {
    // Image handle (loaded in preload)
    static image;
    // Upward speed in px/frame (+50% game pace)
    static SPEED = 21;
    // Draw size
    static W = 34;
    static H = 34;

    /**
     * @param {Number} x spawn x (rabbit centre)
     * @param {Number} y spawn y (rabbit head)
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.dead = false;
    }

    update() {
        this.y -= Bullet.SPEED;
        if (this.y < -Bullet.H) this.dead = true;
    }

    render() {
        if (Bullet.image) {
            image(
                Bullet.image,
                this.x - Bullet.W / 2,
                this.y - Bullet.H / 2,
                Bullet.W,
                Bullet.H
            );
        } else {
            // Fallback dot if the sprite failed to load
            push();
            noStroke();
            fill("#ff5db1");
            ellipse(this.x, this.y, Bullet.W * 0.6);
            pop();
        }
    }
}
