// === Audio Core State ===
const audioState = {
    actx: null,
    master: null,
    comp: null,
    filter: null,      // <-- NEW: Adaptive Low-Pass Filter
    convolver: null,   // <-- NEW: Reverb effect node
    reverbGain: null,  // <-- NEW: Gain for the reverb effect
    isMuted: true,
    synth: 'classic'
};
const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
let noiseBuffer = null;

/**
 * Initializes the Web Audio API context and main audio nodes.
 * This should be called once after a user interaction.
 */
function initAudio() {
    if (audioState.actx) return;
    try {
        audioState.actx = new (window.AudioContext || window.webkitAudioContext)();
        const actx = audioState.actx;

        // Create core components
        audioState.master = actx.createGain();
        audioState.master.gain.value = 0.4;
        
        audioState.comp = actx.createDynamicsCompressor();
        audioState.comp.threshold.value = -40; // More gentle compression
        audioState.comp.ratio.value = 6;

        // --- NEW: Adaptive Filter ---
        audioState.filter = actx.createBiquadFilter();
        audioState.filter.type = 'lowpass';
        audioState.filter.frequency.value = 18000; // Start open

        // --- NEW: Convolution Reverb ---
        audioState.convolver = actx.createConvolver();
        audioState.reverbGain = actx.createGain();
        audioState.reverbGain.gain.value = 0.7; // "Wetness" of the reverb

        // Generate a synthetic impulse response for the reverb
        function createImpulseResponse(duration = 2, decay = 2) {
            const sampleRate = actx.sampleRate;
            const length = sampleRate * duration;
            const impulse = actx.createBuffer(2, length, sampleRate);
            for (let channel = 0; channel < 2; channel++) {
                const channelData = impulse.getChannelData(channel);
                for (let i = 0; i < length; i++) {
                    const t = i / length;
                    channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
                }
            }
            return impulse;
        }
        audioState.convolver.buffer = createImpulseResponse();

        // --- NEW: Reroute the audio graph ---
        // Final Chain: Compressor -> Filter -> Master -> Destination
        audioState.comp.connect(audioState.filter);
        audioState.filter.connect(audioState.master);
        audioState.master.connect(actx.destination);
        
        // Reverb Chain: Convolver -> ReverbGain -> Compressor (mixes back in)
        audioState.convolver.connect(audioState.reverbGain);
        audioState.reverbGain.connect(audioState.comp);


        // Create a buffer for white noise (used in percussion synth)
        const bufferSize = actx.sampleRate * 0.5;
        noiseBuffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { output[i] = Math.random() * 2 - 1; }

    } catch (e) {
        console.error("Web Audio API is not supported in this browser.");
    }
}


/**
 * Plays a sound based on an event (e.g., cell birth or death).
 * @param {object} e - The event object containing x, y, type, etc.
 */
