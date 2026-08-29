# ShallotBeats Pro 🧅🥁🎸

> **Studio-Grade Step Sequencer & Guitar Backing Drum Machine by Shallot**  
> Powered by the Web Audio API with 18 acoustic Pearl & synthesized instruments, Studio Room Reverb, 12 genre kits, 3-stage velocity, dynamic drum fills, A/B Verse/Chorus patterns, WAV/MIDI export, and Web MIDI controller/pedal integration.

---

## ✨ Features Overview

### 🎸 1. Jamming & Song Arrangement
- **Verse & Chorus (Pattern A / B)**: Independent 32-step patterns per bank with seamless bar-synchronized switching.
- **4-Beat Count-In Pre-Roll**: Visual countdown and metronome count-in so you can position your hands on the guitar fretboard before beat 1.
- **Dynamic Drum Fills**: Dedicated manual trigger button (<kbd>F</kbd>) or configurable **Auto-Fill every 4 or 8 bars** (snare/tom roll into a downbeat crash).
- **12 Curated Guitar Presets**:
  - *Rock Beat*, *Blues Shuffle* (50% swing), *90s Grunge*, *Punk D-Beat*, *Funk Groove*, *Boom Bap Hip Hop*, *Heavy Metal* (double-kick), *Reggae Drop*, *Country Train*, *Motown Soul*, *Bossa Nova*, and *Swing Jazz*.

### 🔊 2. Studio Sound Engine & Master FX
- **18 Drum Instruments**:
  - *Pearl Master Studio Acoustic Samples*: Kick, Snare, Punch Snare, Cross Stick, Closed Hat, Open Hat, Ride, Ride Bell, Crash, Crash 2, Splash, Splash 2, High Tom, Mid Tom, Low Tom.
  - *Synthesized Percussion*: Hand Clap, 808 Cowbell, Snappy Rimshot.
- **3-Stage Hit Velocity**: Click steps to cycle `Off` → `Normal (0.75)` → `Accent (1.0)` → `Ghost (0.35)`.
- **Studio Room Reverb (Convolver)**: Synthetic acoustic room simulation with dry/wet control.
- **Humanize Timing Engine**: Adds organic micro-timing jitter (±0–4ms) and velocity variation to eliminate robotic repetition.
- **Punch Dynamics Compressor**: Studio threshold/ratio compression.
- **Bass & Treble Shelving EQ**: 100Hz low-shelf and 6000Hz high-shelf tone shaping.

### 🎛️ 3. Sequencer Tools & Live Pads
- **Per-Track Solo (`S`) & Mute (`M`)**: Focus on individual instruments while programming.
- **Nudge & Duplicate Utilities**: Shift track patterns 1 step left/right (`◀`/`▶`) or duplicate 16 steps into 32 (`16→32`).
- **Interactive Live Drum Pads**: 18 clickable pads with QWERTY keyboard shortcuts (`Q`–`P`, `A`–`K`) and visual hit animations.
- **Web MIDI API Controller Support**: Connect USB drum pads or MIDI footswitches to trigger drums or control Play/Stop/Fills hands-free.

### 📥 4. Export & Saving
- **1-Click WAV Loop Export**: High-fidelity offline audio rendering into a standard 16-bit 44.1kHz `.wav` loop file with master FX and reverb tail.
- **Standard MIDI Export**: Generates a standard Type 0 `.mid` file with General MIDI drum mapping for DAWs (Reaper, Logic, Pro Tools, Ableton).
- **6 User Save Banks**: Independent storage with custom naming and persistent auto-saving in `localStorage`.

---

## 🎹 Keyboard & Hardware Shortcuts

| Key | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Play / Pause Toggle |
| <kbd>S</kbd> | Stop & Rewind to Step 1 |
| <kbd>F</kbd> | Trigger Dynamic Drum Fill |
| <kbd>Tab</kbd> | Toggle Verse (A) / Chorus (B) |
| <kbd>T</kbd> | Tap Tempo (4-tap average) |
| <kbd>C</kbd> | Clear Active Grid |
| <kbd>1</kbd> – <kbd>9</kbd> | Load Genre Presets 1–9 |
| <kbd>Q</kbd> – <kbd>P</kbd>, <kbd>A</kbd> – <kbd>K</kbd> | Play Drum Pads Live |
| <kbd>Esc</kbd> | Close Settings Dialog |
| **MIDI Pedals** | Start (0xFA), Stop (0xFC), Note triggers (Ch 10) |

---

## 🚀 Launching ShallotBeats

### 1. Windowless Desktop Application (Recommended)
Double-click:
```text
launch.bat
```
*or*
```text
launch_silent.vbs
```

### 2. Web Browser
Double-click `index.html` or start a local server:
```bash
python -m http.server 3000
```
Navigate to `http://localhost:3000`.

---

## 🎨 Themes & Design Tokens

ShallotBeats uses the **Shallot Plum** design system documented in [`THEME.md`](THEME.md) and [`shallot-theme.css`](shallot-theme.css):
- **Shallot Plum (Default)**: Velvet plum (`#180d21`) with warm copper glow (`#d48244`) and golden amber accents (`#f39c12`).
- **Cyberpunk Neon**: Electric cyan (`#00f2fe`) and magenta (`#ff0055`) dark mode.

---

## 📄 License
MIT License. Copyright (c) 2026 Shallot (strothman). See [LICENSE](LICENSE).
