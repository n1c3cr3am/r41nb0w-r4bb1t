/**
 * Global variables
 */
// All platforms
var platforms = [];
// Doodler Object ref
var doodler;
// Blackhole
var blackhole;
// Active bullets fired by the rabbit
var bullets = [];
// Active space invaders
var invaders = [];
// Floating power-ups to collect
var powerups = [];
// Frames left of slow-motion (from a slow-mo power-up)
var slowmoFrames = 0;
var SLOWMO_FRAMES = 160;
// Timestamp (ms) of the last shot, for cooldown
var lastShot = 0;
// Minimum delay between shots (ms)
var SHOOT_COOLDOWN = 280;
// Double-tap tracking (mobile double jump)
var lastTapTime = 0;
var lastTapX = 0;
var lastTapY = 0;
// Pause handle
var paused = false;
// Score
var score = 0;
// Game Over
var isOver = false;
// Is dead from blackhole
var isBlackholed = false;
// Vertical distance between adjacent platforms
var stepSize;
// Mobile detection
var isMobile;
// Background grid cell size
var cell;
// Matrix raincode background
var raincode;
// Replay button
var replayButton = {
    x: 0,
    y: 0,
    w: 160,
    h: 50,
    visible: false
};

const sound = {
    blackhole: null,
    jump: null,
    spring: null,
    fragile: null,
    falling: null,
};

// Frozen base values. windowResized() scales from these every time so that
// repeated resize events (e.g. the iOS Safari URL bar collapsing) never
// compound the scaling. See windowResized() for details.
// Overall pace multiplier (+50% faster game). Applied to every velocity and
// to gravity so jumps keep the same airtime but everything moves quicker.
const GAME_SPEED = 1.5;
const BASE = Object.freeze({
    jumpForce: 8.15 * GAME_SPEED,
    superJumpForce: 14 * GAME_SPEED,
    speed: 7.2 * GAME_SPEED,
    doodlerW: 80,
    doodlerH: 80,
    platformW: 110,
    platformH: 28,
    springW: 56,
    springH: 56,
    GRAVITY: 0.16 * GAME_SPEED,
    MAX_FALLING_SPEED: 10 * GAME_SPEED,
});

// Safely play a sound — iOS may fail to load audio, guard against null/errors
function playSound(s) {
    try { if (s && s.isLoaded()) s.play(); } catch (e) {}
}

/**
 * Preload event hook
 * For loading static resources before setup
 */
function preload() {
    // Only images are loaded here. Audio is loaded AFTER setup (see loadSounds)
    // because on iOS (WebKit) p5.sound's loadSound() can hang inside preload()
    // without ever firing a success or error callback, which blocks setup()
    // from running and leaves the player staring at a blank screen.
    // Load every rabbit animation pose into Doodler.images
    Doodler.POSES.forEach((p) => {
        Doodler.images[p] = loadImage(`./assets/img/${p}.png`);
    });
    Platform.springImage = loadImage("./assets/img/spring.png");
    Blackhole.blackholeImg = loadImage("./assets/img/hole.png");
    Bullet.image = loadImage("./assets/img/bullet.png");
}

/**
 * Load sound files outside of preload() so they never block startup.
 * Each loadSound() call is async and non-blocking here; playSound() guards
 * against sounds that haven't loaded (or failed to load), so the game stays
 * fully playable even when audio is unavailable (e.g. restricted on iOS).
 */
function loadSounds() {
    var noop = function() {};
    soundFormats("mp3", "wav");
    sound.blackhole = loadSound("./assets/sound/blackhole.mp3", noop, noop);
    sound.jump = loadSound("./assets/sound/jump.wav", noop, noop);
    sound.spring = loadSound("./assets/sound/spring.mp3", noop, noop);
    sound.fragile = loadSound("./assets/sound/fragile.mp3", noop, noop);
    sound.falling = loadSound("./assets/sound/falling.mp3", noop, noop);
}

