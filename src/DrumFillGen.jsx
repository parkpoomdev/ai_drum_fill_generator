import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Square, RefreshCw, Sliders, Activity, Download, Plus, LayoutGrid, Layers, Archive, Trash2, Grid, Save, X, Drumstick, Music2, AlertTriangle } from 'lucide-react';

// ─────────────────────────────────────────────
// AUDIO ENGINE
// ─────────────────────────────────────────────
const createAudioContext = () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    return new AC();
};

const playSound = (ctx, type, time, velocity = 1, genre = 'acoustic') => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    let vol = velocity;
    if (genre === 'electronic') vol *= 0.8;
    if (genre === 'jazz') vol *= 0.7;
    if (genre === 'metal') vol *= 1.1;

    if (type.startsWith('tom')) {
        let sf = 150, ef = 50;
        if (type === 'tomHigh') { sf = 200; ef = 80; }
        if (type === 'tomMid') { sf = 140; ef = 60; }
        if (type === 'tomLow') { sf = 90; ef = 40; }
        if (genre === 'electronic') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(sf * 1.5, time);
            osc.frequency.exponentialRampToValueAtTime(ef, time + 0.2);
            gain.gain.setValueAtTime(vol, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(sf, time);
            osc.frequency.exponentialRampToValueAtTime(ef, time + 0.4);
            gain.gain.setValueAtTime(vol * 0.9, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
        }
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(time); osc.stop(time + 0.5);
        return;
    }

    if (type === 'kick') {
        const sf = genre === 'electronic' ? 150 : (genre === 'metal' ? 100 : 120);
        osc.type = genre === 'electronic' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(sf, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + (genre === 'jazz' ? 0.3 : 0.5));
        if (genre === 'metal') {
            const co = ctx.createOscillator(), cg = ctx.createGain();
            co.frequency.setValueAtTime(3000, time); co.frequency.exponentialRampToValueAtTime(100, time + 0.05);
            cg.gain.setValueAtTime(vol * 0.5, time); cg.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
            co.connect(cg); cg.connect(ctx.destination); co.start(time); co.stop(time + 0.05);
        }
    } else if (type === 'snare') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(genre === 'electronic' ? 200 : 180, time);
        gain.gain.setValueAtTime(vol * 0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        const noise = ctx.createBufferSource();
        const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < ctx.sampleRate; i++) d[i] = Math.random() * 2 - 1;
        noise.buffer = buf;
        const ng = ctx.createGain(), f = ctx.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 1000;
        ng.gain.setValueAtTime(vol * 0.8, time); ng.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        noise.connect(f); f.connect(ng); ng.connect(ctx.destination); noise.start(time);
    } else if (type === 'hihat') {
        const sz = ctx.sampleRate * 0.5;
        const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource(); noise.buffer = buf;
        const f = ctx.createBiquadFilter();
        f.type = genre === 'jazz' ? 'bandpass' : 'highpass';
        f.frequency.value = genre === 'jazz' ? 5000 : 7000;
        if (genre === 'jazz') f.Q.value = 1;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(vol * 0.3, time);
        ng.gain.exponentialRampToValueAtTime(0.01, time + (genre === 'jazz' ? 0.3 : 0.05));
        noise.connect(f); f.connect(ng); ng.connect(ctx.destination); noise.start(time);
        return;
    } else if (type === 'crash') {
        const sz = ctx.sampleRate * 2;
        const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource(); noise.buffer = buf;
        const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(vol * 0.6, time); ng.gain.exponentialRampToValueAtTime(0.01, time + 1.5);
        noise.connect(f); f.connect(ng); ng.connect(ctx.destination); noise.start(time);
        return;
    }
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(time); osc.stop(time + 0.5);
};

