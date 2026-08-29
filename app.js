// ShallotBeats App Logic — 18 Instruments × 32 Steps
document.addEventListener('DOMContentLoaded', () => {
    // --- Application Metadata ---
    const APP_NAME = 'ShallotBeats';
    const APP_VERSION = '1.3.0';

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
    let metronomeEnabled = false;

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
    const p = (...bits) => {
        const arr = bits.map(b => !!b);
        while (arr.length < TOTAL_STEPS) arr.push(false);
        return arr.slice(0, TOTAL_STEPS);
    };
    const d = (a16) => [...a16, ...a16];
    const z = () => new Array(TOTAL_STEPS).fill(false);

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
    const btnThemePlum = document.getElementById('btn-theme-plum');
    const btnThemeNeon = document.getElementById('btn-theme-neon');

    // Settings Modal Elements
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnDoneSettings = document.getElementById('btn-done-settings');
    const settingsModal = document.getElementById('settings-modal');
    const settingsAppVersion = document.getElementById('settings-app-version');
    const footerAppVersion = document.getElementById('footer-app-version');
    const toggleMetronome = document.getElementById('toggle-metronome');
    const btnResetBanks = document.getElementById('btn-reset-banks');
    const themeCards = document.querySelectorAll('.theme-card-option');

    // Initialize Version Display
    if (settingsAppVersion) settingsAppVersion.textContent = `v${APP_VERSION}`;
    if (footerAppVersion) footerAppVersion.textContent = `${APP_NAME} v${APP_VERSION}`;

    // --- Theme Management ---
    let currentTheme = localStorage.getItem('shallotbeats_theme') || localStorage.getItem('beatsync_theme') || 'plum';

    function applyTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('shallotbeats_theme', theme);

        if (btnThemePlum && btnThemeNeon) {
            btnThemePlum.classList.toggle('active', theme === 'plum');
            btnThemeNeon.classList.toggle('active', theme === 'neon');
        }

        // Synchronize Settings Modal Radio Cards
        themeCards.forEach(card => {
            const choice = card.dataset.themeChoice;
            const radio = card.querySelector('input[type="radio"]');
            const isActive = choice === theme;
            card.classList.toggle('active', isActive);
            if (radio) radio.checked = isActive;
        });
    }

    if (btnThemePlum) btnThemePlum.addEventListener('click', () => applyTheme('plum'));
    if (btnThemeNeon) btnThemeNeon.addEventListener('click', () => applyTheme('neon'));

    themeCards.forEach(card => {
        card.addEventListener('click', (e) => {
            const choice = card.dataset.themeChoice;
            if (choice) applyTheme(choice);
        });
    });

    applyTheme(currentTheme);

    // --- Settings Modal Handlers ---
    function openSettings() {
        if (settingsModal) settingsModal.classList.remove('hidden');
    }

    function closeSettings() {
        if (settingsModal) settingsModal.classList.add('hidden');
    }

    if (btnOpenSettings) btnOpenSettings.addEventListener('click', openSettings);
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettings);
    if (btnDoneSettings) btnDoneSettings.addEventListener('click', closeSettings);

    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeSettings();
        });
    }

    // Metronome Toggle
    if (toggleMetronome) {
        toggleMetronome.addEventListener('change', (e) => {
            metronomeEnabled = e.target.checked;
        });
    }

    // Reset Banks Handler
    if (btnResetBanks) {
        btnResetBanks.addEventListener('click', () => {
            if (confirm("Are you sure you want to reset all 6 User Banks? This will erase any custom saved patterns.")) {
                for (let i = 0; i < 6; i++) {
                    localStorage.removeItem(`beatsync_bank_${i}`);
                }
                initUserBanks();
                alert("All user banks have been reset.");
            }
        });
    }

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
        // Body (tone)
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, time);
        osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);
        oscGain.gain.setValueAtTime(0.7, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.2);

        // Snap (noise)
        if (!noiseBuffer) return;
        const noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, time);
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.8, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start(time);
        noise.stop(time + 0.25);
    }

    function playHatSynth(time, isOpen = false) {
        if (!noiseBuffer) return;
        const duration = isOpen ? 0.35 : 0.05;
        const noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(7000, time);
        filter.Q.setValueAtTime(3.0, time);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(time);
        noise.stop(time + duration + 0.05);
    }

    function playTomSynth(time, baseFreq = 150) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * 1.5, time);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, time + 0.2);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.3);
    }

    function playClap(time) {
        if (!noiseBuffer) return;
        const bursts = [0, 0.011, 0.024];
        bursts.forEach((offset, idx) => {
            const noise = audioCtx.createBufferSource();
            noise.buffer = noiseBuffer;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, time + offset);
            filter.Q.setValueAtTime(2.0, time + offset);
            const gain = audioCtx.createGain();
            const dur = (idx === bursts.length - 1) ? 0.18 : 0.02;
            gain.gain.setValueAtTime(0.6, time + offset);
            gain.gain.exponentialRampToValueAtTime(0.01, time + offset + dur);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            noise.start(time + offset);
            noise.stop(time + offset + dur + 0.02);
        });
    }

    function playCowbell(time) {
        const f1 = 800, f2 = 540;
        [f1, f2].forEach(freq => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, time);
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(freq, time);
            filter.Q.setValueAtTime(8.0, time);
            gain.gain.setValueAtTime(0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.25);
        });
    }

    function playRimshot(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, time);
        osc.frequency.exponentialRampToValueAtTime(120, time + 0.03);
        gain.gain.setValueAtTime(0.7, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.04);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.06);

        if (!noiseBuffer) return;
        const noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2500, time);
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.5, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.03);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start(time);
        noise.stop(time + 0.05);
    }

    function playMetronomeClick(time, isDownbeat) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isDownbeat ? 1400 : 900, time);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.04);
    }

    // --- Master Sound Player ---
    function playSound(instId, time) {
        if (!audioCtx || muteStates[instId]) return;

        // Try playing acoustic sample first
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
        // Play scheduled drum hits
        instruments.forEach(inst => {
            if (grid[inst.id][step]) {
                playSound(inst.id, time);
            }
        });

        // Metronome quarter note click (every 4 steps)
        if (metronomeEnabled && step % 4 === 0) {
            playMetronomeClick(time, step === 0);
        }

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

            // Steps row
            const stepsWrapper = document.createElement('div');
            stepsWrapper.classList.add('track-steps');

            for (let step = 0; step < TOTAL_STEPS; step++) {
                const node = document.createElement('div');
                node.classList.add('step-node');
                node.dataset.inst = inst.id;
                node.dataset.step = step;

                if (grid[inst.id][step]) {
                    node.classList.add('active-step');
                }

                node.addEventListener('click', () => {
                    grid[inst.id][step] = !grid[inst.id][step];
                    node.classList.toggle('active-step', grid[inst.id][step]);
                    if (grid[inst.id][step]) {
                        initAudio();
                        if (audioCtx.state === 'suspended') audioCtx.resume();
                        playSound(inst.id, audioCtx.currentTime);
                    }
                    if (activeBank !== null) {
                        autoSaveBank(activeBank);
                    }
                });

                stepsWrapper.appendChild(node);
            }

            track.appendChild(stepsWrapper);
            gridContainer.appendChild(track);
        });
    }

    function highlightStepUI(stepIndex) {
        // Indicators
        const indicators = stepsIndicatorContainer.children;
        for (let i = 0; i < indicators.length; i++) {
            indicators[i].classList.remove('active', 'active-accent');
        }
        if (indicators[stepIndex]) {
            if (stepIndex % 4 === 0) {
                indicators[stepIndex].classList.add('active-accent');
            } else {
                indicators[stepIndex].classList.add('active');
            }
        }

        // Active node flash
        const prevStep = (stepIndex - 1 + TOTAL_STEPS) % TOTAL_STEPS;
        const prevNodes = gridContainer.querySelectorAll(`.step-node[data-step="${prevStep}"]`);
        prevNodes.forEach(node => node.classList.remove('playing-highlight'));

        const currentNodes = gridContainer.querySelectorAll(`.step-node[data-step="${stepIndex}"]`);
        currentNodes.forEach(node => {
            const instId = node.dataset.inst;
            if (grid[instId][stepIndex]) {
                node.classList.add('playing-highlight');
            }
        });
    }

    function loadPreset(name) {
        const preset = presets[name];
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
        if (!analyser) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        if (currentTheme === 'plum') {
            canvasCtx.fillStyle = 'rgba(24, 13, 33, 0.45)';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            canvasCtx.lineWidth = 2.5;
            canvasCtx.strokeStyle = '#d48244';
            canvasCtx.shadowBlur = 10;
            canvasCtx.shadowColor = 'rgba(243, 156, 18, 0.8)';
        } else {
            canvasCtx.fillStyle = 'rgba(15, 18, 27, 0.45)';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            canvasCtx.lineWidth = 2.5;
            canvasCtx.strokeStyle = 'rgb(0, 242, 254)';
            canvasCtx.shadowBlur = 8;
            canvasCtx.shadowColor = 'rgba(0, 242, 254, 0.6)';
        }

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

    // --- Playback Controls ---

    function togglePlayPause() {
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
    }

    function stopPlayback() {
        isPlaying = false;
        btnPlay.innerHTML = '<span class="icon">▶</span> Play';
        btnPlay.classList.remove('btn-secondary');
        btnPlay.classList.add('btn-primary');
        clearTimeout(timerId);
        currentStep = 0;
        Array.from(stepsIndicatorContainer.children).forEach(ind => {
            ind.classList.remove('active', 'active-accent');
        });
    }

    btnPlay.addEventListener('click', togglePlayPause);
    btnStop.addEventListener('click', stopPlayback);

    btnClear.addEventListener('click', () => {
        instruments.forEach(inst => grid[inst.id].fill(false));
        buildGridUI();
    });

    // Slider helpers
    const bindSlider = (el, valEl, cb) => {
        const handler = (e) => {
            const val = e.target.value;
            valEl.textContent = val;
            cb(val);
        };
        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
    };

    bindSlider(inputBpm, valBpm, (v) => { bpm = parseInt(v); });
    bindSlider(inputSwing, valSwing, (v) => { swing = parseInt(v); });
    bindSlider(inputVolume, { set textContent(v) {} }, (v) => {
        if (masterGain && audioCtx) {
            masterGain.gain.setValueAtTime(v / 100, audioCtx.currentTime);
        }
    });
    bindSlider(inputPunch, valPunch, () => updateCompressor());
    bindSlider(inputBass, valBass, (v) => {
        if (bassFilter && audioCtx) {
            bassFilter.gain.setValueAtTime(parseFloat(v), audioCtx.currentTime);
        }
    });
    bindSlider(inputTreble, valTreble, (v) => {
        if (trebleFilter && audioCtx) {
            trebleFilter.gain.setValueAtTime(parseFloat(v), audioCtx.currentTime);
        }
    });

    // Tap Tempo
    function handleTapTempo() {
        const now = Date.now();
        tapTimes.push(now);
        if (tapTimes.length > 4) tapTimes.shift();

        if (tapTimes.length > 1) {
            let intervals = [];
            for (let i = 1; i < tapTimes.length; i++) {
                intervals.push(tapTimes[i] - tapTimes[i - 1]);
            }
            // Check for timeout (> 2000ms reset)
            if (intervals[intervals.length - 1] > 2000) {
                tapTimes = [now];
                return;
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const calculatedBpm = Math.round(60000 / avgInterval);
            if (calculatedBpm >= 60 && calculatedBpm <= 220) {
                bpm = calculatedBpm;
                inputBpm.value = bpm;
                valBpm.textContent = bpm;
            }
        }
    }
    btnTap.addEventListener('click', handleTapTempo);

    // Preset Buttons
    presetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            presetButtons.forEach(b => b.classList.remove('active'));
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

    function autoSaveBank(index) {
        if (index === null) return;
        const gridCopy = {};
        instruments.forEach(inst => {
            gridCopy[inst.id] = [...grid[inst.id]];
        });

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
        const activeBtn = document.querySelector(`.btn-bank[data-bank="${index}"]`);
        if (activeBtn) {
            activeBtn.innerHTML = `<span class="indicator"></span> ${beatData.name}`;
            activeBtn.classList.add('populated');
        }
    }

    function switchToBank(index) {
        if (activeBank !== null && activeBank !== index) {
            autoSaveBank(activeBank);
        }

        activeBank = index;

        bankButtons.forEach(b => b.classList.remove('active'));
        presetButtons.forEach(b => b.classList.remove('active'));

        const targetBtn = document.querySelector(`.btn-bank[data-bank="${index}"]`);
        if (targetBtn) targetBtn.classList.add('active');

        const rawData = localStorage.getItem(`beatsync_bank_${index}`);
        if (rawData) {
            try {
                const data = JSON.parse(rawData);
                bpm = data.bpm || 120;
                swing = data.swing || 0;
                inputBpm.value = bpm;
                valBpm.textContent = bpm;
                inputSwing.value = swing;
                valSwing.textContent = swing;

                instruments.forEach(inst => {
                    grid[inst.id] = data.grid[inst.id] ? [...data.grid[inst.id]] : new Array(TOTAL_STEPS).fill(false);
                });

                buildGridUI();
            } catch (e) {
                console.error("Failed to parse bank data:", e);
            }
        } else {
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
            if (prompted === null) return;
            name = prompted.trim() || `Beat ${index + 1}`;
        }

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

    // --- Global Keyboard Shortcuts ---
    window.addEventListener('keydown', (e) => {
        // If typing in an input or modal prompt, ignore hotkeys
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            togglePlayPause();
        } else if (e.key === 's' || e.key === 'S') {
            stopPlayback();
        } else if (e.key === 't' || e.key === 'T') {
            handleTapTempo();
        } else if (e.key === 'c' || e.key === 'C') {
            instruments.forEach(inst => grid[inst.id].fill(false));
            buildGridUI();
        } else if (e.key === 'Escape') {
            closeSettings();
        } else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
            const presetKeys = ['rock', 'blues', 'funk', 'hiphop', 'metal', 'jazz'];
            const idx = parseInt(e.key) - 1;
            if (presetKeys[idx]) {
                presetButtons.forEach(b => b.classList.remove('active'));
                const targetBtn = document.querySelector(`.btn-preset[data-preset="${presetKeys[idx]}"]`);
                if (targetBtn) targetBtn.classList.add('active');
                if (activeBank !== null) {
                    const activeBtn = document.querySelector(`.btn-bank[data-bank="${activeBank}"]`);
                    if (activeBtn) activeBtn.classList.remove('active');
                    activeBank = null;
                }
                loadPreset(presetKeys[idx]);
            }
        }
    });

    // Boot
    initUserBanks();
    loadPreset('rock');
});
