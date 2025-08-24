// === Langton's Ant Mode - State & Config ===
const antState = {
    numAnts: 3,
    ants: [],
    // 0: up, 1: right, 2: down, 3: left
    directions: [[0, -1], [1, 0], [0, 1], [-1, 0]]
};

class Ant {
    constructor(x, y, dir) {
        this.x = x;
        this.y = y;
        this.dir = dir; // 0, 1, 2, 3
    }

    move(events) {
        // This check now primarily prevents errors if an ant somehow starts off-screen
        if (this.x < 0 || this.x >= cols || this.y < 0 || this.y >= rows) return;
        
        const cellState = grid[this.y][this.x];
        
        events.push({ 
            x: this.x / cols, 
            y: this.y / rows, 
            type: cellState === 0 ? 'birth' : 'death', 
            weight: 1 
        });

        if (cellState === 0) { // "White"
            this.dir = (this.dir + 1) % 4; // Turn right
            grid[this.y][this.x] = 1; // Flip color
        } else { // "Black"
            this.dir = (this.dir + 3) % 4; // Turn left
            grid[this.y][this.x] = 0; // Flip color
        }

        const [dx, dy] = antState.directions[this.dir];
        this.x += dx;
        this.y += dy;

        // --- FIX: Implement proper non-wrapped world behavior ---
        if (classicState.useWrap) {
            // World wrapping (teleport)
            this.x = (this.x + cols) % cols;
            this.y = (this.y + rows) % rows;
        } else {
            // Non-wrapping world: bounce off the edges
            if (this.x >= cols) {
                this.x = cols - 1; // Clamp position to be inside the grid
                this.dir = 3; // Force direction to Left
            } else if (this.x < 0) {
                this.x = 0;
                this.dir = 1; // Force direction to Right
            }

            if (this.y >= rows) {
                this.y = rows - 1;
                this.dir = 0; // Force direction to Up
            } else if (this.y < 0) {
                this.y = 0;
                this.dir = 2; // Force direction to Down
            }
        }
        // --- END FIX ---
    }
}

// === Langton's Ant Mode - Core Logic ===

function setupAnt() {
    grid = new Array(rows).fill(null).map(() => new Array(cols).fill(0));
    antState.ants = [];
    for (let i = 0; i < antState.numAnts; i++) {
        const x = Math.floor(cols / 2 + (rng() - 0.5) * 20);
        const y = Math.floor(rows / 2 + (rng() - 0.5) * 20);
        const dir = Math.floor(rng() * 4);
        antState.ants.push(new Ant(x, y, dir));
    }
}

function updateAnt() {
    const stepsPerFrame = 10;
    const stepEvents = [];
    for (let i = 0; i < stepsPerFrame; i++) {
        antState.ants.forEach(ant => ant.move(stepEvents));
    }
    stepEvents.sort((a, b) => b.weight - a.weight).slice(0, 3).forEach(playEvent);
    updateAudioEffects(stepEvents.length);
}

function drawAnt() {
    const gap = 1;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x] === 1) {
                ctx.fillStyle = '#ccc';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - gap, CELL_SIZE - gap);
            }
        }
    }
    ctx.fillStyle = 'hsl(0, 100%, 60%)';
    antState.ants.forEach(ant => {
        ctx.fillRect(ant.x * CELL_SIZE, ant.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
}