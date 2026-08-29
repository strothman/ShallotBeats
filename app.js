// ShallotBeats Pro App Logic — 18 Instruments × 32 Steps × Pro Sound Engine
document.addEventListener('DOMContentLoaded', () => {
    // --- Application Metadata ---
    const APP_NAME = 'ShallotBeats';
    const APP_VERSION = '2.0.0';

    // --- State and Config ---
    let audioCtx = null;
    let masterGain = null;
    let analyser = null;
    let compressor = null;
    let bassFilter = null;
    let trebleFilter = null;
    let reverbNode = null;
    let reverbGain = null;
    let dryGain = null;

    let isPlaying = false;
    let bpm = 120;
    let swing = 0; // 0 to 80
    let humanize = 15; // 0 to 100
    let reverbAmount = 25; // 0 to 100
    let activeBank = null; // 0 to 5
    let currentPattern = 'A'; // 'A' (Verse) or 'B' (Chorus)

    let metronomeEnabled = false;
    let countInEnabled = false;
    let isCountingIn = false;
    let countInBeat = 0;

    let fillPending = false;
    let autoFillInterval = 0; // 0 = off, 4 = every 4 loops, 8 = every 8 loops
    let loopCount = 0;

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
    // General MIDI drum map + QWERTY pad shortcuts
    const instruments = [
        { id: 'kick',       name: 'Kick Drum',    short: 'Kick',    key: 'Q', midi: 36, sampleUrl: 'samples/kick.wav' },
        { id: 'snare',      name: 'Acoustic Snare', short: 'Snare', key: 'W', midi: 38, sampleUrl: 'samples/snare.wav' },
        { id: 'snare2',     name: 'Punch Snare',  short: 'Snare 2', key: 'E', midi: 40, sampleUrl: 'samples/snare2.wav' },
        { id: 'snare3',     name: 'Cross Stick',  short: 'Stick',   key: 'R', midi: 37, sampleUrl: 'samples/snare3.wav' },
        { id: 'hat_closed', name: 'Closed Hi-Hat', short: 'Cl Hat', key: 'T', midi: 42, sampleUrl: 'samples/hat_closed.wav' },
        { id: 'hat_open',   name: 'Open Hi-Hat',  short: 'Op Hat',  key: 'Y', midi: 46, sampleUrl: 'samples/hat_open.wav' },
        { id: 'ride',       name: 'Ride Cymbal',  short: 'Ride',    key: 'U', midi: 51, sampleUrl: 'samples/ride.wav' },
        { id: 'ride2',      name: 'Ride Bell',    short: 'R Bell',  key: 'I', midi: 53, sampleUrl: 'samples/ride2.wav' },
        { id: 'crash',      name: 'Crash Cymbal', short: 'Crash',   key: 'O', midi: 49, sampleUrl: 'samples/crash.wav' },
        { id: 'crash2',     name: 'Crash 2',      short: 'Crash 2', key: 'P', midi: 57, sampleUrl: 'samples/crash2.wav' },
        { id: 'splash',     name: 'Splash Cymbal', short: 'Splash', key: 'A', midi: 55, sampleUrl: 'samples/splash.wav' },
        { id: 'splash2',    name: 'Splash 2',     short: 'Splash 2', key: 'S', midi: 52, sampleUrl: 'samples/splash2.wav' },
        { id: 'tom_high',   name: 'High Tom',     short: 'H Tom',   key: 'D', midi: 50, sampleUrl: 'samples/tom_low.wav' },
        { id: 'tom_mid',    name: 'Mid Tom',      short: 'M Tom',   key: 'F', midi: 48, sampleUrl: 'samples/tom_mid.wav' },
        { id: 'tom_low',    name: 'Low Tom',      short: 'L Tom',   key: 'G', midi: 45, sampleUrl: 'samples/tom_high.wav' },
        { id: 'clap',       name: 'Hand Clap',    short: 'Clap',    key: 'H', midi: 39, synth: true },
        { id: 'cowbell',    name: '808 Cowbell',  short: 'Cowbell', key: 'J', midi: 56, synth: true },
        { id: 'rimshot',    name: 'Snappy Rim',   short: 'Rim',     key: 'K', midi: 75, synth: true }
    ];

    // Audio buffers cache
    let buffers = {};

    // Dual-Pattern Grid States: 0 = off, 1 = normal, 2 = accent, 3 = ghost
    let gridA = {};
    let gridB = {};
    instruments.forEach(inst => {
        gridA[inst.id] = new Array(TOTAL_STEPS).fill(0);
        gridB[inst.id] = new Array(TOTAL_STEPS).fill(0);
    });

    // Helper getter for active grid
    const getActiveGrid = () => currentPattern === 'A' ? gridA : gridB;

    // Mute & Solo states
    let muteStates = {};
    let soloStates = {};
    instruments.forEach(inst => {
        muteStates[inst.id] = false;
        soloStates[inst.id] = false;
    });

    // Preset notation helpers
    const p = (...bits) => {
        const arr = bits.map(b => b ? 1 : 0);
        while (arr.length < TOTAL_STEPS) arr.push(0);
        return arr.slice(0, TOTAL_STEPS);
    };
    const d = (a16) => [...a16, ...a16];
    const z = () => new Array(TOTAL_STEPS).fill(0);

    // --- 12 Pro Presets ---
    const presets = {
        rock: {
            bpm: 120, swing: 0,
            gridA: {
                kick:       d([2,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                snare2:     z(), snare3: z(),
                hat_closed: d([2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1]),
                hat_open:   d([0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1]),
                ride: z(), ride2: z(), crash: p(2), crash2: z(), splash: z(), splash2: z(),
                tom_high: z(), tom_mid: z(),
                tom_low:    d([0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0]),
                clap: z(), cowbell: z(), rimshot: z()
            },
            gridB: {
                kick:       d([2,0,1,0,2,0,0,0,2,0,1,0,2,0,1,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                hat_closed: z(), hat_open: d([0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0]),
                ride:       d([2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1]),
                crash:      p(2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0),
                snare2: z(), snare3: z(), ride2: z(), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            }
        },
        blues: {
            bpm: 96, swing: 50,
            gridA: {
                kick:       d([2,0,0,0,0,0,1,0,2,0,0,0,0,0,1,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                hat_closed: d([2,0,1,0,2,0,1,0,2,0,1,0,2,0,1,0]),
                hat_open:   d([0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1]),
                snare2: z(), snare3: z(), ride: z(), ride2: z(), crash: z(), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            },
            gridB: {
                kick:       d([2,0,0,0,1,0,1,0,2,0,0,0,1,0,1,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                ride:       d([2,0,1,0,2,0,1,0,2,0,1,0,2,0,1,0]),
                ride2:      d([0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1]),
                crash:      p(2),
                snare2: z(), snare3: z(), hat_closed: z(), hat_open: z(), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            }
        },
        grunge: {
            bpm: 112, swing: 5,
            gridA: {
                kick:       d([2,0,1,0,0,0,2,0,0,0,1,0,0,0,2,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,1]),
                hat_closed: d([2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1]),
                hat_open:   d([0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0]),
                crash:      p(2),
                snare2: z(), snare3: z(), ride: z(), ride2: z(), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            },
            gridB: {
                kick:       d([2,0,2,0,0,0,2,0,2,0,2,0,0,0,2,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                crash:      d([2,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0]),
                crash2:     d([0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0]),
                tom_low:    d([0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]),
                snare2: z(), snare3: z(), hat_closed: z(), hat_open: z(), ride: z(), ride2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), clap: z(), cowbell: z(), rimshot: z()
            }
        },
        punk: {
            bpm: 180, swing: 0,
            gridA: {
                kick:       d([2,0,0,0,2,0,1,0,2,0,0,0,2,0,1,0]),
                snare:      d([0,0,2,0,0,0,2,0,0,0,2,0,0,0,2,0]),
                hat_closed: d([2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1]),
                crash:      p(2),
                snare2: z(), snare3: z(), hat_open: z(), ride: z(), ride2: z(), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            },
            gridB: {
                kick:       d([2,0,1,0,2,0,1,0,2,0,1,0,2,0,1,0]),
                snare:      d([0,0,2,0,0,0,2,0,0,0,2,0,0,0,2,0]),
                ride:       d([2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1]),
                crash:      p(2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0),
                snare2: z(), snare3: z(), hat_closed: z(), hat_open: z(), ride2: z(), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            }
        },
        funk: {
            bpm: 105, swing: 15,
            gridA: {
                kick:       d([2,0,0,0,0,0,0,1,0,2,1,0,0,0,0,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,1,2,0,1,0]),
                hat_closed: d([2,1,0,1,2,1,2,0,2,1,0,1,2,1,0,1]),
                hat_open:   d([0,0,1,0,0,0,0,1,0,0,1,0,0,0,1,0]),
                clap:       d([0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0]),
                snare2: z(), snare3: z(), ride: z(), ride2: z(), crash: z(), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), cowbell: z(), rimshot: z()
            },
            gridB: {
                kick:       d([2,0,0,1,0,0,1,0,0,2,0,1,0,1,0,0]),
                snare:      d([0,0,0,0,2,0,0,1,0,0,2,0,0,0,2,0]),
                hat_closed: z(),
                ride:       d([2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1]),
                cowbell:    d([0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0]),
                snare2: z(), snare3: z(), hat_open: z(), ride2: z(), crash: p(2), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), rimshot: z()
            }
        },
        hiphop: {
            bpm: 90, swing: 20,
            gridA: {
                kick:       d([2,0,0,0,0,0,1,0,0,0,2,0,0,1,0,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,1,0,0,2,0,0,0]),
                hat_closed: d([2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,1]),
                hat_open:   d([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2]),
                clap:       d([0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0]),
                snare2: z(), snare3: z(), ride: z(), ride2: z(), crash: z(), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), cowbell: z(), rimshot: z()
            },
            gridB: {
                kick:       d([2,0,1,0,0,0,2,0,0,0,2,0,1,0,0,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,1,0]),
                hat_closed: d([2,2,1,2,2,1,2,2,1,2,2,1,2,2,1,2]),
                hat_open:   d([0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1]),
                snare2: z(), snare3: z(), ride: z(), ride2: z(), crash: p(2), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            }
        },
        metal: {
            bpm: 160, swing: 0,
            gridA: {
                kick:       d([2,2,0,0,2,2,0,0,2,2,0,0,2,2,0,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                hat_closed: d([2,0,1,0,2,0,1,0,2,0,1,0,2,0,1,0]),
                crash:      p(2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0),
                snare2: z(), snare3: z(), hat_open: z(), ride: z(), ride2: z(), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            },
            gridB: {
                kick:       d([2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                ride:       d([2,0,1,0,2,0,1,0,2,0,1,0,2,0,1,0]),
                crash2:     d([2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0]),
                snare2: z(), snare3: z(), hat_closed: z(), hat_open: z(), ride2: z(), crash: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            }
        },
        reggae: {
            bpm: 80, swing: 30,
            gridA: {
                kick:       d([0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0]),
                snare3:     d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                hat_closed: d([0,0,2,0,0,0,2,0,0,0,2,0,0,0,2,0]),
                hat_open:   d([0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1]),
                rimshot:    d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                snare: z(), snare2: z(), kick2: z(), ride: z(), ride2: z(), crash: p(2), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z()
            },
            gridB: {
                kick:       d([0,0,0,0,0,0,0,0,2,0,0,0,0,0,1,0]),
                snare:      d([0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0]),
                hat_closed: d([0,0,2,1,0,0,2,1,0,0,2,1,0,0,2,1]),
                splash:     d([0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0]),
                snare2: z(), snare3: z(), hat_open: z(), ride: z(), ride2: z(), crash: z(), crash2: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            }
        },
        country: {
            bpm: 110, swing: 35,
            gridA: {
                kick:       d([2,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                snare3:     d([1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1]),
                hat_closed: d([2,0,1,0,2,0,1,0,2,0,1,0,2,0,1,0]),
                snare2: z(), hat_open: z(), ride: z(), ride2: z(), crash: p(2), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            },
            gridB: {
                kick:       d([2,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                ride:       d([2,0,1,0,2,0,1,0,2,0,1,0,2,0,1,0]),
                ride2:      d([0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1]),
                snare2: z(), snare3: z(), hat_closed: z(), hat_open: z(), crash: p(2), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            }
        },
        motown: {
            bpm: 125, swing: 10,
            gridA: {
                kick:       d([2,0,0,0,1,0,0,1,2,0,0,0,1,0,0,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                hat_closed: d([2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1]),
                clap:       d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                snare2: z(), snare3: z(), hat_open: z(), ride: z(), ride2: z(), crash: p(2), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), cowbell: z(), rimshot: z()
            },
            gridB: {
                kick:       d([2,0,0,1,0,0,2,0,2,0,0,1,0,0,2,0]),
                snare:      d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                hat_open:   d([0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0]),
                ride:       d([2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1]),
                clap:       d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                snare2: z(), snare3: z(), hat_closed: z(), ride2: z(), crash: p(2), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), cowbell: z(), rimshot: z()
            }
        },
        bossa: {
            bpm: 130, swing: 0,
            gridA: {
                kick:       d([2,0,0,1,0,0,2,0,0,0,2,0,0,1,0,0]),
                snare3:     d([2,0,0,2,0,0,2,0,0,2,0,0,2,0,2,0]),
                hat_closed: d([2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1]),
                hat_open:   d([0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1]),
                snare: z(), snare2: z(), ride: z(), ride2: z(), crash: z(), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            },
            gridB: {
                kick:       d([2,0,0,1,0,0,2,0,0,0,2,0,0,1,0,0]),
                snare3:     d([2,0,0,2,0,0,2,0,0,2,0,0,2,0,2,0]),
                ride:       d([2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1]),
                splash:     p(1),
                snare: z(), snare2: z(), hat_closed: z(), hat_open: z(), ride2: z(), crash: z(), crash2: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            }
        },
        jazz: {
            bpm: 135, swing: 60,
            gridA: {
                kick:       p(2,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1,0,0,0,0,0,0,0),
                snare3:     p(0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0),
                ride:       p(2,0,1,1,2,0,1,1,2,0,1,1,2,0,1,1,2,0,1,1,2,0,1,1,2,0,1,1,2,0,1,1),
                hat_closed: d([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
                snare: z(), snare2: z(), hat_open: z(), ride2: z(), crash: z(), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            },
            gridB: {
                kick:       p(2,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0),
                snare:      p(0,0,0,0,2,0,0,0,0,0,1,0,2,0,0,1,0,0,0,0,2,0,0,0,0,0,1,0,2,0,0,1),
                ride:       p(2,0,1,1,2,0,1,1,2,0,1,1,2,0,1,1,2,0,1,1,2,0,1,1,2,0,1,1,2,0,1,1),
                ride2:      d([0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0]),
                snare2: z(), snare3: z(), hat_closed: z(), hat_open: z(), crash: p(2), crash2: z(), splash: z(), splash2: z(), tom_high: z(), tom_mid: z(), tom_low: z(), clap: z(), cowbell: z(), rimshot: z()
            }
        }
    };

    // --- DOM Elements ---
    const gridContainer = document.getElementById('sequencer-grid-container');
    const stepsIndicatorContainer = document.getElementById('steps-indicator-container');
    const padsGridContainer = document.getElementById('pads-grid-container');
    const btnPlay = document.getElementById('btn-play');
    const btnStop = document.getElementById('btn-stop');
    const btnClear = document.getElementById('btn-clear');
    const btnTap = document.getElementById('btn-tap');
    const btnCountIn = document.getElementById('btn-countin');
    const btnFill = document.getElementById('btn-fill');
    const countInBanner = document.getElementById('countin-banner');
    const countInStepSpan = document.getElementById('countin-step');
    const patternButtons = document.querySelectorAll('.btn-pattern');
    const currentPatternTag = document.getElementById('current-pattern-tag');

    const inputBpm = document.getElementById('input-bpm');
    const valBpm = document.getElementById('val-bpm');
    const inputSwing = document.getElementById('input-swing');
    const valSwing = document.getElementById('val-swing');
    const inputHumanize = document.getElementById('input-humanize');
    const valHumanize = document.getElementById('val-humanize');
    const inputVolume = document.getElementById('input-volume');
    const inputReverb = document.getElementById('input-reverb');
    const valReverb = document.getElementById('val-reverb');
    const inputPunch = document.getElementById('input-punch');
    const valPunch = document.getElementById('val-punch');
    const inputBass = document.getElementById('input-bass');
    const valBass = document.getElementById('val-bass');
    const inputTreble = document.getElementById('input-treble');
    const valTreble = document.getElementById('val-treble');

    const presetButtons = document.querySelectorAll('.btn-preset');
    const bankButtons = document.querySelectorAll('.btn-bank');
    const btnSaveBeat = document.getElementById('btn-save-beat');
    const btnExportWav = document.getElementById('btn-export-wav');
    const btnExportMidi = document.getElementById('btn-export-midi');
    const btnToolDouble = document.getElementById('btn-tool-double');
    const btnToolCopyPattern = document.getElementById('btn-tool-copy-pattern');

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
    const midiStatusText = document.getElementById('midi-status-text');
    const selectAutoFill = document.getElementById('select-autofill');
    const toggleMetronome = document.getElementById('toggle-metronome');
    const btnResetBanks = document.getElementById('btn-reset-banks');
    const themeCards = document.querySelectorAll('.theme-card-option');

    // Initialize Version Display
    if (settingsAppVersion) settingsAppVersion.textContent = `v${APP_VERSION} PRO`;
    if (footerAppVersion) footerAppVersion.textContent = `${APP_NAME} v${APP_VERSION} Pro`;

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
        card.addEventListener('click', () => {
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

    if (toggleMetronome) {
        toggleMetronome.addEventListener('change', (e) => {
            metronomeEnabled = e.target.checked;
        });
    }

    if (selectAutoFill) {
        selectAutoFill.addEventListener('change', (e) => {
            autoFillInterval = parseInt(e.target.value);
        });
    }

    if (btnResetBanks) {
        btnResetBanks.addEventListener('click', () => {
            if (confirm("Are you sure you want to reset all 6 User Banks?")) {
                for (let i = 0; i < 6; i++) {
                    localStorage.removeItem(`shallotbeats_bank_${i}`);
                    localStorage.removeItem(`beatsync_bank_${i}`);
                }
                initUserBanks();
                alert("All user banks have been reset.");
            }
        });
    }

    // --- Synthetic Room Reverb Generator ---
    function createReverbBuffer(ctx, duration = 1.6, decay = 2.2) {
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * duration;
        const impulse = ctx.createBuffer(2, length, sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const n = i / length;
            const factor = Math.exp(-n * decay);
            left[i] = (Math.random() * 2 - 1) * factor;
            right[i] = (Math.random() * 2 - 1) * factor;
        }
        return impulse;
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

        // Dynamics Compressor (Punch)
        compressor = audioCtx.createDynamicsCompressor();
        updateCompressor();

        // Room Reverb & Dry/Wet Split
        reverbNode = audioCtx.createConvolver();
        reverbNode.buffer = createReverbBuffer(audioCtx, 1.8, 2.5);

        reverbGain = audioCtx.createGain();
        dryGain = audioCtx.createGain();
        updateReverbGain();

        // Analyser node for the visualizer
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        // Signal Chain:
        // Bus -> Bass -> Treble -> Comp -> Dry & Reverb -> MasterGain -> Analyser -> Output
        bassFilter.connect(trebleFilter);
        trebleFilter.connect(compressor);

        compressor.connect(dryGain);
        compressor.connect(reverbNode);
        reverbNode.connect(reverbGain);

        dryGain.connect(masterGain);
        reverbGain.connect(masterGain);

        masterGain.connect(analyser);
        analyser.connect(audioCtx.destination);

        // Noise buffer for synth fallback
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

        // Initialize Web MIDI
        initWebMidi();
    }

    function updateCompressor() {
        if (!compressor || !audioCtx) return;
        const val = parseFloat(inputPunch.value);
        const threshold = -(val / 100) * 50;
        const ratio = 1 + (val / 100) * 11;
        compressor.threshold.setValueAtTime(threshold, audioCtx.currentTime);
        compressor.ratio.setValueAtTime(ratio, audioCtx.currentTime);
        compressor.knee.setValueAtTime(12, audioCtx.currentTime);
        compressor.attack.setValueAtTime(0.015, audioCtx.currentTime);
        compressor.release.setValueAtTime(0.18, audioCtx.currentTime);
    }

    function updateReverbGain() {
        if (!reverbGain || !dryGain || !audioCtx) return;
        const wetVal = reverbAmount / 100.0;
        reverbGain.gain.setValueAtTime(wetVal * 0.7, audioCtx.currentTime);
        dryGain.gain.setValueAtTime(1.0 - (wetVal * 0.25), audioCtx.currentTime);
    }

    async function loadSamples() {
        const promises = instruments
            .filter(inst => inst.sampleUrl)
            .map(async (inst) => {
                try {
                    const response = await fetch(inst.sampleUrl);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const arrayBuffer = await response.arrayBuffer();
                    const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
                    buffers[inst.id] = decodedData;
                } catch (err) {
                    console.warn(`Sample failed for ${inst.name}, using synthesis engine.`, err);
                }
            });
        await Promise.all(promises);
    }

    // --- Sound Synthesis Engines with Velocity Scaling ---

    function playKickSynth(time, gainNode) {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.connect(g);
        g.connect(gainNode);
        osc.frequency.setValueAtTime(160, time);
        osc.frequency.exponentialRampToValueAtTime(38, time + 0.16);
        g.gain.setValueAtTime(1.0, time);
        g.gain.exponentialRampToValueAtTime(0.01, time + 0.32);
        osc.start(time);
        osc.stop(time + 0.35);
    }

    function playSnareSynth(time, gainNode) {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, time);
        osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);
        oscGain.gain.setValueAtTime(0.7, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        osc.connect(oscGain);
        oscGain.connect(gainNode);
        osc.start(time);
        osc.stop(time + 0.2);

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
        noiseGain.connect(gainNode);
        noise.start(time);
        noise.stop(time + 0.25);
    }

    function playHatSynth(time, isOpen, gainNode) {
        if (!noiseBuffer) return;
        const duration = isOpen ? 0.35 : 0.05;
        const noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(7000, time);
        filter.Q.setValueAtTime(3.0, time);
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.6, time);
        g.gain.exponentialRampToValueAtTime(0.01, time + duration);
        noise.connect(filter);
        filter.connect(g);
        g.connect(gainNode);
        noise.start(time);
        noise.stop(time + duration + 0.05);
    }

    function playTomSynth(time, baseFreq, gainNode) {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * 1.5, time);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, time + 0.2);
        g.gain.setValueAtTime(0.8, time);
        g.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
        osc.connect(g);
        g.connect(gainNode);
        osc.start(time);
        osc.stop(time + 0.3);
    }

    function playClap(time, gainNode) {
        if (!noiseBuffer) return;
        const bursts = [0, 0.011, 0.024];
        bursts.forEach((offset, idx) => {
            const noise = audioCtx.createBufferSource();
            noise.buffer = noiseBuffer;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, time + offset);
            filter.Q.setValueAtTime(2.0, time + offset);
            const g = audioCtx.createGain();
            const dur = (idx === bursts.length - 1) ? 0.18 : 0.02;
            g.gain.setValueAtTime(0.6, time + offset);
            g.gain.exponentialRampToValueAtTime(0.01, time + offset + dur);
            noise.connect(filter);
            filter.connect(g);
            g.connect(gainNode);
            noise.start(time + offset);
            noise.stop(time + offset + dur + 0.02);
        });
    }

    function playCowbell(time, gainNode) {
        [800, 540].forEach(freq => {
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, time);
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(freq, time);
            filter.Q.setValueAtTime(8.0, time);
            g.gain.setValueAtTime(0.3, time);
            g.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
            osc.connect(filter);
            filter.connect(g);
            g.connect(gainNode);
            osc.start(time);
            osc.stop(time + 0.25);
        });
    }

    function playRimshot(time, gainNode) {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, time);
        osc.frequency.exponentialRampToValueAtTime(120, time + 0.03);
        g.gain.setValueAtTime(0.7, time);
        g.gain.exponentialRampToValueAtTime(0.01, time + 0.04);
        osc.connect(g);
        g.connect(gainNode);
        osc.start(time);
        osc.stop(time + 0.06);
    }

    function playMetronomeClick(time, isDownbeat) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isDownbeat ? 1400 : 900, time);
        g.gain.setValueAtTime(0.3, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
        osc.connect(g);
        g.connect(bassFilter);
        osc.start(time);
        osc.stop(time + 0.04);
    }

    // --- Master Sound Player ---
    function playSound(instId, time, velocityState = 1) {
        if (!audioCtx) return;

        // Solo / Mute Evaluation
        const anySolo = Object.values(soloStates).some(s => s);
        if (anySolo) {
            if (!soloStates[instId]) return;
        } else if (muteStates[instId]) {
            return;
        }

        // Velocity gain multipliers:
        // 1 = Normal (0.75), 2 = Accent (1.0), 3 = Ghost (0.35)
        let velGain = 0.75;
        if (velocityState === 2) velGain = 1.0;
        else if (velocityState === 3) velGain = 0.35;

        // Humanize velocity micro-variation (± 5% * humanize factor)
        if (humanize > 0) {
            const jitter = (Math.random() * 2 - 1) * 0.08 * (humanize / 100);
            velGain = Math.max(0.1, Math.min(1.0, velGain + jitter));
        }

        // Dedicated gain node per voice
        const voiceGain = audioCtx.createGain();
        voiceGain.gain.setValueAtTime(velGain, time);
        voiceGain.connect(bassFilter);

        // Acoustic Sample playback
        if (buffers[instId]) {
            const src = audioCtx.createBufferSource();
            src.buffer = buffers[instId];
            src.connect(voiceGain);
            src.start(time);
            return;
        }

        // Synthesis fallbacks
        switch (instId) {
            case 'kick':       playKickSynth(time, voiceGain); break;
            case 'snare':
            case 'snare2':
            case 'snare3':     playSnareSynth(time, voiceGain); break;
            case 'hat_closed': playHatSynth(time, false, voiceGain); break;
            case 'hat_open':
            case 'ride':
            case 'ride2':
            case 'crash':
            case 'crash2':
            case 'splash':
            case 'splash2':    playHatSynth(time, true, voiceGain); break;
            case 'tom_high':   playTomSynth(time, 200, voiceGain); break;
            case 'tom_mid':    playTomSynth(time, 150, voiceGain); break;
            case 'tom_low':    playTomSynth(time, 110, voiceGain); break;
            case 'clap':       playClap(time, voiceGain); break;
            case 'cowbell':    playCowbell(time, voiceGain); break;
            case 'rimshot':    playRimshot(time, voiceGain); break;
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
        // Humanize micro-timing offset (± 0-4ms)
        let scheduledTime = time;
        if (humanize > 0 && step !== 0) {
            const timeOffset = (Math.random() * 2 - 1) * 0.004 * (humanize / 100);
            scheduledTime = Math.max(audioCtx.currentTime, scheduledTime + timeOffset);
        }

        // Handle Drum Fill Injections
        const inFillZone = (fillPending && step >= 24);
        if (inFillZone) {
            // Dynamic Snare & Tom Roll Build
            if (step % 2 === 0) playSound('snare', scheduledTime, 2);
            if (step % 4 === 0) playSound('tom_mid', scheduledTime, 2);
            if (step === 30 || step === 31) playSound('tom_low', scheduledTime, 2);
        } else {
            // Standard Grid Execution
            const activeGrid = getActiveGrid();
            instruments.forEach(inst => {
                const vel = activeGrid[inst.id][step];
                if (vel > 0) {
                    playSound(inst.id, scheduledTime, vel);
                }
            });
        }

        // Downbeat Crash Landing after Fill
        if (step === 0 && fillPending) {
            playSound('crash', scheduledTime, 2);
            fillPending = false;
        }

        // Metronome quarter note click (every 4 steps)
        if (metronomeEnabled && step % 4 === 0) {
            playMetronomeClick(scheduledTime, step === 0);
        }

        const delayMs = Math.max(0, (scheduledTime - audioCtx.currentTime) * 1000);
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

        // Loop counter for Auto-Fill
        if (currentStep === 0) {
            loopCount++;
            if (autoFillInterval > 0 && loopCount % autoFillInterval === (autoFillInterval - 1)) {
                fillPending = true;
            }
        }
    }

    // --- 4-Beat Count-In Scheduler ---
    function startCountIn() {
        isCountingIn = true;
        countInBeat = 1;
        countInBanner.classList.add('active');
        countInStepSpan.textContent = countInBeat;

        const secondsPerBeat = 60.0 / bpm;
        let nextBeatTime = audioCtx.currentTime + 0.05;

        for (let b = 1; b <= 4; b++) {
            const tickTime = nextBeatTime + (b - 1) * secondsPerBeat;
            playMetronomeClick(tickTime, b === 1);

            const delay = Math.max(0, (tickTime - audioCtx.currentTime) * 1000);
            setTimeout(() => {
                countInStepSpan.textContent = b;
            }, delay);
        }

        setTimeout(() => {
            isCountingIn = false;
            countInBanner.classList.remove('active');
            startPlaybackEngine();
        }, secondsPerBeat * 4 * 1000);
    }

    function startPlaybackEngine() {
        isPlaying = true;
        btnPlay.innerHTML = '<span class="icon">⏸</span> Pause';
        btnPlay.classList.add('btn-secondary');
        btnPlay.classList.remove('btn-primary');
        currentStep = 0;
        nextStepTime = audioCtx.currentTime + 0.05;
        scheduler();
    }

    function togglePlayPause() {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        if (!isPlaying && !isCountingIn) {
            if (countInEnabled) {
                startCountIn();
            } else {
                startPlaybackEngine();
            }
        } else {
            isPlaying = false;
            isCountingIn = false;
            countInBanner.classList.remove('active');
            btnPlay.innerHTML = '<span class="icon">▶</span> Play';
            btnPlay.classList.remove('btn-secondary');
            btnPlay.classList.add('btn-primary');
            clearTimeout(timerId);
        }
    }

    function stopPlayback() {
        isPlaying = false;
        isCountingIn = false;
        countInBanner.classList.remove('active');
        btnPlay.innerHTML = '<span class="icon">▶</span> Play';
        btnPlay.classList.remove('btn-secondary');
        btnPlay.classList.add('btn-primary');
        clearTimeout(timerId);
        currentStep = 0;
        Array.from(stepsIndicatorContainer.children).forEach(ind => {
            ind.classList.remove('active', 'active-accent');
        });
    }

    // --- UI Grid & Live Pads ---

    function buildGridUI() {
        gridContainer.innerHTML = '';
        stepsIndicatorContainer.innerHTML = '';
        const activeGrid = getActiveGrid();

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

            // Track Header Label
            const labelArea = document.createElement('div');
            labelArea.classList.add('track-label');

            const metaArea = document.createElement('div');
            metaArea.classList.add('instrument-meta');
            const instName = document.createElement('span');
            instName.classList.add('instrument-name');
            instName.textContent = inst.short;
            instName.title = `${inst.name} [Pad: ${inst.key}]`;
            metaArea.appendChild(instName);

            // Mute, Solo & Nudge controls
            const trackControls = document.createElement('div');
            trackControls.classList.add('track-controls');

            const btnMute = document.createElement('button');
            btnMute.classList.add('btn-mute');
            btnMute.textContent = 'M';
            btnMute.title = 'Mute Track';
            btnMute.classList.toggle('active', muteStates[inst.id]);
            btnMute.addEventListener('click', () => {
                muteStates[inst.id] = !muteStates[inst.id];
                btnMute.classList.toggle('active', muteStates[inst.id]);
            });

            const btnSolo = document.createElement('button');
            btnSolo.classList.add('btn-solo');
            btnSolo.textContent = 'S';
            btnSolo.title = 'Solo Track';
            btnSolo.classList.toggle('active', soloStates[inst.id]);
            btnSolo.addEventListener('click', () => {
                soloStates[inst.id] = !soloStates[inst.id];
                btnSolo.classList.toggle('active', soloStates[inst.id]);
            });

            const btnNudgeL = document.createElement('button');
            btnNudgeL.classList.add('btn-tool');
            btnNudgeL.textContent = '◀';
            btnNudgeL.title = 'Nudge pattern 1 step left';
            btnNudgeL.addEventListener('click', () => nudgeTrack(inst.id, -1));

            const btnNudgeR = document.createElement('button');
            btnNudgeR.classList.add('btn-tool');
            btnNudgeR.textContent = '▶';
            btnNudgeR.title = 'Nudge pattern 1 step right';
            btnNudgeR.addEventListener('click', () => nudgeTrack(inst.id, 1));

            trackControls.appendChild(btnMute);
            trackControls.appendChild(btnSolo);
            trackControls.appendChild(btnNudgeL);
            trackControls.appendChild(btnNudgeR);

            labelArea.appendChild(metaArea);
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

                updateNodeClass(node, activeGrid[inst.id][step]);

                // 3-Level Velocity Cycle: 0 -> 1 (Normal) -> 2 (Accent) -> 3 (Ghost) -> 0
                node.addEventListener('click', () => {
                    const currentVal = activeGrid[inst.id][step];
                    const nextVal = (currentVal + 1) % 4;
                    activeGrid[inst.id][step] = nextVal;
                    updateNodeClass(node, nextVal);

                    if (nextVal > 0) {
                        initAudio();
                        if (audioCtx.state === 'suspended') audioCtx.resume();
                        playSound(inst.id, audioCtx.currentTime, nextVal);
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

    function updateNodeClass(node, val) {
        node.classList.remove('active-normal', 'active-accent', 'active-ghost');
        if (val === 1) node.classList.add('active-normal');
        else if (val === 2) node.classList.add('active-accent');
        else if (val === 3) node.classList.add('active-ghost');
    }

    function buildPadsUI() {
        padsGridContainer.innerHTML = '';
        instruments.forEach(inst => {
            const pad = document.createElement('div');
            pad.classList.add('drum-pad');
            pad.id = `pad-${inst.id}`;

            pad.innerHTML = `
                <span class="pad-key">${inst.key}</span>
                <span class="pad-name">${inst.short}</span>
            `;

            const triggerPad = () => {
                initAudio();
                if (audioCtx.state === 'suspended') audioCtx.resume();
                playSound(inst.id, audioCtx.currentTime, 2);
                pad.classList.add('hit-active');
                setTimeout(() => pad.classList.remove('hit-active'), 120);
            };

            pad.addEventListener('mousedown', triggerPad);
            pad.addEventListener('touchstart', (e) => { e.preventDefault(); triggerPad(); });

            padsGridContainer.appendChild(pad);
        });
    }

    function triggerPadByKey(keyChar) {
        const upper = keyChar.toUpperCase();
        const inst = instruments.find(i => i.key === upper);
        if (inst) {
            initAudio();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            playSound(inst.id, audioCtx.currentTime, 2);
            const padEl = document.getElementById(`pad-${inst.id}`);
            if (padEl) {
                padEl.classList.add('hit-active');
                setTimeout(() => padEl.classList.remove('hit-active'), 120);
            }
        }
    }

    function highlightStepUI(stepIndex) {
        const indicators = stepsIndicatorContainer.children;
        for (let i = 0; i < indicators.length; i++) {
            indicators[i].classList.remove('active', 'active-accent');
        }
        if (indicators[stepIndex]) {
            if (stepIndex % 4 === 0) indicators[stepIndex].classList.add('active-accent');
            else indicators[stepIndex].classList.add('active');
        }

        const prevStep = (stepIndex - 1 + TOTAL_STEPS) % TOTAL_STEPS;
        const prevNodes = gridContainer.querySelectorAll(`.step-node[data-step="${prevStep}"]`);
        prevNodes.forEach(node => node.classList.remove('playing-highlight'));

        const currentNodes = gridContainer.querySelectorAll(`.step-node[data-step="${stepIndex}"]`);
        const activeGrid = getActiveGrid();
        currentNodes.forEach(node => {
            const instId = node.dataset.inst;
            if (activeGrid[instId][stepIndex] > 0) {
                node.classList.add('playing-highlight');
            }
        });
    }

    // --- Track Quick Tools ---
    function nudgeTrack(instId, direction) {
        const activeGrid = getActiveGrid();
        const row = activeGrid[instId];
        if (direction === 1) {
            const last = row.pop();
            row.unshift(last);
        } else {
            const first = row.shift();
            row.push(first);
        }
        buildGridUI();
        if (activeBank !== null) autoSaveBank(activeBank);
    }

    if (btnToolDouble) {
        btnToolDouble.addEventListener('click', () => {
            const activeGrid = getActiveGrid();
            instruments.forEach(inst => {
                for (let s = 0; s < 16; s++) {
                    activeGrid[inst.id][s + 16] = activeGrid[inst.id][s];
                }
            });
            buildGridUI();
            if (activeBank !== null) autoSaveBank(activeBank);
        });
    }

    if (btnToolCopyPattern) {
        btnToolCopyPattern.addEventListener('click', () => {
            if (currentPattern === 'A') {
                instruments.forEach(inst => {
                    gridB[inst.id] = [...gridA[inst.id]];
                });
                alert("Pattern A copied to Pattern B (Chorus).");
            } else {
                instruments.forEach(inst => {
                    gridA[inst.id] = [...gridB[inst.id]];
                });
                alert("Pattern B copied to Pattern A (Verse).");
            }
            if (activeBank !== null) autoSaveBank(activeBank);
        });
    }

    // --- Song Section (Pattern A / B) Switcher ---
    patternButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pattern = e.currentTarget.dataset.pattern;
            patternButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentPattern = pattern;
            if (currentPatternTag) {
                currentPatternTag.textContent = pattern === 'A' ? 'PATTERN A (VERSE)' : 'PATTERN B (CHORUS)';
            }
            buildGridUI();
        });
    });

    // --- Performance Controls ---
    btnPlay.addEventListener('click', togglePlayPause);
    btnStop.addEventListener('click', stopPlayback);

    if (btnCountIn) {
        btnCountIn.addEventListener('click', () => {
            countInEnabled = !countInEnabled;
            btnCountIn.classList.toggle('active', countInEnabled);
        });
    }

    if (btnFill) {
        btnFill.addEventListener('click', () => {
            fillPending = true;
        });
    }

    btnClear.addEventListener('click', () => {
        const activeGrid = getActiveGrid();
        instruments.forEach(inst => activeGrid[inst.id].fill(0));
        buildGridUI();
        if (activeBank !== null) autoSaveBank(activeBank);
    });

    // Preset Loader
    function loadPreset(name) {
        const preset = presets[name];
        if (!preset) return;
        bpm = preset.bpm;
        swing = preset.swing;

        instruments.forEach(inst => {
            gridA[inst.id] = preset.gridA[inst.id] ? [...preset.gridA[inst.id]] : new Array(TOTAL_STEPS).fill(0);
            gridB[inst.id] = preset.gridB && preset.gridB[inst.id] ? [...preset.gridB[inst.id]] : [...gridA[inst.id]];
        });

        inputBpm.value = bpm;
        valBpm.textContent = bpm;
        inputSwing.value = swing;
        valSwing.textContent = swing;
        buildGridUI();
    }

    presetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            presetButtons.forEach(b => b.classList.remove('active'));
            if (activeBank !== null) {
                const activeBtn = document.querySelector(`.btn-bank[data-bank="${activeBank}"]`);
                if (activeBtn) activeBtn.classList.remove('active');
                activeBank = null;
            }
            e.currentTarget.classList.add('active');
            loadPreset(e.currentTarget.dataset.preset);
        });
    });

    // --- Slider Binders ---
    const bindSlider = (el, valEl, cb) => {
        if (!el) return;
        const handler = (e) => {
            const val = e.target.value;
            if (valEl) valEl.textContent = val;
            cb(val);
        };
        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
    };

    bindSlider(inputBpm, valBpm, (v) => { bpm = parseInt(v); });
    bindSlider(inputSwing, valSwing, (v) => { swing = parseInt(v); });
    bindSlider(inputHumanize, valHumanize, (v) => { humanize = parseInt(v); });
    bindSlider(inputReverb, valReverb, (v) => {
        reverbAmount = parseInt(v);
        updateReverbGain();
    });
    bindSlider(inputVolume, null, (v) => {
        if (masterGain && audioCtx) masterGain.gain.setValueAtTime(v / 100, audioCtx.currentTime);
    });
    bindSlider(inputPunch, valPunch, () => updateCompressor());
    bindSlider(inputBass, valBass, (v) => {
        if (bassFilter && audioCtx) bassFilter.gain.setValueAtTime(parseFloat(v), audioCtx.currentTime);
    });
    bindSlider(inputTreble, valTreble, (v) => {
        if (trebleFilter && audioCtx) trebleFilter.gain.setValueAtTime(parseFloat(v), audioCtx.currentTime);
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
            if (intervals[intervals.length - 1] > 2000) {
                tapTimes = [now];
                return;
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const calculatedBpm = Math.round(60000 / avgInterval);
            if (calculatedBpm >= 50 && calculatedBpm <= 240) {
                bpm = calculatedBpm;
                inputBpm.value = bpm;
                valBpm.textContent = bpm;
            }
        }
    }
    btnTap.addEventListener('click', handleTapTempo);

    // --- User Save Banks ---
    function initUserBanks() {
        for (let i = 0; i < 6; i++) {
            const rawData = localStorage.getItem(`shallotbeats_bank_${i}`) || localStorage.getItem(`beatsync_bank_${i}`);
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
        const copyA = {};
        const copyB = {};
        instruments.forEach(inst => {
            copyA[inst.id] = [...gridA[inst.id]];
            copyB[inst.id] = [...gridB[inst.id]];
        });

        const rawData = localStorage.getItem(`shallotbeats_bank_${index}`) || localStorage.getItem(`beatsync_bank_${index}`);
        let existingName = `Bank ${index + 1}`;
        if (rawData) {
            try {
                const parsed = JSON.parse(rawData);
                if (parsed.name) existingName = parsed.name;
            } catch (e) {}
        }

        const beatData = {
            name: existingName,
            bpm: bpm,
            swing: swing,
            humanize: humanize,
            reverbAmount: reverbAmount,
            gridA: copyA,
            gridB: copyB
        };

        localStorage.setItem(`shallotbeats_bank_${index}`, JSON.stringify(beatData));
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

        const rawData = localStorage.getItem(`shallotbeats_bank_${index}`) || localStorage.getItem(`beatsync_bank_${index}`);
        if (rawData) {
            try {
                const data = JSON.parse(rawData);
                bpm = data.bpm || 120;
                swing = data.swing || 0;
                humanize = data.humanize !== undefined ? data.humanize : 15;
                reverbAmount = data.reverbAmount !== undefined ? data.reverbAmount : 25;

                inputBpm.value = bpm;
                valBpm.textContent = bpm;
                inputSwing.value = swing;
                valSwing.textContent = swing;
                inputHumanize.value = humanize;
                valHumanize.textContent = humanize;
                inputReverb.value = reverbAmount;
                valReverb.textContent = reverbAmount;
                updateReverbGain();

                instruments.forEach(inst => {
                    if (data.gridA) {
                        gridA[inst.id] = data.gridA[inst.id] ? [...data.gridA[inst.id]] : new Array(TOTAL_STEPS).fill(0);
                    } else if (data.grid) {
                        // Upgrade legacy boolean grid
                        gridA[inst.id] = data.grid[inst.id] ? data.grid[inst.id].map(b => b ? 1 : 0) : new Array(TOTAL_STEPS).fill(0);
                    }
                    gridB[inst.id] = data.gridB && data.gridB[inst.id] ? [...data.gridB[inst.id]] : [...gridA[inst.id]];
                });

                buildGridUI();
            } catch (e) {
                console.error("Failed to parse bank data:", e);
            }
        } else {
            instruments.forEach(inst => {
                gridA[inst.id].fill(0);
                gridB[inst.id].fill(0);
            });
            buildGridUI();
        }
    }

    function saveBank(index) {
        if (index === null) {
            alert("Please select a User Bank (Bank 1 - Bank 6) first.");
            return;
        }

        const activeBtn = document.querySelector(`.btn-bank[data-bank="${index}"]`);
        let currentName = activeBtn ? activeBtn.textContent.trim() : `Bank ${index + 1}`;
        if (currentName.startsWith("Bank ")) currentName = "";

        const prompted = prompt("Enter a custom name for this beat:", currentName || `My Beat ${index + 1}`);
        if (prompted === null) return;
        const name = prompted.trim() || `Beat ${index + 1}`;

        const copyA = {};
        const copyB = {};
        instruments.forEach(inst => {
            copyA[inst.id] = [...gridA[inst.id]];
            copyB[inst.id] = [...gridB[inst.id]];
        });

        const beatData = {
            name: name,
            bpm: bpm,
            swing: swing,
            humanize: humanize,
            reverbAmount: reverbAmount,
            gridA: copyA,
            gridB: copyB
        };

        localStorage.setItem(`shallotbeats_bank_${index}`, JSON.stringify(beatData));
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

    btnSaveBeat.addEventListener('click', () => saveBank(activeBank));

    // --- WAV Audio Loop Exporter ---
    async function exportWavLoop() {
        initAudio();
        const secondsPerBeat = 60.0 / bpm;
        const stepDuration = 0.25 * secondsPerBeat;
        const totalDuration = stepDuration * TOTAL_STEPS + 1.2; // include reverb tail
        const offlineCtx = new OfflineAudioContext(2, Math.ceil(44100 * totalDuration), 44100);

        // Build offline processing graph
        const offMaster = offlineCtx.createGain();
        offMaster.gain.setValueAtTime(0.85, 0);

        const offReverb = offlineCtx.createConvolver();
        offReverb.buffer = createReverbBuffer(offlineCtx, 1.8, 2.5);
        const offReverbGain = offlineCtx.createGain();
        const offDryGain = offlineCtx.createGain();

        const wet = reverbAmount / 100.0;
        offReverbGain.gain.setValueAtTime(wet * 0.7, 0);
        offDryGain.gain.setValueAtTime(1.0 - (wet * 0.25), 0);

        offReverb.connect(offReverbGain);
        offReverbGain.connect(offMaster);
        offDryGain.connect(offMaster);
        offMaster.connect(offlineCtx.destination);

        const activeGrid = getActiveGrid();

        // Schedule offline nodes
        for (let s = 0; s < TOTAL_STEPS; s++) {
            let t = s * stepDuration;
            if (swing > 0 && s % 2 !== 0) {
                t += (swing / 100) * (1 / 3) * stepDuration;
            }

            instruments.forEach(inst => {
                const vel = activeGrid[inst.id][s];
                if (vel > 0 && !muteStates[inst.id]) {
                    const velGain = vel === 2 ? 1.0 : (vel === 3 ? 0.35 : 0.75);
                    const g = offlineCtx.createGain();
                    g.gain.setValueAtTime(velGain, t);
                    g.connect(offDryGain);
                    g.connect(offReverb);

                    if (buffers[inst.id]) {
                        const src = offlineCtx.createBufferSource();
                        src.buffer = buffers[inst.id];
                        src.connect(g);
                        src.start(t);
                    }
                }
            });
        }

        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = audioBufferToWavBlob(renderedBuffer);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `ShallotBeats-${bpm}BPM-${currentPattern === 'A' ? 'Verse' : 'Chorus'}.wav`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    }

    function audioBufferToWavBlob(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        const numSamples = buffer.length;
        const byteRate = sampleRate * blockAlign;
        const dataSize = numSamples * blockAlign;
        const headerSize = 44;
        const totalSize = headerSize + dataSize;

        const arrayBuffer = new ArrayBuffer(totalSize);
        const view = new DataView(arrayBuffer);

        function writeString(offset, string) {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        }

        writeString(0, 'RIFF');
        view.setUint32(4, totalSize - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        const left = buffer.getChannelData(0);
        const right = numChannels > 1 ? buffer.getChannelData(1) : left;
        let offset = 44;

        for (let i = 0; i < numSamples; i++) {
            let sL = Math.max(-1, Math.min(1, left[i]));
            view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7FFF, true);
            offset += 2;

            if (numChannels > 1) {
                let sR = Math.max(-1, Math.min(1, right[i]));
                view.setInt16(offset, sR < 0 ? sR * 0x8000 : sR * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    // --- Standard Type 0 MIDI Exporter ---
    function exportMidiFile() {
        const ticksPerBeat = 480;
        const ticksPerStep = ticksPerBeat / 4; // 120 ticks per 16th note
        const activeGrid = getActiveGrid();

        let events = [];

        for (let step = 0; step < TOTAL_STEPS; step++) {
            const startTick = step * ticksPerStep;
            instruments.forEach(inst => {
                const velState = activeGrid[inst.id][step];
                if (velState > 0) {
                    const midiVel = velState === 2 ? 127 : (velState === 3 ? 45 : 95);
                    events.push({ tick: startTick, type: 'noteOn', note: inst.midi, velocity: midiVel });
                    events.push({ tick: startTick + 60, type: 'noteOff', note: inst.midi, velocity: 0 });
                }
            });
        }

        events.sort((a, b) => a.tick - b.tick);

        let trackBytes = [];
        let lastTick = 0;

        // Tempo meta event (microsec per quarter note)
        const microsecPerBeat = Math.round(60000000 / bpm);
        trackBytes.push(0x00, 0xFF, 0x51, 0x03, (microsecPerBeat >> 16) & 0xFF, (microsecPerBeat >> 8) & 0xFF, microsecPerBeat & 0xFF);

        events.forEach(ev => {
            const delta = ev.tick - lastTick;
            lastTick = ev.tick;

            // Variable-length delta time
            let deltaBytes = [];
            let temp = delta;
            deltaBytes.push(temp & 0x7F);
            while ((temp >>= 7) > 0) {
                deltaBytes.unshift((temp & 0x7F) | 0x80);
            }
            trackBytes.push(...deltaBytes);

            // MIDI Channel 10 (0x99 for NoteOn, 0x89 for NoteOff)
            if (ev.type === 'noteOn') {
                trackBytes.push(0x99, ev.note, ev.velocity);
            } else {
                trackBytes.push(0x89, ev.note, 0);
            }
        });

        // End of track meta event
        trackBytes.push(0x00, 0xFF, 0x2F, 0x00);

        // Header Chunk: MThd, length 6, format 0, 1 track, 480 division
        const header = [
            0x4D, 0x54, 0x68, 0x64,
            0x00, 0x00, 0x00, 0x06,
            0x00, 0x00,
            0x00, 0x01,
            (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF
        ];

        // Track Chunk: MTrk + length + trackBytes
        const trackLen = trackBytes.length;
        const trackHeader = [
            0x4D, 0x54, 0x72, 0x6B,
            (trackLen >> 24) & 0xFF,
            (trackLen >> 16) & 0xFF,
            (trackLen >> 8) & 0xFF,
            trackLen & 0xFF
        ];

        const midiBuffer = new Uint8Array([...header, ...trackHeader, ...trackBytes]);
        const blob = new Blob([midiBuffer], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `ShallotBeats-${bpm}BPM.mid`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    }

    if (btnExportWav) btnExportWav.addEventListener('click', exportWavLoop);
    if (btnExportMidi) btnExportMidi.addEventListener('click', exportMidiFile);

    // --- Web MIDI API Controller Support ---
    function initWebMidi() {
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then((access) => {
                if (midiStatusText) {
                    const inputs = Array.from(access.inputs.values());
                    midiStatusText.textContent = inputs.length > 0 ? `Connected (${inputs[0].name})` : 'Enabled (No Devices)';
                }
                for (let input of access.inputs.values()) {
                    input.onmidimessage = handleMidiMessage;
                }
            }).catch(() => {
                if (midiStatusText) midiStatusText.textContent = 'Unavailable';
            });
        }
    }

    function handleMidiMessage(msg) {
        const [cmd, note, vel] = msg.data;
        // Note On (Channel 10 or any channel)
        if ((cmd & 0xF0) === 0x90 && vel > 0) {
            const inst = instruments.find(i => i.midi === note);
            if (inst) {
                initAudio();
                playSound(inst.id, audioCtx.currentTime, vel > 100 ? 2 : 1);
                const padEl = document.getElementById(`pad-${inst.id}`);
                if (padEl) {
                    padEl.classList.add('hit-active');
                    setTimeout(() => padEl.classList.remove('hit-active'), 120);
                }
            }
        }
        // MIDI Start (0xFA) / Stop (0xFC) transport from pedals
        else if (cmd === 0xFA) startPlaybackEngine();
        else if (cmd === 0xFC) stopPlayback();
    }

    // --- Visualizer Oscilloscope ---
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

    // --- Global Keyboard Shortcuts ---
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            togglePlayPause();
        } else if (e.key === 's' || e.key === 'S') {
            stopPlayback();
        } else if (e.key === 'f' || e.key === 'F') {
            fillPending = true;
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const nextP = currentPattern === 'A' ? 'B' : 'A';
            const btn = document.querySelector(`.btn-pattern[data-pattern="${nextP}"]`);
            if (btn) btn.click();
        } else if (e.key === 't' || e.key === 'T') {
            handleTapTempo();
        } else if (e.key === 'c' || e.key === 'C') {
            const activeGrid = getActiveGrid();
            instruments.forEach(inst => activeGrid[inst.id].fill(0));
            buildGridUI();
        } else if (e.key === 'Escape') {
            closeSettings();
        } else if (['1','2','3','4','5','6','7','8','9'].includes(e.key)) {
            const presetKeys = ['rock', 'blues', 'grunge', 'punk', 'funk', 'hiphop', 'metal', 'reggae', 'country'];
            const idx = parseInt(e.key) - 1;
            if (presetKeys[idx]) {
                presetButtons.forEach(b => b.classList.remove('active'));
                const targetBtn = document.querySelector(`.btn-preset[data-preset="${presetKeys[idx]}"]`);
                if (targetBtn) targetBtn.classList.add('active');
                loadPreset(presetKeys[idx]);
            }
        } else {
            triggerPadByKey(e.key);
        }
    });

    // Boot System
    initUserBanks();
    buildPadsUI();
    loadPreset('rock');
});