function playEvent(e) {
    if (!audioState.actx || audioState.isMuted) return;

    const actx = audioState.actx;
    const t = actx.currentTime + 0.005;
    const freq = scale[(Math.floor((1 - e.y) * scale.length) + (e.type === 'birth' ? 1 : 0)) % scale.length];
    const panNode = new StereoPannerNode(actx, { pan: e.x * 2 - 1 });

    // --- NEW: Connect panner to both dry (compressor) and wet (reverb) paths ---
    panNode.connect(audioState.comp);
    panNode.connect(audioState.convolver);

    // Randomize pitch slightly for a more organic feel
    const detune = (rng() - 0.5) * 15;

    switch (audioState.synth) {
        case 'classic': {
            const osc = actx.createOscillator();
            const amp = actx.createGain();
            osc.frequency.value = freq;
            osc.detune.value = detune;
            osc.type = e.type === 'birth' ? 'triangle' : 'square';
            // --- FIX: Softer envelope ---
            amp.gain.setValueAtTime(0, t);
            amp.gain.linearRampToValueAtTime(0.4, t + 0.02); // Slower attack
            amp.gain.exponentialRampToValueAtTime(0.001, t + 0.4); // Longer release
            osc.connect(amp).connect(panNode); // Connect to panner
            osc.start(t);
            osc.stop(t + 0.42);
            break;
        }
        case 'percussion': {
            if (e.type === 'birth') {
                const osc = actx.createOscillator();
                const amp = actx.createGain();
                osc.type = 'sine';
                osc.detune.value = detune;
                // --- FIX: Softer envelope ---
                amp.gain.setValueAtTime(0, t);
                amp.gain.linearRampToValueAtTime(0.8, t + 0.01);
                amp.gain.exponentialRampToValueAtTime(0.001, t + 0.2); // Longer
                osc.frequency.setValueAtTime(freq * 1.5, t);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.2);
                osc.connect(amp).connect(panNode);
                osc.start(t);
                osc.stop(t + 0.22);
            } else {
                const noise = actx.createBufferSource();
                noise.buffer = noiseBuffer;
                const amp = actx.createGain();
                // --- FIX: Softer envelope ---
                amp.gain.setValueAtTime(0, t);
                amp.gain.linearRampToValueAtTime(0.2, t + 0.01);
                amp.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                noise.connect(amp).connect(panNode);
                noise.start(t);
                noise.stop(t + 0.12);
            }
            break;
        }
        case 'harps': { // Harps are already soft, minimal changes
            if (e.type === 'birth') {
                [0, 4, 7].forEach(interval => {
                    const osc = actx.createOscillator();
                    const amp = actx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq * Math.pow(2, interval / 12);
                    osc.detune.value = detune;
                    amp.gain.setValueAtTime(0, t);
                    amp.gain.linearRampToValueAtTime(0.15, t + 0.01);
                    amp.gain.exponentialRampToValueAtTime(0.001, t + 0.6); // Slightly longer
                    osc.connect(amp).connect(panNode);
                    osc.start(t);
                    osc.stop(t + 0.62);
                });
            } else {
                const osc = actx.createOscillator();
                const amp = actx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.value = freq / 2;
                osc.detune.value = detune;
                amp.gain.setValueAtTime(0, t);
                amp.gain.linearRampToValueAtTime(0.2, t + 0.01);
                amp.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.connect(amp).connect(panNode);
                osc.start(t);
                osc.stop(t + 0.52);
            }
            break;
        }
    }
}


// --- NEW: The "Conductor" function that adjusts effects based on event density ---
/**
 * Updates global audio effects based on the number of events in a frame.
 * @param {number} eventCount - The number of sound events generated in the current update step.
 */
function updateAudioEffects(eventCount) {
    if (!audioState.actx || !audioState.filter) return;
    
    const actx = audioState.actx;
    
    // Define filter frequency range
    const MAX_FREQ = 16000;
    const MIN_FREQ = 800;
    
    // Define event count thresholds
    const MAX_EVENTS = 20; // At this count, the filter is at its minimum frequency
    
    // Calculate how "chaotic" the current frame is (0 to 1)
    const chaos = Math.min(eventCount / MAX_EVENTS, 1);
    
    // Map chaos to filter frequency (inversely)
    // When chaos is 0, freq is MAX_FREQ. When chaos is 1, freq is MIN_FREQ.
    const newFreq = MAX_FREQ - chaos * (MAX_FREQ - MIN_FREQ);
    
    // Smoothly transition the filter to the new frequency
    audioState.filter.frequency.setTargetAtTime(newFreq, actx.currentTime, 0.1);
}


// === Audio UI Event Handlers ===

/**
 * Toggles the master mute state.
 */
async function toggleMute() {
    if (!audioState.actx) initAudio();
    if (audioState.actx && audioState.actx.state === 'suspended') {
        await audioState.actx.resume();
    }
    audioState.isMuted = !audioState.isMuted;
    if (audioState.actx) {
        const newVolume = audioState.isMuted ? 0 : parseFloat(volumeSlider.value);
        audioState.master.gain.setTargetAtTime(newVolume, audioState.actx.currentTime, 0.1);
    }
    updateUI(); // This function is in main.js but should be globally accessible
}

/**
 * Sets the master volume.
 * @param {Event} e - The input event from the volume slider.
 */
function setVolume(e) {
    if (audioState.actx && !audioState.isMuted) {
        audioState.master.gain.setTargetAtTime(parseFloat(e.target.value), audioState.actx.currentTime, 0.1);
    }
}

/**
 * Changes the active synthesizer.
 * @param {Event} e - The change event from the synth select dropdown.
 */
function setSynth(e) {
    audioState.synth = e.target.value;
}