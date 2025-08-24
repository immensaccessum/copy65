// === DOM Element References ===
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const uiPanel = document.getElementById('ui-panel');
const uiToggle = document.getElementById('ui-toggle');
const pauseBtn = document.getElementById('pause-btn');
const pauseIconPath = document.getElementById('pause-icon-path');
const resetBtn = document.getElementById('reset-btn');
const muteBtn = document.getElementById('mute-btn');
const muteIconPath = document.getElementById('mute-icon-path');
const modeSelect = document.getElementById('mode-select');
const eraserCheck = document.getElementById('eraser-check');
const brushSizeSlider = document.getElementById('brush-size-slider');
const speedSlider = document.getElementById('speed-slider');
const wrapCheck = document.getElementById('wrap-check');
const synthSelect = document.getElementById('synth-select');
const volumeSlider = document.getElementById('volume-slider');

// Control Panels
const brushControls = document.getElementById('brush-controls');
const classicControls = document.getElementById('classic-controls');
const smoothControls = document.getElementById('smooth-controls');
const cyclicControls = document.getElementById('cyclic-controls');
const antControls = document.getElementById('ant-controls');
const boidsControls = document.getElementById('boids-controls');

// Classic Controls
const rulesSelect = document.getElementById('rules-select');
const vonNeumannCheck = document.getElementById('von-neumann-check');
const generationsCheck = document.getElementById('generations-check');
const probabilisticCheck = document.getElementById('probabilistic-check');
const fadeSelect = document.getElementById('fade-select');
const renderGlowCheck = document.getElementById('render-glow-check');
const renderCirclesCheck = document.getElementById('render-circles-check');

// Smooth Controls
const smoothPresetSelect = document.getElementById('smooth-preset-select');
const smoothCustomControls = document.getElementById('smooth-custom-controls');
const smoothColorSelect = document.getElementById('smooth-color-select');
const smoothVonNeumannCheck = document.getElementById('smooth-von-neumann-check');
const smoothB1Slider = document.getElementById('smooth-b1-slider');
const smoothB2Slider = document.getElementById('smooth-b2-slider');
const smoothS1Slider = document.getElementById('smooth-s1-slider');
const smoothS2Slider = document.getElementById('smooth-s2-slider');
const smoothDtSlider = document.getElementById('smooth-dt-slider');


// Cyclic Controls
const cyclicStatesSlider = document.getElementById('cyclic-states-slider');
const cyclicThresholdSlider = document.getElementById('cyclic-threshold-slider');

// Ant Controls
const antCountSlider = document.getElementById('ant-count-slider');

// Boids Controls
const boidsCountSlider = document.getElementById('boids-count-slider');
const boidsAlignSlider = document.getElementById('boids-align-slider');
const boidsCohesionSlider = document.getElementById('boids-cohesion-slider');
const boidsSeparationSlider = document.getElementById('boids-separation-slider');


// === Global App State ===
let grid, resourceGrid;
let cols, rows;
let isPaused = false;
let lastUpdateTime = 0;
let simulationInterval = 100;
let currentMode = 'classic';
let isEraserMode = false;
let currentBrushSize = 1;
let rng;
let isDrawing = false;
const CELL_SIZE = 8;

const rendererState = {
    useGlow: false,
    useCircles: false
};

const ICONS = {
    play: "M6 4l5 4-5 4z",
    pause: "M5 3h1v10H5zm5 0h1v10h-1z",
    mute: "M11 2.5a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-1 0v-10a.5.5 0 0 1 .5-.5zM7 4.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zM3 5.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5z",
    unmute: "M11.5 2.5a.5.5 0 0 1 0 1h-11a.5.5 0 0 1 0-1h11zm-1.5 3a.5.5 0 0 1 0 1h-8a.5.5 0 0 1 0-1h8zm-2 3a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1h5zm-2 3a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1h2z"
};
const inactivityTimer = { id: null, lastBirthTime: 0, FADE_DURATION: 3000, RESTART_TIMEOUT: 60000 };


// === Core Application Logic ===

function setup() {
    rng = mulberry32(Date.now());
    resizeCanvas();
    
    switch(currentMode) {
        case 'classic': case 'resources': setupClassic(); if (currentMode === 'resources') setupResources(); break;
        case 'smooth': setupSmooth(); break;
        case 'cyclic': setupCyclic(); break;
        case 'ant': setupAnt(); break;
        case 'boids': setupBoids(); break;
    }
    resetInactivityTimer();
}

function update() {
    if (isPaused) return;
    switch(currentMode) {
        case 'classic': case 'resources': updateClassic(); if (currentMode === 'resources') updateResources(); break;
        case 'smooth': updateSmooth(); break;
        case 'cyclic': updateCyclic(); break;
        case 'ant': updateAnt(); break;
        case 'boids': updateBoids(); break;
    }
}

