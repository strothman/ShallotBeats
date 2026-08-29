# Changelog 🥁📝

All notable changes to the **BeatSync** project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

- Additional genre presets (Latin Bossa, Double Bass Metal, Reggae).
- MIDI keyboard / pad input trigger support.
- WAV audio pattern export capability.

---

## [1.2.0] - 2026-08-28

### Added
- **Application Settings Panel**:
  - Added dedicated glassmorphic Settings modal accessible from the header (`⚙️` button) or `Esc` key.
  - Live version & revision display badge (`v1.2.0 - Shallot Edition`) in both Settings and the app footer.
  - Theme selection preview cards with live radio toggles synchronizing with header buttons.
  - Optional **Metronome Quarter-Click** toggle (audible woodblock click on downbeats and quarter notes).
  - High-precision audio scheduling status indicator.
  - Complete **Keyboard Shortcuts** guide.
  - **Storage & Banks Reset** tool with confirmation safeguards.
- **Global Keyboard Shortcuts**:
  - `Space`: Instant Play / Pause toggle.
  - `S`: Stop & rewind playhead.
  - `T`: Tap Tempo input.
  - `C`: Clear active sequencer grid.
  - `1` - `6`: Quick-load genre presets (Rock, Blues, Funk, Hip Hop, Metal, Jazz).
  - `Esc`: Close modal dialog.

### Changed
- Updated `app.js` architecture with centralized `APP_VERSION` tracking across the UI.
- Upgraded visualizer layout and header spacing for cleaner alignment on all display sizes.

---

## [1.1.0] - 2026-08-28

### Added
- **Shallot Plum Theme**:
  - Implemented signature Deep Velvet Plum (`#180d21`) and Copper Glow (`#d48244`) color palette from the Shallot cooking app design system.
  - Added [`shallot-theme.css`](shallot-theme.css) containing all design tokens, surfaces, borders, and typography variables.
  - Added [`THEME.md`](THEME.md) specification documentation.
  - Added header theme toggle button (`🧅 Plum` / `⚡ Neon`) with persistent `localStorage` synchronization.
  - Adapted waveform oscilloscope canvas visualizer to render warm copper and golden amber glow when Plum theme is active.
- **Windowless Desktop Launchers**:
  - Added [`launch.bat`](launch.bat) for zero-console windowless launches.
  - Added [`launch_app.bat`](launch_app.bat) to launch Microsoft Edge or Google Chrome in standalone desktop `--app` mode with optimized window dimensions.
  - Added [`launch_silent.vbs`](launch_silent.vbs) silent WScript executor.
- **Documentation**:
  - Created [`README.md`](README.md) with full feature list, sound architecture table, launch guide, and project layout.
  - Created [`CHANGELOG.md`](CHANGELOG.md) to maintain revision history.

### Changed
- Refactored [`style.css`](style.css) to support CSS custom property theme tokens across all panels, sequencer steps, sliders, and buttons.
- Updated [`index.html`](index.html) header structure to incorporate theme switcher controls alongside visualizer.

---

## [1.0.0] - 2026-08-28

### Added
- **18 Drum Instruments**:
  - Integrated 15 acoustic drum samples from the Pearl Master Studio kit (Kick, Snares, Hats, Rides, Crashes, Splashes, Toms).
  - Built Web Audio API synthetic instruments for Clap, 808 Cowbell, and Snappy Rimshot.
- **32-Step Sequencer**:
  - Implemented 32-step grid with 4-step measure accenting.
  - Added dynamic step highlighting and playhead indicators.
- **Backing Presets**:
  - Added 6 instant presets: Rock, Blues Shuffle (50% swing), Funk Groove, Hip Hop, Heavy Metal, and Swing Jazz.
- **User Save Banks**:
  - Built 6 independent user save banks with custom naming, instant recall, and persistent storage in `localStorage`.
- **Master FX Section**:
  - Integrated Master Dynamics Compressor (Punch control).
  - Integrated Low-shelf Bass EQ and High-shelf Treble EQ filters.
  - Real-time Master Volume control.
- **Timing Engine**:
  - Lookahead Web Audio API scheduler for rock-solid timing.
  - BPM slider (60–220 BPM) with Tap Tempo detection.
  - Configurable swing / shuffle percentage.