/**
 * Setup event hook
 * Initialization
 */
function setup() {
    frameRate(config.FPS);
    createCanvas(windowWidth, windowHeight);
    windowResized();
    raincode = new Raincode();
    generatePlatforms();
    doodler = new Doodler(
        platforms[platforms.length - 2].x,
        platforms[platforms.length - 2].y - Doodler.h / 2 - Platform.h / 2
    );
    // Enable audio for iOS devices, then load sounds (non-blocking, off preload)
    userStartAudio();
    loadSounds();
}

/**
 * Update method of main loop, calls FPS=100 times per second
 */
function draw() {
    // Slow-motion power-up only slows the moving platforms (see plat.update)
    if (slowmoFrames > 0) slowmoFrames--;
    // Draw background
    drawBackground();
    // Render blackhole
    blackhole && blackhole.render();
    // Draw all platforms
    platforms.forEach((plat) => {
        plat.render();
        // For springs : check Collision with the falling doodler
        if (
            plat.springed &&
            doodler.vy > 0 &&
            checkCollision(doodler, {
                x: plat.x + plat.springX,
                y: plat.y + plat.springY,
                w: Platform.springW,
                h: Platform.springH,
            })
        ) {
            playSound(sound.spring);
            doodler.vy = -Doodler.superJumpForce;
            doodler.spring();
            doodler.canDoubleJump = true;
        }
        // For non-invisible platforms : check collision with the falling doodler
        if (
            plat.type !== Platform.platformTypes.INVISIBLE &&
            doodler.vy > 0 &&
            checkCollision(doodler, plat)
        ) {
            const T = Platform.platformTypes;
            // Any platform bounce recharges the mid-air double jump
            doodler.canDoubleJump = true;
            let kind = plat.type;
            // Mutation platforms randomly behave as boost / fragile / normal
            if (kind === T.MUTATION) {
                const r = Math.random();
                kind = r < 1 / 3 ? T.ELASTIC : r < 2 / 3 ? T.FRAGILE : T.STABLE;
            }

            if (kind === T.ELASTIC) {
                // Always launch a super-jump
                doodler.vy = -Doodler.superJumpForce;
                doodler.spring();
                playSound(sound.spring);
            } else if (kind === T.ROCKET) {
                // Strap on a rocket: sustained upward boost
                doodler.rocket();
                playSound(sound.spring);
            } else if (kind === T.CLOUD) {
                // Soft cloud: bounce scales with incoming fall speed (x2 effect)
                const boost =
                    Doodler.jumpForce + 1.4 * Math.min(doodler.vy, config.MAX_FALLING_SPEED);
                doodler.vy = -Math.min(boost, Doodler.superJumpForce * 1.3);
                doodler.land();
                playSound(sound.jump);
            } else {
                // Normal bounce family
                doodler.vy = -Doodler.jumpForce;
                doodler.land();
                if (kind === T.FRAGILE) {
                    // Fragile (and mutated-fragile) vanish after the jump
                    plat.type = T.INVISIBLE;
                    plat.springed = false;
                    playSound(sound.fragile);
                } else if (kind === T.ICE) {
                    // Ice sends the doodler sliding
                    doodler.iceBounce();
                    playSound(sound.jump);
                } else if (plat.type === T.DISCO) {
                    // Disco awards bonus points (x2 effect)
                    score += 400;
                    playSound(sound.jump);
                } else {
                    playSound(sound.jump);
                }
            }
        }
        // Update moving platforms (slow-mo only slows these)
        if (plat.type === Platform.platformTypes.MOVING && !paused) {
            plat.update(slowmoFrames > 0 ? 0.3 : 1);
        }
    });
    // Render invaders, bullets and power-ups above the platforms
    invaders.forEach((inv) => inv.render());
    bullets.forEach((b) => b.render());
    powerups.forEach((pu) => pu.render());
    // Draw score
    drawScore();
    drawHud();
    if (!isOver) {
        // Render the doodler
        if (doodler) {
            doodler.render();
            doodler.update();
        }
        // Update projectiles & enemies, resolve combat
        if (doodler) {
            bullets.forEach((b) => b.update());
            invaders.forEach((inv) => inv.update());
            // Bullets destroy invaders
            bullets.forEach((b) => {
                invaders.forEach((inv) => {
                    if (!b.dead && !inv.dead && inv.hit(b.x, b.y)) {
                        b.dead = true;
                        inv.dead = true;
                        score += 300;
                    }
                });
            });
            // Cull dead/off-screen
            bullets = bullets.filter((b) => !b.dead);
            invaders = invaders.filter(
                (inv) => !inv.dead && inv.y < height + 200
            );
            // An invader touching the rabbit is fatal (unless shielded)
            for (const inv of invaders) {
                if (inv.overlaps(doodler)) {
                    if (doodler.shieldFrames > 0) {
                        // Shield absorbs the hit and destroys the invader
                        doodler.shieldFrames = 0;
                        inv.dead = true;
                    } else {
                        isOver = true;
                        doodler.vx = 0;
                        doodler.vy = 0;
                        playSound(sound.blackhole);
                    }
                    break;
                }
            }
            // Collect power-ups
            for (const pu of powerups) {
                if (!pu.dead && pu.overlaps(doodler)) {
                    pu.dead = true;
                    applyPowerUp(pu.type);
                }
            }
            powerups = powerups.filter((pu) => !pu.dead && pu.y < height + 200);
        }
        // check death from falling
        if (doodler && doodler.y >= height) {
            isOver = true;
            doodler.vx = 0;
            doodler.vy = 0;
            playSound(sound.falling);
        } else if (
            // check death from blackhole
            doodler &&
            blackhole &&
            dist(doodler.x, doodler.y, blackhole.x, blackhole.y) <
                Blackhole.ROCHE_LIMIT
        ) {
            if (doodler.shieldFrames > 0) {
                // Shield destroys the blackhole instead of dying
                doodler.shieldFrames = 0;
                blackhole = null;
            } else {
                isOver = true;
                doodler.vx = 0;
                doodler.vy = 0;
                doodler.x = blackhole.x;
                doodler.y = blackhole.y;
                isBlackholed = true;
                playSound(sound.blackhole);
            }
        }
        // check blackhole out of bounds
        if (blackhole && blackhole.y > height) {
            blackhole = null;
        }
        // Restrain doodler from going up above the THRESHOLD=100
        if (doodler && doodler.y <= config.THRESHOLD && doodler.vy < 0) {
            // If so, move blackhole and all other platforms down
            // opposite speed of doodler
            blackhole && (blackhole.y -= doodler.vy);
            invaders.forEach((inv) => (inv.y -= doodler.vy));
            bullets.forEach((b) => (b.y -= doodler.vy));
            powerups.forEach((pu) => (pu.y -= doodler.vy));
            updatePlatforms();
        }
    } else {
        drawDead();
    }
}

