// === Smooth Life Mode - State & Config ===

const SMOOTH_PRESETS = {
    'liquid': { name: 'Жидкие Глайдеры', B1: 0.258, B2: 0.365, S1: 0.267, S2: 0.445, DT: 0.12 },
    'coral': { name: 'Коралловый Рост', B1: 0.300, B2: 0.450, S1: 0.220, S2: 0.580, DT: 0.09 },
    'mitosis': { name: 'Клеточный Митоз', B1: 0.250, B2: 0.340, S1: 0.200, S2: 0.500, DT: 0.14 },
    'amoeba': { name: 'Амебная Битва', B1: 0.300, B2: 0.420, S1: 0.250, S2: 0.500, DT: 0.1 },
    'crystal': { name: 'Кристаллизация', B1: 0.220, B2: 0.320, S1: 0.150, S2: 0.500, DT: 0.05 },
    'custom': { name: 'Свой', B1: 0.278, B2: 0.365, S1: 0.267, S2: 0.445, DT: 0.1 }
};

const smoothState = {
    presetName: 'liquid',
    currentPreset: SMOOTH_PRESETS['liquid'],
    colorTheme: 'cyan',
    useVonNeumann: false,
};


// === Smooth Life Mode - Core Logic ===

function setupSmooth() {
    grid = new Array(rows).fill(null).map(() =>
        new Array(cols).fill(0).map(() => (rng() < 0.1 ? rng() : 0))
    );
    if(typeof updateSmoothSliders === "function") {
      updateSmoothSliders(smoothState.currentPreset);
    }
}

/**
 * Updates the grid state for one step in "Smooth Life" mode.
 */
function updateSmooth() {
    const { B1, B2, S1, S2, DT } = smoothState.currentPreset;
    const next = grid.map(r => r.slice());
    let birthsThisStep = 0;

    // --- PERFORMANCE FIX: Smart event selection instead of collecting all events ---
    const MAX_SOUND_EVENTS = 3;
    let topEvents = []; // Array to hold the most significant events
    let minWeightInTop = 0; // The minimum weight in the topEvents array
    let totalEventCount = 0; // Total count for audio effects
    // --- END FIX ---

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let n = 0, cnt = 0;
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue;
                    if (smoothState.useVonNeumann && Math.abs(i) + Math.abs(j) > 1) continue;
                    const yy = classicState.useWrap ? (y + i + rows) % rows : y + i;
                    const xx = classicState.useWrap ? (x + j + cols) % cols : x + j;

                    if (yy < 0 || yy >= rows || xx < 0 || xx >= cols) continue;
                    n += grid[yy][xx];
                    cnt++;
                }
            }
            n /= cnt || 1;

            const v = grid[y][x];
            const birth = (n > B1 && n < B2) ? 1 : 0;
            const survive = (n > S1 && n < S2) ? 1 : 0;
            const dv = DT * (birth * (1 - v) + survive * v - (1 - survive) * v);
            const nv = Math.max(0, Math.min(1, v + dv));
            next[y][x] = nv;

            const wasAlive = v > 0.2, isAlive = nv > 0.2;
            if (wasAlive !== isAlive) {
                if (isAlive) birthsThisStep++;

                // --- PERFORMANCE FIX: Efficiently find top events without sorting a huge array ---
                totalEventCount++;
                const weight = Math.abs(dv); // Use change magnitude as weight

                // If we don't have enough events yet, or if this one is stronger than the weakest in our list
                if (topEvents.length < MAX_SOUND_EVENTS || weight > minWeightInTop) {
                    const event = { 
                        x: x / cols, 
                        y: y / rows, 
                        type: isAlive ? 'birth' : 'death', 
                        weight: weight 
                    };

                    if (topEvents.length < MAX_SOUND_EVENTS) {
                        topEvents.push(event);
                    } else {
                        // Replace the event with the minimum weight
                        let minIndex = 0;
                        for (let i = 1; i < topEvents.length; i++) {
                            if (topEvents[i].weight < topEvents[minIndex].weight) {
                                minIndex = i;
                            }
                        }
                        topEvents[minIndex] = event;
                    }
                    
                    // Update the minimum weight for the next comparison
                    minWeightInTop = Math.min(...topEvents.map(e => e.weight));
                }
                // --- END FIX ---
            }
        }
    }
    
    grid = next;
    if (birthsThisStep > 0) resetInactivityTimer();
    
    // --- PERFORMANCE FIX: Play only the pre-selected top events ---
    topEvents.forEach(playEvent);
    updateAudioEffects(totalEventCount);
    // --- END FIX ---
}


function drawSmooth() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const value = grid[y][x];
            if (value > 0.01) {
                let color;
                const lightness = value * 100;
                
                switch(smoothState.colorTheme) {
                    case 'magma':
                        color = `hsl(${20 + value * 40}, 100%, ${Math.min(50 + value * 50, 95)}%)`;
                        break;
                    case 'forest':
                        color = `hsl(${90 + value * 40}, 85%, ${Math.max(20, lightness * 0.7)}%)`;
                        break;
                    case 'psychedelic':
                        color = `hsl(${value * 360}, 100%, 55%)`;
                        break;
                    case 'cyan':
                    default:
                        color = `hsl(190, 100%, ${lightness}%)`;
                        break;
                }
                
                ctx.fillStyle = color;
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}