# Project State: ShallotBeats Pro 🧅🥁🎸

**Last Updated:** September 1, 2026  
**Current Version:** `v2.0.0` (Pro Edition)  
**Repository / App Name:** ShallotBeats (ShallotBeats Pro)  
**Author / Maintainer:** Shallot (`strothman`)  
**License:** [MIT License](LICENSE)  

---

## 🎯 Project Overview & Vision

**ShallotBeats Pro** is a studio-grade, zero-dependency, browser-based step sequencer and drum machine engineered specifically for bedroom guitarists, songwriters, and music producers. Powered natively by the **Web Audio API**, it delivers realistic acoustic drumming dynamics, organic timing variations, room acoustics simulation, and seamless song arrangement tools directly in the browser or via standalone desktop app mode.

---

## 🏗️ Architecture & Tech Stack

- **Frontend Core:** Pure HTML5, Semantic DOM structure, ES6+ Vanilla JavaScript.
- **Audio Engine:** Web Audio API (`AudioContext`, `ConvolverNode`, `DynamicsCompressorNode`, `BiquadFilterNode`, `GainNode`).
- **Styling & Design System:** Pure Vanilla CSS3 with custom CSS Variables, glassmorphism, responsive grid/flex layouts, and the signature **Shallot Plum & Copper Glow** aesthetic.
- **Typography:** Google Fonts (`Outfit` & `Space Grotesk`).
- **Persistence:** Browser `localStorage` for banks, settings, patterns, and session persistence.
- **I/O & Integration:** 
  - Standard Type-0 MIDI File (`.mid`) generator & exporter.
  - 16-bit 44.1kHz stereo PCM WAV export via `OfflineAudioContext`.
  - Web MIDI API for external hardware controllers and USB pedal transport triggers.

---

## 📂 Project File Structure

```text
ShallotBeats/
├── index.html            # Main application UI layout & modals
├── style.css             # Core design system, glassmorphism, components
├── shallot-theme.css     # Shallot Plum (#180d21) & Copper Glow palette
├── app.js                # Core audio engine, sequencer state, event handling
├── download-samples.js   # Script for fetching/managing sample assets
├── launch.bat            # Windowless launcher script (calls VBS)
├── launch_app.bat        # App-mode launcher (Edge / Chrome / Browser)
├── launch_silent.vbs     # Silent background execution helper
├── samples/              # High-fidelity acoustic Pearl & percussion WAVs
├── README.md             # Public documentation & user guide
├── CHANGELOG.md          # Release history and version notes
├── THEME.md              # Theme & visual identity specifications
├── LICENSE               # MIT License (Copyright 2026 Shallot)
└── PROJECT_STATE.md      # Comprehensive architectural and project status document
```

---

## 🎛️ Key Features & Modules

### 1. Song Arrangement & Practice Tools
- **Verse & Chorus Banks (Pattern A / B):** Independent 32-step patterns per bank with seamless bar-synchronized switching via header button or <kbd>Tab</kbd>.
- **4-Beat Count-In Pre-Roll:** Visual metronome countdown banner (<kbd>⏱ Count-In</kbd>) allowing musicians time to grab instruments before beat 1.
- **Dynamic Drum Fills:** Manual fill trigger (<kbd>F</kbd>) or configurable **Auto-Fill** every 4 or 8 bars with snare/tom builds and cymbal crash downbeats.
- **6 Memory Banks:** Quick save/load slots for rapid switching during practice sessions.

### 2. Audio Engine & Sound Design
- **18 Instruments:**
  - *Pearl Master Studio Samples:* Kick, Snare, Punch Snare, Cross Stick, Closed Hat, Open Hat, Ride, Ride Bell, Crash, Crash 2, Splash, Splash 2, High Tom, Mid Tom, Low Tom.
  - *Synthesized Percussion:* Hand Clap, 808 Cowbell, Snappy Rimshot.
- **3-Stage Hit Velocity:** Cycle `Off` → `Normal` (Gain 0.75) → `Accent` (Gain 1.0) → `Ghost` (Gain 0.35).
- **Studio Room Reverb (Convolver):** Synthetic acoustic impulse response with dry/wet mix.
- **Humanize Timing Engine:** Micro-timing jitter (±0–4ms) and velocity variation for natural feel.
- **Master FX:** Punch Dynamics Compressor, Bass (100Hz) and Treble (6000Hz) shelving EQs, and master volume.

### 3. 12 Curated Presets
1. **Rock Beat** (120 BPM)
2. **Blues Shuffle** (110 BPM, 50% Swing)
3. **90s Grunge** (116 BPM)
4. **Punk D-Beat** (165 BPM)
5. **Funk Groove** (105 BPM, 30% Swing)
6. **Boom Bap Hip Hop** (90 BPM, 25% Swing)
7. **Heavy Metal** (140 BPM, Double-Kick)
8. **Reggae Drop** (75 BPM, One-Drop)
9. **Country Train** (130 BPM)
10. **Motown Soul** (118 BPM)
11. **Bossa Nova** (125 BPM)
12. **Swing Jazz** (135 BPM, 60% Swing)

### 4. Interactive Live Pads & MIDI
- **18 QWERTY/Click Drum Pads:** Real-time triggering with visual feedback.
- **Web MIDI Controller Support:** Real-time Note-On triggers and footswitch transport controls.
- **WAV & MIDI Export:** Download high-quality audio loops and standard MIDI files.

---

## 🚀 Active Roadmap & Planned Enhancements

- [ ] Multi-track Audio Stem Export (individual `.wav` tracks for Kick, Snare, Hats, etc.).
- [ ] Built-in Chord Progression & Bassline backing player.
- [ ] User custom sample upload & drag-and-drop sound kit import.
- [ ] Cloud synchronization / pattern sharing via URL hash / JSON export.

---

- **Repository Name:** `ShallotBeats`
- **GitHub Remote:** `https://github.com/strothman/ShallotBeats.git`
- **Local Directory:** `c:\Users\strot\Antigravity IDE\ShallotBeats`