/**
 * Update platforms in response to doodler movement
 */
function updatePlatforms() {
    platforms.forEach((plat, i) => {
        plat.y -= doodler.vy;
        // Gain score
        score++;
        // re-render the bottom non-fragile & non-invisible platform to the top
        // reset position and type
        if (plat.y > height) {
            if (
                plat.type !== Platform.platformTypes.FRAGILE &&
                plat.type !== Platform.platformTypes.INVISIBLE
            ) {
                // Random  x
                let x = Platform.w / 2 + (width - Platform.w) * Math.random();
                // One screen height off for y
                let y = plat.y - (config.STEPS + 1) * stepSize;
                // Random type
                let type = Platform.platformTypes.getRandomType();
                // Random springed
                let springed = Math.random() < config.SPRINGED_CHANCE;
                // Remove current
                platforms.splice(i, 1);
                // Add new
                platforms.push(new Platform(x, y, type, springed));
                // If got a fragile one, go add another stable one aside
                // In case player have nowhere to go
                if (type === Platform.platformTypes.FRAGILE) {
                    // 1/3 offset for the x
                    x = (x + width / 3) % width;
                    // Stable type
                    type = Platform.platformTypes.STABLE;
                    // Random springed
                    springed = Math.random() < config.SPRINGED_CHANCE;
                    // add stable next to the fragile
                    platforms.push(new Platform(x, y, type, springed));
                }
                // for other types there's a chance to generate blackhole
                else if (
                    !blackhole &&
                    Math.random() < config.BLACKHOLE_CHANCE
                ) {
                    blackhole = new Blackhole((x + width / 2) % width, y);
                }
                // Occasionally spawn a space invader near the top
                if (
                    invaders.length < config.MAX_INVADERS &&
                    Math.random() < config.INVADER_CHANCE
                ) {
                    invaders.push(new Invader((x + width / 2) % width, y));
                }
                // Occasionally spawn a floating power-up above the platform
                if (Math.random() < config.POWERUP_CHANCE) {
                    powerups.push(
                        new PowerUp(x, y - stepSize * 0.6, PowerUp.randomType())
                    );
                }
            } else {
                // Fragile & Invisible just remove
                platforms.splice(i, 1);
            }
        }
    });
}

