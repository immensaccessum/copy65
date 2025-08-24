// === Cyclic Automata Mode - State & Config ===
const cyclicState = {
    NUM_STATES: 8,
    THRESHOLD: 3,
};

// === Cyclic Automata Mode - Core Logic ===

function setupCyclic() {
    grid = new Array(rows).fill(null).map(() =>
        new Array(cols).fill(0).map(() => Math.floor(rng() * cyclicState.NUM_STATES))
    );
}

function updateCyclic() {
    const nextGrid = grid.map(arr => [...arr]);
    const stepEvents = []; // <-- FIX: Array for sound events

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const currentState = grid[y][x];
            const nextStateInCycle = (currentState + 1) % cyclicState.NUM_STATES;
            let neighborCount = 0;

            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue;
                    
                    const nY_raw = y + i;
                    const nX_raw = x + j;

                    if (classicState.useWrap) {
                        const nY = (nY_raw + rows) % rows;
                        const nX = (nX_raw + cols) % cols;
                        if (grid[nY][nX] === nextStateInCycle) {
                            neighborCount++;
                        }
                    } else {
                        if (nY_raw >= 0 && nY_raw < rows && nX_raw >= 0 && nX_raw < cols) {
                             if (grid[nY_raw][nX_raw] === nextStateInCycle) {
                                neighborCount++;
                            }
                        }
                    }
                }
            }

            if (neighborCount >= cyclicState.THRESHOLD) {
                nextGrid[y][x] = nextStateInCycle;
                // <-- FIX: Register a sound event for the state change
                stepEvents.push({ x: x / cols, y: y / rows, type: 'birth', weight: 1 });
            }
        }
    }
    grid = nextGrid;

    // <-- FIX: Play the most prominent sounds for this frame
    stepEvents.sort((a, b) => b.weight - a.weight).slice(0, 3).forEach(playEvent);
    updateAudioEffects(stepEvents.length); 
}

function drawCyclic() {
    const gap = 1;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const state = grid[y][x];
            const hue = (state / cyclicState.NUM_STATES) * 360;
            ctx.fillStyle = `hsl(${hue}, 90%, 55%)`;
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - gap, CELL_SIZE - gap);
        }
    }
}