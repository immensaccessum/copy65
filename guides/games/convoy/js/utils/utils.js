/**
 * A simple pseudorandom number generator (PRNG).
 * Ensures deterministic results from a given seed.
 * @param {number} a - The seed.
 * @returns {function(): number} A function that returns a random number between 0 and 1.
 */
function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

/**
 * Resizes the canvas to fit the window, accounting for device pixel ratio.
 * Recalculates grid dimensions (cols, rows).
 */
function resizeCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(w / CELL_SIZE);
    rows = Math.ceil(h / CELL_SIZE);
}