/**
 * KeyPressed event hook
 * Sets doodler speed and direction
 */
function keyPressed() {
    if (isOver) return;
    // SPACE fires a bullet upward
    if (keyCode === 32) {
        shoot();
        return false;
    }
    // UP / W performs a mid-air double jump
    if (keyCode === UP_ARROW || keyCode === 87) {
        tryDoubleJump();
        return false;
    }
    if (
        (keyCode === LEFT_ARROW || keyCode === 65) &&
        doodler.vx !== -Doodler.speed
    ) {
        doodler.vx = -Doodler.speed;
        doodler.direction = Doodler.Direction.LEFT;
    } else if (
        (keyCode === RIGHT_ARROW || keyCode === 68) &&
        doodler.vx !== Doodler.speed
    ) {
        doodler.vx = Doodler.speed;
        doodler.direction = Doodler.Direction.RIGHT;
    }
}

/**
 * Keyreleased event hook
 * Resets Doodler vx if neither of LEFT or RIGHT is pressed
 */
function keyReleased() {
    if (
        !keyIsDown(LEFT_ARROW) &&
        !keyIsDown(RIGHT_ARROW) &&
        !keyIsDown(65) &&
        !keyIsDown(68) &&
        doodler.vx != 0
    ) {
        doodler.vx = 0;
    }
}

/**
 * Fire a bullet upward from the rabbit, respecting the cooldown.
 */
function shoot() {
    if (isOver || !doodler) return;
    if (millis() - lastShot < SHOOT_COOLDOWN) return;
    lastShot = millis();
    bullets.push(new Bullet(doodler.x, doodler.y - Doodler.h));
    doodler.shoot();
}

/** Use a mid-air double jump if available */
function tryDoubleJump() {
    if (isOver || !doodler) return;
    if (doodler.doubleJump()) playSound(sound.jump);
}

/** Apply the effect of a collected power-up */
function applyPowerUp(type) {
    if (!doodler) return;
    if (type === PowerUp.TYPES.SHIELD) {
        doodler.shieldFrames = Doodler.SHIELD_FRAMES;
    } else if (type === PowerUp.TYPES.BOOST) {
        // Rainbow boost: a huge launch upward
        doodler.vy = -Doodler.superJumpForce * 1.7;
        doodler.spring();
        doodler.canDoubleJump = true;
    } else if (type === PowerUp.TYPES.SLOWMO) {
        slowmoFrames = SLOWMO_FRAMES;
    }
    playSound(sound.spring);
}