function draw() {
    if (currentMode !== 'boids') {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }
    
    switch(currentMode) {
        case 'resources': drawResources(rendererState); drawClassic(rendererState); break;
        case 'classic': drawClassic(rendererState); break;
        case 'smooth': drawSmooth(); break;
        case 'cyclic': drawCyclic(); break; // Could also be adapted to use the new renderer
        case 'ant': drawAnt(); break;
        case 'boids': drawBoids(); break;
    }
    handleInactivityFade();
}

function gameLoop(timestamp) {
    if (!isPaused && timestamp - lastUpdateTime > simulationInterval) {
        update();
        lastUpdateTime = timestamp;
    }
    draw();
    requestAnimationFrame(gameLoop);
}

function applyBrush(clientX, clientY) {
    if (currentMode === 'boids' || currentMode === 'ant') return;

    const x = Math.floor(clientX / CELL_SIZE);
    const y = Math.floor(clientY / CELL_SIZE);
    for (let i = -currentBrushSize; i <= currentBrushSize; i++) {
        for (let j = -currentBrushSize; j <= currentBrushSize; j++) {
            if (Math.hypot(i, j) > currentBrushSize + 0.5) continue;
            const nY = y + i, nX = x + j;
            if (nY >= 0 && nY < rows && nX >= 0 && nX < cols) {
                if (!isEraserMode) {
                    if (currentMode === 'smooth') grid[nY][nX] = 1.0;
                    else if (currentMode === 'cyclic') grid[nY][nX] = 0;
                    else grid[nY][nX] = classicState.useGenerations ? (Math.floor(rng() * classicState.NUM_SPECIES)) * 1000 + 1 : 1;
                } else {
                    grid[nY][nX] = 0;
                }
            }
        }
    }
}


// === UI and Event Handling ===

function updateUI() {
    const panels = {
        classic: classicControls,
        smooth: smoothControls,
        resources: classicControls,
        cyclic: cyclicControls,
        ant: antControls,
        boids: boidsControls
    };
    
    Object.values(panels).forEach(p => p.style.display = 'none');
    smoothCustomControls.style.display = 'none';
    
    if (panels[currentMode]) {
        panels[currentMode].style.display = 'flex';
    }
    
    if (currentMode === 'smooth' && smoothState.presetName === 'custom') {
        smoothCustomControls.style.display = 'flex';
    }
    
    const isGridBased = currentMode !== 'boids' && currentMode !== 'ant';
    brushControls.style.display = isGridBased ? 'flex' : 'none';
    document.getElementById('controls-hint').style.display = isGridBased ? 'block' : 'none';

    pauseIconPath.setAttribute('d', isPaused ? ICONS.play : ICONS.pause);
    muteIconPath.setAttribute('d', audioState.isMuted ? ICONS.unmute : ICONS.mute);
}


function populateUI() {
    for (const key in RULES) {
        const o = document.createElement('option'); o.value = key; o.textContent = RULES[key].name; rulesSelect.appendChild(o);
    }
    for (const key in SMOOTH_PRESETS) {
        const o = document.createElement('option'); o.value = key; o.textContent = SMOOTH_PRESETS[key].name; smoothPresetSelect.appendChild(o);
    }
}

function applyInitialSettings() {
    modeSelect.value = 'resources'; rulesSelect.value = 'B2/S'; vonNeumannCheck.checked = false; generationsCheck.checked = false; probabilisticCheck.checked = false; fadeSelect.value = 'visual'; classicState.fadeMode = 'visual'; wrapCheck.checked = false; currentMode = 'resources'; classicState.rules = RULES['B2/S']; classicState.useVonNeumann = false; classicState.useGenerations = false; classicState.useProbabilistic = false; classicState.useWrap = false;
}

function resetInactivityTimer() { clearTimeout(inactivityTimer.id); inactivityTimer.lastBirthTime = performance.now(); inactivityTimer.id = setTimeout(() => { isPaused = false; setup(); }, inactivityTimer.RESTART_TIMEOUT); }
function handleInactivityFade() { const timeSinceBirth = performance.now() - inactivityTimer.lastBirthTime; if (!isPaused && timeSinceBirth > inactivityTimer.RESTART_TIMEOUT - inactivityTimer.FADE_DURATION) { const fadeProgress = (timeSinceBirth - (inactivityTimer.RESTART_TIMEOUT - inactivityTimer.FADE_DURATION)) / inactivityTimer.FADE_DURATION; ctx.fillStyle = `rgba(0,0,0,${fadeProgress * 0.8})`; ctx.fillRect(0,0,canvas.clientWidth, canvas.clientHeight); } }


function updateSmoothSliders(preset) {
    smoothB1Slider.value = preset.B1;
    smoothB2Slider.value = preset.B2;
    smoothS1Slider.value = preset.S1;
    smoothS2Slider.value = preset.S2;
    smoothDtSlider.value = preset.DT;
}

function updateCustomPresetFromSliders() {
    smoothState.currentPreset = {
        name: 'Свой',
        B1: parseFloat(smoothB1Slider.value),
        B2: parseFloat(smoothB2Slider.value),
        S1: parseFloat(smoothS1Slider.value),
        S2: parseFloat(smoothS2Slider.value),
        DT: parseFloat(smoothDtSlider.value),
    };
}


