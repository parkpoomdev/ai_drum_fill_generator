import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Play,
  Square,
  RefreshCw,
  Sliders,
  Activity,
  Download,
  Plus,
  LayoutGrid,
  Layers,
  Archive,
  Trash2,
  Grid,
  Save,
  X,
  Drumstick,
  Music2,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Repeat,
  ArrowRight,
  StopCircle,
} from "lucide-react";
import { Soundfont } from "smplr";

// ─────────────────────────────────────────────
// AUDIO ENGINE
// ─────────────────────────────────────────────
const createAudioContext = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  return new AC();
};

const playSound = (ctx, type, time, velocity = 1, genre = "acoustic") => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  let vol = velocity;
  if (genre === "electronic") vol *= 0.8;
  if (genre === "jazz") vol *= 0.7;
  if (genre === "metal") vol *= 1.1;

  if (type.startsWith("tom")) {
    let sf = 150,
      ef = 50;
    if (type === "tomHigh") {
      sf = 200;
      ef = 80;
    }
    if (type === "tomMid") {
      sf = 140;
      ef = 60;
    }
    if (type === "tomLow") {
      sf = 90;
      ef = 40;
    }
    if (genre === "electronic") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(sf * 1.5, time);
      osc.frequency.exponentialRampToValueAtTime(ef, time + 0.2);
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(sf, time);
      osc.frequency.exponentialRampToValueAtTime(ef, time + 0.4);
      gain.gain.setValueAtTime(vol * 0.9, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.5);
    return;
  }

  if (type === "kick") {
    const sf = genre === "electronic" ? 150 : genre === "metal" ? 100 : 120;
    osc.type = genre === "electronic" ? "sine" : "triangle";
    osc.frequency.setValueAtTime(sf, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      time + (genre === "jazz" ? 0.3 : 0.5),
    );
    if (genre === "metal") {
      const co = ctx.createOscillator(),
        cg = ctx.createGain();
      co.frequency.setValueAtTime(3000, time);
      co.frequency.exponentialRampToValueAtTime(100, time + 0.05);
      cg.gain.setValueAtTime(vol * 0.5, time);
      cg.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
      co.connect(cg);
      cg.connect(ctx.destination);
      co.start(time);
      co.stop(time + 0.05);
    }
  } else if (type === "snare") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(genre === "electronic" ? 200 : 180, time);
    gain.gain.setValueAtTime(vol * 0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < ctx.sampleRate; i++) d[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    const ng = ctx.createGain(),
      f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1000;
    ng.gain.setValueAtTime(vol * 0.8, time);
    ng.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    noise.connect(f);
    f.connect(ng);
    ng.connect(ctx.destination);
    noise.start(time);
  } else if (type === "hihat") {
    const sz = ctx.sampleRate * 0.5;
    const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = genre === "jazz" ? "bandpass" : "highpass";
    f.frequency.value = genre === "jazz" ? 5000 : 7000;
    if (genre === "jazz") f.Q.value = 1;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vol * 0.3, time);
    ng.gain.exponentialRampToValueAtTime(
      0.01,
      time + (genre === "jazz" ? 0.3 : 0.05),
    );
    noise.connect(f);
    f.connect(ng);
    ng.connect(ctx.destination);
    noise.start(time);
    return;
  } else if (type === "crash") {
    const sz = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 3000;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vol * 0.6, time);
    ng.gain.exponentialRampToValueAtTime(0.01, time + 1.5);
    noise.connect(f);
    f.connect(ng);
    ng.connect(ctx.destination);
    noise.start(time);
    return;
  } else if (type === "metronome" || type === "metronome_high") {
    osc.type = "sine";
    const freq = type === "metronome_high" ? 1200 : 800;
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(10, time + 0.05);
    gain.gain.setValueAtTime(vol * 0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
  }
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.5);
};

// ─────────────────────────────────────────────
// PATTERN GENERATOR
// generatorMode: 'groove' | 'fill'
// ─────────────────────────────────────────────
const generatePattern = (
  genre,
  complexity,
  intensity,
  fillAmount,
  generatorMode = "fill",
) => {
  const steps = 16;
  const p = Array(steps)
    .fill(null)
    .map(() => ({
      kick: 0,
      snare: 0,
      hihat: 0,
      tomHigh: 0,
      tomMid: 0,
      tomLow: 0,
      crash: 0,
    }));
  const r = () => Math.random();

  // ── GROOVE MODE: rich per-genre variations ──
  if (generatorMode === "groove") {
    const vol = intensity / 100;
    // Use complexity to pick variation index (0-2)
    const variant = Math.floor((complexity / 100) * 3);

    if (genre === "acoustic") {
      // Variant 0: Standard rock  1: Half-time  2: Syncopated
      const hhPat = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]; // 16th grid mask
      for (let i = 0; i < 16; i++) {
        if (i % 2 === 0) p[i].hihat = 0.55 + r() * 0.15; // base 8th hats
        if (variant >= 1 && r() > 0.5)
          p[i].hihat = Math.max(p[i].hihat, 0.3 + r() * 0.2); // extra 16ths
      }
      if (variant === 0) {
        // Standard: kick 1 & 3, snare 2 & 4
        p[0].kick = vol;
        p[8].kick = vol;
        p[4].snare = vol;
        p[12].snare = vol;
      } else if (variant === 1) {
        // Half-time: kick on 1, snare on 3
        p[0].kick = vol;
        p[6].kick = vol * 0.7;
        p[8].snare = vol;
        if (r() > 0.5) p[14].kick = vol * 0.6; // anticipation
      } else {
        // Syncopated: kick on 1, 3+, snare on 2, 4
        p[0].kick = vol;
        p[8].kick = vol;
        p[10].kick = vol * 0.75;
        p[4].snare = vol;
        p[12].snare = vol;
        if (r() > 0.4) p[3].kick = vol * 0.5;
        if (r() > 0.6) p[15].kick = vol * 0.4; // pickup kick
      }
      // Ghost notes on snare
      if (intensity > 50) {
        [2, 6, 9, 11, 14].forEach((i) => {
          if (r() > 0.55) p[i].snare = Math.max(p[i].snare, vol * 0.2);
        });
      }
      if (intensity > 80) p[0].crash = 0.8;
    } else if (genre === "funk") {
      // Rich 16th-note funk grooves
      const kickSlots = [
        [0, 6, 10],
        [0, 10, 14],
        [0, 5, 9, 14],
      ];
      const snareSlots = [
        [4, 12],
        [4, 10, 12],
        [4, 11, 12],
      ];
      const ghost = [2, 3, 6, 7, 9, 11, 13, 15];
      (kickSlots[variant] || kickSlots[0]).forEach((i) => {
        p[i].kick = vol * (i === 0 ? 1 : 0.75);
      });
      (snareSlots[variant] || snareSlots[0]).forEach((i) => {
        p[i].snare = vol;
      });
      for (let i = 0; i < 16; i++)
        p[i].hihat = (i % 2 === 0 ? 0.55 : 0.35) + r() * 0.1;
      ghost.forEach((i) => {
        if (r() > 0.45)
          p[i].snare = Math.max(p[i].snare, vol * (0.15 + r() * 0.2));
      });
      if (complexity > 60 && r() > 0.5) p[0].crash = 0.6;
    } else if (genre === "electronic") {
      // Variant 0: Four-on-floor  1: Trap  2: House w/open hats
      if (variant === 0) {
        // Classic four-on-the-floor
        for (let i = 0; i < 16; i++) p[i].hihat = 0.35 + r() * 0.1;
        [0, 4, 8, 12].forEach((i) => (p[i].kick = vol));
        [4, 12].forEach((i) => (p[i].snare = vol));
        if (r() > 0.5) p[6].kick = vol * 0.6;
      } else if (variant === 1) {
        // Trap: sparse kick, rapid 16th hats with rolls
        for (let i = 0; i < 16; i++) p[i].hihat = 0.25 + r() * 0.15;
        // Hat rolls at end of bar
        [14, 15].forEach((i) => (p[i].hihat = 0.55 + r() * 0.2));
        p[0].kick = vol;
        p[4].kick = vol * 0.7;
        p[8].snare = vol;
        if (r() > 0.5) p[11].kick = vol * 0.5;
        if (r() > 0.6) p[14].kick = vol * 0.4;
      } else {
        // House w/ open hats on the & of beats
        [0, 4, 8, 12].forEach((i) => (p[i].kick = vol));
        [4, 12].forEach((i) => (p[i].snare = vol));
        for (let i = 0; i < 16; i++) p[i].hihat = i % 2 === 0 ? 0.5 : 0.25;
        [2, 6, 10, 14].forEach((i) => (p[i].hihat = 0.55)); // open feel on off-beats
        if (r() > 0.4) p[6].kick = vol * 0.65;
      }
      if (intensity > 80) p[0].crash = 0.7;
    } else if (genre === "jazz") {
      // Variant 0: Swing ride  1: Bossa nova  2: Bebop comping
      if (variant === 0) {
        // Classic swing ride: beat on 1, skip 2, play 2& and 3
        [0, 3, 4, 7, 8, 11, 12, 15].forEach(
          (i) => (p[i].hihat = 0.45 + r() * 0.2),
        );
        p[0].kick = vol * 0.5;
        [4, 12].forEach((i) => {
          if (r() > 0.3) p[i].snare = vol * (0.3 + r() * 0.4);
        });
        [2, 6, 10, 14].forEach((i) => {
          if (r() > 0.6) p[i].kick = vol * 0.25;
        }); // comping
      } else if (variant === 1) {
        // Bossa nova: right-hand ride, left-hand rim
        [0, 3, 5, 8, 11, 13].forEach((i) => (p[i].hihat = 0.4 + r() * 0.15)); // clave-ish
        [2, 10].forEach((i) => (p[i].snare = vol * 0.35));
        p[0].kick = vol * 0.7;
        p[8].kick = vol * 0.5;
      } else {
        // Bebop: busy ride, kick/snare sparse
        for (let i = 0; i < 16; i++)
          p[i].hihat = r() > 0.3 ? 0.4 + r() * 0.25 : 0;
        [0, 4, 8, 12].forEach((i) => (p[i].hihat = 0.6));
        if (r() > 0.5) p[5].kick = vol * 0.3;
        if (r() > 0.5) p[9].kick = vol * 0.3;
        [4, 12].forEach((i) => {
          if (r() > 0.5) p[i].snare = vol * (0.2 + r() * 0.4);
        });
      }
    } else if (genre === "metal") {
      // Variant 0: Mid-tempo   1: Full double kick   2: Half-time breakdown
      [4, 12].forEach((i) => (p[i].snare = vol));
      if (variant === 0) {
        [0, 8].forEach((i) => (p[i].kick = vol));
        [2, 6, 10, 14].forEach((i) => {
          if (r() > 0.3) p[i].kick = vol * 0.8;
        });
        for (let i = 0; i < 16; i++) p[i].hihat = i % 2 === 0 ? 0.65 : 0.3;
      } else if (variant === 1) {
        // Blast-beat style: kick every 16th
        for (let i = 0; i < 16; i++) {
          p[i].kick = vol * (i % 2 === 0 ? 1 : 0.7);
          p[i].hihat = 0.6;
        }
        p[4].kick = 0;
        p[12].kick = 0; // snare takes those beats
      } else {
        // Half-time: kick 1, snare only on 3, heavy double 16ths
        p[0].kick = vol;
        p[8].kick = vol;
        p[9].kick = vol * 0.7;
        p[8].snare = vol; // half-time snare on 3
        p[4].snare = 0;
        p[12].snare = 0;
        for (let i = 0; i < 16; i++)
          p[i].hihat = i % 4 === 0 ? 0.7 : i % 2 === 0 ? 0.45 : 0;
      }
      if (intensity > 70) p[0].crash = 0.9;
    }

    return p;
  }

  // FILL mode — original logic
  const fillDuration = Math.floor((fillAmount / 100) * 16);
  const fillStartStep = 16 - fillDuration;

  for (let i = 0; i < fillStartStep; i++) {
    if (genre === "jazz") {
      if (i % 4 === 0 || i % 4 === 3) p[i].hihat = 0.5 + Math.random() * 0.2;
    } else {
      if (i % 2 === 0) p[i].hihat = 0.6 + Math.random() * 0.2;
      if (genre === "electronic" && intensity > 60) p[i].hihat = 0.5;
    }
    if (i === 0) p[i].kick = 1;
    if (i === 4 || i === 12) p[i].snare = 1;
    if (genre === "funk") {
      if (i === 10) p[i].kick = 0.8;
      if (i === 7 || i === 9) p[i].snare = 0.3;
    } else if (genre === "metal") {
      if (i === 2 || i === 3) p[i].kick = 0.9;
    } else if (genre === "electronic") {
      if (i === 6) p[i].kick = 0.8;
    }
  }

  for (let i = fillStartStep; i < steps; i++) {
    const vol = intensity / 100;
    const densityThreshold = 100 - complexity;
    if (i === fillStartStep) p[i].snare = Math.max(0.6, vol);
    const rand = Math.random();
    if (genre === "jazz") {
      if (Math.random() * 100 > densityThreshold) {
        if (rand < 0.3) p[i].snare = vol * Math.random();
        else if (rand < 0.5) p[i].tomHigh = vol * 0.8;
        else if (rand < 0.7) p[i].tomMid = vol * 0.8;
        else p[i].tomLow = vol * 0.8;
        if (i % 2 === 0) p[i].hihat = 0.4;
      }
    } else if (genre === "metal") {
      if (complexity > 50) {
        p[i].kick = vol;
        const bp = i % 4;
        if (bp === 0) p[i].snare = vol;
        else if (bp === 1) p[i].tomHigh = vol;
        else if (bp === 2) p[i].tomMid = vol;
        else p[i].tomLow = vol;
      } else {
        if (i % 4 === 0) {
          p[i].snare = 1;
          p[i].crash = 0.6;
        }
      }
    } else {
      if (Math.random() * 100 > densityThreshold) {
        if (intensity > 60 && complexity < 50) {
          p[i].snare = vol * (0.6 + (i / steps) * 0.4);
        } else {
          const fp = fillDuration > 0 ? (i - fillStartStep) / fillDuration : 0;
          if (fp < 0.33) p[i].tomHigh = vol;
          else if (fp < 0.66) p[i].tomMid = vol;
          else p[i].tomLow = vol;
        }
      }
    }
    if (intensity > 90 && i >= 14) {
      p[i].snare = 1;
      p[i].kick = 1;
      p[i].tomLow = 1;
    }
  }

  if (intensity > 70) p[0].crash = 1;
  return p;
};

