# Shallot Plum Theme Specification 🧅🎨
**Signature Deep Plum & Copper Glow Design System for ShallotBeats**
*Copyright (c) 2026 Shallot (strothman) — MIT License*

---

## 🎨 Color Palette Overview

| Token Name | Hex / Value | Usage |
| :--- | :--- | :--- |
| **`shallot-bg-app`** | `#180d21` | Deep Velvet Plum background (OLED-friendly dark foundation) |
| **`shallot-bg-card`** | `#261533` | Elevated surface for control panels, sequencer grid backdrop |
| **`shallot-primary`** | `#d48244` | Warm Shallot Copper Glow (play button, active steps, indicators) |
| **`shallot-primary-light`** | `#3d234a` | Soft purple-plum tint for pills and bank containers |
| **`shallot-accent`** | `#f39c12` | Golden amber glow (beat highlights, secondary alerts) |
| **`shallot-deep-plum`** | `#4a1d6a` | Ambient atmospheric background glow |
| **`shallot-text-main`** | `#f5eff9` | Soft Lilac-White (crisp readability) |
| **`shallot-text-muted`** | `#bda8c7` | Muted lavender grey (labels, track titles) |
| **`shallot-border`** | `rgba(212, 130, 68, 0.22)` | Translucent copper glass border |
| **`shallot-danger`** | `#e74c3c` | Clear grid / mute indicators |

---

## 💻 How Themes Work in ShallotBeats

ShallotBeats supports hot theme switching between **Shallot Plum** and **Cyberpunk Neon**:
- Active theme is persisted across sessions in `localStorage.getItem('shallotbeats_theme')`.
- CSS variables automatically update panels, sliders, grid nodes, ambient lighting, and buttons.
- The real-time Web Audio API waveform visualizer adapts its stroke color and glowing shadows dynamically.
