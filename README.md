# AI Drum System

A professional AI-assisted drum composition tool built with React, Vite, and Tailwind CSS.

## Features

- **Generator Mode** — Create drum grooves and fills with AI-assisted generation
  - Groove sub-mode: 3 distinct rhythmic variations per genre (Rock/Pop, Trap/EDM, Jazz/Fusion, Metal, Funk/R&B)
  - Fill sub-mode: Procedurally generated end-of-phrase drum fills with adjustable fill length
  - Controls: Genre Style, Dynamics, Layers, Fill Length
  - Live 1-bar step-grid preview with instrument rows (Kick, Snare, Hi-Hat, Toms, Crash)

- **Arrangement Mode** — DAW-style song structure timeline
  - Drag patterns from the Pattern Library onto a horizontal bar-based timeline
  - Segments (Intro, Verse, Chorus, etc.) with editable names
  - Click any bar to seek and play from that position
  - Per-bar X button to remove individual bar slots
  - Segment delete with confirmation when slots are filled

- **Pattern Library** — Persistent reusable pattern store
  - Click-to-rename inline editing
  - Double-click to re-load into Generator for variation
  - Mini pattern preview (Kick / Snare / Hi-Hat rows)
  - Visible in both Generator and Arrangement modes

- **MIDI Export** — Format 1 multi-track MIDI file with proper GM drum mapping

## Running the App

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open `http://localhost:5173/`

## Screenshot

![Drum App Running Screenshot](./screenshot.png)

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- Web Audio API (synthesized percussion — no samples)
- Lucide React icons

---

## Credits

**Designed & Built by Parkpoom Wisedsri**  
📧 [parkpoom.wisedsri@gmail.com](mailto:parkpoom.wisedsri@gmail.com)  
🐙 [github.com/parkpoomdev](https://github.com/parkpoomdev)

**AI Collaboration:** Antigravity / Google DeepMind  
*Pattern generation logic, UI architecture, and MIDI export co-developed with AI assistance.*