/** Draw the active power-up indicators near the top-left */
function drawHud() {
    push();
    textAlign(LEFT, TOP);
    textStyle(NORMAL);
    textSize(22);
    fill(225, 245, 230);
    noStroke();
    let yy = 44;
    if (doodler && doodler.shieldFrames > 0) {
        text("🛡️ " + Math.ceil(doodler.shieldFrames / config.FPS) + "s", 10, yy);
        yy += 28;
    }
    if (slowmoFrames > 0) {
        text("🕶️ slow-mo", 10, yy);
    }
    pop();
}

/** Apply left/right movement from the current touch position */
function applyHorizontalTouch() {
    if (mouseX < width / 2 && doodler.vx !== -Doodler.speed) {
        doodler.vx = -Doodler.speed;
        doodler.direction = Doodler.Direction.LEFT;
    } else if (mouseX >= width / 2 && doodler.vx !== Doodler.speed) {
        doodler.vx = Doodler.speed;
        doodler.direction = Doodler.Direction.RIGHT;
    }
}

/**
 * Touch event mobile
 */
function touchStarted() {
    // Prevent default iOS behaviors like scrolling, zooming, etc.
    if (event) {
        event.preventDefault();
    }
    // Double-tap (two quick taps close together) = double jump
    const now = millis();
    if (
        !isOver &&
        now - lastTapTime < 280 &&
        Math.abs(mouseX - lastTapX) < width * 0.3 &&
        Math.abs(mouseY - lastTapY) < height * 0.3
    ) {
        lastTapTime = 0; // consume so a triple-tap doesn't double-fire
        tryDoubleJump();
        return false;
    }
    lastTapTime = now;
    lastTapX = mouseX;
    lastTapY = mouseY;
    // Tapping the top of the screen shoots upward instead of moving
    if (!isOver && mouseY < height * 0.25) {
        shoot();
        return false;
    }
    applyHorizontalTouch();
    // Return false to prevent default behavior
    return false;
}

/**
 * Touch moved event mobile
 */
function touchMoved() {
    // Prevent default iOS behaviors like scrolling
    if (event) {
        event.preventDefault();
    }
    applyHorizontalTouch();
    // Return false to prevent default behavior
    return false;
}

/**
 * Touch end event mobile
 */
function touchEnded() {
    // Prevent default iOS behaviors
    if (event) {
        event.preventDefault();
    }
    
    // Check if replay button was clicked
    if (replayButton.visible && isOver) {
        if (dist(mouseX, mouseY, replayButton.x, replayButton.y) <= replayButton.w / 2 + replayButton.h) {
            resetGame();
            return false;
        }
    }
    
    if (doodler.vx != 0) {
        doodler.vx = 0;
    }
    // Return false to prevent default behavior
    return false;
}

/**
 * Mouse pressed event for replay button
 */
function mousePressed() {
    // Check if replay button was clicked
    if (replayButton.visible && isOver) {
        if (dist(mouseX, mouseY, replayButton.x, replayButton.y) <= replayButton.w / 2 + replayButton.h) {
            resetGame();
        }
    }
}

/**
 * Window resized event hook, keep 16:9
 */
