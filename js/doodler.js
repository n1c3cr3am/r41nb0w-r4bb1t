class Doodler {
    // Animation poses (file name in assets/img, without extension)
    static POSES = [
        "rabbit_idle",
        "rabbit_up",
        "rabbit_fall",
        "rabbit_lean",
        "rabbit_land",
        "rabbit_spring",
        "rabbit_ko",
        "rabbit_shoot",
    ];
    // pose name -> p5.Image (filled in preload)
    static images = {};

    // Frames the land (squash) / spring (stretch) poses stay on after impact
    static LAND_FRAMES = 8;
    static SPRING_FRAMES = 14;

    // Rocket boost: sustained upward velocity for a number of frames
    static ROCKET_FORCE = 13;
    static ROCKET_FRAMES = 42;

    // Visual size of the sprite relative to the collision box. The hitbox
    // (w/h) stays small/fair; only the drawing is enlarged, anchored at the
    // feet so the bigger rabbit still sits correctly on platforms.
    static DISPLAY_SCALE = 4;
    // Vertical position of the feet within the normalised sprite (988/1024).
    static FEET_RATIO = 0.9648;

    // Direction enum
    static Direction = {
        LEFT: 0,
        RIGHT: 1,
    };

    // Collision box dimensions
    static w = 80;
    static h = 80;
    // Vertical jump force
    static jumpForce = 8.15;
    // Vertical spring jump force
    static superJumpForce = 14;
    // Horizontal speed scalar
    static speed = 7.2;

    /**
     * Construct with position
     * Default static
     * Default direction : RIGHT
     * @param {Number} x
     * @param {Number} y
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.direction = Doodler.Direction.RIGHT;
        // Countdown timers for transient impact poses
        this.landFrames = 0;
        this.springFrames = 0;
        // Residual horizontal slide from bouncing on ice (decays each frame)
        this.drift = 0;
        // Frames left of a rocket boost (forced upward velocity)
        this.rocketFrames = 0;
    }

    /** Engage a rocket boost: sustained upward velocity for ROCKET_FRAMES */
    rocket() {
        this.rocketFrames = Doodler.ROCKET_FRAMES;
    }

    /** Slippery bounce: keep sliding in the current heading after an ice hit */
    iceBounce() {
        const dir =
            this.vx > 0
                ? 1
                : this.vx < 0
                ? -1
                : this.direction === Doodler.Direction.RIGHT
                ? 1
                : -1;
        this.drift = dir * Doodler.speed * 1.2;
    }

    /** Trigger the squash pose after a normal platform bounce */
    land() {
        this.landFrames = Doodler.LAND_FRAMES;
    }

    /** Trigger the stretch pose after a spring super-jump */
    spring() {
        this.springFrames = Doodler.SPRING_FRAMES;
    }

    /**
     * Pick the pose image for the current state.
     * Priority: dead > spring > land > rising > falling.
     */
    poseImage() {
        let key;
        if (typeof isOver !== "undefined" && isOver) {
            key = "rabbit_ko";
        } else if (this.rocketFrames > 0) {
            key = "rabbit_up";
        } else if (this.springFrames > 0) {
            key = "rabbit_spring";
        } else if (this.landFrames > 0) {
            key = "rabbit_land";
        } else if (this.vy < 0) {
            key = "rabbit_up";
        } else {
            key = "rabbit_fall";
        }
        return Doodler.images[key] || Doodler.images["rabbit_idle"];
    }

    /**
     * Renders the doodler. Sprites face right by default; when moving left we
     * mirror horizontally around the doodler's x so it stays in place.
     */
    render() {
        const img = this.poseImage();
        // Enlarge the drawing relative to the (smaller) collision box, anchored
        // at the feet: the sprite's feet line sits on the collision-box bottom.
        const dw = Doodler.w * Doodler.DISPLAY_SCALE;
        const dh = Doodler.h * Doodler.DISPLAY_SCALE;
        const footY = this.y + Doodler.h / 2;
        const left = this.x - dw / 2;
        const top = footY - Doodler.FEET_RATIO * dh;
        push();
        if (this.direction === Doodler.Direction.LEFT) {
            // Reflect around the vertical axis through this.x
            translate(2 * this.x, 0);
            scale(-1, 1);
        }
        image(img, left, top, dw, dh);
        pop();
    }

    /**
     * Update and move the doodler
     */
    update() {
        // Horizontal move (player input + decaying ice drift)
        this.x += this.vx + this.drift;
        this.drift *= 0.95;
        if (Math.abs(this.drift) < 0.05) this.drift = 0;
        // Ensure within screen
        if (this.x > width) {
            this.x = 0;
        } else if (this.x < 0) {
            this.x = width;
        }
        // Vertical move
        if (this.rocketFrames > 0) {
            // Rocket boost overrides gravity with a strong, steady climb
            this.vy = -Doodler.ROCKET_FORCE;
            this.rocketFrames--;
        } else {
            // Falls faster
            this.vy += this.vy < 0 ? config.GRAVITY : config.GRAVITY * 1.33;
            if (this.vy > config.MAX_FALLING_SPEED)
                this.vy = config.MAX_FALLING_SPEED;
        }
        this.y += this.vy;
        // Ensure below THRESHOLD=100
        if (this.y <= config.THRESHOLD) {
            this.y = config.THRESHOLD;
        }
        // Tick down transient impact poses
        if (this.landFrames > 0) this.landFrames--;
        if (this.springFrames > 0) this.springFrames--;
    }
}