// ─────────────────────────────────────────────
// DELETE CONFIRMATION MODAL
// ─────────────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="bg-neutral-800 border border-neutral-600 rounded-xl p-6 w-80 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle size={20} className="text-amber-400 shrink-0" />
        <p className="text-sm text-gray-200">{message}</p>
      </div>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-gray-300 text-sm font-bold transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// MINI PATTERN PREVIEW (for library items)
// ─────────────────────────────────────────────
const MiniPattern = ({ pattern }) => {
  const rows = [
    { id: "hihat", color: "bg-yellow-500" },
    { id: "snare", color: "bg-red-500" },
    { id: "kick", color: "bg-blue-500" },
  ];
  return (
    <div className="mt-1.5 flex flex-col gap-[2px] w-full bg-black/20 p-1 rounded-sm border border-black/10">
      {rows.map((row) => (
        <div key={row.id} className="flex gap-[1px] h-[3px]">
          {(pattern || Array(16).fill({})).slice(0, 16).map((step, i) => {
            const val = step[row.id] || 0;
            return (
              <div
                key={i}
                className={`flex-1 rounded-[0.5px] ${val > 0 ? row.color : "bg-neutral-800"}`}
                style={{ opacity: val > 0 ? 0.3 + val * 0.7 : 1 }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// PIANO ROLL & CHORD BLOCK
// ─────────────────────────────────────────────
const CHORD_ROOTS = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "Bb",
  "B",
];
const CHORD_QUALITIES = [
  "Major",
  "Minor",
  "7",
  "maj7",
  "m9",
  "dim",
  "aug",
  "sus4",
];

const PianoRollBlock = ({
  notes = [],
  chords = [],
  onNotesChange,
  onChordsChange,
  isCurrent = false,
  currentStep = -1,
  globalStart = 0,
  audioCtx = null,
  pianoInst = null,
}) => {
  // Expanded scrollable pitch lanes — base is C1 (MIDI 24)
  const BASE_MIDI = 48; // C3 — bottom of visible range; C4=row12, G4=row19
  const ROW_COUNT = 36; // 3 chromatic octaves (C3–B5)
  const ROW_HEIGHT = 14; // px per pitch lane — smaller so C3–A4 fits in viewport
  const PITCH_MAX = ROW_COUNT - 1;
  const rows = Array.from({ length: ROW_COUNT }, (_, i) => ROW_COUNT - 1 - i);

  // Compute display note names for the piano roll rows
  const NOTE_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const midiForRow = (r) => BASE_MIDI + r;
  const labelForRow = (r) => {
    const midi = midiForRow(r);
    const oct = Math.floor(midi / 12) - 1;
    return `${NOTE_NAMES[midi % 12]}${oct}`;
  };
  const clampPitch = (p) => Math.max(0, Math.min(PITCH_MAX, p));
  const visiblePitchTop = ROW_COUNT - 1;
  const visiblePitchBottom = 0;
  const scrollRef = useRef(null);

  // Auto-scroll piano roll to show C3–A4 by default
  useEffect(() => {
    if (scrollRef.current) {
      const VISIBLE_H = 300;
      // Scroll to the very bottom so C3 (row 0) is at the bottom edge and
      // A4 (row ~21) is at the top — showing the full chord+melody range at once
      scrollRef.current.scrollTop = Math.max(
        0,
        ROW_COUNT * ROW_HEIGHT - VISIBLE_H,
      );
    }
  }, []);

  // Drag state for notes
  const [draggingNoteId, setDraggingNoteId] = useState(null);
  const [dragType, setDragType] = useState(null); // 'move', 'resize'
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [initialNoteState, setInitialNoteState] = useState(null);

  // Drag state for chords
  const [draggingChordIndex, setDraggingChordIndex] = useState(null);
  const [chordDragType, setChordDragType] = useState(null);
  const [chordDragStartX, setChordDragStartX] = useState(0);
  const [initialChordState, setInitialChordState] = useState(null);

  // Handle Note Dragging
  const handlePointerDown = (e, note, type) => {
    e.stopPropagation();
    setDraggingNoteId(note.id);
    setDragType(type);
    setDragStartX(e.clientX);
    setDragStartY(e.clientY);
    setInitialNoteState({ ...note });
    e.target.setPointerCapture(e.pointerId);
  };

  const handleChordPointerDown = (e, chord, index, type) => {
    e.stopPropagation();
    // Avoid starting drag/resize when interacting with editor/quick-edit controls
    if (
      e.target.closest?.("[data-chord-editor]") ||
      e.target.closest?.("[data-chord-quick]")
    ) {
      return;
    }
    setDraggingChordIndex(index);
    setChordDragType(type);
    setChordDragStartX(e.clientX);
    setInitialChordState({ start: 0, duration: 4, ...chord });
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (draggingNoteId) {
      const noteIndex = notes.findIndex((n) => n.id === draggingNoteId);
      if (noteIndex === -1) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      const stepDelta = Math.round(dx / 24);
      const pitchDelta = Math.round(dy / ROW_HEIGHT);
      const newNotes = [...notes];
      const note = { ...initialNoteState };

      if (dragType === "move") {
        note.start = Math.max(0, Math.min(15, note.start + stepDelta));
        note.pitch = clampPitch(note.pitch - pitchDelta);
      } else if (dragType === "resize") {
        note.duration = Math.max(
          1,
          Math.min(16 - note.start, note.duration + stepDelta),
        );
      }

      newNotes[noteIndex] = note;
      onNotesChange(newNotes);
    } else if (draggingChordIndex !== null) {
      const dx = e.clientX - chordDragStartX;
      const stepDelta = Math.round(dx / 24);
      const newChords = [...chords];
      const chord = { ...initialChordState };

      if (chordDragType === "move") {
        chord.start = Math.max(
          0,
          Math.min(16 - chord.duration, chord.start + stepDelta),
        );
      } else if (chordDragType === "resize") {
        chord.duration = Math.max(
          1,
          Math.min(16 - chord.start, chord.duration + stepDelta),
        );
      }

      newChords[draggingChordIndex] = chord;
      onChordsChange(newChords);
    }
  };

  const handlePointerUp = (e) => {
    setDraggingNoteId(null);
    setDragType(null);
    setDraggingChordIndex(null);
    setChordDragType(null);
    if (e.target.hasPointerCapture(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  // Handle Note click — play piano sound + select / double-click deletes
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  const playNotePreview = (pitch) => {
    if (!pianoInst || !audioCtx) return;
    const midiNote = BASE_MIDI + pitch;
    try {
      pianoInst.start({ note: midiNote, velocity: 90, duration: 0.8 });
    } catch (_) { }
  };

  const handleNoteClick = (e, note) => {
    e.stopPropagation();
    if (e.detail === 2) {
      onNotesChange(notes.filter((n) => n.id !== note.id));
      setSelectedNoteId(null);
    } else {
      setSelectedNoteId(note.id === selectedNoteId ? null : note.id);
      playNotePreview(note.pitch);
    }
  };

  // ── Chord editor state ──
  // openChordIdx: index of chord being edited, or 'new' for adding
  const [openChordIdx, setOpenChordIdx] = useState(null);
  // newChordDraft: draft for the "Add New" chord
  const [newChordDraft, setNewChordDraft] = useState({
    root: "C",
    quality: "Major",
    start: 0,
    duration: 4,
  });

  const playChordPreview = async (chord) => {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      if (!pianoInst || typeof pianoInst.start !== "function") return;

      const normalizedRoot =
        chord?.root === "Am"
          ? "A"
          : chord?.root === "A#m"
            ? "Bb"
            : chord?.root === "D#m"
              ? "Eb"
              : chord?.root === "F#m"
                ? "F#"
                : chord?.root === "G#m"
                  ? "G#"
                  : chord?.root;

      const inferredQuality =
        chord?.quality ||
        (typeof chord?.root === "string" && chord.root.endsWith("m")
          ? "Minor"
          : "Major");

      const rootToMidi = {
        C: 48,
        "C#": 49,
        D: 50,
        Eb: 51,
        E: 52,
        F: 53,
        "F#": 54,
        G: 55,
        "G#": 56,
        A: 57,
        Bb: 58,
        B: 59,
      };
      // Apply per-chord octave (default oct 3 = C3 register)
      const baseRoot = rootToMidi[normalizedRoot] || 48;
      const root = baseRoot + ((chord.octave ?? 3) - 3) * 12;
      const pitches = [root];
      if (inferredQuality === "Minor") pitches.push(root + 3, root + 7);
      else if (inferredQuality === "7")
        pitches.push(root + 4, root + 7, root + 10);
      else if (inferredQuality === "maj7")
        pitches.push(root + 4, root + 7, root + 11);
      else if (inferredQuality === "dim") pitches.push(root + 3, root + 6);
      else if (inferredQuality === "aug") pitches.push(root + 4, root + 8);
      else if (inferredQuality === "sus4") pitches.push(root + 5, root + 7);
      else if (inferredQuality === "m9")
        pitches.push(root + 3, root + 7, root + 10, root + 14);
      else pitches.push(root + 4, root + 7);

      pitches.forEach((p) =>
        pianoInst.start({ note: p, velocity: 70, duration: 1.2 }),
      );
    } catch (_) { }
  };

  const parseChordInput = (raw = "") => {
    const src = String(raw).trim();
    if (!src) return null;
    const m = src.match(/^([A-Ga-g])([#b]?)(maj7|m9|sus4|dim|aug|m|7)?$/i);
    if (!m) return null;

    const letter = m[1].toUpperCase();
    const accidental = m[2] || "";
    const suffixRaw = (m[3] || "").toLowerCase();

    let root = `${letter}${accidental}`;
    if (root === "Db") root = "C#";
    if (root === "D#") root = "Eb";
    if (root === "Gb") root = "F#";
    if (root === "Ab") root = "G#";
    if (root === "A#") root = "Bb";

    if (!CHORD_ROOTS.includes(root)) return null;

    let quality = "Major";
    if (suffixRaw === "m") quality = "Minor";
    else if (suffixRaw === "7") quality = "7";
    else if (suffixRaw === "maj7") quality = "maj7";
    else if (suffixRaw === "m9") quality = "m9";
    else if (suffixRaw === "dim") quality = "dim";
    else if (suffixRaw === "aug") quality = "aug";
    else if (suffixRaw === "sus4") quality = "sus4";

    return { root, quality };
  };

  const formatChordLabel = (chord) =>
    `${chord.root}${chord.quality === "Major" ? "" : chord.quality}`;

  const qualityBadgeClass = (quality) => {
    if (quality === "Minor")
      return "bg-sky-500/20 text-sky-300 border-sky-400/40";
    if (quality === "Major")
      return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
    if (quality === "7" || quality === "maj7" || quality === "m9")
      return "bg-violet-500/20 text-violet-300 border-violet-400/40";
    return "bg-amber-500/20 text-amber-300 border-amber-400/40";
  };

  return (
    <div
      className="flex flex-col w-full bg-[#111] border border-neutral-700/50 rounded-lg overflow-hidden mt-2 select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Chords Track */}
      <div className="flex items-center bg-neutral-800 border-b border-neutral-700 h-8 relative">
        <div className="flex items-center px-2 border-r border-neutral-700 text-[10px] font-bold text-neutral-400 w-12 shrink-0">
          Chords
        </div>
        <div className="flex-1 relative h-full overflow-visible">
          {/* Background grid */}
          <div className="absolute inset-0 flex pointer-events-none opacity-20">
            {Array(16)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r ${i % 4 === 3 ? "border-white/10" : "border-white/[0.02]"}`}
                />
              ))}
          </div>

          {chords.map((chord, i) => {
            const start = chord.start ?? i * 4;
            const duration = chord.duration ?? 4;
            const left = (start / 16) * 100;
            const width = (duration / 16) * 100;
            const isEditing = openChordIdx === i;

            return (
              <div
                key={i}
                className="absolute h-[calc(100%-4px)] top-[2px] cursor-grab active:cursor-grabbing group/chord"
                style={{ left: `${left}%`, width: `${width}%` }}
                onPointerDown={(e) =>
                  handleChordPointerDown(e, chord, i, "move")
                }
              >
                {/* Chord pill header with Edit + quality label */}
                <div
                  className={`w-full h-full border rounded shadow-sm transition-colors flex items-center justify-between gap-1 px-1 ${isEditing
                    ? "bg-indigo-500/40 border-indigo-400"
                    : "bg-indigo-500/20 border-indigo-500/50 hover:bg-indigo-500/30"
                    }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playChordPreview(chord);
                    }}
                    className="min-w-0 flex-1 text-left flex items-baseline gap-1 overflow-hidden"
                    title="Click to preview"
                  >
                    <span className="truncate text-[10px] font-bold text-indigo-200 leading-none">
                      {formatChordLabel(chord)}
                    </span>
                    <span className="text-[7px] text-indigo-400/70 font-mono shrink-0 leading-none">
                      oct{chord.octave ?? 3}
                    </span>
                  </button>

                  <span
                    className={`px-1 py-0.5 rounded border text-[8px] font-bold uppercase tracking-widest ${qualityBadgeClass(chord.quality || "Major")}`}
                  >
                    {(chord.quality || "Major").toLowerCase()}
                  </span>

                  <button
                    data-chord-editor
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenChordIdx(isEditing ? null : i);
                    }}
                    className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-neutral-900/50 border border-indigo-300/40 text-indigo-200 hover:bg-indigo-600/50"
                    title="Edit chord"
                  >
                    Edit
                  </button>
                </div>

                {/* Hover Quick-Edit Panel */}
                <div
                  data-chord-quick
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute top-full left-0 mt-1 bg-[#161628] border border-indigo-600/40 rounded-lg shadow-2xl z-40 opacity-0 pointer-events-none group-hover/chord:opacity-100 group-hover/chord:pointer-events-auto group-focus-within/chord:opacity-100 group-focus-within/chord:pointer-events-auto transition-all duration-150 p-2 w-52"
                >
                  <div className="text-[8px] font-bold text-indigo-300 uppercase tracking-widest mb-1">
                    Quick Edit
                  </div>
                  <div className="grid grid-cols-6 gap-1 mb-2">
                    {CHORD_ROOTS.map((r) => (
                      <button
                        key={`${i}-quick-root-${r}`}
                        onClick={() => {
                          const newC = [...chords];
                          newC[i] = { ...newC[i], root: r };
                          onChordsChange(newC);
                          playChordPreview({ ...chord, root: r });
                        }}
                        className={`text-[9px] py-1 rounded font-bold transition-colors ${chord.root === r
                          ? "bg-indigo-500 text-white"
                          : "bg-neutral-700/80 text-gray-300 hover:bg-indigo-600/50"
                          }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {CHORD_QUALITIES.map((q) => (
                      <button
                        key={`${i}-quick-quality-${q}`}
                        onClick={() => {
                          const newC = [...chords];
                          newC[i] = { ...newC[i], quality: q };
                          onChordsChange(newC);
                          playChordPreview({ ...chord, quality: q });
                        }}
                        className={`text-[8px] py-1 rounded truncate px-1 font-semibold transition-colors ${chord.quality === q
                          ? "bg-indigo-500 text-white"
                          : "bg-neutral-700/80 text-gray-300 hover:bg-indigo-600/50"
                          }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  {/* Octave control */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-indigo-900/40">
                    <span className="text-[8px] text-indigo-300 font-bold uppercase tracking-widest">
                      Octave
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const newC = [...chords];
                          newC[i] = {
                            ...newC[i],
                            octave: Math.max(1, (chord.octave ?? 3) - 1),
                          };
                          onChordsChange(newC);
                          playChordPreview(newC[i]);
                        }}
                        className="w-5 h-5 rounded bg-neutral-700 hover:bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center leading-none"
                      >
                        −
                      </button>
                      <span className="text-[10px] text-white font-bold font-mono w-4 text-center">
                        {chord.octave ?? 3}
                      </span>
                      <button
                        onClick={() => {
                          const newC = [...chords];
                          newC[i] = {
                            ...newC[i],
                            octave: Math.min(6, (chord.octave ?? 3) + 1),
                          };
                          onChordsChange(newC);
                          playChordPreview(newC[i]);
                        }}
                        className="w-5 h-5 rounded bg-neutral-700 hover:bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center leading-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Delete on Hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onChordsChange(chords.filter((_, idx) => idx !== i));
                    setOpenChordIdx(null);
                  }}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 hover:bg-red-400 text-white rounded-full opacity-0 group-hover/chord:opacity-100 flex items-center justify-center text-[9px] border border-white/20 shadow-lg z-20 leading-none"
                >
                  ×
                </button>

                {/* Resize Handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-400/50"
                  onPointerDown={(e) =>
                    handleChordPointerDown(e, chord, i, "resize")
                  }
                />

                {/* ── Chord Editor Popover (double-click) ── */}
                {isEditing && (
                  <div
                    data-chord-editor
                    className="absolute top-full left-0 mt-1 bg-[#1a1a2e] border border-indigo-600/50 rounded-xl shadow-2xl z-50 w-64 flex flex-col cursor-default overflow-hidden"
                    style={{ minWidth: 256 }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {/* Popover header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-indigo-900/40 border-b border-indigo-700/40">
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                        ✏️ Edit Chord
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => playChordPreview(chord)}
                          className="text-[9px] px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-300 border border-indigo-500/30 font-bold"
                          title="Preview sound"
                        >
                          ▶ Play
                        </button>
                        <button
                          onClick={() => setOpenChordIdx(null)}
                          className="text-neutral-500 hover:text-white text-[13px] leading-none"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="p-3 flex flex-col gap-3">
                      {/* Text input parser (e.g. C, Am, F#maj7, Bdim) */}
                      <div>
                        <div className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                          Chord Text Input
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            defaultValue={formatChordLabel(chord)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const parsed = parseChordInput(
                                  e.currentTarget.value,
                                );
                                if (!parsed) return;
                                const newC = [...chords];
                                newC[i] = { ...newC[i], ...parsed };
                                onChordsChange(newC);
                                playChordPreview(newC[i]);
                              }
                            }}
                            className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-indigo-500"
                            placeholder="C, Am, F#maj7, Bdim..."
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const input =
                                e.currentTarget.parentElement?.querySelector(
                                  "input",
                                );
                              const parsed = parseChordInput(
                                input?.value || "",
                              );
                              if (!parsed) return;
                              const newC = [...chords];
                              newC[i] = { ...newC[i], ...parsed };
                              onChordsChange(newC);
                              playChordPreview(newC[i]);
                            }}
                            className="text-[9px] font-bold px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-200 border border-indigo-400/40"
                          >
                            Apply
                          </button>
                        </div>
                      </div>

                      {/* Root */}
                      <div>
                        <div className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                          Root Note
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                          {CHORD_ROOTS.map((r) => (
                            <button
                              key={r}
                              onClick={() => {
                                const newC = [...chords];
                                newC[i] = { ...newC[i], root: r };
                                onChordsChange(newC);
                                playChordPreview({ ...chord, root: r });
                              }}
                              className={`text-[10px] py-1 rounded font-bold transition-colors ${chord.root === r ? "bg-indigo-500 text-white shadow-md" : "bg-neutral-700/80 text-gray-300 hover:bg-indigo-600/50"}`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Quality */}
                      <div>
                        <div className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                          Quality
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {CHORD_QUALITIES.map((q) => (
                            <button
                              key={q}
                              onClick={() => {
                                const newC = [...chords];
                                newC[i] = { ...newC[i], quality: q };
                                onChordsChange(newC);
                                playChordPreview({ ...chord, quality: q });
                              }}
                              className={`text-[9px] py-1 rounded truncate px-1 font-semibold transition-colors ${chord.quality === q ? "bg-indigo-500 text-white shadow-md" : "bg-neutral-700/80 text-gray-300 hover:bg-indigo-600/50"}`}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Octave */}
                      <div>
                        <div className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                          Octave Register
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newC = [...chords];
                              newC[i] = {
                                ...newC[i],
                                octave: Math.max(1, (chord.octave ?? 3) - 1),
                              };
                              onChordsChange(newC);
                              playChordPreview(newC[i]);
                            }}
                            className="w-7 h-7 rounded bg-neutral-700 hover:bg-indigo-600 text-white text-[14px] font-bold flex items-center justify-center leading-none transition-colors"
                          >
                            −
                          </button>
                          <div className="flex-1 text-center">
                            <span className="text-[13px] font-bold text-white font-mono">
                              Oct {chord.octave ?? 3}
                            </span>
                            <div className="text-[8px] text-neutral-500 font-mono">
                              C{chord.octave ?? 3} = MIDI{" "}
                              {48 + ((chord.octave ?? 3) - 3) * 12}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const newC = [...chords];
                              newC[i] = {
                                ...newC[i],
                                octave: Math.min(6, (chord.octave ?? 3) + 1),
                              };
                              onChordsChange(newC);
                              playChordPreview(newC[i]);
                            }}
                            className="w-7 h-7 rounded bg-neutral-700 hover:bg-indigo-600 text-white text-[14px] font-bold flex items-center justify-center leading-none transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Divider + Add New + Delete row */}
                      <div className="border-t border-neutral-700/60 pt-2 flex gap-2">
                        <button
                          onClick={() => {
                            // Add a new chord right after this one
                            const newStart = Math.min(
                              15,
                              (chord.start ?? 0) + (chord.duration ?? 4),
                            );
                            const draft = {
                              root: "C",
                              quality: "Major",
                              start: newStart,
                              duration: 4,
                              octave: 3,
                            };
                            const newC = [...chords];
                            newC.splice(i + 1, 0, draft);
                            onChordsChange(newC);
                            setOpenChordIdx(i + 1);
                          }}
                          className="flex-1 text-[9px] font-bold text-emerald-400 hover:text-white hover:bg-emerald-600 py-1.5 rounded border border-emerald-500/40 hover:border-emerald-500 transition-all flex items-center justify-center gap-1"
                        >
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Add New
                        </button>
                        <button
                          onClick={() => {
                            onChordsChange(
                              chords.filter((_, idx) => idx !== i),
                            );
                            setOpenChordIdx(null);
                          }}
                          className="flex-1 text-[9px] font-bold text-red-400 hover:text-white hover:bg-red-600 py-1.5 rounded border border-red-500/40 hover:border-red-500 transition-all flex items-center justify-center gap-1"
                        >
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Chord button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              let newStart = 0;
              for (let s = 0; s <= 12; s += 4) {
                if (!chords.some((c) => (c.start ?? 0) === s)) {
                  newStart = s;
                  break;
                }
              }
              onChordsChange([
                ...chords,
                {
                  root: "C",
                  quality: "Major",
                  start: newStart,
                  duration: 4,
                  octave: 3,
                },
              ]);
              setOpenChordIdx(chords.length);
            }}
            className="absolute top-[2px] right-1 h-6 w-6 rounded flex items-center justify-center bg-neutral-700 hover:bg-indigo-600 text-neutral-300 text-[12px] z-10 shrink-0 shadow-md font-bold"
            title="Add Chord (or double-click existing to edit)"
          >
            +
          </button>
        </div>
      </div>

      {/* Piano Roll Grid (true vertical scrolling) */}
      <div
        ref={scrollRef}
        className="flex bg-[#0a0a0a] relative h-[300px] overflow-y-auto overflow-x-hidden"
      >
        <div
          className="flex flex-col w-14 shrink-0 border-r border-neutral-800 bg-neutral-900"
          style={{ height: ROW_COUNT * ROW_HEIGHT }}
        >
          {rows.map((r) => (
            <div
              key={r}
              className={`flex items-center justify-center text-[8px] font-mono border-b border-neutral-800/70 ${NOTE_NAMES[midiForRow(r) % 12] === "C"
                ? "text-indigo-300 font-bold bg-indigo-500/10"
                : "text-neutral-500"
                }`}
              style={{ height: ROW_HEIGHT }}
            >
              {labelForRow(r)}
            </div>
          ))}
        </div>

        <div
          className="flex-1 relative border-b border-neutral-800"
          style={{ height: ROW_COUNT * ROW_HEIGHT }}
        >
          {/* Horizontal pitch lines */}
          <div className="absolute inset-0 pointer-events-none">
            {rows.map((r) => (
              <div
                key={r}
                className={`absolute left-0 right-0 border-b ${NOTE_NAMES[midiForRow(r) % 12] === "C"
                  ? "border-indigo-500/25"
                  : "border-white/[0.03]"
                  }`}
                style={{
                  top: (ROW_COUNT - 1 - r) * ROW_HEIGHT,
                  height: ROW_HEIGHT,
                }}
              />
            ))}
          </div>

          {/* Vertical beat lines */}
          <div className="absolute inset-0 flex pointer-events-none">
            {Array(16)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r ${i % 4 === 3 ? "border-white/15" : "border-white/[0.03]"
                    }`}
                />
              ))}
          </div>

          {/* Playhead */}
          {isCurrent &&
            currentStep >= globalStart &&
            currentStep < globalStart + 16 && (
              <div
                className="absolute top-0 bottom-0 w-px bg-emerald-500/50 z-10 pointer-events-none"
                style={{ left: `${((currentStep - globalStart) / 16) * 100}%` }}
              />
            )}

          {/* Notes */}
          {notes.map((note) => {
            const left = (note.start / 16) * 100;
            const width = (note.duration / 16) * 100;
            const safePitch = Math.max(
              visiblePitchBottom,
              Math.min(visiblePitchTop, note.pitch),
            );
            const top = (ROW_COUNT - 1 - safePitch) * ROW_HEIGHT;
            const isSelected = note.id === selectedNoteId;
            const noteName = labelForRow(safePitch);

            return (
              <div
                key={note.id}
                className={`absolute border rounded-[2px] cursor-grab active:cursor-grabbing flex items-center shadow-sm transition-colors group/note ${isSelected
                  ? "border-emerald-300 bg-emerald-400/40 ring-1 ring-emerald-300/50"
                  : "border-emerald-500 bg-emerald-500/20 hover:bg-emerald-500/40"
                  }`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  top,
                  height: ROW_HEIGHT - 1,
                }}
                onPointerDown={(e) => handlePointerDown(e, note, "move")}
                onClick={(e) => handleNoteClick(e, note)}
                title={`${note.text} • ${noteName} • Click to preview • Dbl-click to delete`}
              >
                <div className="flex items-center gap-0.5 px-1 min-w-0 pointer-events-none">
                  <span className="text-[9px] font-bold text-emerald-100 truncate drop-shadow-md leading-none">
                    {note.text}
                  </span>
                  {isSelected && (
                    <span className="text-[7px] text-emerald-300/70 font-mono shrink-0 leading-none">
                      {noteName}
                    </span>
                  )}
                </div>

                {isSelected && (
                  <button
                    className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 hover:bg-red-400 text-white rounded-full flex items-center justify-center text-[9px] border border-white/30 shadow-lg z-20 leading-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNotesChange(notes.filter((n) => n.id !== note.id));
                      setSelectedNoteId(null);
                    }}
                    title="Delete note"
                  >
                    ×
                  </button>
                )}

                <div
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-emerald-400/50 transition-colors"
                  onPointerDown={(e) => handlePointerDown(e, note, "resize")}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Guide bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-neutral-900 border-t border-neutral-800 text-[8px] text-neutral-500 font-bold uppercase tracking-widest">
        <div className="flex items-center gap-3">
          <span>
            Note: Drag • Resize edge • Click=preview+select • Dbl-click=delete
          </span>
          <span className="text-neutral-700">|</span>
          <span>Chord: Click=preview • Dbl-click=edit/add • ×=delete</span>
        </div>
        <span className="text-neutral-700 font-mono">
          Piano Roll {labelForRow(visiblePitchBottom)}–
          {labelForRow(visiblePitchTop)} • Chord octave per block
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const DrumFillGen = () => {
  // ── Load Initial State ──
  const getSavedState = () => {
    try {
      const stored = localStorage.getItem("drumFillGen_saveState");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.segments)) return parsed;
      return null;
    } catch (e) {
      return null;
    }
  };
  const savedState = getSavedState();

  // ── App mode ──
  const [appMode, setAppMode] = useState("generator");

  // ── Generator sub-mode ──
  const [generatorMode, setGeneratorMode] = useState(
    savedState?.generatorMode ?? "groove",
  );

  // ── Playback ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(savedState?.bpm ?? 110);

  // ── Generator params ──
  const [genre, setGenre] = useState(savedState?.genre ?? "acoustic");
  const [complexity, setComplexity] = useState(savedState?.complexity ?? 60);
  const [intensity, setIntensity] = useState(savedState?.intensity ?? 70);
  const [fillAmount, setFillAmount] = useState(savedState?.fillAmount ?? 25);

  // ── Manual Pattern ──
  const [manualPattern, setManualPattern] = useState(
    savedState?.manualPattern ??
    Array(16)
      .fill(null)
      .map(() => ({ kick: 0, snare: 0 })),
  );

  const defaultLib = [
    {
      id: "lib-1",
      name: "Default Groove",
      type: "groove",
      pattern: generatePattern("acoustic", 60, 70, 0, "groove"),
      params: {
        genre: "acoustic",
        complexity: 60,
        intensity: 70,
        fillAmount: 0,
        generatorMode: "groove",
      },
    },
    {
      id: "lib-2",
      name: "Default Fill",
      type: "fill",
      pattern: generatePattern("acoustic", 60, 70, 50, "fill"),
      params: {
        genre: "acoustic",
        complexity: 60,
        intensity: 70,
        fillAmount: 50,
        generatorMode: "fill",
      },
    },
  ];

  const [pattern, setPattern] = useState(
    savedState?.pattern ??
    (() => generatePattern("acoustic", 60, 70, 25, "groove")),
  );

  // ── Library ──
  const [library, setLibrary] = useState(savedState?.library ?? defaultLib);

  // ── Arrangement ──
  const [segments, setSegments] = useState(
    savedState?.segments ?? [
      {
        id: "seg-1",
        name: "Intro",
        bars: ["lib-1", null, null, null],
        playbackMode: "next",
      },
      {
        id: "seg-2",
        name: "Verse",
        bars: ["lib-1", "lib-1", "lib-1", "lib-2"],
        playbackMode: "next",
      },
    ],
  );
  const [confirmModal, setConfirmModal] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [openSegMenu, setOpenSegMenu] = useState(null); // segIndex of open kebab menu
  const [editingLibId, setEditingLibId] = useState(null); // id of lib item currently loaded in generator
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false); // is lyrics panel expanded
  const [isDayTheme, setIsDayTheme] = useState(savedState?.isDayTheme ?? false); // day theme toggle
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState(
    savedState?.isMetronomeEnabled ?? false,
  ); // metronome toggle
  const [isGrooveLooping, setIsGrooveLooping] = useState(
    savedState?.isGrooveLooping ?? true,
  ); // generator groove loop toggle

  // ── Refs ──
  const audioCtxRef = useRef(null);
  const pianoRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIDRef = useRef(null);

  // Close segment kebab menu on outside click
  useEffect(() => {
    if (openSegMenu === null) return;
    const close = () => setOpenSegMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openSegMenu]);

  // ── Active pattern for playback ──
  const activePattern = useMemo(() => {
    if (appMode === "generator") return pattern;
    let flat = [];
    segments.forEach((seg) =>
      seg.bars.forEach((barId) => {
        const item = barId ? library.find((l) => l.id === barId) : null;
        flat.push(
          ...(item
            ? item.pattern
            : Array(16)
              .fill(null)
              .map(() => ({}))),
        );
      }),
    );
    return flat.length > 0
      ? flat
      : Array(16)
        .fill(null)
        .map(() => ({}));
  }, [appMode, pattern, segments, library]);

  const maxSteps = useMemo(() => activePattern.length || 16, [activePattern]);

  // ── Auto Save to LocalStorage ──
  useEffect(() => {
    const stateToSave = {
      generatorMode,
      bpm,
      genre,
      complexity,
      intensity,
      fillAmount,
      manualPattern,
      pattern,
      library,
      segments,
      isDayTheme,
      isMetronomeEnabled,
      isGrooveLooping,
    };
    localStorage.setItem("drumFillGen_saveState", JSON.stringify(stateToSave));
  }, [
    generatorMode,
    bpm,
    genre,
    complexity,
    intensity,
    fillAmount,
    manualPattern,
    pattern,
    library,
    segments,
    isDayTheme,
    isMetronomeEnabled,
    isGrooveLooping,
  ]);

  // ── Regen when params change ──
  useEffect(() => {
    const genModeRaw = generatorMode === "manual" ? "groove" : generatorMode;
    const newPattern = generatePattern(
      genre,
      complexity,
      intensity,
      genModeRaw === "groove" ? 0 : fillAmount,
      genModeRaw,
    );
    if (generatorMode === "manual") {
      for (let i = 0; i < 16; i++) {
        newPattern[i].kick = manualPattern[i].kick;
        newPattern[i].snare = manualPattern[i].snare;
      }
    }
    setPattern(newPattern);
  }, [genre, complexity, intensity, fillAmount, generatorMode, manualPattern]);

  // ── MIDI ──
  const generateMidiBlob = useCallback(() => {
    const writeVarInt = (value) => {
      if (value === 0) return [0];
      const stack = [];
      let t = value;
      while (t > 0) {
        stack.push(t & 0x7f);
        t >>= 7;
      }
      const res = [];
      for (let i = stack.length - 1; i >= 0; i--) {
        let b = stack[i];
        if (i > 0) b |= 0x80;
        res.push(b);
      }
      return res;
    };
    const stringToBytes = (str) =>
      unescape(encodeURIComponent(str))
        .split("")
        .map((c) => c.charCodeAt(0));

    const tpb = 480,
      tp16 = tpb / 4,
      uspb = Math.round(60000000 / bpm);
    const tempoData = [
      0x00,
      0xff,
      0x51,
      0x03,
      (uspb >> 16) & 0xff,
      (uspb >> 8) & 0xff,
      uspb & 0xff,
      0x00,
      0xff,
      0x2f,
      0x00,
    ];
    const tempoHeader = [
      0x4d,
      0x54,
      0x72,
      0x6b,
      (tempoData.length >> 24) & 0xff,
      (tempoData.length >> 16) & 0xff,
      (tempoData.length >> 8) & 0xff,
      tempoData.length & 0xff,
    ];
    const trackData = [];
    const events = [];
    const GM_MAP = {
      kick: 36,
      snare: 38,
      hihat: 42,
      tomHigh: 50,
      tomMid: 47,
      tomLow: 43,
      crash: 49,
    };

    const trackNameStr =
      appMode === "arrangement" ? "AI Drum Arrangement" : "AI Drum Pattern";
    const trackNameBytes = stringToBytes(trackNameStr);
    events.push({
      tick: 0,
      isMeta: true,
      data: [
        0xff,
        0x03,
        ...writeVarInt(trackNameBytes.length),
        ...trackNameBytes,
      ],
    });

    if (appMode === "arrangement") {
      let stepOffset = 0;
      segments.forEach((seg) => {
        const markerBytes = stringToBytes(`Part: ${seg.name}`);
        events.push({
          tick: stepOffset * tp16,
          isMeta: true,
          data: [
            0xff,
            0x06,
            ...writeVarInt(markerBytes.length),
            ...markerBytes,
          ],
        });

        seg.bars.forEach((barId) => {
          const item = barId ? library.find((l) => l.id === barId) : null;
          if (item) {
            const descBytes = stringToBytes(`Pattern: ${item.name}`);
            events.push({
              tick: stepOffset * tp16,
              isMeta: true,
              data: [
                0xff,
                0x01,
                ...writeVarInt(descBytes.length),
                ...descBytes,
              ],
            });
          }

          const pat = item ? item.pattern : Array(16).fill({});
          pat.forEach((step, idx) => {
            const tick = (stepOffset + idx) * tp16;
            Object.entries(step).forEach(([inst, val]) => {
              if (val > 0 && GM_MAP[inst]) {
                const vel = Math.min(127, Math.max(1, Math.floor(val * 127)));
                events.push({
                  tick,
                  isMeta: false,
                  data: [0x99, GM_MAP[inst], vel],
                });
                events.push({
                  tick: tick + 60,
                  isMeta: false,
                  data: [0x99, GM_MAP[inst], 0],
                });
              }
            });
          });
          stepOffset += 16;
        });
      });
    } else {
      pattern.forEach((step, idx) => {
        const tick = idx * tp16;
        Object.entries(step).forEach(([inst, val]) => {
          if (val > 0 && GM_MAP[inst]) {
            const vel = Math.min(127, Math.max(1, Math.floor(val * 127)));
            events.push({
              tick,
              isMeta: false,
              data: [0x99, GM_MAP[inst], vel],
            });
            events.push({
              tick: tick + 60,
              isMeta: false,
              data: [0x99, GM_MAP[inst], 0],
            });
          }
        });
      });
    }

    events.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      if (a.isMeta !== b.isMeta) return a.isMeta ? -1 : 1;
      if (!a.isMeta && !b.isMeta) {
        const velA = a.data[2];
        const velB = b.data[2];
        if (velA === 0 && velB > 0) return -1;
        if (velB === 0 && velA > 0) return 1;
      }
      return 0;
    });

    let lastTick = 0;
    events.forEach((e) => {
      const d = e.tick - lastTick;
      lastTick = e.tick;
      trackData.push(...writeVarInt(d));
      trackData.push(...e.data);
    });
    trackData.push(0x00, 0xff, 0x2f, 0x00);

    const header = [
      0x4d,
      0x54,
      0x68,
      0x64,
      0x00,
      0x00,
      0x00,
      0x06,
      0x00,
      0x01,
      0x00,
      0x02,
      (tpb >> 8) & 0xff,
      tpb & 0xff,
    ];
    const trackHeader = [
      0x4d,
      0x54,
      0x72,
      0x6b,
      (trackData.length >> 24) & 0xff,
      (trackData.length >> 16) & 0xff,
      (trackData.length >> 8) & 0xff,
      trackData.length & 0xff,
    ];
    return new Blob(
      [
        new Uint8Array([
          ...header,
          ...tempoHeader,
          ...tempoData,
          ...trackHeader,
          ...trackData,
        ]),
      ],
      { type: "audio/midi" },
    );
  }, [pattern, segments, library, bpm, appMode]);

  const exportMIDI = () => {
    const blob = generateMidiBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drum-${appMode}-${Date.now()}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ── Playback engine ──
  const scheduleNote = useCallback(
    (step, time) => {
      requestAnimationFrame(() => setCurrentStep(step));
      const s = activePattern[step];
      if (!s) return;
      const ctx = audioCtxRef.current;
      if (s.kick > 0) playSound(ctx, "kick", time, s.kick, genre);
      if (s.snare > 0) playSound(ctx, "snare", time, s.snare, genre);
      if (s.hihat > 0) playSound(ctx, "hihat", time, s.hihat, genre);
      if (s.tomHigh > 0) playSound(ctx, "tomHigh", time, s.tomHigh, genre);
      if (s.tomMid > 0) playSound(ctx, "tomMid", time, s.tomMid, genre);
      if (s.tomLow > 0) playSound(ctx, "tomLow", time, s.tomLow, genre);
      if (s.crash > 0) playSound(ctx, "crash", time, s.crash, genre);

      // Metronome logic
      if (isMetronomeEnabled && step % 4 === 0) {
        const isHigh = step % 16 === 0;
        playSound(ctx, isHigh ? "metronome_high" : "metronome", time, 1, genre);
      }

      // Piano logic for Lyrics & Chords (Arrangement mode)
      if (appMode === "arrangement") {
        let pBars = 0;
        let currentSeg = null;
        let currentBarIdx = 0;
        for (let i = 0; i < segments.length; i++) {
          if (
            step >= pBars * 16 &&
            step < (pBars + segments[i].bars.length) * 16
          ) {
            currentSeg = segments[i];
            currentBarIdx = Math.floor((step - pBars * 16) / 16);
            break;
          }
          pBars += segments[i].bars.length;
        }

        if (currentSeg && pianoRef.current) {
          const stepInBar = step % 16;

          // 1. Play Chord
          if (currentSeg.barChords && currentSeg.barChords[currentBarIdx]) {
            const chords = currentSeg.barChords[currentBarIdx];
            chords.forEach((chord, chordIndex) => {
              const chordStart = chord.start ?? chordIndex * 4;
              if (chordStart === stepInBar) {
                // Simple chord to MIDI mapping
                const rootToMidi = {
                  C: 48,
                  "C#": 49,
                  D: 50,
                  Eb: 51,
                  E: 52,
                  F: 53,
                  "F#": 54,
                  G: 55,
                  "G#": 56,
                  A: 57,
                  Bb: 58,
                  B: 59,
                };
                const normalizedRoot =
                  chord?.root === "Am"
                    ? "A"
                    : chord?.root === "A#m"
                      ? "Bb"
                      : chord?.root === "D#m"
                        ? "Eb"
                        : chord?.root === "F#m"
                          ? "F#"
                          : chord?.root === "G#m"
                            ? "G#"
                            : chord?.root;
                const inferredQuality =
                  chord?.quality ||
                  (typeof chord?.root === "string" && chord.root.endsWith("m")
                    ? "Minor"
                    : "Major");
                // Apply per-chord octave (default oct 3 = C3 register)
                const baseRoot = rootToMidi[normalizedRoot] || 48;
                const root = baseRoot + ((chord.octave ?? 3) - 3) * 12;
                const pitches = [root];
                if (inferredQuality === "Minor")
                  pitches.push(root + 3, root + 7);
                else if (inferredQuality === "7")
                  pitches.push(root + 4, root + 7, root + 10);
                else if (inferredQuality === "maj7")
                  pitches.push(root + 4, root + 7, root + 11);
                else if (inferredQuality === "dim")
                  pitches.push(root + 3, root + 6);
                else if (inferredQuality === "aug")
                  pitches.push(root + 4, root + 8);
                else if (inferredQuality === "sus4")
                  pitches.push(root + 5, root + 7);
                else if (inferredQuality === "m9")
                  pitches.push(root + 3, root + 7, root + 10, root + 14);
                else pitches.push(root + 4, root + 7); // Major default

                pitches.forEach((p) => {
                  pianoRef.current.start({
                    note: p,
                    velocity: 68,
                    time: time,
                    duration: (chord.duration * (60 / bpm)) / 4,
                  });
                });
              }
            });
          }

          // 2. Play Lyric Note — base pitch C1 (MIDI 24)
          if (currentSeg.barLyrics && currentSeg.barLyrics[currentBarIdx]) {
            const notes = currentSeg.barLyrics[currentBarIdx];
            notes.forEach((note) => {
              if (note.start === stepInBar) {
                // row 0 = C3 (48), row 12 = C4 (60), row 19 = G4 (67), ascending by semitone
                const midiPitch = 48 + note.pitch;
                pianoRef.current.start({
                  note: midiPitch,
                  velocity: 80,
                  time: time,
                  duration: (note.duration * (60 / bpm)) / 4,
                });
              }
            });
          }
        }
      }
    },
    [activePattern, genre, isMetronomeEnabled, appMode, segments, bpm],
  );

  const scheduler = useCallback(() => {
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
      scheduleNote(currentStepRef.current, nextNoteTimeRef.current);
      nextNoteTimeRef.current += 60.0 / bpm / 4;

      let nextStep = currentStepRef.current + 1;

      if (appMode === "arrangement") {
        // Determine current segment and bar bounds
        let segStartStep = 0;
        let segEndStep = 0;
        let currentSeg = null;
        let barStartStep = 0;
        let barEndStep = 0;
        let currentBarIdx = -1;

        let pBars = 0;
        for (let i = 0; i < segments.length; i++) {
          const segLen = segments[i].bars.length * 16;
          if (
            currentStepRef.current >= pBars * 16 &&
            currentStepRef.current < (pBars + segments[i].bars.length) * 16
          ) {
            currentSeg = segments[i];
            segStartStep = pBars * 16;
            segEndStep = segStartStep + segLen;
            currentBarIdx = Math.floor(
              (currentStepRef.current - segStartStep) / 16,
            );
            barStartStep = segStartStep + currentBarIdx * 16;
            barEndStep = barStartStep + 16;
            break;
          }
          pBars += segments[i].bars.length;
        }

        if (currentSeg && nextStep === barEndStep) {
          // Check per-bar playback mode first: 'loop' | 'next' | 'stop'
          const barMode =
            currentSeg.barPlayModes && currentSeg.barPlayModes[currentBarIdx]
              ? currentSeg.barPlayModes[currentBarIdx]
              : "next";

          if (barMode === "loop") {
            // Stay on this groove bar — loop it
            nextStep = barStartStep;
          } else if (barMode === "stop") {
            // Stop playback after this groove bar finishes
            setIsPlaying(false);
            return;
          } else {
            // barMode === 'next' — advance normally
            if (nextStep === segEndStep) {
              // Reached end of segment — check segment mode
              const segMode = currentSeg.playbackMode || "next";
              if (segMode === "loop") {
                nextStep = segStartStep;
              } else if (segMode === "stop") {
                setIsPlaying(false);
                return;
              } else {
                if (nextStep >= maxSteps) nextStep = 0;
              }
            } else if (nextStep >= maxSteps) {
              nextStep = 0;
            }
          }
        } else if (nextStep >= maxSteps) {
          nextStep = 0;
        }
      } else {
        if (nextStep >= maxSteps) {
          if (isGrooveLooping) {
            nextStep = 0;
          } else {
            setIsPlaying(false);
            return;
          }
        }
      }

      currentStepRef.current = nextStep;
    }
    timerIDRef.current = setTimeout(scheduler, 25);
  }, [
    scheduleNote,
    bpm,
    maxSteps,
    appMode,
    segments,
    isGrooveLooping,
    setIsPlaying,
  ]);

  useEffect(() => {
    if (isPlaying) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = createAudioContext();
      }
      if (!pianoRef.current) {
        pianoRef.current = new Soundfont(audioCtxRef.current, {
          instrument: "acoustic_grand_piano",
        });
      }
      if (audioCtxRef.current.state === "suspended")
        audioCtxRef.current.resume();
      nextNoteTimeRef.current = audioCtxRef.current.currentTime;

      scheduler();
    } else {
      clearTimeout(timerIDRef.current);
      setCurrentStep(-1);
      currentStepRef.current = 0; // Rewind to beginning on STOP
    }
    return () => clearTimeout(timerIDRef.current);
  }, [isPlaying, scheduler, appMode]);

  // ── Library helpers ──
  const saveToLibrary = () => {
    const effectiveFill =
      generatorMode === "groove" || generatorMode === "manual" ? 0 : fillAmount;

    if (editingLibId) {
      setLibrary((prev) =>
        prev.map((l) =>
          l.id === editingLibId
            ? {
              ...l,
              pattern: pattern.map((s) => ({ ...s })),
              params: {
                genre,
                complexity,
                intensity,
                fillAmount: effectiveFill,
                generatorMode,
              },
              manualPattern: manualPattern.map((s) => ({ ...s })),
            }
            : l,
        ),
      );
    } else {
      const typeLabel =
        generatorMode === "groove"
          ? "Groove"
          : generatorMode === "manual"
            ? "Manual"
            : "Fill";
      const newItem = {
        id: `lib-${Date.now()}`,
        name: `${genre.charAt(0).toUpperCase() + genre.slice(1)} ${typeLabel}`,
        type: generatorMode,
        pattern: pattern.map((s) => ({ ...s })),
        params: {
          genre,
          complexity,
          intensity,
          fillAmount: effectiveFill,
          generatorMode,
        },
        manualPattern: manualPattern.map((s) => ({ ...s })),
      };
      setLibrary((prev) => [...prev, newItem]);
    }
  };

  const loadFromLibrary = (libItem) => {
    const { params } = libItem;
    setGenre(params.genre);
    setComplexity(params.complexity);
    setIntensity(params.intensity);
    setFillAmount(params.fillAmount);
    setGeneratorMode(params.generatorMode);
    if (libItem.manualPattern)
      setManualPattern(libItem.manualPattern.map((s) => ({ ...s })));
    setPattern([...libItem.pattern]);
    setEditingLibId(libItem.id);
    setAppMode("generator");
    setIsPlaying(false);
  };

  const renameLibraryItem = (id, newName) => {
    setLibrary((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, name: newName.trim() || l.name } : l,
      ),
    );
    setRenamingId(null);
  };

  const deleteFromLibrary = (id) => {
    setLibrary((prev) => prev.filter((l) => l.id !== id));
  };

  // ── Arrangement helpers ──
  const handleDropInSegment = (e, targetSegIndex, targetBarIndex) => {
    const libId = e.dataTransfer.getData("libraryId");
    if (libId) {
      setSegments((prev) =>
        prev.map((seg, si) =>
          si !== targetSegIndex
            ? seg
            : {
              ...seg,
              bars: seg.bars.map((b, bi) =>
                bi === targetBarIndex ? libId : b,
              ),
            },
        ),
      );
      return;
    }

    const dragType = e.dataTransfer.getData("type");
    if (dragType === "bar") {
      const srcSeg = parseInt(e.dataTransfer.getData("segIndex"), 10);
      const srcBar = parseInt(e.dataTransfer.getData("barIndex"), 10);
      if (srcSeg === targetSegIndex && srcBar === targetBarIndex) return;

      setSegments((prev) => {
        const next = [...prev];
        const srcItem = next[srcSeg].bars[srcBar];
        const targetItem = next[targetSegIndex].bars[targetBarIndex];

        const updatedSrcBars = [...next[srcSeg].bars];
        const updatedTargetBars =
          srcSeg === targetSegIndex
            ? updatedSrcBars
            : [...next[targetSegIndex].bars];

        updatedSrcBars[srcBar] = targetItem;
        updatedTargetBars[targetBarIndex] = srcItem;

        next[srcSeg] = { ...next[srcSeg], bars: updatedSrcBars };
        if (srcSeg !== targetSegIndex) {
          next[targetSegIndex] = {
            ...next[targetSegIndex],
            bars: updatedTargetBars,
          };
        }
        return next;
      });
    }
  };

  // KEEP the bar slot, just clear its content. If already empty, remove it completely.
  const removeBar = (segIndex, barIndex) => {
    setSegments((prev) =>
      prev.map((seg, si) =>
        si !== segIndex
          ? seg
          : {
            ...seg,
            bars:
              seg.bars[barIndex] === null
                ? seg.bars.filter((_, bi) => bi !== barIndex)
                : seg.bars.map((b, bi) => (bi === barIndex ? null : b)),
          },
      ),
    );
  };

  // SEEK playback to a specific global bar, then play
  const seekToBar = useCallback(
    (globalBarIndex) => {
      const targetStep = globalBarIndex * 16;
      if (targetStep >= maxSteps) return;
      if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
      if (!pianoRef.current) {
        pianoRef.current = new Soundfont(audioCtxRef.current, {
          instrument: "acoustic_grand_piano",
        });
      }
      if (audioCtxRef.current.state === "suspended")
        audioCtxRef.current.resume();
      clearTimeout(timerIDRef.current);
      currentStepRef.current = targetStep;
      nextNoteTimeRef.current = audioCtxRef.current.currentTime;
      if (!isPlaying) {
        setIsPlaying(true); // let useEffect kick off the scheduler
      } else {
        scheduler(); // already playing — restart scheduler loop from new position
      }
    },
    [maxSteps, isPlaying, scheduler],
  );

  const deleteSegment = (segIndex) => {
    const seg = segments[segIndex];
    const hasPatterns = seg.bars.some((b) => b !== null);
    const doDelete = () => {
      setSegments((prev) => prev.filter((_, i) => i !== segIndex));
      setConfirmModal(null);
    };
    if (hasPatterns) {
      setConfirmModal({
        message: `"${seg.name}" has patterns assigned. Delete anyway?`,
        onConfirm: doDelete,
      });
    } else {
      doDelete();
    }
  };

  const GenreBtn = ({ id, label, color }) => (
    <button
      onClick={() => setGenre(id)}
      className={`py-2 px-3 rounded-md text-sm font-medium transition-all border border-transparent ${genre === id ? `bg-${color}-600 text-white shadow-lg border-${color}-400` : "bg-neutral-700 text-gray-400 hover:bg-neutral-600"}`}
    >
      {label}
    </button>
  );

  const instruments = [
    { id: "crash", label: "Crash", color: "bg-purple-500" },
    {
      id: "hihat",
      label: genre === "jazz" ? "Ride" : "Hi-Hat",
      color: "bg-yellow-500",
    },
    { id: "tomHigh", label: "Tom High", color: "bg-orange-400" },
    { id: "tomMid", label: "Tom Mid", color: "bg-orange-500" },
    { id: "tomLow", label: "Tom Low", color: "bg-orange-600" },
    { id: "snare", label: "Snare", color: "bg-red-500" },
    { id: "kick", label: "Kick", color: "bg-blue-500" },
  ];

  // ─────────────────────────────────────────
  // SHARED LIBRARY PANEL
  // ─────────────────────────────────────────
  const LibraryPanel = () => (
    <div className="w-56 bg-neutral-900 border-r border-neutral-800 p-3 flex flex-col shrink-0 h-full">
      <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <Archive size={12} /> Pattern Library
      </h2>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-0.5">
        {library.length === 0 && (
          <div className="text-xs text-gray-600 text-center p-3 border border-dashed border-neutral-700 rounded-lg">
            No patterns yet.
            <br />
            Generate & save!
          </div>
        )}
        {library.map((item) => {
          const isItemPlaying =
            isPlaying && appMode === "generator" && editingLibId === item.id;
          return (
            <div
              key={item.id}
              draggable={renamingId !== item.id}
              onDragStart={(e) =>
                renamingId !== item.id &&
                e.dataTransfer.setData("libraryId", item.id)
              }
              onDoubleClick={() =>
                renamingId !== item.id && loadFromLibrary(item)
              }
              className={`bg-neutral-800 border p-2.5 rounded-lg cursor-grab hover:bg-neutral-750 transition-all active:cursor-grabbing group select-none relative
                                ${editingLibId === item.id ? "border-indigo-500/50 shadow-lg shadow-indigo-500/10" : "border-neutral-700"}`}
              title="Click name to rename • Drag to arrange • Double-click to re-edit"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {/* Small Play/Preview button on library items */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (editingLibId === item.id && isPlaying) {
                        setIsPlaying(false);
                      } else {
                        loadFromLibrary(item);
                        // Trigger play after load
                        setTimeout(() => setIsPlaying(true), 50);
                      }
                    }}
                    className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${isItemPlaying ? "bg-red-500 text-white" : "bg-neutral-700 text-gray-400 hover:bg-emerald-500 hover:text-white"}`}
                  >
                    {isItemPlaying ? (
                      <Square size={8} fill="currentColor" />
                    ) : (
                      <Play size={8} fill="currentColor" className="ml-0.5" />
                    )}
                  </button>

                  {renamingId === item.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => renameLibraryItem(item.id, renameValue)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          renameLibraryItem(item.id, renameValue);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-xs font-bold bg-neutral-700 text-white rounded px-1 py-0.5 border border-indigo-500 outline-none min-w-0"
                    />
                  ) : (
                    <span
                      className="text-xs font-bold text-gray-200 truncate cursor-text hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(item.id);
                        setRenameValue(item.name);
                      }}
                      title="Click to rename"
                    >
                      {item.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`text-[8px] uppercase font-bold px-1 py-0.5 rounded ${item.type === "fill" ? "bg-rose-500/20 text-rose-400" : item.type === "manual" ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"}`}
                  >
                    {item.type}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFromLibrary(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              {/* LIVE PREVIEW in library: if editing, show current generator pattern, else show saved pattern */}
              <MiniPattern
                pattern={
                  editingLibId === item.id && appMode === "generator"
                    ? pattern
                    : item.pattern
                }
              />
              <div className="text-[9px] text-neutral-600 mt-1 flex justify-between items-center">
                <span>
                  {editingLibId === item.id
                    ? "Editing..."
                    : "Double-click to edit"}
                </span>
                {isItemPlaying && (
                  <span className="text-emerald-500 font-bold animate-pulse text-[8px]">
                    PLAYING
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <div
      className={`min-h-screen bg-neutral-900 text-gray-200 font-sans flex flex-col ${isDayTheme ? "day-theme" : ""}`}
    >
      {/* CONFIRM MODAL */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* TOP BAR */}
      <div className="bg-neutral-950 border-b border-neutral-800 px-5 py-3 shrink-0 flex items-center justify-between shadow-md z-20">
        <div className="flex items-center gap-5">
          <h1 className="text-lg font-bold text-white tracking-wider flex items-center gap-2">
            <Activity size={20} className="text-emerald-500" /> AI DRUM SYSTEM
          </h1>
          <div className="flex bg-neutral-800 p-1 rounded-lg gap-0.5">
            <button
              onClick={() => {
                setAppMode("generator");
                setIsPlaying(false);
              }}
              className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-1.5 transition-all ${appMode === "generator" ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-white"}`}
            >
              <LayoutGrid size={14} /> GENERATOR
            </button>
            <button
              onClick={() => {
                setAppMode("arrangement");
                setIsPlaying(false);
              }}
              className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-1.5 transition-all ${appMode === "arrangement" ? "bg-indigo-500 text-white" : "text-gray-400 hover:text-white"}`}
            >
              <Grid size={14} /> ARRANGEMENT
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMetronomeEnabled(!isMetronomeEnabled)}
            className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${isMetronomeEnabled ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-500" : "bg-neutral-800 border-neutral-700 text-gray-500"}`}
            title={
              isMetronomeEnabled ? "Turn Metronome OFF" : "Turn Metronome ON"
            }
          >
            {isMetronomeEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={() => setIsDayTheme(!isDayTheme)}
            className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${isDayTheme ? "bg-amber-500/20 border-amber-500/50 text-amber-500" : "bg-indigo-500/20 border-indigo-500/50 text-indigo-400"}`}
            title={isDayTheme ? "Switch to Dark Mode" : "Switch to Day Theme"}
          >
            {isDayTheme ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="flex items-center gap-2 bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700">
            <span className="text-[10px] text-gray-400 font-bold uppercase">
              BPM
            </span>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="bg-transparent text-white font-mono font-bold text-right w-12 focus:outline-none"
            />
          </div>
          <input
            type="file"
            accept=".json"
            id="import-project"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (event) => {
                try {
                  const parsed = JSON.parse(event.target.result);
                  if (parsed && Array.isArray(parsed.segments)) {
                    if (parsed.generatorMode)
                      setGeneratorMode(parsed.generatorMode);
                    if (parsed.bpm) setBpm(parsed.bpm);
                    if (parsed.genre) setGenre(parsed.genre);
                    if (parsed.complexity !== undefined)
                      setComplexity(parsed.complexity);
                    if (parsed.intensity !== undefined)
                      setIntensity(parsed.intensity);
                    if (parsed.fillAmount !== undefined)
                      setFillAmount(parsed.fillAmount);
                    if (parsed.manualPattern)
                      setManualPattern(parsed.manualPattern);
                    if (parsed.pattern) setPattern(parsed.pattern);
                    if (parsed.library) setLibrary(parsed.library);
                    if (parsed.segments) setSegments(parsed.segments);
                    if (parsed.isDayTheme !== undefined)
                      setIsDayTheme(parsed.isDayTheme);
                    if (parsed.isMetronomeEnabled !== undefined)
                      setIsMetronomeEnabled(parsed.isMetronomeEnabled);
                    if (parsed.isGrooveLooping !== undefined)
                      setIsGrooveLooping(parsed.isGrooveLooping);
                  }
                } catch (error) {
                  alert("Invalid project file.");
                }
              };
              reader.readAsText(file);
              e.target.value = ""; // reset
            }}
          />
          <button
            onClick={() => document.getElementById("import-project").click()}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-sm text-gray-200 flex items-center gap-2 cursor-pointer transition-colors"
            title="Load Project"
          >
            <Archive size={14} /> LOAD
          </button>
          <button
            onClick={() => {
              const stateToSave = {
                generatorMode,
                bpm,
                genre,
                complexity,
                intensity,
                fillAmount,
                manualPattern,
                pattern,
                library,
                segments,
                isDayTheme,
                isMetronomeEnabled,
                isGrooveLooping,
              };
              const blob = new Blob([JSON.stringify(stateToSave, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `drum-project-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-400 rounded-lg text-sm flex items-center gap-2 cursor-pointer transition-colors font-bold"
            title="Save Project"
          >
            <Save size={14} /> SAVE
          </button>
          <button
            onClick={exportMIDI}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-sm text-gray-200 flex items-center gap-2 cursor-pointer transition-colors"
            title="Download MIDI"
          >
            <Download size={14} /> EXPORT MIDI
          </button>
        </div>
      </div>

      {/* WORKSPACE */}
      <div className="flex-1 overflow-hidden flex">
        {/* ALWAYS-VISIBLE LIBRARY PANEL */}
        <LibraryPanel />

        {/* ═══════════════════════════════ GENERATOR MODE ═════════════════════ */}
        {appMode === "generator" && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Generator sub-mode selector */}
            <div className="px-8 pt-6 pb-0 flex items-center gap-4">
              <div className="flex bg-neutral-800 p-1 rounded-lg border border-neutral-700 shrink-0">
                <button
                  onClick={() => setGeneratorMode("groove")}
                  className={`px-5 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${generatorMode === "groove" ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
                >
                  <Drumstick size={14} /> Groove
                </button>
                <button
                  onClick={() => setGeneratorMode("fill")}
                  className={`px-5 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${generatorMode === "fill" ? "bg-rose-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
                >
                  <Music2 size={14} /> Fill
                </button>
                <button
                  onClick={() => setGeneratorMode("manual")}
                  className={`px-5 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${generatorMode === "manual" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
                >
                  <LayoutGrid size={14} /> Manual
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {generatorMode === "groove"
                  ? "Repeating rhythmic backbone — the core loop that anchors the song."
                  : generatorMode === "fill"
                    ? "End-of-phrase accent phrase — the burst that transitions sections."
                    : "Draw your own kick and snare rhythm on the grid, AI generates the hats/toms."}
              </p>
            </div>

            {/* Main layout below sub-mode bar */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 p-8">
              {/* Controls LEFT */}
              <div className="w-full lg:w-80 shrink-0 space-y-5">
                <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-5 shadow-xl">
                  <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sliders size={14} className="text-emerald-500" /> Pattern
                    Controls
                  </h2>
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">
                        Genre Style
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <GenreBtn
                          id="acoustic"
                          label="Rock / Pop"
                          color="amber"
                        />
                        <GenreBtn
                          id="electronic"
                          label="Trap / EDM"
                          color="indigo"
                        />
                        <GenreBtn id="jazz" label="Jazz / Fusion" color="sky" />
                        <GenreBtn id="metal" label="Metal" color="red" />
                        <GenreBtn id="funk" label="Funk / R&B" color="purple" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 font-bold uppercase">
                          Dynamics
                        </span>
                        <span className="text-emerald-400 font-mono">
                          {intensity}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={intensity}
                        onChange={(e) => setIntensity(Number(e.target.value))}
                        className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 font-bold uppercase">
                          Layers
                        </span>
                        <span className="text-indigo-400 font-mono">
                          {complexity}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={complexity}
                        onChange={(e) => setComplexity(Number(e.target.value))}
                        className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                    {generatorMode === "fill" && (
                      <div className="pt-3 border-t border-neutral-700">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400 font-bold uppercase">
                            Fill Length
                          </span>
                          <span className="text-rose-400 font-mono">
                            {fillAmount}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={fillAmount}
                          onChange={(e) =>
                            setFillAmount(Number(e.target.value))
                          }
                          className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const genModeRaw =
                              generatorMode === "manual"
                                ? "groove"
                                : generatorMode;
                            const newPattern = generatePattern(
                              genre,
                              complexity,
                              intensity,
                              genModeRaw === "groove" ? 0 : fillAmount,
                              genModeRaw,
                            );
                            if (generatorMode === "manual") {
                              for (let i = 0; i < 16; i++) {
                                newPattern[i].kick = manualPattern[i].kick;
                                newPattern[i].snare = manualPattern[i].snare;
                              }
                            }
                            setPattern(newPattern);
                          }}
                          className="flex-1 py-2.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white font-bold flex items-center justify-center gap-2 border border-neutral-600 transition-colors text-sm"
                        >
                          <RefreshCw size={14} /> REGEN
                        </button>
                        {editingLibId ? (
                          <div className="flex-1 flex gap-2">
                            <button
                              onClick={saveToLibrary}
                              className="flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-[11px] border bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border-indigo-500/30"
                            >
                              UPDATE
                            </button>
                            <button
                              onClick={() => {
                                // Temporarily unset editing ID to force a new save
                                const currentId = editingLibId;
                                setEditingLibId(null);
                                // We need to use a timeout/effect ideally, or just duplicate the save logic
                                // Because state updates are async, the easiest way is to direct duplicate save logic for 'Save As New'
                                const effectiveFill =
                                  generatorMode === "groove" ||
                                    generatorMode === "manual"
                                    ? 0
                                    : fillAmount;
                                const typeLabel =
                                  generatorMode === "groove"
                                    ? "Groove"
                                    : generatorMode === "manual"
                                      ? "Manual"
                                      : "Fill";
                                const newItem = {
                                  id: `lib-${Date.now()}`,
                                  name: `${genre.charAt(0).toUpperCase() + genre.slice(1)} ${typeLabel} (Copy)`,
                                  type: generatorMode,
                                  pattern: pattern.map((s) => ({ ...s })),
                                  params: {
                                    genre,
                                    complexity,
                                    intensity,
                                    fillAmount: effectiveFill,
                                    generatorMode,
                                  },
                                  manualPattern: manualPattern.map((s) => ({
                                    ...s,
                                  })),
                                };
                                setLibrary((prev) => [...prev, newItem]);
                                setEditingLibId(currentId); // restore edit link
                              }}
                              title="Save as a new pattern"
                              className="py-2.5 px-3 rounded-lg font-bold flex items-center justify-center transition-all text-xs border bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border-emerald-500/30"
                            >
                              <Plus size={14} /> NEW
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={saveToLibrary}
                            className="flex-1 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                          >
                            <Save size={14} /> SAVE
                          </button>
                        )}
                      </div>
                      {editingLibId && (
                        <button
                          onClick={() => setEditingLibId(null)}
                          className="w-full py-1 text-[10px] font-bold text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-widest"
                        >
                          Cancel Editing / New Workspace
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview + centered play MIDDLE */}
              <div className="flex-1 flex flex-col gap-4">
                {/* Step grid */}
                <div className="bg-[#0a0a0a] rounded-xl border border-neutral-700 p-5 shadow-inner flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                      Live Preview — 1 Bar
                    </h2>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${generatorMode === "fill" && fillAmount > 0 ? "bg-rose-500/20 text-rose-400" : generatorMode === "manual" ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"}`}
                    >
                      {generatorMode === "groove"
                        ? "GROOVE"
                        : generatorMode === "manual"
                          ? "MANUAL ACTIVE"
                          : fillAmount > 0
                            ? "FILL ACTIVE"
                            : "GROOVE"}
                    </span>
                  </div>

                  {/* Beat numbers */}
                  <div className="flex items-center mb-1">
                    <div className="w-20 shrink-0" />
                    <div
                      className="flex-1 grid gap-px"
                      style={{ gridTemplateColumns: "repeat(16, 1fr)" }}
                    >
                      {Array(16)
                        .fill(0)
                        .map((_, i) => (
                          <div
                            key={i}
                            className="text-[9px] text-center font-mono font-bold"
                            style={{
                              color: i % 4 === 0 ? "#10b981" : "transparent",
                            }}
                          >
                            {i % 4 === 0 ? i / 4 + 1 : "."}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Instrument rows — REDUCED HEIGHT */}
                  <div className="flex flex-col gap-px">
                    {instruments.map((inst) => (
                      <div
                        key={inst.id}
                        className="flex items-center"
                        style={{ height: "22px" }}
                      >
                        <div className="w-20 shrink-0 text-right pr-3 text-[9px] font-bold text-gray-500 uppercase tracking-wider font-mono">
                          {inst.label}
                        </div>
                        <div
                          className="flex-1 grid gap-px h-full bg-neutral-900 rounded-sm border border-white/5"
                          style={{ gridTemplateColumns: "repeat(16, 1fr)" }}
                        >
                          {pattern.map((step, si) => {
                            const val = step[inst.id] || 0;
                            const isActive = val > 0;
                            const isCurrent = currentStep === si && isPlaying;
                            return (
                              <div
                                key={si}
                                className={`relative flex items-center justify-center ${si % 4 === 0 ? "border-l border-white/10" : ""}`}
                                style={{
                                  backgroundColor: isCurrent
                                    ? "#2a2a2a"
                                    : generatorMode === "fill" &&
                                      si >=
                                      16 -
                                      Math.floor((fillAmount / 100) * 16)
                                      ? "#1e1515"
                                      : "#111",
                                }}
                              >
                                {!isActive && (
                                  <div className="w-0.5 h-0.5 bg-neutral-700 rounded-full opacity-40" />
                                )}
                                {isActive && (
                                  <div
                                    className={`absolute inset-[1px] rounded-[1px] ${inst.color}`}
                                    style={{
                                      opacity: 0.75 + val * 0.25,
                                      filter: isCurrent
                                        ? "brightness(1.6)"
                                        : "none",
                                    }}
                                  >
                                    <div
                                      className="absolute bottom-0 left-0 right-0 bg-black/30"
                                      style={{ height: `${(1 - val) * 100}%` }}
                                    />
                                  </div>
                                )}
                                {generatorMode === "manual" &&
                                  (inst.id === "kick" ||
                                    inst.id === "snare") && (
                                    <div
                                      className="absolute inset-0 cursor-pointer hover:bg-white/20 transition-colors z-20"
                                      onClick={() => {
                                        const currentVal =
                                          manualPattern[si][inst.id];
                                        const newVal = currentVal > 0 ? 0 : 1;
                                        setManualPattern((prev) => {
                                          const next = [...prev];
                                          next[si] = {
                                            ...next[si],
                                            [inst.id]: newVal,
                                          };
                                          return next;
                                        });
                                      }}
                                    />
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── CENTERED PLAY BUTTON ── */}
                <div className="flex items-center justify-center py-2 gap-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`flex items-center gap-3 px-10 py-3 rounded-full font-bold text-lg shadow-2xl transition-all active:scale-95 ${isPlaying ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/30" : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30"}`}
                  >
                    {isPlaying ? (
                      <>
                        <Square size={20} fill="currentColor" /> STOP
                      </>
                    ) : (
                      <>
                        <Play size={20} fill="currentColor" /> PLAY
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsGrooveLooping((v) => !v)}
                    className={`h-12 px-4 rounded-full border text-sm font-bold transition-all flex items-center gap-2 ${isGrooveLooping
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white"
                      }`}
                    title={
                      isGrooveLooping
                        ? "Loop groove is ON"
                        : "Loop groove is OFF (play once)"
                    }
                  >
                    <Repeat size={14} />
                    LOOP
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ ARRANGEMENT MODE ═══════════════════ */}
        {appMode === "arrangement" && (
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT: ARRANGEMENT TIMELINE */}
            <div className="flex-1 flex flex-col border-r border-neutral-800 overflow-hidden">
              {/* Arrangement toolbar */}
              <div className="bg-neutral-900 border-b border-neutral-800 px-5 py-2 flex items-center gap-4 shrink-0">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                  Arrangement Timeline
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-all text-sm ${isPlaying ? "bg-red-500 hover:bg-red-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"}`}
                >
                  {isPlaying ? (
                    <>
                      <Square size={14} fill="currentColor" /> STOP
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="currentColor" /> PLAY
                    </>
                  )}
                </button>
              </div>

              {/* Timeline canvas */}
              <div className="flex-1 overflow-auto bg-[#080808] p-6">
                <div className="flex items-start gap-4 w-max pb-12">
                  {segments.map((segment, segIndex) => (
                    <div
                      key={segment.id}
                      className="w-44 shrink-0 flex flex-col"
                    >
                      {/* Segment header */}
                      <div className="bg-neutral-800 rounded-t-lg border-b-2 border-indigo-500 flex items-center group/seghead relative">
                        <button
                          onClick={() => {
                            let precedingBars = 0;
                            for (let i = 0; i < segIndex; i++)
                              precedingBars += segments[i].bars.length;
                            seekToBar(precedingBars);
                          }}
                          className="pl-2.5 text-neutral-500 hover:text-emerald-400 transition-colors"
                          title={`Play ${segment.name}`}
                        >
                          <Play size={12} fill="currentColor" />
                        </button>
                        <input
                          value={segment.name}
                          onChange={(e) =>
                            setSegments((prev) =>
                              prev.map((s, i) =>
                                i !== segIndex
                                  ? s
                                  : { ...s, name: e.target.value },
                              ),
                            )
                          }
                          className="bg-transparent text-center text-sm font-bold flex-1 min-w-0 py-2 px-1 border-none outline-none text-gray-200"
                        />



                        {/* ⋮ Kebab menu */}
                        <div className="relative shrink-0 pr-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenSegMenu(
                                openSegMenu === segIndex ? null : segIndex,
                              );
                            }}
                            className="text-neutral-500 hover:text-white px-1.5 py-1.5 rounded hover:bg-neutral-700 transition-colors text-base leading-none"
                            title="Segment options"
                          >
                            ⋮
                          </button>
                          {openSegMenu === segIndex && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1 w-36 bg-neutral-800 border border-neutral-600 rounded-lg shadow-2xl z-50 overflow-hidden"
                            >
                              <button
                                onClick={() => {
                                  deleteSegment(segIndex);
                                  setOpenSegMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
                              >
                                <Trash2 size={12} /> Delete Segment
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bars */}
                      <div className="bg-neutral-900/50 border border-t-0 border-neutral-800 rounded-b-lg p-2 flex flex-col gap-2 min-h-[80px]">
                        {segment.bars.map((barLibId, barIndex) => {
                          const item = library.find((l) => l.id === barLibId);

                          let precedingBars = 0;
                          for (let i = 0; i < segIndex; i++)
                            precedingBars += segments[i].bars.length;
                          precedingBars += barIndex;
                          const globalBarIdx = precedingBars;
                          const globalStart = globalBarIdx * 16;
                          const isCurrent =
                            isPlaying &&
                            currentStep >= globalStart &&
                            currentStep < globalStart + 16;

                          return (
                            <div
                              key={barIndex}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("type", "bar");
                                e.dataTransfer.setData("segIndex", segIndex);
                                e.dataTransfer.setData("barIndex", barIndex);
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) =>
                                handleDropInSegment(e, segIndex, barIndex)
                              }
                              onClick={() => item && seekToBar(globalBarIdx)}
                              className={`relative h-14 rounded-md border-2 border-dashed flex items-center justify-center overflow-hidden transition-all group
                                                                ${item ? "border-transparent bg-neutral-800 hover:bg-neutral-700/60 cursor-pointer" : "border-neutral-700/50 hover:border-neutral-600 hover:bg-neutral-800/20"}
                                                                ${isCurrent ? "ring-1 ring-emerald-500/50" : ""} cursor-grab active:cursor-grabbing`}
                            >
                              {/* Playback progress bar */}
                              {isCurrent && (
                                <div
                                  className="absolute top-0 left-0 bottom-0 bg-emerald-500/20 z-0 transition-all duration-75"
                                  style={{
                                    width:
                                      ((currentStep % 16) / 16) * 100 + "%",
                                  }}
                                />
                              )}

                              {/* ── Corner X: always shown on hover, removes the slot ── */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeBar(segIndex, barIndex);
                                }}
                                className="absolute top-1 right-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/70 hover:bg-red-600 text-neutral-400 hover:text-white rounded p-0.5"
                                title="Remove bar slot"
                              >
                                <X size={10} />
                              </button>

                              {item ? (
                                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full pointer-events-none px-4">
                                  <span className="text-[11px] font-bold text-gray-200 truncate w-full text-center">
                                    {item.name}
                                  </span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span
                                      className={`text-[9px] ${item.type === "fill" ? "text-rose-400" : "text-emerald-400"}`}
                                    >
                                      {item.type}
                                    </span>
                                    {isCurrent && (
                                      <span className="text-[8px] text-emerald-400 font-bold animate-pulse">
                                        ▶ PLAYING
                                      </span>
                                    )}
                                    {!isCurrent && (
                                      <span className="text-[8px] text-neutral-600">
                                        click to play
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-neutral-600 pointer-events-none">
                                  Drop Here
                                </span>
                              )}

                              {/* Bar number bottom-left */}
                              <div className="absolute bottom-1 left-1.5 text-[8px] font-mono text-neutral-700 font-bold z-10">
                                B{barIndex + 1}
                              </div>
                            </div>
                          );
                        })}

                        {/* Add bar */}
                        <button
                          onClick={() =>
                            setSegments((prev) =>
                              prev.map((s, i) =>
                                i !== segIndex
                                  ? s
                                  : { ...s, bars: [...s.bars, null] },
                              ),
                            )
                          }
                          className="h-7 border border-dashed border-neutral-700 text-neutral-600 rounded-md hover:bg-neutral-800 hover:text-white transition-all flex items-center justify-center text-xs"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add segment */}
                  <button
                    onClick={() =>
                      setSegments((prev) => [
                        ...prev,
                        {
                          id: `seg-${Date.now()}`,
                          name: `Part ${prev.length + 1}`,
                          bars: [null, null, null, null],
                        },
                      ])
                    }
                    className="h-10 px-4 bg-neutral-800 hover:bg-indigo-600 border border-neutral-700 rounded-lg text-white font-bold flex items-center justify-center transition-all group shrink-0"
                  >
                    <Plus size={16} className="shrink-0 mr-1.5" />
                    <span className="text-xs whitespace-nowrap">
                      Add Part
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: LYRIC PANEL */}
            {isLyricsExpanded && (
              <div
                className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                onClick={() => setIsLyricsExpanded(false)}
              />
            )}
            <div
              className={`flex flex-col shrink-0 overflow-hidden bg-neutral-900 shadow-2xl ${isLyricsExpanded ? "fixed inset-8 md:inset-x-32 md:inset-y-16 z-50 border border-neutral-700 rounded-2xl" : "w-80 border-l border-neutral-800 relative z-10"}`}
            >
              <div className="bg-neutral-950 border-b border-neutral-800 px-5 flex items-center justify-between shrink-0 h-[45px]">
                <span className="text-xs text-slate-300 font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="text-lg">📝</span> Lyrics & Notes
                </span>
                <button
                  onClick={() => setIsLyricsExpanded(!isLyricsExpanded)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title={isLyricsExpanded ? "Collapse" : "Expand"}
                >
                  {isLyricsExpanded ? (
                    <Minimize2 size={16} />
                  ) : (
                    <Maximize2 size={16} />
                  )}
                </button>
              </div>
              {isLyricsExpanded && (
                <div className="bg-neutral-950 border-b border-neutral-800 p-3 flex gap-2 overflow-x-auto shrink-0 z-20">
                  {segments.map((seg, idx) => {
                    let pBars = 0;
                    for (let i = 0; i < idx; i++)
                      pBars += segments[i].bars.length;
                    return (
                      <button
                        key={seg.id}
                        onClick={() => seekToBar(pBars)}
                        className="px-3 py-1 bg-neutral-800 hover:bg-emerald-600/80 hover:text-white border border-neutral-700 rounded-md text-xs font-bold text-gray-300 transition-all whitespace-nowrap"
                      >
                        [{seg.name}]
                      </button>
                    );
                  })}
                </div>
              )}
              <div
                className={`flex-1 overflow-y-auto space-y-4 custom-scrollbar ${isLyricsExpanded ? "p-8 md:p-12" : "p-4"}`}
              >
                {segments.map((segment, segIndex) => {
                  let precedingBars = 0;
                  for (let i = 0; i < segIndex; i++)
                    precedingBars += segments[i].bars.length;
                  const segmentStartStep = precedingBars * 16;
                  const segmentEndStep =
                    segmentStartStep + segment.bars.length * 16;
                  const isSegCurrent =
                    isPlaying &&
                    currentStep >= segmentStartStep &&
                    currentStep < segmentEndStep;

                  return (
                    <div
                      key={segment.id}
                      className={`bg-neutral-850 rounded-xl overflow-hidden flex flex-col shadow-lg transition-all border ${isSegCurrent ? "border-indigo-500/50 shadow-indigo-500/10" : "border-neutral-700"}`}
                    >
                      {/* Card Header */}
                      <div
                        className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center z-10 cursor-pointer hover:bg-neutral-800 transition-colors group"
                        onClick={() => seekToBar(precedingBars)}
                      >
                        <span className="text-sm font-bold text-gray-200">
                          {segment.name}
                        </span>
                        {isSegCurrent ? (
                          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest animate-pulse">
                            Running
                          </span>
                        ) : (
                          <span className="text-[9px] text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to Play
                          </span>
                        )}
                      </div>

                      {/* Card Body - Bars/Grooves */}
                      <div className="flex flex-col bg-neutral-800/40 relative pb-1">
                        {segment.bars.map((barLibId, barIndex) => {
                          const globalBarIdx = precedingBars + barIndex;
                          const globalStart = globalBarIdx * 16;
                          const globalEnd = globalStart + 16;
                          const isBarCurrent =
                            isPlaying &&
                            currentStep >= globalStart &&
                            currentStep < globalEnd;
                          const rawProgress = isBarCurrent
                            ? ((currentStep - globalStart) / 16) * 100
                            : currentStep >= globalEnd
                              ? 100
                              : 0;
                          const progress =
                            !isPlaying && currentStep === -1 ? 0 : rawProgress;

                          const item = barLibId
                            ? library.find((l) => l.id === barLibId)
                            : null;
                          const words =
                            (segment.barLyrics &&
                              segment.barLyrics[barIndex]) ||
                            [];

                          // Per-bar playback mode: 'loop' | 'next' | 'stop'
                          const barPlayMode =
                            segment.barPlayModes &&
                              segment.barPlayModes[barIndex]
                              ? segment.barPlayModes[barIndex]
                              : "next";
                          const setBarPlayMode = (mode) => {
                            setSegments((prev) =>
                              prev.map((s, i) => {
                                const nextBarPlayModes = { ...(s.barPlayModes || {}) };
                                if (mode === "loop") {
                                  Object.keys(nextBarPlayModes).forEach((k) => {
                                    if (nextBarPlayModes[k] === "loop") nextBarPlayModes[k] = "next";
                                  });
                                }
                                if (i === segIndex) {
                                  nextBarPlayModes[barIndex] = mode;
                                }
                                return {
                                  ...s,
                                  barPlayModes: nextBarPlayModes,
                                };
                              }),
                            );
                          };

                          return (
                            <div
                              key={barIndex}
                              onClick={(e) => {
                                if (
                                  e.target.tagName !== "INPUT" &&
                                  e.target.tagName !== "SPAN" &&
                                  e.target.tagName !== "BUTTON"
                                ) {
                                  seekToBar(globalBarIdx);
                                }
                              }}
                              className={`p-3 relative border-b border-neutral-700/50 last:border-b-0 transition-colors cursor-pointer hover:bg-neutral-800/40 ${isBarCurrent ? (item ? "bg-emerald-900/10" : "bg-neutral-800/60") : ""}`}
                            >
                              {/* ── Bar header: groove name + play controls + mode toggle ── */}
                              <div className="flex items-center justify-between mb-2 gap-1">
                                {/* Left: groove name + type badge */}
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  {item ? (
                                    <>
                                      <span
                                        className={`shrink-0 text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${item.type === "fill" ? "bg-rose-500/20 text-rose-400" : item.type === "manual" ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"}`}
                                      >
                                        {item.type}
                                      </span>
                                      <span
                                        className="text-xs font-medium text-gray-300 truncate"
                                        title={item.name}
                                      >
                                        {item.name}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-neutral-600">
                                      Empty Bar {barIndex + 1}
                                    </span>
                                  )}
                                </div>

                                {/* Right: Play/Pause + Stop + Loop/Next/Stop mode */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Play / Pause this groove */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isBarCurrent && isPlaying) {
                                        // Pause
                                        setIsPlaying(false);
                                      } else {
                                        // Seek to this bar and play
                                        seekToBar(globalBarIdx);
                                      }
                                    }}
                                    className={`w-6 h-6 rounded flex items-center justify-center border text-[9px] transition-all ${isBarCurrent && isPlaying
                                      ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/30"
                                      }`}
                                    title={
                                      isBarCurrent && isPlaying
                                        ? "Pause"
                                        : "Play this groove"
                                    }
                                  >
                                    {isBarCurrent && isPlaying ? (
                                      /* Pause icon */
                                      <svg
                                        width="8"
                                        height="8"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                      >
                                        <rect
                                          x="6"
                                          y="4"
                                          width="4"
                                          height="16"
                                        />
                                        <rect
                                          x="14"
                                          y="4"
                                          width="4"
                                          height="16"
                                        />
                                      </svg>
                                    ) : (
                                      /* Play icon */
                                      <svg
                                        width="8"
                                        height="8"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                      >
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                      </svg>
                                    )}
                                  </button>

                                  {/* Stop (rewind) */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsPlaying(false);
                                    }}
                                    className="w-6 h-6 rounded flex items-center justify-center border border-neutral-700 bg-neutral-800 text-neutral-500 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-400 text-[9px] transition-all"
                                    title="Stop playback"
                                  >
                                    <svg
                                      width="8"
                                      height="8"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                    >
                                      <rect
                                        x="3"
                                        y="3"
                                        width="18"
                                        height="18"
                                        rx="2"
                                      />
                                    </svg>
                                  </button>

                                  {/* Loop / Next / Stop mode toggle */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBarPlayMode(
                                        barPlayMode === "loop"
                                          ? "next"
                                          : "loop",
                                      );
                                    }}
                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase tracking-widest transition-all ${barPlayMode === "loop"
                                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                      : "bg-neutral-800 border-neutral-700 text-neutral-500 hover:text-neutral-300"
                                      }`}
                                    title={
                                      barPlayMode === "loop"
                                        ? "🔁 Looping this groove only — click to disable"
                                        : "🔁 Enable loop for this groove"
                                    }
                                  >
                                    <svg
                                      width="8"
                                      height="8"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="17 1 21 5 17 9" />
                                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                      <polyline points="7 23 3 19 7 15" />
                                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                                    </svg>
                                    loop
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 relative z-10 mt-1">
                                {/* ── COLLAPSED: word & chord chips — overview only, no piano roll ── */}
                                {!isLyricsExpanded && (
                                  <>
                                    {(
                                      (segment.barChords &&
                                        segment.barChords[barIndex]) ||
                                      []
                                    ).length > 0 && (
                                        <div className="flex flex-wrap gap-1 items-center">
                                          <span className="text-[7px] text-neutral-600 uppercase tracking-widest font-bold mr-0.5">
                                            chords
                                          </span>
                                          {(
                                            (segment.barChords &&
                                              segment.barChords[barIndex]) ||
                                            []
                                          ).map((chord, ci) => (
                                            <span
                                              key={ci}
                                              className="text-[8px] px-1.5 py-0.5 bg-indigo-500/15 border border-indigo-500/30 rounded text-indigo-300 font-bold"
                                            >
                                              {chord.root}
                                              {chord.quality === "Major"
                                                ? ""
                                                : chord.quality}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    {words.length > 0 && (
                                      <div className="flex flex-wrap gap-1 items-center">
                                        <span className="text-[7px] text-neutral-600 uppercase tracking-widest font-bold mr-0.5">
                                          lyrics
                                        </span>
                                        {words.map((w, wi) => {
                                          const note =
                                            typeof w === "string"
                                              ? { text: w }
                                              : w;
                                          return (
                                            <span
                                              key={wi}
                                              className="text-[9px] px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded text-emerald-300 font-mono"
                                            >
                                              {note.text}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {(words.length > 0 ||
                                      (
                                        (segment.barChords &&
                                          segment.barChords[barIndex]) ||
                                        []
                                      ).length > 0) && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setIsLyricsExpanded(true);
                                          }}
                                          className="text-left text-[8px] text-neutral-600 hover:text-indigo-400 font-mono transition-colors leading-none mt-0.5"
                                        >
                                          🎹 Open piano roll to edit…
                                        </button>
                                      )}
                                  </>
                                )}

                                {/* ── EXPANDED: full piano roll editor (only in popup) ── */}
                                {isLyricsExpanded && words.length > 0 && (
                                  <PianoRollBlock
                                    notes={words.map((w, i) =>
                                      typeof w === "string"
                                        ? {
                                          id: `legacy-${i}`,
                                          text: w,
                                          pitch: 14,
                                          start: Math.min(15, i * 2),
                                          duration: 2,
                                        }
                                        : w,
                                    )}
                                    chords={
                                      (segment.barChords &&
                                        segment.barChords[barIndex]) ||
                                      []
                                    }
                                    onNotesChange={(newNotes) => {
                                      setSegments((prev) =>
                                        prev.map((s, i) => {
                                          if (i === segIndex) {
                                            const nextBarLyrics = {
                                              ...(s.barLyrics || {}),
                                            };
                                            nextBarLyrics[barIndex] = newNotes;
                                            return {
                                              ...s,
                                              barLyrics: nextBarLyrics,
                                            };
                                          }
                                          return s;
                                        }),
                                      );
                                    }}
                                    onChordsChange={(newChords) => {
                                      setSegments((prev) =>
                                        prev.map((s, i) => {
                                          if (i === segIndex) {
                                            const nextBarChords = {
                                              ...(s.barChords || {}),
                                            };
                                            nextBarChords[barIndex] = newChords;
                                            return {
                                              ...s,
                                              barChords: nextBarChords,
                                            };
                                          }
                                          return s;
                                        }),
                                      );
                                    }}
                                    isCurrent={isPlaying}
                                    currentStep={currentStep}
                                    globalStart={globalStart}
                                    audioCtx={audioCtxRef.current}
                                    pianoInst={pianoRef.current}
                                  />
                                )}

                                {isLyricsExpanded && (
                                  <input
                                    type="text"
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder={
                                      item
                                        ? `📝 Type lyrics for ${item.type}...`
                                        : `📝 Type lyrics for empty bar...`
                                    }
                                    className="w-full bg-neutral-900/60 border border-neutral-700 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500 focus:bg-neutral-900 transition-colors placeholder-neutral-500 shadow-inner mt-2"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const text = e.target.value;
                                        if (!text.trim()) return;
                                        const segmenter = new Intl.Segmenter(
                                          ["th", "en"],
                                          { granularity: "word" },
                                        );
                                        const newWords = Array.from(
                                          segmenter.segment(text),
                                        )
                                          .filter((s) => s.isWordLike)
                                          .map((s) => s.segment);

                                        const numWords = newWords.length;
                                        const stepSize = Math.max(
                                          1,
                                          Math.floor(
                                            16 / Math.max(1, numWords),
                                          ),
                                        );
                                        // Random singable melody in C4–A4 range
                                        // Rows relative to BASE_MIDI=48: C4=12, D4=14, E4=16, F4=17, G4=19, A4=21
                                        const MELODY_SCALE = [
                                          12, 14, 16, 17, 19, 21,
                                        ];
                                        const melodyIdxs = [0]; // start at C4
                                        for (let mi = 1; mi < numWords; mi++) {
                                          const prev = melodyIdxs[mi - 1];
                                          // Weighted random walk: prefer steps of ±1 scale degree
                                          const raw = Math.round(
                                            Math.random() * 4 - 2,
                                          );
                                          const step = raw === 0 ? 1 : raw;
                                          melodyIdxs.push(
                                            Math.max(
                                              0,
                                              Math.min(
                                                MELODY_SCALE.length - 1,
                                                prev + step,
                                              ),
                                            ),
                                          );
                                        }
                                        const newNotes = newWords.map(
                                          (word, i) => ({
                                            id: `note-${Date.now()}-${i}`,
                                            text: word,
                                            pitch: MELODY_SCALE[melodyIdxs[i]], // C4–A4 singable melody
                                            start: Math.min(15, i * stepSize),
                                            duration: Math.min(
                                              stepSize,
                                              16 - i * stepSize,
                                              4,
                                            ),
                                          }),
                                        );

                                        setSegments((prev) =>
                                          prev.map((s, i) => {
                                            if (i === segIndex) {
                                              const nextBarLyrics = {
                                                ...(s.barLyrics || {}),
                                              };
                                              // Append to existing
                                              const existing = Array.isArray(
                                                nextBarLyrics[barIndex],
                                              )
                                                ? nextBarLyrics[barIndex].map(
                                                  (w, idx) =>
                                                    typeof w === "string"
                                                      ? {
                                                        id: `legacy-${Date.now()}-${idx}`,
                                                        text: w,
                                                        pitch: 4,
                                                        start: idx * 2,
                                                        duration: 2,
                                                      }
                                                      : w,
                                                )
                                                : [];
                                              nextBarLyrics[barIndex] = [
                                                ...existing,
                                                ...newNotes,
                                              ];

                                              // Also initialize chords if empty
                                              const nextBarChords = {
                                                ...(s.barChords || {}),
                                              };
                                              if (
                                                !nextBarChords[barIndex] ||
                                                nextBarChords[barIndex]
                                                  .length === 0
                                              ) {
                                                nextBarChords[barIndex] = [
                                                  {
                                                    root: "C",
                                                    quality: "Major",
                                                    start: 0,
                                                    duration: 8,
                                                    octave: 3,
                                                  },
                                                  {
                                                    root: "A",
                                                    quality: "Minor",
                                                    start: 8,
                                                    duration: 8,
                                                    octave: 3,
                                                  },
                                                ];
                                              }
                                              return {
                                                ...s,
                                                barLyrics: nextBarLyrics,
                                                barChords: nextBarChords,
                                              };
                                            }
                                            return s;
                                          }),
                                        );
                                        e.target.value = "";
                                      }
                                    }}
                                  />
                                )}
                              </div>

                              {/* Bottom Linear Progress Bar for this bar */}
                              <div
                                className={`absolute bottom-0 left-0 h-[2px] transition-opacity z-0 ${isBarCurrent ? "opacity-100" : "opacity-0"} ${item ? "bg-emerald-500" : "bg-neutral-500"}`}
                                style={{
                                  width: progress + "%",
                                  transitionDuration: "50ms",
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div className="shrink-0 bg-neutral-950 border-t border-neutral-800 px-6 py-2.5 flex items-center justify-between text-[10px] text-neutral-600">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 font-bold tracking-wider">
            AI DRUM SYSTEM
          </span>
          <span className="text-neutral-700">•</span>
          <span>Designed &amp; Built by</span>
          <span className="text-neutral-400 font-semibold">
            Parkpoom Wisedsri
          </span>
          <span className="text-neutral-700">•</span>
          <a
            href="mailto:parkpoom.wisedsri@gmail.com"
            className="text-neutral-500 hover:text-emerald-400 transition-colors underline underline-offset-2"
          >
            parkpoom.wisedsri@gmail.com
          </a>
        </div>
        <div className="flex items-center gap-1.5 text-neutral-700">
          <span>AI Collaboration</span>
          <span className="text-indigo-600 font-semibold">
            Antigravity / Google DeepMind
          </span>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        .day-theme {
          filter: invert(1) hue-rotate(180deg);
        }
        .day-theme img,
        .day-theme video {
          filter: invert(1) hue-rotate(180deg);
        }
      `}</style>
    </div>
  );
};

export default DrumFillGen;