function windowResized() {
    stepSize = windowHeight / config.STEPS;
    isMobile = window.matchMedia("only screen and (max-width: 768px)").matches;
    if (!isMobile) {
        resizeCanvas((windowHeight * 9) / 16, windowHeight);
    }
    cell = windowHeight / 30;
    if (raincode) raincode.init();

    // Scale all size/physics values from the frozen BASE reference.
    // NOTE: this must always recompute from BASE (never *= in place). On iOS,
    // Safari fires resize events when the URL bar collapses; multiplying in
    // place would re-scale already-scaled values every time and quickly make
    // the doodler uncontrollable. Scaling from BASE keeps windowResized()
    // idempotent no matter how often it fires.
    if (height > 0) {
        const REF_HEIGHT = 1289;
        const heightRatio = height / REF_HEIGHT;
        // Scale movement heights
        Doodler.jumpForce = BASE.jumpForce * heightRatio;
        Doodler.superJumpForce = BASE.superJumpForce * heightRatio;
        config.GRAVITY = BASE.GRAVITY * heightRatio;
        config.MAX_FALLING_SPEED = BASE.MAX_FALLING_SPEED * heightRatio;
        // Scale render heights
        Doodler.h = BASE.doodlerH * heightRatio;
        Platform.h = BASE.platformH * heightRatio;
        Platform.springH = BASE.springH * heightRatio;
    }
    if (width > 0) {
        const REF_WIDTH = 725;
        const widthRatio = width / REF_WIDTH;
        // Scale movement widths
        Doodler.speed = BASE.speed * widthRatio;
        // Scale render widths
        Doodler.w = BASE.doodlerW * widthRatio;
        Platform.w = BASE.platformW * widthRatio;
        Platform.springW = BASE.springW * widthRatio;
    }
}

/**
 * Reset game to initial state
 */
function resetGame() {
    // CRITICAL: Stop death animation immediately by clearing death states first
    isOver = false;
    isBlackholed = false;
    paused = false;
    
    // Hide replay button immediately
    replayButton.visible = false;
    
    // Clear arrays and objects BEFORE resetting dimensions
    platforms = [];
    blackhole = null;
    bullets = [];
    invaders = [];
    powerups = [];
    slowmoFrames = 0;
    lastShot = 0;
    doodler = null;  // Clear doodler to prevent any lingering references
    
    // Reset score
    score = 0;

    // Recalculate all sizes/physics from BASE for the current screen.
    // windowResized() is now idempotent (scales from BASE), so we no longer
    // need to manually reset the static properties here first.
    windowResized();
    
    // Regenerate platforms
    generatePlatforms();
    
    // Recreate doodler at starting position
    doodler = new Doodler(
        platforms[platforms.length - 2].x,
        platforms[platforms.length - 2].y - Doodler.h / 2 - Platform.h / 2
    );
    
    // Re-enable audio context for iOS (in case it was suspended)
    userStartAudio();
}

// utils

/**
 * Draw background grid and copyright info
 */
function drawBackground() {
    if (raincode) {
        raincode.render();
    } else {
        background(Raincode.BG);
    }
}

/**
 * Draw score on the top right
 */
function drawScore() {
    const fontSize = 28;
    const scoreStr = `SCORE: ${score.toLocaleString()}`;
    textSize(fontSize);
    textStyle(BOLD);
    const strWidth = textWidth(scoreStr);
    let margin = 10;
    
    // Ensure score doesn't overflow - adjust positioning if needed
    let scoreX = width - strWidth - margin;
    if (scoreX < margin) {
        // If score would overflow, position it with minimum margin
        scoreX = margin;
    }
    
    textAlign(LEFT);
    fill(225, 245, 230);
    noStroke();
    text(scoreStr, scoreX, margin + fontSize);
    // draw copy right
    textStyle(NORMAL);
    textSize(14);
    text("Author: github.com/takosenpai2687", margin, height - margin);
    // draw FPS
    text("FPS: " + Math.floor(frameRate()) || 0, margin, height - 30);
}

/**
 * Check collision between a Doodler and a Platform
 * @param {Doodler} doodler
 * @param {Platform | any} platform
 * @returns {Boolean} isColliding
 */
function checkCollision(doodler, platform) {
    if (isOver) return false;
    return (
        doodler.x - Doodler.w / 4 < platform.x + Platform.w / 2 && // right edge
        doodler.x + Doodler.w / 4 > platform.x - Platform.w / 2 && // left edge
        doodler.y + Doodler.h / 2 > platform.y - Platform.h / 2 && // top edge
        doodler.y + Doodler.h / 2 < platform.y // bottom edge
    );
}

