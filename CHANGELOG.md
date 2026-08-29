# Changelog 🧅🥁📝

All notable changes to the **ShallotBeats** project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

- Audio stem multi-track export (individual WAV files per instrument).
- Chord progression backing track player.

---

## [2.0.0] - 2026-08-28 — Pro Edition

### Added
- **Song Section Arranger (Verse / Chorus)**:
  - Added independent **Pattern A (Verse)** and **Pattern B (Chorus)** memory per bank.
  - Seamless bar-synchronized switching via header button or <kbd>Tab</kbd> shortcut.
  - Added Quick Tool to duplicate Pattern A into Pattern B.
- **4-Beat Count-In Pre-Roll**:
  - Added metronome countdown (<kbd>⏱ Count-In</kbd>) with live visual banner before loop starts.
- **Dynamic Drum Fills & Auto-Fill**:
  - Added manual **Trigger Fill** button (<kbd>F</kbd>) injecting a snare/tom build-up and cymbal downbeat crash.
  - Added configurable Auto-Fill setting (Every 4 or 8 bars) in Settings.
- **Studio Room Reverb & Humanize Engine**:
  - Synthetic acoustic room impulse response with dedicated Room Reverb dry/wet slider.
  - Organic Humanize slider adding micro-timing jitter (±0–4ms) and velocity randomness.
- **3-Stage Hit Velocity**:
  - Steps cycle between `Normal` (Gain 0.75), `Accent` (Gain 1.0), and `Ghost` (Gain 0.35).
  - Distinct visual node badges (solid glow, double-border accent, dashed ghost ring).
- **12 Curated Guitar Presets**:
  - Added **90s Grunge**, **Punk D-Beat**, **Reggae Drop**, **Country Train**, **Motown Soul**, and **Bossa Nova** to existing Rock, Blues, Funk, Hip Hop, Metal, and Jazz.
- **WAV & MIDI Export**:
  - 1-click offline audio rendering producing downloadable 16-bit 44.1kHz `.wav` loop files.
  - Standard Type 0 `.mid` MIDI file generator with General MIDI drum mapping.
- **Interactive Live Drum Pads**:
  - 18 clickable/touch drum pads with QWERTY keyboard mapping (`Q`–`P`, `A`–`K`) and visual press animations.
- **Per-Track Solo (`S`) & Track Nudge**:
  - Added Solo buttons alongside Mute on all 18 tracks.
  - Added 1-step pattern nudge buttons (`◀`/`▶`) per track.
- **Web MIDI API Support**:
  - Integrated controller and USB footswitch support (Note On triggers, MIDI Start/Stop transport).

---

## [1.3.0] - 2026-08-28

### Added
- **Official MIT License**:
  - Added [`LICENSE`](LICENSE) for `Copyright (c) 2026 Shallot (strothman)`.
- **ShallotBeats Rebranding**:
  - Rebranded project from BeatSync to **ShallotBeats** across UI, header logo, metadata, and documentation.
  - Upgraded launcher scripts to reflect ShallotBeats.

---

## [1.2.0] - 2026-08-28

### Added
- **Application Settings Panel**:
  - Added glassmorphic Settings modal with version badge (`v1.2.0`), theme options, metronome click, and bank reset.
- **Global Keyboard Shortcuts**:
  - <kbd>Space</kbd>, <kbd>S</kbd>, <kbd>T</kbd>, <kbd>C</kbd>, <kbd>1</kbd>–<kbd>6</kbd>, <kbd>Esc</kbd>.

---

## [1.1.0] - 2026-08-28

### Added
- **Shallot Plum Theme**:
  - Implemented Deep Velvet Plum (`#180d21`) and Copper Glow (`#d48244`) color palette.
  - Added [`shallot-theme.css`](shallot-theme.css) and [`THEME.md`](THEME.md).
  - Added windowless desktop launchers (`launch.bat`, `launch_app.bat`, `launch_silent.vbs`).

---

## [1.0.0] - 2026-08-28

### Added
- Initial release with 18 instruments, 32 steps, 6 presets, 6 save banks, compressor, and EQ.
