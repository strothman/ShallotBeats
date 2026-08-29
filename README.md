# ShallotBeats 🧅🥁🎸

> **Interactive Step Sequencer & Guitar Backing Drum Machine by Shallot**  
> Powered by the Web Audio API with Pearl Master Studio acoustic samples, synthetic percussion, master FX chain, Shallot Plum theme, and full settings control.

---

## ✨ Features

- **18 Drum Instruments**:
  - *Acoustic Samples*: Kick, Snare, Snare 2, Cross Stick, Closed Hi-Hat, Open Hi-Hat, Ride, Ride Bell, Crash, Crash 2, Splash, Splash 2, High Tom, Mid Tom, Low Tom.
  - *Synthesized Percussion*: Clap, 808 Cowbell, Rimshot.
- **32-Step Sequencer Grid**: High-resolution 32-step pattern grid supporting 1/16th and 1/32nd note subdivisions with 4-step measure accenting.
- **Guitar Backing Presets**: Instant loadouts for **Rock**, **Blues Shuffle** (with 50% swing), **Funk Groove**, **Hip Hop**, **Heavy Metal**, and **Swing Jazz**.
- **6 User Save Banks**: Save, rename, and recall custom drum patterns with automatic state persistence (`localStorage`).
- **App Settings & Preferences (⚙️)**:
  - Version & build tracking badge (`v1.3.0`).
  - Visual theme selector with live color preview cards.
  - Metronome quarter-note count-in / click toggle.
  - Keyboard shortcuts reference sheet.
  - Bank and storage reset tool.
- **Global Keyboard Shortcuts**:
  - <kbd>Space</kbd>: Play / Pause toggle
  - <kbd>S</kbd>: Stop & Rewind
  - <kbd>T</kbd>: Tap Tempo
  - <kbd>C</kbd>: Clear active grid
  - <kbd>1</kbd>–<kbd>6</kbd>: Instant preset switching
  - <kbd>Esc</kbd>: Close settings dialog
- **Groove & Timing Engine**:
  - Precision Web Audio API lookahead scheduler.
  - BPM slider (60–220 BPM) + **Tap Tempo** button.
  - Configurable **Swing / Shuffle** timing (0–80%).
- **Master FX Chain**:
  - **Punch / Compression**: Dynamics compressor with automatic threshold/ratio scaling.
  - **Bass Boost**: 100 Hz low-shelf EQ filter (-6 dB to +12 dB).
  - **Treble Boost**: 6000 Hz high-shelf EQ filter (-6 dB to +12 dB).
  - **Master Volume**: Clean pre-analyser level attenuation.
- **Shallot Plum Theme 🧅**:
  - Signature deep velvet plum background (`#180d21`) with warm copper glow (`#d48244`) and golden amber accents (`#f39c12`).
  - Hot theme toggle in header: switch between **Shallot Plum** and **Cyberpunk Neon** anytime.
- **Live Waveform Visualizer**: Real-time Web Audio API oscilloscope canvas that dynamically adapts color and glow to the active theme.

---

## 🚀 Quick Start & Launching

### 1. Windowless Desktop App Launch (Recommended)
Double-click:
```text
launch.bat
```
*or*
```text
launch_silent.vbs
```
This opens ShallotBeats as a clean, dedicated desktop application window (via Microsoft Edge / Chrome `--app` mode) **without leaving any command prompt console window open**.

### 2. Static Web Browser
Simply double-click `index.html` or open with any modern web browser.

### 3. Local Web Server
```bash
python -m http.server 3000
```
Then navigate to `http://localhost:3000`.

---

## 🎛️ Instrument & Sound Architecture

| Track Name | Engine Type | Pitch / Character |
| :--- | :--- | :--- |
| **Kick** | Sample + Synth Fallback | Deep resonant bass drum |
| **Snare / Snare 2 / Cross Stick** | Acoustic Pearl Samples | Crisp acoustic body & rim hits |
| **Closed Hat / Open Hat** | Acoustic Zildjian Samples | Tight sizzle and lingering wash |
| **Ride / Ride Bell** | Acoustic Cymbal Samples | Bright bell ping and ride shimmer |
| **Crash / Crash 2 / Splash / Splash 2** | Acoustic Cymbal Samples | Dynamic stereo accents & quick accents |
| **High / Mid / Low Toms** | Tuned Acoustic Shells | Warm punchy tom fills |
| **Clap** | Synthesized Noise Burst | Triple envelope multi-burst clap |
| **Cowbell** | Synthesized Dual Sine | Classic 800Hz / 540Hz bandpass cowbell |
| **Rim Shot** | Synthesized Wood Percussion | High-frequency snappy transient |

---

## 🎨 Themes & Design Tokens

ShallotBeats uses CSS variables defined in [`shallot-theme.css`](shallot-theme.css) and documented in [`THEME.md`](THEME.md):

- **Plum Theme (Default)**: Deep plum surfaces with copper glow highlights.
- **Neon Theme**: Electric cyan and purple cyberpunk aesthetic.

Theme preference is automatically stored in your browser's `localStorage` and remembered on every launch.

---

## 📂 Project Structure

```text
audio-drums/
├── CHANGELOG.md             # Version history and revision log
├── LICENSE                  # MIT License
├── README.md                # Documentation and user manual
├── THEME.md                 # Design token specification
├── app.js                   # Sequencer audio engine & UI controller
├── index.html               # Main application layout
├── launch.bat               # Windowless batch runner
├── launch_app.bat           # App-mode launcher script
├── launch_silent.vbs        # Silent VBScript wrapper
├── samples/                 # Acoustic drum WAV samples
├── shallot-theme.css        # Shallot Plum design system tokens
└── style.css                # Application styles and animations
```

---

## 📄 License
MIT License. Copyright (c) 2026 Shallot (strothman). See [LICENSE](LICENSE) for details.
