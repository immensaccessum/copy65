// === Classic Mode & Resources Mode - State & Config ===

const INITIAL_DENSITY = 0.25;

const classicState = {
    rules: null,
    useVonNeumann: false,
    useGenerations: false,
    useProbabilistic: false,
    fadeMode: 'visual',
    useWrap: true,
    FADE_DURATION: 20,
    MAX_AGE: 999,
    NUM_SPECIES: 10,
    SPECIES_HUES: [200, 36, 300, 120, 50, 0, 240, 180, 270, 80]
};

const RULES = {
    'B3/S23': { name: 'Классика (Жизнь)', b: [3], s: [2, 3] },
    'B36/S23': { name: 'HighLife', b: [3, 6], s: [2, 3] },
    'B34/S34': { name: 'Жизнь 3-4', b: [3, 4], s: [3, 4] },
    'B2/S': { name: 'Семена (фракталы)', b: [2], s: [] },
    'B1357/S1357': { name: 'Репликатор', b: [1, 3, 5, 7], s: [1, 3, 5, 7] },
    'B3/S1234': { name: 'Лабиринт', b: [3], s: [1, 2, 3, 4] },
    'B35678/S5678': { name: 'Диамеба (хаос)', b: [3, 5, 6, 7, 8], s: [5, 6, 7, 8] },
    'B3678/S34678': { name: 'День и Ночь', b: [3, 6, 7, 8], s: [3, 4, 6, 7, 8] },
    'B4678/S35678': { name: 'Города', b: [4, 6, 7, 8], s: [3, 5, 6, 7, 8] },
    'B3/S245': { name: 'Движение', b: [3], s: [2, 4, 5] },
    'B378/S235678': { name: 'Коагуляция', b: [3, 7, 8], s: [2, 3, 5, 6, 7, 8] }
};
// Set default rules
classicState.rules = RULES[Object.keys(RULES)[0]];

const resourceState = {
    REGEN_RATE: 0.2,
    CONSUME_RATE: 4
};

// === Classic Mode - Core Logic ===

/**
 * Initializes the grid for the "Classic" and "Resources" modes.
 */
function setupClassic() {
    grid = new Array(rows).fill(null).map(() => new Array(cols).fill(0).map(() => {
        if (rng() < INITIAL_DENSITY) {
            if (classicState.useGenerations) {
                const species = Math.floor(rng() * classicState.NUM_SPECIES);
                return species * 1000 + 1; // speciesID * 1000 + age
            }
            return 1; // age = 1
        }
        return 0; // dead
    }));
}

/**
 * Initializes the resource grid for the "Resources" mode.
 */
function setupResources() {
    resourceGrid = new Array(rows).fill(null).map(() => new Array(cols).fill(100));
}

/**
 * Updates the grid state for one step in "Classic" or "Resources" mode.
 */
function updateClassic() {
    const stepEvents = [];
    const nextGrid = grid.map(arr => [...arr]);
    const P_FAIL_SURVIVE = 0.02, P_FAIL_BIRTH = 0.05;
    let birthsThisStep = 0;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let liveNeighbors = 0, oldestParentState = 0;

            // Count neighbors
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue;

                    const nY = y + i;
                    const nX = x + j;

                    if (!classicState.useWrap && (nY < 0 || nY >= rows || nX < 0 || nX >= cols)) continue;
                    if (classicState.useVonNeumann && Math.abs(i) + Math.abs(j) > 1) continue;

                    const ny_ = classicState.useWrap ? (nY + rows) % rows : nY;
                    const nx_ = classicState.useWrap ? (nX + cols) % cols : nX;
                    const neighborState = grid[ny_][nx_];

                    if (neighborState > 0) {
                        liveNeighbors++;
                        if (neighborState > oldestParentState) oldestParentState = neighborState;
                    }
                }
            }

            const currentState = grid[y][x];
            const isAlive = currentState > 0;

            if (isAlive) {
                let shouldDie = !classicState.rules.s.includes(liveNeighbors);
                if (classicState.useProbabilistic && rng() < P_FAIL_SURVIVE) shouldDie = true;
                if (currentMode === 'resources' && resourceGrid[y][x] <= 1) shouldDie = true;

                if (shouldDie) {
                    nextGrid[y][x] = classicState.fadeMode !== 'none' ? -classicState.FADE_DURATION : 0;
                    stepEvents.push({ x: x / cols, y: y / rows, type: 'death', weight: 1 });
                } else {
                    const species = Math.floor(currentState / 1000);
                    const age = currentState % 1000;
                    nextGrid[y][x] = species * 1000 + Math.min(age + 1, classicState.MAX_AGE);
                }
            } else { // Dead or empty cell
                let shouldLive = classicState.rules.b.includes(liveNeighbors);
                if (classicState.useProbabilistic && rng() < P_FAIL_BIRTH) shouldLive = false;
                if (currentMode === 'resources' && resourceGrid[y][x] < 20) shouldLive = false;

                if (shouldLive && (currentState === 0 || classicState.fadeMode === 'visual')) {
                    birthsThisStep++;
                    if (classicState.useGenerations) {
                        const pSpecies = Math.floor(oldestParentState / 1000);
                        nextGrid[y][x] = ((pSpecies + 1) % classicState.NUM_SPECIES) * 1000 + 1;
                    } else {
                        nextGrid[y][x] = 1;
                    }
                    stepEvents.push({ x: x / cols, y: y / rows, type: 'birth', weight: 1 });
                }
            }
        }
    }
    grid = nextGrid;
    if (birthsThisStep > 0) resetInactivityTimer();
    // Play sounds for the most significant events
    stepEvents.sort((a, b) => b.weight - a.weight).slice(0, 3).forEach(playEvent);
    updateAudioEffects(stepEvents.length); 
}

/**
 * Updates the resource grid for one step.
 */
function updateResources() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x] > 0) {
                resourceGrid[y][x] -= resourceState.CONSUME_RATE;
            } else {
                resourceGrid[y][x] += resourceState.REGEN_RATE;
            }
            resourceGrid[y][x] = Math.max(0, Math.min(100, resourceGrid[y][x]));
        }
    }
}