// ─────────────────────────────────────────────
// PATTERN GENERATOR
// generatorMode: 'groove' | 'fill'
// ─────────────────────────────────────────────
const generatePattern = (genre, complexity, intensity, fillAmount, generatorMode = 'fill') => {
    const steps = 16;
    const p = Array(steps).fill(null).map(() => ({
        kick: 0, snare: 0, hihat: 0, tomHigh: 0, tomMid: 0, tomLow: 0, crash: 0
    }));
    const r = () => Math.random();

    // ── GROOVE MODE: rich per-genre variations ──
    if (generatorMode === 'groove') {
        const vol = intensity / 100;
        // Use complexity to pick variation index (0-2)
        const variant = Math.floor((complexity / 100) * 3);

        if (genre === 'acoustic') {
            // Variant 0: Standard rock  1: Half-time  2: Syncopated
            const hhPat = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];   // 16th grid mask
            for (let i = 0; i < 16; i++) {
                if (i % 2 === 0) p[i].hihat = 0.55 + r() * 0.15;   // base 8th hats
                if (variant >= 1 && r() > 0.5) p[i].hihat = Math.max(p[i].hihat, 0.3 + r() * 0.2); // extra 16ths
            }
            if (variant === 0) {
                // Standard: kick 1 & 3, snare 2 & 4
                p[0].kick = vol; p[8].kick = vol;
                p[4].snare = vol; p[12].snare = vol;
            } else if (variant === 1) {
                // Half-time: kick on 1, snare on 3
                p[0].kick = vol; p[6].kick = vol * 0.7;
                p[8].snare = vol;
                if (r() > 0.5) p[14].kick = vol * 0.6; // anticipation
            } else {
                // Syncopated: kick on 1, 3+, snare on 2, 4
                p[0].kick = vol; p[8].kick = vol; p[10].kick = vol * 0.75;
                p[4].snare = vol; p[12].snare = vol;
                if (r() > 0.4) p[3].kick = vol * 0.5;
                if (r() > 0.6) p[15].kick = vol * 0.4; // pickup kick
            }
            // Ghost notes on snare
            if (intensity > 50) {
                [2, 6, 9, 11, 14].forEach(i => { if (r() > 0.55) p[i].snare = Math.max(p[i].snare, vol * 0.2); });
            }
            if (intensity > 80) p[0].crash = 0.8;

        } else if (genre === 'funk') {
            // Rich 16th-note funk grooves
            const kickSlots = [[0, 6, 10], [0, 10, 14], [0, 5, 9, 14]];
            const snareSlots = [[4, 12], [4, 10, 12], [4, 11, 12]];
            const ghost = [2, 3, 6, 7, 9, 11, 13, 15];
            (kickSlots[variant] || kickSlots[0]).forEach(i => { p[i].kick = vol * (i === 0 ? 1 : 0.75); });
            (snareSlots[variant] || snareSlots[0]).forEach(i => { p[i].snare = vol; });
            for (let i = 0; i < 16; i++) p[i].hihat = (i % 2 === 0 ? 0.55 : 0.35) + r() * 0.1;
            ghost.forEach(i => { if (r() > 0.45) p[i].snare = Math.max(p[i].snare, vol * (0.15 + r() * 0.2)); });
            if (complexity > 60 && r() > 0.5) p[0].crash = 0.6;

        } else if (genre === 'electronic') {
            // Variant 0: Four-on-floor  1: Trap  2: House w/open hats
            if (variant === 0) {
                // Classic four-on-the-floor
                for (let i = 0; i < 16; i++) p[i].hihat = 0.35 + r() * 0.1;
                [0, 4, 8, 12].forEach(i => p[i].kick = vol);
                [4, 12].forEach(i => p[i].snare = vol);
                if (r() > 0.5) p[6].kick = vol * 0.6;
            } else if (variant === 1) {
                // Trap: sparse kick, rapid 16th hats with rolls
                for (let i = 0; i < 16; i++) p[i].hihat = 0.25 + r() * 0.15;
                // Hat rolls at end of bar
                [14, 15].forEach(i => p[i].hihat = 0.55 + r() * 0.2);
                p[0].kick = vol; p[4].kick = vol * 0.7;
                p[8].snare = vol;
                if (r() > 0.5) p[11].kick = vol * 0.5;
                if (r() > 0.6) p[14].kick = vol * 0.4;
            } else {
                // House w/ open hats on the & of beats
                [0, 4, 8, 12].forEach(i => p[i].kick = vol);
                [4, 12].forEach(i => p[i].snare = vol);
                for (let i = 0; i < 16; i++) p[i].hihat = i % 2 === 0 ? 0.5 : 0.25;
                [2, 6, 10, 14].forEach(i => p[i].hihat = 0.55); // open feel on off-beats
                if (r() > 0.4) p[6].kick = vol * 0.65;
            }
            if (intensity > 80) p[0].crash = 0.7;

        } else if (genre === 'jazz') {
            // Variant 0: Swing ride  1: Bossa nova  2: Bebop comping
            if (variant === 0) {
                // Classic swing ride: beat on 1, skip 2, play 2& and 3
                [0, 3, 4, 7, 8, 11, 12, 15].forEach(i => p[i].hihat = 0.45 + r() * 0.2);
                p[0].kick = vol * 0.5;
                [4, 12].forEach(i => { if (r() > 0.3) p[i].snare = vol * (0.3 + r() * 0.4); });
                [2, 6, 10, 14].forEach(i => { if (r() > 0.6) p[i].kick = vol * 0.25; }); // comping
            } else if (variant === 1) {
                // Bossa nova: right-hand ride, left-hand rim
                [0, 3, 5, 8, 11, 13].forEach(i => p[i].hihat = 0.4 + r() * 0.15); // clave-ish
                [2, 10].forEach(i => p[i].snare = vol * 0.35);
                p[0].kick = vol * 0.7; p[8].kick = vol * 0.5;
            } else {
                // Bebop: busy ride, kick/snare sparse
                for (let i = 0; i < 16; i++) p[i].hihat = r() > 0.3 ? 0.4 + r() * 0.25 : 0;
                [0, 4, 8, 12].forEach(i => p[i].hihat = 0.6);
                if (r() > 0.5) p[5].kick = vol * 0.3;
                if (r() > 0.5) p[9].kick = vol * 0.3;
                [4, 12].forEach(i => { if (r() > 0.5) p[i].snare = vol * (0.2 + r() * 0.4); });
            }

        } else if (genre === 'metal') {
            // Variant 0: Mid-tempo   1: Full double kick   2: Half-time breakdown
            [4, 12].forEach(i => p[i].snare = vol);
            if (variant === 0) {
                [0, 8].forEach(i => p[i].kick = vol);
                [2, 6, 10, 14].forEach(i => { if (r() > 0.3) p[i].kick = vol * 0.8; });
                for (let i = 0; i < 16; i++) p[i].hihat = i % 2 === 0 ? 0.65 : 0.3;
            } else if (variant === 1) {
                // Blast-beat style: kick every 16th
                for (let i = 0; i < 16; i++) {
                    p[i].kick = vol * (i % 2 === 0 ? 1 : 0.7);
                    p[i].hihat = 0.6;
                }
                p[4].kick = 0; p[12].kick = 0; // snare takes those beats
            } else {
                // Half-time: kick 1, snare only on 3, heavy double 16ths
                p[0].kick = vol; p[8].kick = vol; p[9].kick = vol * 0.7;
                p[8].snare = vol; // half-time snare on 3
                p[4].snare = 0; p[12].snare = 0;
                for (let i = 0; i < 16; i++) p[i].hihat = i % 4 === 0 ? 0.7 : (i % 2 === 0 ? 0.45 : 0);
            }
            if (intensity > 70) p[0].crash = 0.9;
        }

        return p;
    }

    // FILL mode — original logic
    const fillDuration = Math.floor((fillAmount / 100) * 16);
    const fillStartStep = 16 - fillDuration;

    for (let i = 0; i < fillStartStep; i++) {
        if (genre === 'jazz') {
            if (i % 4 === 0 || i % 4 === 3) p[i].hihat = 0.5 + Math.random() * 0.2;
        } else {
            if (i % 2 === 0) p[i].hihat = 0.6 + Math.random() * 0.2;
            if (genre === 'electronic' && intensity > 60) p[i].hihat = 0.5;
        }
        if (i === 0) p[i].kick = 1;
        if (i === 4 || i === 12) p[i].snare = 1;
        if (genre === 'funk') {
            if (i === 10) p[i].kick = 0.8;
            if (i === 7 || i === 9) p[i].snare = 0.3;
        } else if (genre === 'metal') {
            if (i === 2 || i === 3) p[i].kick = 0.9;
        } else if (genre === 'electronic') {
            if (i === 6) p[i].kick = 0.8;
        }
    }

    for (let i = fillStartStep; i < steps; i++) {
        const vol = intensity / 100;
        const densityThreshold = 100 - complexity;
        if (i === fillStartStep) p[i].snare = Math.max(0.6, vol);
        const rand = Math.random();
        if (genre === 'jazz') {
            if (Math.random() * 100 > densityThreshold) {
                if (rand < 0.3) p[i].snare = vol * Math.random();
                else if (rand < 0.5) p[i].tomHigh = vol * 0.8;
                else if (rand < 0.7) p[i].tomMid = vol * 0.8;
                else p[i].tomLow = vol * 0.8;
                if (i % 2 === 0) p[i].hihat = 0.4;
            }
        } else if (genre === 'metal') {
            if (complexity > 50) {
                p[i].kick = vol;
                const bp = i % 4;
                if (bp === 0) p[i].snare = vol;
                else if (bp === 1) p[i].tomHigh = vol;
                else if (bp === 2) p[i].tomMid = vol;
                else p[i].tomLow = vol;
            } else {
                if (i % 4 === 0) { p[i].snare = 1; p[i].crash = 0.6; }
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
        if (intensity > 90 && i >= 14) { p[i].snare = 1; p[i].kick = 1; p[i].tomLow = 1; }
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
                <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-gray-300 text-sm font-bold transition-colors">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors">Delete</button>
            </div>
        </div>
    </div>
);

// ─────────────────────────────────────────────
// MINI PATTERN PREVIEW (for library items)
// ─────────────────────────────────────────────
const MiniPattern = ({ pattern }) => {
    const activeRows = ['kick', 'snare', 'hihat'];
    return (
        <div className="mt-1.5 flex flex-col gap-px w-full">
            {activeRows.map(inst => (
                <div key={inst} className="flex gap-px h-1.5">
                    {pattern.slice(0, 16).map((step, i) => (
                        <div key={i} className={`flex-1 rounded-[1px] ${step[inst] > 0 ? 'bg-emerald-500/70' : 'bg-neutral-700'}`} />
                    ))}
                </div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const DrumFillGen = () => {
    // ── App mode ──
    const [appMode, setAppMode] = useState("generator"); // "generator" | "arrangement"

    // ── Generator sub-mode ──
    const [generatorMode, setGeneratorMode] = useState("groove"); // "groove" | "fill"

    // ── Playback ──
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1);
    const [bpm, setBpm] = useState(110);

    // ── Generator params ──
    const [genre, setGenre] = useState("acoustic");
    const [complexity, setComplexity] = useState(60);
    const [intensity, setIntensity] = useState(70);
    const [fillAmount, setFillAmount] = useState(25);
    const [pattern, setPattern] = useState(() => generatePattern("acoustic", 60, 70, 25, "groove"));

    // ── Library ──
    const [library, setLibrary] = useState([
        { id: "lib-1", name: "Default Groove", type: "groove", pattern: generatePattern("acoustic", 60, 70, 0, "groove"), params: { genre: "acoustic", complexity: 60, intensity: 70, fillAmount: 0, generatorMode: "groove" } },
        { id: "lib-2", name: "Default Fill", type: "fill", pattern: generatePattern("acoustic", 60, 70, 50, "fill"), params: { genre: "acoustic", complexity: 60, intensity: 70, fillAmount: 50, generatorMode: "fill" } }
    ]);

    // ── Arrangement ──
    const [segments, setSegments] = useState([
        { id: "seg-1", name: "Intro", bars: ["lib-1", null, null, null] },
        { id: "seg-2", name: "Verse", bars: ["lib-1", "lib-1", "lib-1", "lib-2"] }
    ]);
    const [confirmModal, setConfirmModal] = useState(null);
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState("");
    const [openSegMenu, setOpenSegMenu] = useState(null); // segIndex of open kebab menu
    const [editingLibId, setEditingLibId] = useState(null); // id of lib item currently loaded in generator

    // ── Refs ──
    const audioCtxRef = useRef(null);
    const nextNoteTimeRef = useRef(0);
    const currentStepRef = useRef(0);
    const timerIDRef = useRef(null);

    // Close segment kebab menu on outside click
    useEffect(() => {
        if (openSegMenu === null) return;
        const close = () => setOpenSegMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [openSegMenu]);

    // ── Active pattern for playback ──
    const activePattern = useMemo(() => {
        if (appMode === "generator") return pattern;
        let flat = [];
        segments.forEach(seg => seg.bars.forEach(barId => {
            const item = barId ? library.find(l => l.id === barId) : null;
            flat.push(...(item ? item.pattern : Array(16).fill(null).map(() => ({}))));
        }));
        return flat.length > 0 ? flat : Array(16).fill(null).map(() => ({}));
    }, [appMode, pattern, segments, library]);

    const maxSteps = useMemo(() => activePattern.length || 16, [activePattern]);

    // ── Regen when params change ──
    useEffect(() => {
        setPattern(generatePattern(genre, complexity, intensity, generatorMode === 'groove' ? 0 : fillAmount, generatorMode));
    }, [genre, complexity, intensity, fillAmount, generatorMode]);

    // ── MIDI ──
    const generateMidiBlob = useCallback(() => {
        const writeVarInt = (value) => {
            if (value === 0) return [0];
            const stack = [];
            let t = value;
            while (t > 0) { stack.push(t & 0x7F); t >>= 7; }
            const res = [];
            for (let i = stack.length - 1; i >= 0; i--) { let b = stack[i]; if (i > 0) b |= 0x80; res.push(b); }
            return res;
        };
        const tpb = 480, tp16 = tpb / 4, uspb = Math.round(60000000 / bpm);
        const tempoData = [0x00, 0xFF, 0x51, 0x03, (uspb >> 16) & 0xFF, (uspb >> 8) & 0xFF, uspb & 0xFF, 0x00, 0xFF, 0x2F, 0x00];
        const tempoHeader = [0x4D, 0x54, 0x72, 0x6B, (tempoData.length >> 24) & 0xFF, (tempoData.length >> 16) & 0xFF, (tempoData.length >> 8) & 0xFF, tempoData.length & 0xFF];
        const trackData = [];
        const events = [];
        const GM_MAP = { kick: 36, snare: 38, hihat: 42, tomHigh: 50, tomMid: 47, tomLow: 43, crash: 49 };
        activePattern.forEach((step, idx) => {
            const tick = idx * tp16;
            Object.entries(step).forEach(([inst, val]) => {
                if (val > 0 && GM_MAP[inst]) {
                    const vel = Math.min(127, Math.max(1, Math.floor(val * 127)));
                    events.push({ tick, type: 0x99, note: GM_MAP[inst], velocity: vel });
                    events.push({ tick: tick + 60, type: 0x99, note: GM_MAP[inst], velocity: 0 });
                }
            });
        });
        events.sort((a, b) => a.tick - b.tick);
        let lastTick = 0;
        events.forEach(e => { const d = e.tick - lastTick; lastTick = e.tick; trackData.push(...writeVarInt(d)); trackData.push(e.type, e.note, e.velocity); });
        trackData.push(0x00, 0xFF, 0x2F, 0x00);
        const header = [0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x01, 0x00, 0x02, (tpb >> 8) & 0xFF, tpb & 0xFF];
        const trackHeader = [0x4D, 0x54, 0x72, 0x6B, (trackData.length >> 24) & 0xFF, (trackData.length >> 16) & 0xFF, (trackData.length >> 8) & 0xFF, trackData.length & 0xFF];
        return new Blob([new Uint8Array([...header, ...tempoHeader, ...tempoData, ...trackHeader, ...trackData])], { type: "audio/midi" });
    }, [activePattern, bpm]);

    const exportMIDI = () => {
        const blob = generateMidiBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `drum-${appMode}-${Date.now()}.mid`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    // ── Playback engine ──
    const scheduleNote = useCallback((step, time) => {
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
    }, [activePattern, genre]);

    const scheduler = useCallback(() => {
        while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
            scheduleNote(currentStepRef.current, nextNoteTimeRef.current);
            nextNoteTimeRef.current += (60.0 / bpm) / 4;
            currentStepRef.current = (currentStepRef.current + 1) % maxSteps;
        }
        timerIDRef.current = setTimeout(scheduler, 25);
    }, [scheduleNote, bpm, maxSteps]);

    useEffect(() => {
        if (isPlaying) {
            if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
            if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
            // Start from where we are instead of resetting to 0 if in generator mode
            if (appMode !== "generator") {
                currentStepRef.current = 0;
            }
            nextNoteTimeRef.current = audioCtxRef.current.currentTime;

            scheduler();
        } else {
            clearTimeout(timerIDRef.current);
            setCurrentStep(-1);
        }
        return () => clearTimeout(timerIDRef.current);
    }, [isPlaying, scheduler, appMode]);

    // ── Library helpers ──
    const saveToLibrary = () => {
        const effectiveFill = generatorMode === 'groove' ? 0 : fillAmount;

        if (editingLibId) {
            // Update existing
            setLibrary(prev => prev.map(l => l.id === editingLibId ? {
                ...l,
                pattern: [...pattern],
                params: { genre, complexity, intensity, fillAmount: effectiveFill, generatorMode }
            } : l));
        } else {
            // Add new
            const newItem = {
                id: `lib-${Date.now()}`,
                name: `${genre.charAt(0).toUpperCase() + genre.slice(1)} ${generatorMode === 'groove' ? 'Groove' : 'Fill'}`,
                type: generatorMode,
                pattern: [...pattern],
                params: { genre, complexity, intensity, fillAmount: effectiveFill, generatorMode }
            };
            setLibrary(prev => [...prev, newItem]);
        }
    };


    const loadFromLibrary = (libItem) => {
        // Double-click: load params into generator and switch to generator mode
        const { params } = libItem;
        setGenre(params.genre);
        setComplexity(params.complexity);
        setIntensity(params.intensity);
        setFillAmount(params.fillAmount);
        setGeneratorMode(params.generatorMode);
        setPattern([...libItem.pattern]);
        setEditingLibId(libItem.id);
        setAppMode("generator");
        setIsPlaying(false);
    };


    const renameLibraryItem = (id, newName) => {
        setLibrary(prev => prev.map(l => l.id === id ? { ...l, name: newName.trim() || l.name } : l));
        setRenamingId(null);
    };

    const deleteFromLibrary = (id) => {
        setLibrary(prev => prev.filter(l => l.id !== id));
    };

    // ── Arrangement helpers ──
    const handleDropInSegment = (e, segIndex, barIndex) => {
        const libId = e.dataTransfer.getData("libraryId");
        if (!libId) return;
        setSegments(prev => prev.map((seg, si) => si !== segIndex ? seg : {
            ...seg, bars: seg.bars.map((b, bi) => bi === barIndex ? libId : b)
        }));
    };

    // REMOVE the bar slot entirely from the segment bars array
    const removeBar = (segIndex, barIndex) => {
        setSegments(prev => prev.map((seg, si) => si !== segIndex ? seg : {
            ...seg, bars: seg.bars.filter((_, bi) => bi !== barIndex)
        }));
    };

    // SEEK playback to a specific global bar, then play
    const seekToBar = useCallback((globalBarIndex) => {
        const targetStep = globalBarIndex * 16;
        if (targetStep >= maxSteps) return;
        if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        clearTimeout(timerIDRef.current);
        currentStepRef.current = targetStep;
        nextNoteTimeRef.current = audioCtxRef.current.currentTime;
        if (!isPlaying) {
            setIsPlaying(true); // let useEffect kick off the scheduler
        } else {
            scheduler(); // already playing — restart scheduler loop from new position
        }
    }, [maxSteps, isPlaying, scheduler]);

    const deleteSegment = (segIndex) => {
        const seg = segments[segIndex];
        const hasPatterns = seg.bars.some(b => b !== null);
        const doDelete = () => {
            setSegments(prev => prev.filter((_, i) => i !== segIndex));
            setConfirmModal(null);
        };
        if (hasPatterns) {
            setConfirmModal({ message: `"${seg.name}" has patterns assigned. Delete anyway?`, onConfirm: doDelete });
        } else {
            doDelete();
        }
    };

    const GenreBtn = ({ id, label, color }) => (
        <button onClick={() => setGenre(id)}
            className={`py-2 px-3 rounded-md text-sm font-medium transition-all border border-transparent ${genre === id ? `bg-${color}-600 text-white shadow-lg border-${color}-400` : "bg-neutral-700 text-gray-400 hover:bg-neutral-600"}`}>
            {label}
        </button>
    );

    const instruments = [
        { id: "crash", label: "Crash", color: "bg-purple-500" },
        { id: "hihat", label: genre === "jazz" ? "Ride" : "Hi-Hat", color: "bg-yellow-500" },
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
                        No patterns yet.<br />Generate & save!
                    </div>
                )}
                {library.map(item => {
                    const isItemPlaying = isPlaying && appMode === "generator" && editingLibId === item.id;
                    return (
                        <div key={item.id}
                            draggable={renamingId !== item.id}
                            onDragStart={(e) => renamingId !== item.id && e.dataTransfer.setData("libraryId", item.id)}
                            onDoubleClick={() => renamingId !== item.id && loadFromLibrary(item)}
                            className={`bg-neutral-800 border p-2.5 rounded-lg cursor-grab hover:bg-neutral-750 transition-all active:cursor-grabbing group select-none relative
                                ${editingLibId === item.id ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-neutral-700'}`}
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
                                        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${isItemPlaying ? 'bg-red-500 text-white' : 'bg-neutral-700 text-gray-400 hover:bg-emerald-500 hover:text-white'}`}
                                    >
                                        {isItemPlaying ? <Square size={8} fill="currentColor" /> : <Play size={8} fill="currentColor" className="ml-0.5" />}
                                    </button>

                                    {renamingId === item.id ? (
                                        <input
                                            autoFocus
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onBlur={() => renameLibraryItem(item.id, renameValue)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') renameLibraryItem(item.id, renameValue);
                                                if (e.key === 'Escape') setRenamingId(null);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex-1 text-xs font-bold bg-neutral-700 text-white rounded px-1 py-0.5 border border-indigo-500 outline-none min-w-0"
                                        />
                                    ) : (
                                        <span
                                            className="text-xs font-bold text-gray-200 truncate cursor-text hover:text-white"
                                            onClick={(e) => { e.stopPropagation(); setRenamingId(item.id); setRenameValue(item.name); }}
                                            title="Click to rename"
                                        >
                                            {item.name}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className={`text-[8px] uppercase font-bold px-1 py-0.5 rounded ${item.type === 'fill' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                        {item.type}
                                    </span>
                                    <button onClick={(e) => { e.stopPropagation(); deleteFromLibrary(item.id); }}
                                        className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all">
                                        <X size={12} />
                                    </button>
                                </div>
                            </div>
                            <MiniPattern pattern={item.pattern} />
                            <div className="text-[9px] text-neutral-600 mt-1 flex justify-between items-center">
                                <span>{editingLibId === item.id ? "Editing..." : "Double-click to edit"}</span>
                                {isItemPlaying && <span className="text-emerald-500 font-bold animate-pulse text-[8px]">PLAYING</span>}
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
        <div className="min-h-screen bg-neutral-900 text-gray-200 font-sans flex flex-col">

            {/* CONFIRM MODAL */}
            {confirmModal && (
                <ConfirmModal message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />
            )}

            {/* TOP BAR */}
            <div className="bg-neutral-950 border-b border-neutral-800 px-5 py-3 shrink-0 flex items-center justify-between shadow-md z-20">
                <div className="flex items-center gap-5">
                    <h1 className="text-lg font-bold text-white tracking-wider flex items-center gap-2">
                        <Activity size={20} className="text-emerald-500" /> AI DRUM SYSTEM
                    </h1>
                    <div className="flex bg-neutral-800 p-1 rounded-lg gap-0.5">
                        <button onClick={() => { setAppMode("generator"); setIsPlaying(false); }}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-1.5 transition-all ${appMode === "generator" ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <LayoutGrid size={14} /> GENERATOR
                        </button>
                        <button onClick={() => { setAppMode("arrangement"); setIsPlaying(false); }}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-1.5 transition-all ${appMode === "arrangement" ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <Grid size={14} /> ARRANGEMENT
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">BPM</span>
                        <input type="number" value={bpm} onChange={(e) => setBpm(Number(e.target.value))}
                            className="bg-transparent text-white font-mono font-bold text-right w-12 focus:outline-none" />
                    </div>
                    <button onClick={exportMIDI}
                        className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-sm text-gray-200 flex items-center gap-2 cursor-pointer transition-colors"
                        title="Download MIDI">
                        <Download size={14} /> EXPORT
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
                                <button onClick={() => setGeneratorMode("groove")}
                                    className={`px-5 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${generatorMode === "groove" ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                                    <Drumstick size={14} /> Groove
                                </button>
                                <button onClick={() => setGeneratorMode("fill")}
                                    className={`px-5 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${generatorMode === "fill" ? 'bg-rose-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                                    <Music2 size={14} /> Fill
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">
                                {generatorMode === 'groove'
                                    ? 'Repeating rhythmic backbone — the core loop that anchors the song.'
                                    : 'End-of-phrase accent phrase — the burst that transitions sections.'}
                            </p>
                        </div>

                        {/* Main layout below sub-mode bar */}
                        <div className="flex-1 flex flex-col lg:flex-row gap-6 p-8">

                            {/* Controls LEFT */}
                            <div className="w-full lg:w-80 shrink-0 space-y-5">
                                <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-5 shadow-xl">
                                    <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Sliders size={14} className="text-emerald-500" /> Pattern Controls
                                    </h2>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Genre Style</label>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <GenreBtn id="acoustic" label="Rock / Pop" color="amber" />
                                                <GenreBtn id="electronic" label="Trap / EDM" color="indigo" />
                                                <GenreBtn id="jazz" label="Jazz / Fusion" color="sky" />
                                                <GenreBtn id="metal" label="Metal" color="red" />
                                                <GenreBtn id="funk" label="Funk / R&B" color="purple" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-400 font-bold uppercase">Dynamics</span>
                                                <span className="text-emerald-400 font-mono">{intensity}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))}
                                                className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-400 font-bold uppercase">Layers</span>
                                                <span className="text-indigo-400 font-mono">{complexity}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" value={complexity} onChange={(e) => setComplexity(Number(e.target.value))}
                                                className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                        </div>
                                        {generatorMode === 'fill' && (
                                            <div className="pt-3 border-t border-neutral-700">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-gray-400 font-bold uppercase">Fill Length</span>
                                                    <span className="text-rose-400 font-mono">{fillAmount}%</span>
                                                </div>
                                                <input type="range" min="0" max="100" value={fillAmount} onChange={(e) => setFillAmount(Number(e.target.value))}
                                                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-2 pt-2">
                                            <div className="flex gap-2">
                                                <button onClick={() => setPattern(generatePattern(genre, complexity, intensity, generatorMode === 'groove' ? 0 : fillAmount, generatorMode))}
                                                    className="flex-1 py-2.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white font-bold flex items-center justify-center gap-2 border border-neutral-600 transition-colors text-sm">
                                                    <RefreshCw size={14} /> REGEN
                                                </button>
                                                <button onClick={saveToLibrary}
                                                    className={`flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-sm border ${editingLibId ? 'bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border-indigo-500/30' : 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border-emerald-500/30'}`}>
                                                    <Save size={14} /> {editingLibId ? 'UPDATE' : 'SAVE'}
                                                </button>
                                            </div>
                                            {editingLibId && (
                                                <button onClick={() => setEditingLibId(null)}
                                                    className="w-full py-1 text-[10px] font-bold text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-widest">
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
                                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Preview — 1 Bar</h2>
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${generatorMode === "fill" && fillAmount > 0 ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                                            {generatorMode === "groove" ? "GROOVE" : fillAmount > 0 ? "FILL ACTIVE" : "GROOVE"}
                                        </span>
                                    </div>

                                    {/* Beat numbers */}
                                    <div className="flex items-center mb-1">
                                        <div className="w-20 shrink-0" />
                                        <div className="flex-1 grid gap-px" style={{ gridTemplateColumns: "repeat(16, 1fr)" }}>
                                            {Array(16).fill(0).map((_, i) => (
                                                <div key={i} className="text-[9px] text-center font-mono font-bold" style={{ color: i % 4 === 0 ? '#10b981' : 'transparent' }}>
                                                    {i % 4 === 0 ? (i / 4) + 1 : '.'}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Instrument rows — REDUCED HEIGHT */}
                                    <div className="flex flex-col gap-px">
                                        {instruments.map((inst) => (
                                            <div key={inst.id} className="flex items-center" style={{ height: '22px' }}>
                                                <div className="w-20 shrink-0 text-right pr-3 text-[9px] font-bold text-gray-500 uppercase tracking-wider font-mono">{inst.label}</div>
                                                <div className="flex-1 grid gap-px h-full bg-neutral-900 rounded-sm border border-white/5" style={{ gridTemplateColumns: "repeat(16, 1fr)" }}>
                                                    {pattern.map((step, si) => {
                                                        const val = step[inst.id] || 0;
                                                        const isActive = val > 0;
                                                        const isCurrent = currentStep === si && isPlaying;
                                                        return (
                                                            <div key={si}
                                                                className={`relative flex items-center justify-center ${si % 4 === 0 ? "border-l border-white/10" : ""}`}
                                                                style={{ backgroundColor: isCurrent ? "#2a2a2a" : (generatorMode === 'fill' && si >= 16 - Math.floor((fillAmount / 100) * 16) ? "#1e1515" : "#111") }}>
                                                                {!isActive && <div className="w-0.5 h-0.5 bg-neutral-700 rounded-full opacity-40" />}
                                                                {isActive && (
                                                                    <div className={`absolute inset-[1px] rounded-[1px] ${inst.color}`}
                                                                        style={{ opacity: 0.75 + val * 0.25, filter: isCurrent ? "brightness(1.6)" : "none" }}>
                                                                        <div className="absolute bottom-0 left-0 right-0 bg-black/30" style={{ height: `${(1 - val) * 100}%` }} />
                                                                    </div>
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
                                <div className="flex items-center justify-center py-2">
                                    <button onClick={() => setIsPlaying(!isPlaying)}
                                        className={`flex items-center gap-3 px-10 py-3 rounded-full font-bold text-lg shadow-2xl transition-all active:scale-95 ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30' : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'}`}>
                                        {isPlaying
                                            ? <><Square size={20} fill="currentColor" /> STOP</>
                                            : <><Play size={20} fill="currentColor" /> PLAY</>}
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════ ARRANGEMENT MODE ═══════════════════ */}
                {appMode === "arrangement" && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">

                        {/* Arrangement toolbar */}
                        <div className="bg-neutral-900 border-b border-neutral-800 px-5 py-2 flex items-center gap-4 shrink-0">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Arrangement Timeline</span>
                            <div className="flex-1" />
                            <button onClick={() => setIsPlaying(!isPlaying)}
                                className={`px-5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-all text-sm ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
                                {isPlaying ? <><Square size={14} fill="currentColor" /> STOP</> : <><Play size={14} fill="currentColor" /> PLAY</>}
                            </button>
                        </div>

                        {/* Timeline canvas */}
                        <div className="flex-1 overflow-auto bg-[#080808] p-6">
                            <div className="flex items-start gap-4 w-max pb-12">
                                {segments.map((segment, segIndex) => (
                                    <div key={segment.id} className="w-44 shrink-0 flex flex-col">
                                        {/* Segment header */}
                                        <div className="bg-neutral-800 rounded-t-lg border-b-2 border-indigo-500 flex items-center group/seghead">
                                            <button
                                                onClick={() => {
                                                    let precedingBars = 0;
                                                    for (let i = 0; i < segIndex; i++) precedingBars += segments[i].bars.length;
                                                    seekToBar(precedingBars);
                                                }}
                                                className="pl-2.5 text-neutral-500 hover:text-emerald-400 transition-colors"
                                                title={`Play ${segment.name}`}
                                            >
                                                <Play size={12} fill="currentColor" />
                                            </button>
                                            <input value={segment.name}
                                                onChange={(e) => setSegments(prev => prev.map((s, i) => i !== segIndex ? s : { ...s, name: e.target.value }))}
                                                className="bg-transparent text-center text-sm font-bold flex-1 py-2 px-1 border-none outline-none text-gray-200" />

                                            {/* ⋮ Kebab menu */}
                                            <div className="relative shrink-0">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setOpenSegMenu(openSegMenu === segIndex ? null : segIndex); }}
                                                    className="text-neutral-500 hover:text-white px-2 py-2 rounded hover:bg-neutral-700 transition-colors text-base leading-none"
                                                    title="Segment options"
                                                >⋮</button>
                                                {openSegMenu === segIndex && (
                                                    <div
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="absolute right-0 top-full mt-1 w-36 bg-neutral-800 border border-neutral-600 rounded-lg shadow-2xl z-50 overflow-hidden">
                                                        <button
                                                            onClick={() => { deleteSegment(segIndex); setOpenSegMenu(null); }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left">
                                                            <Trash2 size={12} /> Delete Segment
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Bars */}
                                        <div className="bg-neutral-900/50 border border-t-0 border-neutral-800 rounded-b-lg p-2 flex flex-col gap-2 min-h-[80px]">
                                            {segment.bars.map((barLibId, barIndex) => {
                                                const item = library.find(l => l.id === barLibId);

                                                let precedingBars = 0;
                                                for (let i = 0; i < segIndex; i++) precedingBars += segments[i].bars.length;
                                                precedingBars += barIndex;
                                                const globalBarIdx = precedingBars;
                                                const globalStart = globalBarIdx * 16;
                                                const isCurrent = isPlaying && currentStep >= globalStart && currentStep < globalStart + 16;

                                                return (
                                                    <div key={barIndex}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={(e) => handleDropInSegment(e, segIndex, barIndex)}
                                                        onClick={() => item && seekToBar(globalBarIdx)}
                                                        className={`relative h-14 rounded-md border-2 border-dashed flex items-center justify-center overflow-hidden transition-all group
                                                            ${item ? 'border-transparent bg-neutral-800 hover:bg-neutral-700/60 cursor-pointer' : 'border-neutral-700/50 hover:border-neutral-600 hover:bg-neutral-800/20'}
                                                            ${isCurrent ? 'ring-1 ring-emerald-500/50' : ''}`}>

                                                        {/* Playback progress bar */}
                                                        {isCurrent && (
                                                            <div className="absolute top-0 left-0 bottom-0 bg-emerald-500/20 z-0 transition-all duration-75"
                                                                style={{ width: `${((currentStep % 16) / 16) * 100}%` }} />
                                                        )}

                                                        {/* ── Corner X: always shown on hover, removes the slot ── */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeBar(segIndex, barIndex); }}
                                                            className="absolute top-1 right-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/70 hover:bg-red-600 text-neutral-400 hover:text-white rounded p-0.5"
                                                            title="Remove bar slot">
                                                            <X size={10} />
                                                        </button>

                                                        {item ? (
                                                            <div className="relative z-10 flex flex-col items-center justify-center w-full h-full pointer-events-none px-4">
                                                                <span className="text-[11px] font-bold text-gray-200 truncate w-full text-center">{item.name}</span>
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <span className={`text-[9px] ${item.type === 'fill' ? 'text-rose-400' : 'text-emerald-400'}`}>{item.type}</span>
                                                                    {isCurrent && <span className="text-[8px] text-emerald-400 font-bold animate-pulse">▶ PLAYING</span>}
                                                                    {!isCurrent && <span className="text-[8px] text-neutral-600">click to play</span>}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-neutral-600 pointer-events-none">Drop Here</span>
                                                        )}

                                                        {/* Bar number bottom-left */}
                                                        <div className="absolute bottom-1 left-1.5 text-[8px] font-mono text-neutral-700 font-bold z-10">B{barIndex + 1}</div>
                                                    </div>
                                                );
                                            })}

                                            {/* Add bar */}
                                            <button onClick={() => setSegments(prev => prev.map((s, i) => i !== segIndex ? s : { ...s, bars: [...s.bars, null] }))}
                                                className="h-7 border border-dashed border-neutral-700 text-neutral-600 rounded-md hover:bg-neutral-800 hover:text-white transition-all flex items-center justify-center text-xs">
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Add segment */}
                                <button onClick={() => setSegments(prev => [...prev, { id: `seg-${Date.now()}`, name: `Part ${prev.length + 1}`, bars: [null, null, null, null] }])}
                                    className="w-12 h-10 bg-neutral-800 hover:bg-indigo-600 border border-neutral-700 rounded-lg text-white font-bold flex items-center justify-center transition-all overflow-hidden group shrink-0 hover:w-32">
                                    <Plus size={16} className="shrink-0" />
                                    <span className="text-xs ml-1.5 w-0 overflow-hidden whitespace-nowrap group-hover:w-auto transition-all duration-300">Add Part</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── FOOTER ── */}
            <div className="shrink-0 bg-neutral-950 border-t border-neutral-800 px-6 py-2.5 flex items-center justify-between text-[10px] text-neutral-600">
                <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold tracking-wider">AI DRUM SYSTEM</span>
                    <span className="text-neutral-700">•</span>
                    <span>Designed &amp; Built by</span>
                    <span className="text-neutral-400 font-semibold">Parkpoom Wisedsri</span>
                    <span className="text-neutral-700">•</span>
                    <a href="mailto:parkpoom.wisedsri@gmail.com"
                        className="text-neutral-500 hover:text-emerald-400 transition-colors underline underline-offset-2">
                        parkpoom.wisedsri@gmail.com
                    </a>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-700">
                    <span>AI Collaboration</span>
                    <span className="text-indigo-600 font-semibold">Antigravity / Google DeepMind</span>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
            `}</style>
        </div>
    );
};

export default DrumFillGen;