/**
 * Generate platforms at startup
 */
function generatePlatforms() {
    stepSize = Math.floor(height / config.STEPS);
    for (let y = height; y > 0; y -= stepSize) {
        const x = Platform.w / 2 + (width - Platform.w) * Math.random();
        let type = Platform.platformTypes.getRandomType();
        while (type === Platform.platformTypes.FRAGILE) {
            type = Platform.platformTypes.getRandomType();
        }
        const springed = Math.random() < config.SPRINGED_CHANCE;
        platforms.push(new Platform(x, y, type, springed));
    }
}

/**
 * Animation updater after death
 * Keep falling until no platforms or blackhole in sight
 */
function drawDead() {
    // Safety check - if game was restarted, don't run death animation
    if (!isOver) {
        return;
    }
    
    if (!platforms.length && !blackhole) {
        // Show Game Over text with bold font
        textAlign(CENTER);
        textStyle(BOLD);
        textSize(48);
        fill(225, 245, 230);
        noStroke();
        text("GAME OVER!", width / 2, height / 2 - 60);
        
        // Show final score
        textSize(32);
        text(`Final Score: ${score.toLocaleString()}`, width / 2, height / 2);
        
        // Draw restart button (platform-style)
        replayButton.x = width / 2;
        replayButton.y = height / 2 + 70;
        replayButton.visible = true;
        
        // Draw filled platform shape
        noStroke();
        rectMode(RADIUS);
        fill(Platform.platformTypes.getColor(Platform.platformTypes.STABLE));
        
        // Middle rectangle
        rect(replayButton.x, replayButton.y, replayButton.w / 2, replayButton.h / 2);
        
        // Left semicircle (filled)
        ellipse(replayButton.x - replayButton.w / 2, replayButton.y, replayButton.h, replayButton.h);
        
        // Right semicircle (filled)
        ellipse(replayButton.x + replayButton.w / 2, replayButton.y, replayButton.h, replayButton.h);
        
        // Draw border arcs with thick stroke
        stroke(0);
        strokeWeight(4);
        
        // Left arc border
        arc(
            replayButton.x - replayButton.w / 2,
            replayButton.y,
            replayButton.h,
            replayButton.h,
            HALF_PI,
            HALF_PI + PI,
            OPEN
        );
        
        // Right arc border
        arc(
            replayButton.x + replayButton.w / 2,
            replayButton.y,
            replayButton.h,
            replayButton.h,
            HALF_PI + PI,
            HALF_PI,
            OPEN
        );
        
        // Top line border
        line(
            replayButton.x - replayButton.w / 2,
            replayButton.y - replayButton.h / 2,
            replayButton.x + replayButton.w / 2,
            replayButton.y - replayButton.h / 2
        );
        
        // Bottom line border
        line(
            replayButton.x - replayButton.w / 2,
            replayButton.y + replayButton.h / 2,
            replayButton.x + replayButton.w / 2,
            replayButton.y + replayButton.h / 2
        );
        
        // Draw button text
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        textSize(24);
        fill(255);
        noStroke();
        text("RESTART", replayButton.x, replayButton.y);
    } else if (!isBlackholed) {
        // Still falling
        doodler.render();
        for (let i = platforms.length - 1; i >= 0; i--) {
            platforms[i].y -= Doodler.jumpForce;
            if (platforms[i].y < 0) {
                platforms.splice(i, 1);
            }
        }
        if (blackhole) {
            blackhole.y -= Doodler.jumpForce;
            if (blackhole.y < 0) {
                blackhole = null;
            }
        }
    } else {
        // Is absorbed by a blackhole
        doodler.render();
        Doodler.w -= 0.5;
        Doodler.h -= 0.5;
        if (Doodler.w < 0 || Doodler.h < 0) {
            platforms = [];
            blackhole = null;
        }
    }
}
