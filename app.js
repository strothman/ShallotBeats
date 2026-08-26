// BeatSync App Logic — 18 Instruments × 32 Steps
document.addEventListener('DOMContentLoaded', () => {
    // --- State and Config ---
    let audioCtx = null;
    let masterGain = null;
    let analyser = null;
    let compressor = null;
    let bassFilter = null;
    let trebleFilter = null;

    let isPlaying = false;
    let bpm = 120;
    let swing = 0; // 0 to 80
    let activeBank = null; // Currently selected bank (0 to 5)

    // Scheduler variables
    const TOTAL_STEPS = 32;
    let currentStep = 0;
    let nextStepTime = 0.0;
    let lookahead = 25.0; // ms
    let scheduleAheadTime = 0.1; // sec
    let timerId = null;

    // Noise buffer cache
    let noiseBuffer = null;

    // Tap tempo variables
    let tapTimes = [];

    // --- Instrument Definitions (18 total) ---
    // 15 from Pearl Master Studio kit + 3 synthesized
    const instruments = [
        { id: 'kick',       name: 'Kick',         color: '#ff0055',  sampleUrl: 'samples/kick.wav' },
        { id: 'snare',      name: 'Snare',        color: '#00f2fe',  sampleUrl: 'samples/snare.wav' },
        { id: 'snare2',     name: 'Snare 2',      color: '#4facfe',  sampleUrl: 'samples/snare2.wav' },
        { id: 'snare3',     name: 'Cross Stick',  color: '#7ec8e3',  sampleUrl: 'samples/snare3.wav' },
        { id: 'hat_closed', name: 'Closed Hat',   color: '#8a2be2',  sampleUrl: 'samples/hat_closed.wav' },
        { id: 'hat_open',   name: 'Open Hat',     color: '#ffd166',  sampleUrl: 'samples/hat_open.wav' },
        { id: 'ride',       name: 'Ride',         color: '#c9b1ff',  sampleUrl: 'samples/ride.wav' },
        { id: 'ride2',      name: 'Ride Bell',    color: '#e0ccff',  sampleUrl: 'samples/ride2.wav' },
        { id: 'crash',      name: 'Crash',        color: '#06d6a0',  sampleUrl: 'samples/crash.wav' },
        { id: 'crash2',     name: 'Crash 2',      color: '#26f0c5',  sampleUrl: 'samples/crash2.wav' },
        { id: 'splash',     name: 'Splash',       color: '#00c9a7',  sampleUrl: 'samples/splash.wav' },
        { id: 'splash2',    name: 'Splash 2',     color: '#48d1cc',  sampleUrl: 'samples/splash2.wav' },
        { id: 'tom_high',   name: 'High Tom',     color: '#ff6b6b',  sampleUrl: 'samples/tom_low.wav' },
        { id: 'tom_mid',    name: 'Mid Tom',      color: '#ee5a5a',  sampleUrl: 'samples/tom_mid.wav' },
        { id: 'tom_low',    name: 'Low Tom',      color: '#d94343',  sampleUrl: 'samples/tom_high.wav' },
        { id: 'clap',       name: 'Clap',         color: '#f72585',  synth: true },
        { id: 'cowbell',    name: 'Cowbell',       color: '#ffbe0b',  synth: true },
        { id: 'rimshot',    name: 'Rim Shot',      color: '#fb8500',  synth: true }
    ];

    // Audio buffers cache
    let buffers = {};

    // Grid states: 18 instruments × 32 steps
    let grid = {};
    instruments.forEach(inst => {
        grid[inst.id] = new Array(TOTAL_STEPS).fill(false);
    });

    // Mute states
    let muteStates = {};
    instruments.forEach(inst => {
        muteStates[inst.id] = false;
    });

    // Helper to make 32-step arrays from shorter notation
    // p = pattern array of 0/1, repeated or padded to 32
    const p = (...bits) => {
        const arr = bits.map(b => !!b);
        while (arr.length < TOTAL_STEPS) arr.push(false);
        return arr.slice(0, TOTAL_STEPS);
    };
    // Convenience: double a 16-step pattern into 32
    const d = (a16) => [...a16, ...a16];
    const z = () => new Array(TOTAL_STEPS).fill(false); // silence

    // --- Presets (32 steps each) ---
    const presets = {
        rock: {
            bpm: 120,
            swing: 0,
            grid: {
                kick:       d([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0].map(Boolean)),
                snare:      d([0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0].map(Boolean)),
                snare2:     z(), snare3: z(),
                hat_closed: d([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0].map(Boolean)),
                hat_open:   d([0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1].map(Boolean)),
                ride:       z(), ride2: z(),
                crash:      p(1,...new Array(31).fill(0)),
                crash2:     z(), splash: z(), splash2: z(),
                tom_high:   z(), tom_mid: z(),
                tom_low:    d([0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0].map(Boolean)),
                clap:       z(), cowbell: z(), rimshot: z()
            }
        },
        blues: {
            bpm: 96,
            swing: 50,
            grid: {
                kick:       d([1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0].map(Boolean)),
                snare:      d([0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0].map(Boolean)),
                snare2:     z(), snare3: z(),
                hat_closed: d([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0].map(Boolean)),
                hat_open:   d([0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1].map(Boolean)),
                ride:       z(), ride2: z(),
                crash:      z(), crash2: z(), splash: z(), splash2: z(),
                tom_high:   z(), tom_mid: z(), tom_low: z(),
                clap:       z(), cowbell: z(), rimshot: z()
            }
        },
        funk: {
            bpm: 105,
            swing: 15,
            grid: {
                kick:       d([1,0,0,0,0,0,0,1,0,1,1,0,0,0,0,0].map(Boolean)),
                snare:      d([0,0,0,0,1,0,0,0,0,0,0,1,1,0,1,0].map(Boolean)),
                snare2:     z(), snare3: z(),
                hat_closed: d([1,1,0,1,1,1,1,0,1,1,0,1,1,1,0,1].map(Boolean)),
                hat_open:   d([0,0,1,0,0,0,0,1,0,0,1,0,0,0,1,0].map(Boolean)),
                ride:       z(), ride2: z(),
                crash:      z(), crash2: z(), splash: z(), splash2: z(),
                tom_high:   z(), tom_mid: z(), tom_low: z(),
                clap:       d([0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0].map(Boolean)),
                cowbell:    z(), rimshot: z()
            }
        },
        hiphop: {
            bpm: 90,
            swing: 20,
            grid: {
                kick:       d([1,0,0,0,0,0,1,0,0,0,1,0,0,1,0,0].map(Boolean)),
                snare:      d([0,0,0,0,1,0,0,0,0,1,0,0,1,0,0,0].map(Boolean)),
                snare2:     z(), snare3: z(),
                hat_closed: d([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1].map(Boolean)),
                hat_open:   d([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1].map(Boolean)),
                ride:       z(), ride2: z(),
                crash:      z(), crash2: z(), splash: z(), splash2: z(),
                tom_high:   z(), tom_mid: z(), tom_low: z(),
                clap:       d([0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0].map(Boolean)),
                cowbell:    z(), rimshot: z()
            }
        },
        metal: {
            bpm: 160,
            swing: 0,
            grid: {
                kick:       d([1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0].map(Boolean)),
                snare:      d([0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0].map(Boolean)),
                snare2:     z(), snare3: z(),
                hat_closed: d([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0].map(Boolean)),
                hat_open:   d([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1].map(Boolean)),
                ride:       z(), ride2: z(),
                crash:      p(1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0),
                crash2:     z(), splash: z(), splash2: z(),
                tom_high:   z(), tom_mid: z(), tom_low: z(),
                clap:       z(), cowbell: z(), rimshot: z()
            }
        },
        jazz: {
            bpm: 130,
            swing: 60,
            grid: {
                kick:       p(1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0),
                snare:      z(),
                snare2:     z(),
                snare3:     p(0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0),
                hat_closed: z(),
                hat_open:   z(),
                ride:       p(1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1),
                ride2:      z(),
                crash:      z(), crash2: z(), splash: z(), splash2: z(),
                tom_high:   z(), tom_mid: z(), tom_low: z(),
                clap:       z(), cowbell: z(), rimshot: z()
            }
        }
    };

    // --- DOM Elements ---
    const gridContainer = document.getElementById('sequencer-grid-container');
    const stepsIndicatorContainer = document.getElementById('steps-indicator-container');
    const btnPlay = document.getElementById('btn-play');
    const btnStop = document.getElementById('btn-stop');
    const btnClear = document.getElementById('btn-clear');
    const btnTap = document.getElementById('btn-tap');
    const inputBpm = document.getElementById('input-bpm');
    const valBpm = document.getElementById('val-bpm');
    const inputSwing = document.getElementById('input-swing');
    const valSwing = document.getElementById('val-swing');
    const inputVolume = document.getElementById('input-volume');
    const inputPunch = document.getElementById('input-punch');
    const valPunch = document.getElementById('val-punch');
    const inputBass = document.getElementById('input-bass');
    const valBass = document.getElementById('val-bass');
    const inputTreble = document.getElementById('input-treble');
    const valTreble = document.getElementById('val-treble');
    const presetButtons = document.querySelectorAll('.btn-preset');
    const bankButtons = document.querySelectorAll('.btn-bank');
    const btnSaveBeat = document.getElementById('btn-save-beat');
    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');

    // --- Setup Audio & Node Graph ---
    function initAudio() {
        if (audioCtx) return;

        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Master Gain
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(inputVolume.value / 100, audioCtx.currentTime);

        // EQ Filters
        bassFilter = audioCtx.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.setValueAtTime(100, audioCtx.currentTime);
        bassFilter.gain.setValueAtTime(parseFloat(inputBass.value), audioCtx.currentTime);

        trebleFilter = audioCtx.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.setValueAtTime(6000, audioCtx.currentTime);
        trebleFilter.gain.setValueAtTime(parseFloat(inputTreble.value), audioCtx.currentTime);

        // Dynamics Compressor
        compressor = audioCtx.createDynamicsCompressor();
        updateCompressor();

        // Analyser node for the visualizer
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        // Signal chain: masterGain → Bass EQ → Treble EQ → Compressor → Analyser → Output
        masterGain.connect(bassFilter);
        bassFilter.connect(trebleFilter);
        trebleFilter.connect(compressor);
        compressor.connect(analyser);
        analyser.connect(audioCtx.destination);

        // Generate noise buffer for synthesis fallback
        const bufferSize = audioCtx.sampleRate * 2.0;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2.0 - 1.0;
        }
        noiseBuffer = buffer;

        // Load acoustic samples
        loadSamples();

        // Start visualizer
        drawVisualizer();
    }

    function updateCompressor() {
        if (!compressor) return;
        const val = parseFloat(inputPunch.value);
        const threshold = -(val / 100) * 50;
        const ratio = 1 + (val / 100) * 11;
        compressor.threshold.setValueAtTime(threshold, audioCtx.currentTime);
        compressor.ratio.setValueAtTime(ratio, audioCtx.currentTime);
        compressor.knee.setValueAtTime(12, audioCtx.currentTime);
        compressor.attack.setValueAtTime(0.015, audioCtx.currentTime);
        compressor.release.setValueAtTime(0.18, audioCtx.currentTime);
    }

    async function loadSamples() {
        console.log('Loading acoustic drum samples...');
        const promises = instruments
            .filter(inst => inst.sampleUrl)
            .map(async (inst) => {
                try {
                    const response = await fetch(inst.sampleUrl);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const arrayBuffer = await response.arrayBuffer();
                    const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
                    buffers[inst.id] = decodedData;
                    console.log(`  Loaded: ${inst.name}`);
                } catch (err) {
                    console.warn(`  Failed: ${inst.name} — using synthesis fallback`, err);
                }
            });
        await Promise.all(promises);
        console.log('Sample loading complete.');
    }

    // --- Sound Synthesis Engines (fallbacks for kit samples + 3 synth-only) ---

    function playKickSynth(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);
        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc.start(time);
        osc.stop(time + 0.35);
    }

    function playSnareSynth(time) {
        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1000, time);
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.7, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.frequency.setValueAtTime(180, time);
        oscGain.gain.setValueAtTime(0.5, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        noiseSource.start(time);
        noiseSource.stop(time + 0.25);
        osc.start(time);
        osc.stop(time + 0.15);
    }

    function playHatSynth(time, open) {
        const source = audioCtx.createBufferSource();
        source.buffer = noiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(open ? 6500 : 7000, time);
        const gain = audioCtx.createGain();
        const decay = open ? 0.35 : 0.05;
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + decay);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        source.start(time);
        source.stop(time + decay + 0.05);
    }

    function playTomSynth(time, freq) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.25);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc.start(time);
        osc.stop(time + 0.35);
    }

    function playClap(time) {
        const play = (delay) => {
            const s = audioCtx.createBufferSource();
            s.buffer = noiseBuffer;
            const f = audioCtx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.setValueAtTime(1200, time + delay);
            const g = audioCtx.createGain();
            const dur = delay < 0.03 ? 0.015 : 0.25;
            g.gain.setValueAtTime(0.6, time + delay);
            g.gain.exponentialRampToValueAtTime(0.01, time + delay + dur);
            s.connect(f); f.connect(g); g.connect(masterGain);
            s.start(time + delay);
            s.stop(time + delay + dur + 0.05);
        };
        play(0); play(0.015); play(0.03);
    }

    function playCowbell(time) {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, time);
        osc1.frequency.setValueAtTime(560, time);
        osc2.frequency.setValueAtTime(845, time);
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        osc1.connect(filter); osc2.connect(filter);
        filter.connect(gain); gain.connect(masterGain);
        osc1.start(time); osc2.start(time);
        osc1.stop(time + 0.2); osc2.stop(time + 0.2);
    }

    function playRimshot(time) {
        const osc = audioCtx.createOscillator();
        const noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer;
        const oscGain = audioCtx.createGain();
        const noiseGain = audioCtx.createGain();
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(2000, time);
        osc.frequency.setValueAtTime(400, time);
        oscGain.gain.setValueAtTime(0.6, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.03);
        noiseGain.gain.setValueAtTime(0.4, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.04);
        osc.connect(oscGain); oscGain.connect(masterGain);
        noise.connect(noiseFilter); noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        osc.start(time); osc.stop(time + 0.05);
        noise.start(time); noise.stop(time + 0.06);
    }

    // Trigger target sound
    function playSound(instId, time) {
        if (muteStates[instId]) return;

        // If acoustic sample is loaded, play it
        if (buffers[instId]) {
            const src = audioCtx.createBufferSource();
            src.buffer = buffers[instId];
            src.connect(masterGain);
            src.start(time);
            return;
        }

        // Synthesis fallbacks
        switch (instId) {
            case 'kick':       playKickSynth(time); break;
            case 'snare':
            case 'snare2':
            case 'snare3':     playSnareSynth(time); break;
            case 'hat_closed': playHatSynth(time, false); break;
            case 'hat_open':   playHatSynth(time, true); break;
            case 'ride':
            case 'ride2':      playHatSynth(time, true); break;
            case 'crash':
            case 'crash2':
            case 'splash':
            case 'splash2':    playHatSynth(time, true); break;
            case 'tom_high':   playTomSynth(time, 200); break;
            case 'tom_mid':    playTomSynth(time, 150); break;
            case 'tom_low':    playTomSynth(time, 110); break;
            case 'clap':       playClap(time); break;
            case 'cowbell':    playCowbell(time); break;
            case 'rimshot':    playRimshot(time); break;
        }
    }

    // --- Sequencer & Clock ---

    function scheduler() {
        while (nextStepTime < audioCtx.currentTime + scheduleAheadTime) {
            scheduleStep(currentStep, nextStepTime);
            advanceStep();
        }
        timerId = setTimeout(scheduler, lookahead);
    }

    function scheduleStep(step, time) {
        instruments.forEach(inst => {
            if (grid[inst.id][step]) {
                playSound(inst.id, time);
            }
        });
        const delayMs = Math.max(0, (time - audioCtx.currentTime) * 1000);
        setTimeout(() => highlightStepUI(step), delayMs);
    }

    function advanceStep() {
        const secondsPerBeat = 60.0 / bpm;
        const stepDuration = 0.25 * secondsPerBeat; // 16th note
        const isOddStep = currentStep % 2 !== 0;
        let currentStepDuration = stepDuration;

        if (swing > 0) {
            const swingOffset = (swing / 100) * (1 / 3) * stepDuration;
            currentStepDuration = isOddStep
                ? stepDuration - swingOffset
                : stepDuration + swingOffset;
        }

        nextStepTime += currentStepDuration;
        currentStep = (currentStep + 1) % TOTAL_STEPS;
    }

    // --- UI ---

    function buildGridUI() {
        gridContainer.innerHTML = '';
        stepsIndicatorContainer.innerHTML = '';

        // Step indicators
        for (let i = 0; i < TOTAL_STEPS; i++) {
            const ind = document.createElement('div');
            ind.classList.add('step-indicator');
            if (i % 4 === 0) ind.classList.add('accent-bar');
            stepsIndicatorContainer.appendChild(ind);
        }

        // Instrument tracks
        instruments.forEach(inst => {
            const track = document.createElement('div');
            track.classList.add('sequencer-track');

            // Label
            const labelArea = document.createElement('div');
            labelArea.classList.add('track-label');
            const instName = document.createElement('span');
            instName.classList.add('instrument-name');
            instName.textContent = inst.name;
            const trackControls = document.createElement('div');
            trackControls.classList.add('track-controls');
            const btnMute = document.createElement('button');
            btnMute.classList.add('btn-mute');
            btnMute.textContent = 'M';
            btnMute.title = 'Mute';
            btnMute.addEventListener('click', () => {
                muteStates[inst.id] = !muteStates[inst.id];
                btnMute.classList.toggle('active', muteStates[inst.id]);
            });
            trackControls.appendChild(btnMute);
            labelArea.appendChild(instName);
            labelArea.appendChild(trackControls);
            track.appendChild(labelArea);

            // Steps
            const stepsWrapper = document.createElement('div');
            stepsWrapper.classList.add('track-steps');
            for (let i = 0; i < TOTAL_STEPS; i++) {
                const node = document.createElement('button');
                node.classList.add('step-node');
                node.setAttribute('aria-label', `${inst.name} step ${i + 1}`);
                node.dataset.instrument = inst.id;
                node.dataset.step = i;
                if (grid[inst.id][i]) node.classList.add('active-step');
                node.addEventListener('click', () => {
                    initAudio();
                    const state = !grid[inst.id][i];
                    grid[inst.id][i] = state;
                    node.classList.toggle('active-step', state);
                    if (!isPlaying && state) playSound(inst.id, audioCtx.currentTime);
                });
                stepsWrapper.appendChild(node);
            }
            track.appendChild(stepsWrapper);
            gridContainer.appendChild(track);
        });
    }

    function highlightStepUI(step) {
        const indicators = stepsIndicatorContainer.children;
        Array.from(indicators).forEach((ind, i) => {
            ind.classList.toggle('active', i === step);
            if (step % 4 === 0 && i === step) {
                ind.classList.add('active-accent');
            } else {
                ind.classList.remove('active-accent');
            }
        });
        const nodes = document.querySelectorAll(`.step-node[data-step="${step}"]`);
        nodes.forEach(node => {
            node.classList.add('playing-highlight');
            setTimeout(() => node.classList.remove('playing-highlight'), 150);
        });
    }

    function loadPreset(presetName) {
        const preset = presets[presetName];
        if (!preset) return;
        bpm = preset.bpm;
        swing = preset.swing;
        instruments.forEach(inst => {
            grid[inst.id] = [...(preset.grid[inst.id] || new Array(TOTAL_STEPS).fill(false))];
        });
        inputBpm.value = bpm;
        valBpm.textContent = bpm;
        inputSwing.value = swing;
        valSwing.textContent = swing;
        buildGridUI();
    }

    // --- Visualizer ---
    function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.fillStyle = 'rgba(15, 18, 27, 0.4)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        canvasCtx.lineWidth = 2.5;
        canvasCtx.strokeStyle = 'rgb(0, 242, 254)';
        canvasCtx.shadowBlur = 8;
        canvasCtx.shadowColor = 'rgba(0, 242, 254, 0.6)';
        canvasCtx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            i === 0 ? canvasCtx.moveTo(x, y) : canvasCtx.lineTo(x, y);
            x += sliceWidth;
        }
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
        canvasCtx.shadowBlur = 0;
    }

    // --- Event Listeners ---

    btnPlay.addEventListener('click', () => {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        if (!isPlaying) {
            isPlaying = true;
            btnPlay.innerHTML = '<span class="icon">⏸</span> Pause';
            btnPlay.classList.add('btn-secondary');
            btnPlay.classList.remove('btn-primary');
            currentStep = 0;
            nextStepTime = audioCtx.currentTime + 0.05;
            scheduler();
        } else {
            isPlaying = false;
            btnPlay.innerHTML = '<span class="icon">▶</span> Play';
            btnPlay.classList.remove('btn-secondary');
            btnPlay.classList.add('btn-primary');
            clearTimeout(timerId);
        }
    });

    btnStop.addEventListener('click', () => {
        isPlaying = false;
        btnPlay.innerHTML = '<span class="icon">▶</span> Play';
        btnPlay.classList.remove('btn-secondary');
        btnPlay.classList.add('btn-primary');
        clearTimeout(timerId);
        currentStep = 0;
        Array.from(stepsIndicatorContainer.children).forEach(ind => {
            ind.classList.remove('active', 'active-accent');
        });
    });

    btnClear.addEventListener('click', () => {
        instruments.forEach(inst => grid[inst.id].fill(false));
        buildGridUI();
    });

    // Slider helper
    const bindSlider = (el, valEl, cb) => {
        const handler = (e) => {
            if (valEl) valEl.textContent = e.target.value;
            cb(parseFloat(e.target.value));
        };
        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
    };

    bindSlider(inputBpm, valBpm, v => { bpm = v; });
    bindSlider(inputSwing, valSwing, v => { swing = v; });
    bindSlider(inputVolume, null, v => {
        if (masterGain) masterGain.gain.setValueAtTime(v / 100, audioCtx.currentTime);
    });
    bindSlider(inputPunch, valPunch, () => updateCompressor());
    bindSlider(inputBass, valBass, v => {
        if (bassFilter) bassFilter.gain.setValueAtTime(v, audioCtx.currentTime);
    });
    bindSlider(inputTreble, valTreble, v => {
        if (trebleFilter) trebleFilter.gain.setValueAtTime(v, audioCtx.currentTime);
    });

    // Tap Tempo
    btnTap.addEventListener('click', () => {
        initAudio();
        tapTimes.push(performance.now());
        if (tapTimes.length > 4) tapTimes.shift();
        if (tapTimes.length > 1) {
            let intervals = [];
            for (let i = 1; i < tapTimes.length; i++) intervals.push(tapTimes[i] - tapTimes[i - 1]);
            const avg = intervals.reduce((a, b) => a + b) / intervals.length;
            const tapped = Math.round(60000 / avg);
            if (tapped >= 60 && tapped <= 220) {
                bpm = tapped;
                inputBpm.value = bpm;
                valBpm.textContent = bpm;
            }
        }
    });

    // Presets
    presetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            presetButtons.forEach(b => b.classList.remove('active'));
            // Deactivate active bank button if preset is selected
            if (activeBank !== null) {
                const activeBtn = document.querySelector(`.btn-bank[data-bank="${activeBank}"]`);
                if (activeBtn) activeBtn.classList.remove('active');
                activeBank = null;
            }
            e.target.classList.add('active');
            loadPreset(e.target.dataset.preset);
        });
    });

    // --- User Save Banks ---
    function initUserBanks() {
        for (let i = 0; i < 6; i++) {
            const rawData = localStorage.getItem(`beatsync_bank_${i}`);
            const btn = document.querySelector(`.btn-bank[data-bank="${i}"]`);
            if (btn) {
                if (rawData) {
                    try {
                        const data = JSON.parse(rawData);
                        btn.innerHTML = `<span class="indicator"></span> ${data.name}`;
                        btn.classList.add('populated');
                    } catch (err) {
                        console.error(err);
                    }
                } else {
                    btn.innerHTML = `<span class="indicator"></span> Bank ${i + 1}`;
                    btn.classList.remove('populated');
                }
            }
        }
    }

    // Silently auto-save the current bank's state to localStorage (no prompt)
    function autoSaveBank(index) {
        if (index === null) return;

        // Deep copy the grid
        const gridCopy = {};
        instruments.forEach(inst => {
            gridCopy[inst.id] = [...grid[inst.id]];
        });

        // Preserve existing name, or use a default
        const rawData = localStorage.getItem(`beatsync_bank_${index}`);
        let existingName = `Bank ${index + 1}`;
        if (rawData) {
            try {
                const parsed = JSON.parse(rawData);
                if (parsed.name) existingName = parsed.name;
            } catch (e) { /* ignore */ }
        }

        const beatData = {
            name: existingName,
            bpm: bpm,
            swing: swing,
            grid: gridCopy
        };

        localStorage.setItem(`beatsync_bank_${index}`, JSON.stringify(beatData));

        // Update button UI
        const btn = document.querySelector(`.btn-bank[data-bank="${index}"]`);
        if (btn) {
            btn.innerHTML = `<span class="indicator"></span> ${existingName}`;
            btn.classList.add('populated');
        }
    }

    function switchToBank(index) {
        // Auto-save the currently active bank before switching
        if (activeBank !== null) {
            autoSaveBank(activeBank);
        }

        activeBank = index;

        // Update button highlights
        presetButtons.forEach(btn => btn.classList.remove('active'));
        bankButtons.forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.btn-bank[data-bank="${index}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Load data from localStorage
        const rawData = localStorage.getItem(`beatsync_bank_${index}`);
        if (rawData) {
            try {
                const data = JSON.parse(rawData);
                bpm = data.bpm || 120;
                swing = data.swing || 0;

                // Restore grid
                instruments.forEach(inst => {
                    grid[inst.id] = [...(data.grid[inst.id] || new Array(TOTAL_STEPS).fill(false))];
                });

                // Update UI sliders
                inputBpm.value = bpm;
                valBpm.textContent = bpm;
                inputSwing.value = swing;
                valSwing.textContent = swing;

                buildGridUI();
            } catch (err) {
                console.error("Error parsing saved beat:", err);
            }
        } else {
            // Empty bank — start fresh
            instruments.forEach(inst => grid[inst.id].fill(false));
            bpm = 120;
            swing = 0;
            inputBpm.value = bpm;
            valBpm.textContent = bpm;
            inputSwing.value = swing;
            valSwing.textContent = swing;
            buildGridUI();
        }
    }

    // Explicit save: prompts for a name and saves the current grid to the active bank
    function saveBank(index) {
        if (index === null) {
            alert("Please click and select a User Bank (Bank 1 - Bank 6) first to save your beat.");
            return;
        }
        
        const activeBtn = document.querySelector(`.btn-bank[data-bank="${index}"]`);
        let currentName = activeBtn ? activeBtn.textContent.trim() : `Bank ${index + 1}`;
        if (currentName.startsWith("Bank ")) {
            currentName = "";
        }

        let name;
        const urlParams = new URLSearchParams(window.location.search);
        const testName = urlParams.get('mockPrompt');
        if (testName !== null) {
            name = testName || `Beat ${index + 1}`;
        } else {
            const prompted = prompt("Enter a name for this custom beat:", currentName || `My Beat ${index + 1}`);
            if (prompted === null) return; // Cancelled
            name = prompted.trim() || `Beat ${index + 1}`;
        }

        // Deep copy the grid so we save a snapshot
        const gridCopy = {};
        instruments.forEach(inst => {
            gridCopy[inst.id] = [...grid[inst.id]];
        });

        const beatData = {
            name: name,
            bpm: bpm,
            swing: swing,
            grid: gridCopy
        };

        localStorage.setItem(`beatsync_bank_${index}`, JSON.stringify(beatData));

        if (activeBtn) {
            activeBtn.innerHTML = `<span class="indicator"></span> ${beatData.name}`;
            activeBtn.classList.add('populated');
        }
    }

    bankButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.bank);
            switchToBank(index);
        });
    });

    btnSaveBeat.addEventListener('click', () => {
        saveBank(activeBank);
    });

    // Boot
    initUserBanks();
    loadPreset('rock');
});