// === Event Listeners ===
function setupEventListeners() {
    uiToggle.addEventListener('click', () => { uiPanel.classList.toggle('collapsed'); uiToggle.textContent = uiPanel.classList.contains('collapsed') ? 'Настройки ▸' : 'Настройки ▾'; });
    pauseBtn.addEventListener('click', () => { isPaused = !isPaused; if (isPaused) clearTimeout(inactivityTimer.id); else resetInactivityTimer(); updateUI(); });
    resetBtn.addEventListener('click', () => { setup(); isPaused = false; updateUI(); });
    modeSelect.addEventListener('change', (e) => { currentMode = e.target.value; updateUI(); setup(); });
    
    // General Controls
    eraserCheck.addEventListener('change', (e) => { isEraserMode = e.target.checked; });
    brushSizeSlider.addEventListener('input', (e) => { currentBrushSize = parseInt(e.target.value, 10); });
    speedSlider.addEventListener('input', (e) => { simulationInterval = Math.max(16, 200 - e.target.value); });
    wrapCheck.addEventListener('change', (e) => { classicState.useWrap = e.target.checked; setup(); });
    
    // Classic Mode & Renderer Listeners
    rulesSelect.addEventListener('change', (e) => { classicState.rules = RULES[e.target.value]; });
    vonNeumannCheck.addEventListener('change', (e) => { classicState.useVonNeumann = e.target.checked; });
    probabilisticCheck.addEventListener('change', (e) => { classicState.useProbabilistic = e.target.checked; });
    fadeSelect.addEventListener('change', (e) => { classicState.fadeMode = e.target.value; });
    generationsCheck.addEventListener('change', (e) => { classicState.useGenerations = e.target.checked; setup(); });
    renderGlowCheck.addEventListener('change', e => { rendererState.useGlow = e.target.checked; });
    renderCirclesCheck.addEventListener('change', e => { rendererState.useCircles = e.target.checked; });

    // Smooth Mode Listeners
    smoothPresetSelect.addEventListener('change', (e) => { const presetName = e.target.value; smoothState.presetName = presetName; if (presetName !== 'custom') { const preset = SMOOTH_PRESETS[presetName]; updateSmoothSliders(preset); smoothState.currentPreset = preset; } else { updateCustomPresetFromSliders(); } updateUI(); setup(); });
    smoothColorSelect.addEventListener('change', (e) => { smoothState.colorTheme = e.target.value; });
    smoothVonNeumannCheck.addEventListener('change', (e) => { smoothState.useVonNeumann = e.target.checked; });
    [smoothB1Slider, smoothB2Slider, smoothS1Slider, smoothS2Slider, smoothDtSlider].forEach(slider => slider.addEventListener('input', updateCustomPresetFromSliders));

    // Other modes...
    cyclicStatesSlider.addEventListener('input', e => { cyclicState.NUM_STATES = parseInt(e.target.value, 10); setup(); });
    cyclicThresholdSlider.addEventListener('input', e => { cyclicState.THRESHOLD = parseInt(e.target.value, 10); });
    antCountSlider.addEventListener('input', e => { antState.numAnts = parseInt(e.target.value, 10); setup(); });
    boidsCountSlider.addEventListener('input', e => { boidsState.numBoids = parseInt(e.target.value, 10); setup(); });
    boidsAlignSlider.addEventListener('input', e => boidsState.forces.alignment = parseFloat(e.target.value));
    boidsCohesionSlider.addEventListener('input', e => boidsState.forces.cohesion = parseFloat(e.target.value));
    boidsSeparationSlider.addEventListener('input', e => boidsState.forces.separation = parseFloat(e.target.value));
    
    // System Listeners
    ['pause-btn','reset-btn', 'mute-btn'].forEach(id => { const el = document.getElementById(id); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') el.click(); }); });
    uiPanel.addEventListener('pointerdown', (e) => e.stopPropagation());
    uiPanel.addEventListener('pointermove', (e) => e.stopPropagation());
    canvas.addEventListener('pointerdown', e => { clearTimeout(inactivityTimer.id); isDrawing = true; applyBrush(e.clientX, e.clientY); initAudio(); });
    canvas.addEventListener('pointermove', e => { if (isDrawing) { applyBrush(e.clientX, e.clientY); } });
    window.addEventListener('pointerup', () => { if (isDrawing) resetInactivityTimer(); isDrawing = false; }); 
    window.addEventListener('pointerleave', () => { if (isDrawing) resetInactivityTimer(); isDrawing = false; }); 
    window.addEventListener('pointercancel', () => { if (isDrawing) resetInactivityTimer(); isDrawing = false; });
    window.addEventListener('resize', () => { setup(); });
    
    // Audio Listeners
    muteBtn.addEventListener('click', toggleMute);
    volumeSlider.addEventListener('input', setVolume);
    synthSelect.addEventListener('change', setSynth);
}

// === App Initialization ===
function initialize() {
    populateUI();
    applyInitialSettings();
    setupEventListeners();
    updateUI();
    setup();
    requestAnimationFrame(gameLoop);
}

// Start the application
initialize();