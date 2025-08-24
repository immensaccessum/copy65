/**
 * Renders the "Classic" or "Generations" grid onto the main canvas.
 * @param {object} settings - An object with rendering settings (e.g., useGlow, useCircles).
 */
function drawClassic(settings = {}) {
    const gap = settings.useCircles ? 2 : 1;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const value = grid[y][x];
            if (value === 0 && classicState.fadeMode === 'none') continue;

            let color;
            if (value > 0) { // Living cell
                const age = value % 1000;
                if (classicState.useGenerations) {
                    const species = Math.floor(value / 1000);
                    const hue = classicState.SPECIES_HUES[species];
                    const lightness = 90 - (age / classicState.MAX_AGE) * 40;
                    color = `hsl(${hue}, 100%, ${lightness}%)`;
                } else {
                    const lightness = 100 - (Math.min(age, 250) / 250) * 50;
                    color = `hsl(210, 100%, ${lightness}%)`;
                }

                ctx.fillStyle = color;

                // --- NEW CONDITIONAL RENDERING ---
                if (settings.useGlow) {
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 12;
                }

                if (settings.useCircles) {
                    ctx.beginPath();
                    ctx.arc(
                        x * CELL_SIZE + CELL_SIZE / 2, 
                        y * CELL_SIZE + CELL_SIZE / 2, 
                        (CELL_SIZE - gap) / 2, 
                        0, 
                        Math.PI * 2
                    );
                    ctx.fill();
                } else {
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - gap, CELL_SIZE - gap);
                }

                if (settings.useGlow) { // Reset shadow for the next element
                    ctx.shadowBlur = 0;
                }
                
            } else if (value < 0) { // Fading dead cell
                const alpha = 1 - (Math.abs(value) / classicState.FADE_DURATION);
                ctx.fillStyle = `rgba(200, 200, 200, ${alpha * 0.4})`;
                // Fading cells are always squares for simplicity and performance
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
                grid[y][x]++;
            }
        }
    }
}


/**
 * Renders the resource grid layer for the "Resources" mode.
 * @param {object} settings - Rendering settings (currently unused here but good practice).
 */
function drawResources(settings = {}) {
    const gap = 1;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const amount = resourceGrid[y][x] / 100;
            if (amount > 0.01) {
                ctx.fillStyle = `rgba(10, 50, 20, ${amount * 0.8})`;
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - gap, CELL_SIZE - gap);
            }
        }
    }
}