class Platform {
    // Collision box dimensions
    static w = 110;
    static h = 28;
    // Horizontal speed scalar (+50% game pace)
    static speed = 3;
    // Spring dimensions (4x larger so they read clearly on screen)
    static springW = 56;
    static springH = 56;
    // Image handle
    static springImage;
    // High's Club rainbow gradient stops (parsed/cached lazily in _rainbow)
    static RAINBOW_HEX = [
        "#ff595e", // red
        "#ff924c", // orange
        "#ffca3a", // yellow
        "#8ac926", // green
        "#1982c4", // blue
        "#6a4c93", // violet
    ];
    static _rainbow = null;

    /**
     * Construct with position and type
     * default vx = speed
     * @param {Number} x
     * @param {Number} y
     * @param {Platform.platformTypes} type
     * @param {Boolean} springed
     */
    constructor(x, y, type, springed) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.vx = Platform.speed;
        // Does the platform have a spring on it
        this.springed = springed;
        // Randomly initialize spring position : relative
        if (springed) {
            this.springX = (Math.random() - 0.5) * Platform.w * 0.8;
            this.springY = -Platform.h / 2 - Platform.springH / 2;
        } else {
            this.springX = null;
            this.springY = null;
        }
    }

    /**
     * Renders the platform instance
     */
    render() {
        // Do not draw invisible
        if (this.type === Platform.platformTypes.INVISIBLE) return;
        const T = Platform.platformTypes;
        // Cloud is a soft puffy shape, so it skips the rounded-bar outline
        const drawBar = this.type !== T.CLOUD;

        // --- Body fill ---
        noStroke();
        rectMode(RADIUS);
        if (this.type === T.CLOUD) {
            Platform.drawCloudBody(this.x, this.y, Platform.w, Platform.h);
        } else if (this.type === T.STABLE) {
            // Stable platforms get the High's Club rainbow gradient
            Platform.drawRainbowBody(this.x, this.y, Platform.w, Platform.h);
        } else if (this.type === T.DISCO) {
            // Disco platforms cycle through hues over time
            push();
            colorMode(HSB, 360, 100, 100);
            fill((frameCount * 5) % 360, 80, 95);
            rect(this.x, this.y, Platform.w / 2, Platform.h / 2);
            pop();
        } else {
            fill(T.getColor(this.type));
            rect(this.x, this.y, Platform.w / 2, Platform.h / 2);
        }

        // --- Rounded-bar outline (caps + edges) ---
        if (drawBar) {
            stroke(0);
            strokeWeight(2);
            // Left semi circle
            arc(this.x - Platform.w / 2, this.y, Platform.h, Platform.h, HALF_PI, HALF_PI + PI, OPEN);
            // Right semi circle
            arc(this.x + Platform.w / 2, this.y, Platform.h, Platform.h, HALF_PI + PI, HALF_PI, OPEN);
            // Top line
            line(this.x - Platform.w / 2, this.y - Platform.h / 2, this.x + Platform.w / 2, this.y - Platform.h / 2);
            // Bottom line
            line(this.x - Platform.w / 2, this.y + Platform.h / 2, this.x + Platform.w / 2, this.y + Platform.h / 2);
        }

        // --- Type decorations ---
        if (this.type === T.ROCKET) {
            Platform.drawChevrons(this.x, this.y, Platform.h);
        } else if (this.type === T.MUTATION) {
            Platform.drawQuestion(this.x, this.y, Platform.h);
        }
        // Draw spring if applicable
        if (this.springed) {
            image(
                Platform.springImage,
                // hard-coded offsets due to the source image being imcompliant
                this.x + this.springX - Platform.springW / 2 - 11,
                this.y + this.springY - Platform.springH / 2,
                Platform.springW * 2.5,
                Platform.springH * 2
            );
        }
    }

    /**
     * Draw a horizontal rainbow gradient filling the rectangular body of a
     * platform centred on (x, y). Colour stops are parsed once and cached,
     * then interpolated with lerpColor across the width in small steps so it
     * stays cheap enough to run every frame on mobile.
     * @param {Number} x centre x
     * @param {Number} y centre y
     * @param {Number} w full width
     * @param {Number} h full height
     */
    static drawRainbowBody(x, y, w, h) {
        if (!Platform._rainbow) {
            Platform._rainbow = Platform.RAINBOW_HEX.map((c) => color(c));
        }
        const stops = Platform._rainbow;
        const segs = stops.length - 1;
        const left = x - w / 2;
        const top = y - h / 2;
        const bottom = y + h / 2;
        const step = 2;
        push();
        strokeWeight(step + 0.5);
        strokeCap(SQUARE);
        for (let i = 0; i <= w; i += step) {
            const t = (i / w) * segs;
            const idx = Math.min(Math.floor(t), segs - 1);
            stroke(lerpColor(stops[idx], stops[idx + 1], t - idx));
            line(left + i, top, left + i, bottom);
        }
        pop();
    }

    /** Draw a soft white cloud (overlapping puffs) for CLOUD platforms */
    static drawCloudBody(x, y, w, h) {
        push();
        noStroke();
        fill(255);
        const ph = h * 1.5;
        ellipse(x - w * 0.28, y, ph * 1.2, ph);
        ellipse(x + w * 0.28, y, ph * 1.2, ph);
        ellipse(x - w * 0.05, y - h * 0.5, ph * 1.3, ph * 1.3);
        ellipse(x + w * 0.12, y - h * 0.35, ph * 1.1, ph * 1.1);
        ellipse(x, y + h * 0.1, w * 1.0, ph);
        pop();
    }

    /** Draw upward chevrons on ROCKET platforms (boost cue) */
    static drawChevrons(x, y, h) {
        push();
        stroke(255);
        strokeWeight(3);
        noFill();
        const s = h * 0.35;
        for (let k = -1; k <= 1; k++) {
            const cx = x + k * s * 1.8;
            line(cx - s, y + s * 0.5, cx, y - s * 0.5);
            line(cx, y - s * 0.5, cx + s, y + s * 0.5);
        }
        pop();
    }

    /** Draw a "?" on MUTATION platforms */
    static drawQuestion(x, y, h) {
        push();
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        textSize(h * 1.1);
        text("?", x, y - h * 0.05);
        pop();
    }

    /**
     * Update the moving platform
     * This method assumes the platform is moving
     * Must check type before calling this function, for better performance
     */
    update(factor = 1) {
        this.x += this.vx * factor;
        if (this.x > width - Platform.w / 2 || this.x < Platform.w / 2) {
            this.vx *= -1;
        }
    }

    /**
     * Static inner class for platformTypes enum and utils
     * Value is the probability of spawn rate out of 10
     */
    static platformTypes = {
        // Unique ids (values are arbitrary, only compared via these constants)
        STABLE: 5,
        MOVING: 2,
        FRAGILE: 3,
        ICE: 4,
        ELASTIC: 6,
        CLOUD: 7,
        ROCKET: 8,
        DISCO: 9,
        MUTATION: 10,
        INVISIBLE: 0,

        // Spawn weights per type id (relative probabilities)
        WEIGHTS: {
            5: 5, // STABLE
            2: 2, // MOVING
            3: 2, // FRAGILE
            4: 2, // ICE
            6: 1, // ELASTIC
            7: 1, // CLOUD
            8: 1, // ROCKET
            9: 1, // DISCO
            10: 1, // MUTATION
        },

        /**
         * Get a random platform type, weighted by WEIGHTS
         * @returns {Platform.platformTypes} platformType
         */
        getRandomType() {
            const w = this.WEIGHTS;
            const ids = Object.keys(w);
            let total = 0;
            ids.forEach((id) => (total += w[id]));
            let r = Math.random() * total;
            for (const id of ids) {
                r -= w[id];
                if (r < 0) return Number(id);
            }
            return this.STABLE;
        },

        /**
         * Get the render color of the given platform type
         * @param {Platform.platformTypes} type
         */
        getColor(type) {
            switch (type) {
                case this.STABLE:
                    return color("#8ac43d");
                case this.MOVING:
                    return color("#31b8d6");
                case this.FRAGILE:
                    return color(255);
                case this.ICE:
                    return color("#9ad9ff");
                case this.ELASTIC:
                    return color("#46e07a");
                case this.ROCKET:
                    return color("#ff7a3d");
                case this.MUTATION:
                    return color("#a06cff");
                default:
                    return null;
            }
        },
    };
}
