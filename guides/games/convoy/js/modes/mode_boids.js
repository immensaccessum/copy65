// === Boids Mode - State & Config ===
const boidsState = {
    numBoids: 150,
    boids: [],
    forces: {
        alignment: 1.0,
        cohesion: 1.0,
        separation: 1.5,
    },
    perceptionRadius: 50,
    separationThreshold: 20, // <-- FIX: New property for sound trigger distance
    maxSpeed: 3,
    maxForce: 0.05,
    edgeMargin: 50,
    edgeTurnForce: 0.2
};

// Simple Vector class for Boids
class Vector {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    mult(s) { this.x *= s; this.y *= s; return this; }
    div(s) { this.x /= s; this.y /= s; return this; }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() { const m = this.mag(); if (m > 0) this.div(m); return this; }
    setMag(m) { this.normalize().mult(m); return this; }
    limit(max) { const mSq = this.x * this.x + this.y * this.y; if (mSq > max * max) { this.div(Math.sqrt(mSq)).mult(max); } return this; }
    static sub(v1, v2) { return new Vector(v1.x - v2.x, v1.y - v2.y); }
    dist(v) { const dx = this.x - v.x; const dy = this.y - v.y; return Math.sqrt(dx * dx + dy * dy); }
    heading() { return Math.atan2(this.y, this.x); }
}

class Boid {
    constructor() {
        this.position = new Vector(rng() * canvas.clientWidth, rng() * canvas.clientHeight);
        this.velocity = new Vector(rng() * 2 - 1, rng() * 2 - 1);
        this.velocity.setMag(rng() * 2 + 2);
        this.acceleration = new Vector();
    }
    
    edges() {
        if (classicState.useWrap) {
            if (this.position.x > canvas.clientWidth) this.position.x = 0;
            else if (this.position.x < 0) this.position.x = canvas.clientWidth;
            if (this.position.y > canvas.clientHeight) this.position.y = 0;
            else if (this.position.y < 0) this.position.y = canvas.clientHeight;
        } else {
            const steer = new Vector();
            if (this.position.x < boidsState.edgeMargin) steer.x = boidsState.edgeTurnForce;
            else if (this.position.x > canvas.clientWidth - boidsState.edgeMargin) steer.x = -boidsState.edgeTurnForce;
            if (this.position.y < boidsState.edgeMargin) steer.y = boidsState.edgeTurnForce;
            else if (this.position.y > canvas.clientHeight - boidsState.edgeMargin) steer.y = -boidsState.edgeTurnForce;
            this.acceleration.add(steer);
        }
    }

    // <-- FIX: Accept an events array
    flock(boids, events) {
        let alignment = new Vector();
        let cohesion = new Vector();
        let separation = new Vector();
        let total = 0;

        for (let other of boids) {
            let d = this.position.dist(other.position);
            if (other !== this && d < boidsState.perceptionRadius) {
                alignment.add(other.velocity);
                cohesion.add(other.position);
                let diff = Vector.sub(this.position, other.position);
                diff.div(d * d);
                separation.add(diff);
                total++;
                
                // <-- FIX: If boids are very close, generate a weighted sound event
                if (d < boidsState.separationThreshold) {
                    events.push({
                        x: this.position.x / canvas.clientWidth,
                        y: this.position.y / canvas.clientHeight,
                        type: 'death', // 'death' sound for a near-miss/danger
                        weight: 1 / d // Closer events are more important
                    });
                }
            }
        }

        if (total > 0) {
            alignment.div(total).setMag(boidsState.maxSpeed).sub(this.velocity).limit(boidsState.maxForce);
            cohesion.div(total).sub(this.position).setMag(boidsState.maxSpeed).sub(this.velocity).limit(boidsState.maxForce);
            separation.div(total).setMag(boidsState.maxSpeed).sub(this.velocity).limit(boidsState.maxForce);
        }
        
        alignment.mult(boidsState.forces.alignment);
        cohesion.mult(boidsState.forces.cohesion);
        separation.mult(boidsState.forces.separation);

        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);
        this.acceleration.add(separation);
    }

    update() {
        this.position.add(this.velocity);
        this.velocity.add(this.acceleration);
        this.velocity.limit(boidsState.maxSpeed);
        this.acceleration.mult(0);
    }
}

// === Boids Mode - Core Logic ===

function setupBoids() {
    boidsState.boids = [];
    for (let i = 0; i < boidsState.numBoids; i++) {
        boidsState.boids.push(new Boid());
    }
}

function updateBoids() {
    const stepEvents = []; // <-- FIX: Array for sound events
    for (let boid of boidsState.boids) {
        boid.edges();
        boid.flock(boidsState.boids, stepEvents); // <-- FIX: Pass events array
        boid.update();
    }
    // <-- FIX: Play sounds for the closest interactions
    stepEvents.sort((a, b) => b.weight - a.weight).slice(0, 2).forEach(playEvent);
    updateAudioEffects(stepEvents.length); 
}

function drawBoids() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    for (let boid of boidsState.boids) {
        ctx.save();
        ctx.translate(boid.position.x, boid.position.y);
        ctx.rotate(boid.velocity.heading());
        
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-5, -5);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        
        ctx.fillStyle = 'hsl(190, 100%, 70%)';
        ctx.fill();
        
        ctx.restore();
    }
}