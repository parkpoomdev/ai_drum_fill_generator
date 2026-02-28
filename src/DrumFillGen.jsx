import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Square, RefreshCw, Volume2, Sliders, Music, Zap, Activity, Download, Plus, LayoutGrid, Layers, Archive, Trash2, Edit2, PlayCircle, Grid, Save } from 'lucide-react';

// --- AUDIO ENGINE (Synthesizer) ---
const createAudioContext = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    return new AudioContext();
};

const playSound = (ctx, type, time, velocity = 1, genre = 'acoustic') => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let vol = velocity;

    if (genre === 'electronic') vol *= 0.8;
    if (genre === 'jazz') vol *= 0.7;
    if (genre === 'metal') vol *= 1.1;

    // --- TOMS CONFIG ---
    if (type.startsWith('tom')) {
        let startFreq = 150;
        let endFreq = 50;

        // Adjust pitch based on Tom Type
        if (type === 'tomHigh') { startFreq = 200; endFreq = 80; }
        if (type === 'tomMid') { startFreq = 140; endFreq = 60; }
        if (type === 'tomLow') { startFreq = 90; endFreq = 40; }

        if (genre === 'electronic') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(startFreq * 1.5, time);
            osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.2);
            gain.gain.setValueAtTime(vol, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        } else {
            osc.frequency.setValueAtTime(startFreq, time);
            osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.4);
            gain.gain.setValueAtTime(vol * 0.9, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
            osc.type = 'sine';
        }

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.5);
        return;
    }

    // --- OTHER INSTRUMENTS ---
    if (type === 'kick') {
        const startFreq = genre === 'electronic' ? 150 : (genre === 'metal' ? 100 : 120);
        osc.frequency.setValueAtTime(startFreq, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + (genre === 'jazz' ? 0.3 : 0.5));
        osc.type = genre === 'electronic' ? 'sine' : 'triangle';

        if (genre === 'metal') {
            const clickOsc = ctx.createOscillator();
            const clickGain = ctx.createGain();
            clickOsc.frequency.setValueAtTime(3000, time);
            clickOsc.frequency.exponentialRampToValueAtTime(100, time + 0.05);
            clickGain.gain.setValueAtTime(vol * 0.5, time);
            clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
            clickOsc.connect(clickGain);
            clickGain.connect(ctx.destination);
            clickOsc.start(time);
            clickOsc.stop(time + 0.05);
        }
    } else if (type === 'snare') {
        osc.type = 'triangle';
        const baseFreq = genre === 'electronic' ? 200 : 180;
        osc.frequency.setValueAtTime(baseFreq, time);
        gain.gain.setValueAtTime(vol * 0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < ctx.sampleRate; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(vol * 0.8, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(time);
    } else if (type === 'hihat') {
        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = genre === 'jazz' ? 'bandpass' : 'highpass';
        filter.frequency.value = genre === 'jazz' ? 5000 : 7000;
        if (genre === 'jazz') filter.Q.value = 1;

        const noiseGain = ctx.createGain();
        const decayTime = genre === 'jazz' ? 0.3 : 0.05;
        noiseGain.gain.setValueAtTime(vol * 0.3, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + decayTime);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(time);
        return;
    } else if (type === 'crash') {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3000;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(vol * 0.6, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 1.5);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(time);
        return;
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.5);
};

// --- PATTERN GENERATOR ---
const generatePattern = (genre, complexity, intensity, fillAmount) => {
    const steps = 16;
    const pattern = Array(steps).fill(null).map(() => ({
        kick: 0, snare: 0, hihat: 0, tomHigh: 0, tomMid: 0, tomLow: 0, crash: 0
    }));

    const fillDuration = Math.floor((fillAmount / 100) * 16);
    const fillStartStep = 16 - fillDuration;

    for (let i = 0; i < fillStartStep; i++) {
        if (genre === "jazz") {
            if (i % 4 === 0 || i % 4 === 3) pattern[i].hihat = 0.5 + (Math.random() * 0.2);
        } else {
            if (i % 2 === 0) pattern[i].hihat = 0.6 + (Math.random() * 0.2);
            if (genre === "electronic" && intensity > 60) pattern[i].hihat = 0.5;
        }

        if (i === 0) pattern[i].kick = 1;
        if (i === 4 || i === 12) pattern[i].snare = 1;

        if (genre === "funk") {
            if (i === 10) pattern[i].kick = 0.8;
            if (i === 7 || i === 9) pattern[i].snare = 0.3;
        } else if (genre === "metal") {
            if (i === 2 || i === 3) pattern[i].kick = 0.9;
        } else if (genre === "electronic") {
            if (i === 6) pattern[i].kick = 0.8;
        }
    }

    for (let i = fillStartStep; i < steps; i++) {
        const vol = intensity / 100;
        const densityThreshold = 100 - complexity;

        if (i === fillStartStep) pattern[i].snare = Math.max(0.6, vol);

        const rand = Math.random();

        if (genre === "jazz") {
            if (Math.random() * 100 > densityThreshold) {
                if (rand < 0.3) pattern[i].snare = vol * Math.random();
                else if (rand < 0.5) pattern[i].tomHigh = vol * 0.8;
                else if (rand < 0.7) pattern[i].tomMid = vol * 0.8;
                else pattern[i].tomLow = vol * 0.8;
                if (i % 2 === 0) pattern[i].hihat = 0.4;
            }
        }
        else if (genre === "metal") {
            if (complexity > 50) {
                pattern[i].kick = vol;
                const beatPos = i % 4;
                if (beatPos === 0) pattern[i].snare = vol;
                else if (beatPos === 1) pattern[i].tomHigh = vol;
                else if (beatPos === 2) pattern[i].tomMid = vol;
                else pattern[i].tomLow = vol;
            } else {
                if (i % 4 === 0) { pattern[i].snare = 1; pattern[i].crash = 0.6; }
            }
        }
        else {
            if (Math.random() * 100 > densityThreshold) {
                if (intensity > 60 && complexity < 50) {
                    pattern[i].snare = vol * (0.6 + (i / steps) * 0.4);
                } else {
                    const fillProgress = (i - fillStartStep) / fillDuration;
                    if (fillProgress < 0.33) pattern[i].tomHigh = vol;
                    else if (fillProgress < 0.66) pattern[i].tomMid = vol;
                    else pattern[i].tomLow = vol;
                }
            }
        }

        if (intensity > 90 && i >= 14) {
            pattern[i].snare = 1;
            pattern[i].kick = 1;
            pattern[i].tomLow = 1;
        }
    }

    if (intensity > 70) pattern[0].crash = 1;
    return pattern;
};

// --- COMPONENT ---
const DrumFillGen = () => {
    // Top Level State
    const [appMode, setAppMode] = useState("generator"); // "generator" | "arrangement"
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1);
    const [bpm, setBpm] = useState(110);

    // Generator State
    const [genre, setGenre] = useState("acoustic");
    const [complexity, setComplexity] = useState(60);
    const [intensity, setIntensity] = useState(70);
    const [fillAmount, setFillAmount] = useState(25);
    const [pattern, setPattern] = useState(() => generatePattern("acoustic", 60, 70, 25));

    // Library & Arrangement State
    const [library, setLibrary] = useState([
        { id: "lib-1", name: "Default Groove", type: "groove", pattern: generatePattern("acoustic", 60, 70, 0) },
        { id: "lib-2", name: "Default Fill", type: "fill", pattern: generatePattern("acoustic", 60, 70, 50) }
    ]);
    const [segments, setSegments] = useState([
        { id: "seg-1", name: "Intro", bars: ["lib-1", null, null, null] },
        { id: "seg-2", name: "Verse", bars: ["lib-1", "lib-1", "lib-1", "lib-2"] }
    ]);

    const [midiBlobUrl, setMidiBlobUrl] = useState(null);

    // Refs
    const audioCtxRef = useRef(null);
    const nextNoteTimeRef = useRef(0);
    const currentStepRef = useRef(0);
    const timerIDRef = useRef(null);

    const activePattern = useMemo(() => {
        if (appMode === "generator") return pattern;

        let flat = [];
        segments.forEach(seg => {
            seg.bars.forEach(barId => {
                if (barId) {
                    const item = library.find(i => i.id === barId);
                    if (item) flat.push(...item.pattern);
                    else flat.push(...Array(16).fill(null).map(() => ({})));
                } else {
                    flat.push(...Array(16).fill(null).map(() => ({})));
                }
            });
        });
        return flat.length > 0 ? flat : Array(16).fill(null).map(() => ({}));
    }, [appMode, pattern, segments, library]);

    const maxSteps = useMemo(() => activePattern.length || 16, [activePattern]);

    useEffect(() => {
        if (appMode === "generator") {
            setPattern(generatePattern(genre, complexity, intensity, fillAmount));
        }
    }, [genre, complexity, intensity, fillAmount, appMode]);

    // --- MIDI EXPORT ---
    const generateMidiBlob = useCallback(() => {
        const writeVarInt = (value) => {
            if (value === 0) return [0];
            const stack = [];
            let t = value;
            while (t > 0) {
                stack.push(t & 0x7F);
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

        const ticksPerBeat = 480;
        const ticksPer16th = ticksPerBeat / 4;
        const microSecondsPerBeat = Math.round(60000000 / bpm);

        const tempoTrackData = [
            0x00, 0xFF, 0x51, 0x03,
            (microSecondsPerBeat >> 16) & 0xFF,
            (microSecondsPerBeat >> 8) & 0xFF,
            microSecondsPerBeat & 0xFF,
            0x00, 0xFF, 0x2F, 0x00
        ];

        const tempoTrackHeader = [
            0x4D, 0x54, 0x72, 0x6B,
            (tempoTrackData.length >> 24) & 0xFF,
            (tempoTrackData.length >> 16) & 0xFF,
            (tempoTrackData.length >> 8) & 0xFF,
            tempoTrackData.length & 0xFF
        ];

        const trackData = [];
        const events = [];
        const GM_MAP = { kick: 36, snare: 38, hihat: 42, tomHigh: 50, tomMid: 47, tomLow: 43, crash: 49 };

        activePattern.forEach((step, index) => {
            const stepTick = index * ticksPer16th;
            Object.entries(step).forEach(([inst, val]) => {
                if (val > 0 && GM_MAP[inst]) {
                    const velocity = Math.min(127, Math.max(1, Math.floor(val * 127)));
                    const note = GM_MAP[inst];
                    events.push({ tick: stepTick, type: 0x99, note, velocity });
                    events.push({ tick: stepTick + 60, type: 0x99, note, velocity: 0 });
                }
            });
        });

        events.sort((a, b) => a.tick - b.tick);
        let lastEventTick = 0;
        events.forEach(e => {
            const delta = e.tick - lastEventTick;
            lastEventTick = e.tick;
            trackData.push(...writeVarInt(delta));
            trackData.push(e.type, e.note, e.velocity);
        });
        trackData.push(0x00, 0xFF, 0x2F, 0x00);

        const header = [
            0x4D, 0x54, 0x68, 0x64,
            0x00, 0x00, 0x00, 0x06,
            0x00, 0x01,
            0x00, 0x02,
            (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF
        ];

        const trackHeader = [
            0x4D, 0x54, 0x72, 0x6B,
            (trackData.length >> 24) & 0xFF,
            (trackData.length >> 16) & 0xFF,
            (trackData.length >> 8) & 0xFF,
            trackData.length & 0xFF
        ];

        const fileBytes = new Uint8Array([...header, ...tempoTrackHeader, ...tempoTrackData, ...trackHeader, ...trackData]);
        return new Blob([fileBytes], { type: "audio/midi" });
    }, [activePattern, bpm]);

    useEffect(() => {
        const blob = generateMidiBlob();
        const url = URL.createObjectURL(blob);
        setMidiBlobUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [generateMidiBlob]);

    const exportMIDI = (e) => {
        if (e && e.preventDefault) e.preventDefault();
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

    const handleDragStartExport = (e) => {
        if (!midiBlobUrl) return;
        const downloadName = `drum-${appMode}-${Date.now()}.mid`;
        e.dataTransfer.setData("DownloadURL", `audio/midi:${downloadName}:${midiBlobUrl}`);
    };

    // --- PLAYBACK ENGINE ---
    const scheduleNote = (stepNumber, time) => {
        requestAnimationFrame(() => setCurrentStep(stepNumber));
        const step = activePattern[stepNumber];
        if (!step) return;
        const ctx = audioCtxRef.current;

        if (step.kick > 0) playSound(ctx, "kick", time, step.kick, genre);
        if (step.snare > 0) playSound(ctx, "snare", time, step.snare, genre);
        if (step.hihat > 0) playSound(ctx, "hihat", time, step.hihat, genre);
        if (step.tomHigh > 0) playSound(ctx, "tomHigh", time, step.tomHigh, genre);
        if (step.tomMid > 0) playSound(ctx, "tomMid", time, step.tomMid, genre);
        if (step.tomLow > 0) playSound(ctx, "tomLow", time, step.tomLow, genre);
        if (step.crash > 0) playSound(ctx, "crash", time, step.crash, genre);
    };

    const nextNote = () => {
        const secondsPerBeat = 60.0 / bpm;
        const secondsPer16th = secondsPerBeat / 4;
        nextNoteTimeRef.current += secondsPer16th;
        currentStepRef.current = (currentStepRef.current + 1) % maxSteps;
    };

    const scheduler = useCallback(() => {
        while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
            scheduleNote(currentStepRef.current, nextNoteTimeRef.current);
            nextNote();
        }
        timerIDRef.current = setTimeout(scheduler, 25);
    }, [activePattern, bpm, genre, maxSteps]);

    useEffect(() => {
        if (isPlaying) {
            if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
            if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
            currentStepRef.current = 0;
            nextNoteTimeRef.current = audioCtxRef.current.currentTime;
            scheduler();
        } else {
            clearTimeout(timerIDRef.current);
            setCurrentStep(-1);
        }
        return () => clearTimeout(timerIDRef.current);
    }, [isPlaying, scheduler, appMode]);

    const saveToLibrary = () => {
        const newPattern = {
            id: `lib-${Date.now()}`,
            name: `${genre} ${fillAmount > 0 ? 'Fill' : 'Groove'}`,
            type: fillAmount > 0 ? 'fill' : 'groove',
            pattern: [...pattern]
        };
        setLibrary([...library, newPattern]);
    };

    const handleDropInSegment = (e, segIndex, barIndex) => {
        const libId = e.dataTransfer.getData("libraryId");
        if (!libId) return;

        setSegments(prev => {
            const next = [...prev];
            next[segIndex] = { ...next[segIndex], bars: [...next[segIndex].bars] }; // Fix state mutation issue
            next[segIndex].bars[barIndex] = libId;
            return next;
        });
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
        { id: "hihat", label: genre === "jazz" ? "Ride" : "Hi-Hat", color: "bg-yellow-500" },
        { id: "tomHigh", label: "Tom High", color: "bg-orange-400" },
        { id: "tomMid", label: "Tom Mid", color: "bg-orange-500" },
        { id: "tomLow", label: "Tom Low", color: "bg-orange-600" },
        { id: "snare", label: "Snare", color: "bg-red-500" },
        { id: "kick", label: "Kick", color: "bg-blue-500" },
    ];

    return (
        <div className="min-h-screen bg-neutral-900 text-gray-200 font-sans flex flex-col">
            {/* TOP NAVIGATION BAR */}
            <div className="bg-neutral-950 border-b border-neutral-800 p-4 shrink-0 flex items-center justify-between shadow-md z-20">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
                        <Activity className="text-emerald-500" /> AI DRUM SYSTEM
                    </h1>
                    <div className="flex bg-neutral-800 p-1 rounded-lg">
                        <button
                            onClick={() => { setAppMode("generator"); setIsPlaying(false); }}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${appMode === "generator" ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <LayoutGrid size={16} /> GENERATOR
                        </button>
                        <button
                            onClick={() => { setAppMode("arrangement"); setIsPlaying(false); }}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${appMode === "arrangement" ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Grid size={16} /> ARRANGEMENT
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700">
                        <span className="text-xs text-gray-400 font-bold uppercase">BPM</span>
                        <input
                            type="number"
                            value={bpm}
                            onChange={(e) => setBpm(Number(e.target.value))}
                            className="bg-transparent text-white font-mono font-bold text-right w-12 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`px-6 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-all ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                    >
                        {isPlaying ? <><Square size={16} fill="currentColor" /> STOP</> : <><Play size={16} fill="currentColor" /> PLAY</>}
                    </button>
                    <button
                        onClick={exportMIDI}
                        draggable="true"
                        onDragStart={handleDragStartExport}
                        className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-sm text-gray-200 flex items-center gap-2 cursor-grab active:cursor-grabbing"
                        title="Click to Export or Drag to DAW"
                    >
                        <Download size={16} /> EXPORT MIDI
                    </button>
                </div>
            </div>

            {/* MAIN WORKSPACE */}
            <div className="flex-1 overflow-hidden flex relative">

                {appMode === "generator" && (
                    <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto w-full">
                        {/* GENERATOR CONTROLS */}
                        <div className="w-full lg:w-96 shrink-0 space-y-6">
                            <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-6 shadow-xl">
                                <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Sliders size={16} className="text-emerald-500" /> Pattern Controls
                                </h2>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Genre Style</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <GenreBtn id="acoustic" label="Rock/Pop" color="amber" />
                                            <GenreBtn id="electronic" label="Trap/EDM" color="indigo" />
                                            <GenreBtn id="jazz" label="Jazz/Fusion" color="sky" />
                                            <GenreBtn id="metal" label="Metal" color="red" />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-400 font-bold uppercase">Dynamics</span>
                                            <span className="text-emerald-400 font-mono">{intensity}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-400 font-bold uppercase">Layers</span>
                                            <span className="text-indigo-400 font-mono">{complexity}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={complexity} onChange={(e) => setComplexity(Number(e.target.value))} className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    </div>

                                    <div className="pt-4 border-t border-neutral-700">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-400 font-bold uppercase">Fill Length</span>
                                            <span className="text-rose-400 font-mono">{fillAmount}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={fillAmount} onChange={(e) => setFillAmount(Number(e.target.value))} className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                        <button onClick={() => setPattern(generatePattern(genre, complexity, intensity, fillAmount))} className="flex-1 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white font-bold flex items-center justify-center gap-2 border border-neutral-600 transition-colors">
                                            <RefreshCw size={16} /> REGENERATE
                                        </button>
                                        <button onClick={saveToLibrary} className="flex-1 py-3 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
                                            <Save size={16} /> SAVE TO LIB
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* GENERATOR VISUALIZER */}
                        <div className="flex-1 bg-[#0a0a0a] rounded-xl border border-neutral-700 p-6 shadow-inner flex flex-col">
                            <div className="flex justify-between items-end mb-4">
                                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Live Preview (1 Bar)</h2>
                                <span className={`text-xs font-mono px-2 py-1 rounded ${fillAmount > 0 ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                                    {fillAmount > 0 ? `FILL ACTIVE` : `GROOVE`}
                                </span>
                            </div>

                            <div className="flex-1 flex flex-col gap-1 relative overflow-hidden">
                                {instruments.map((inst) => (
                                    <div key={inst.id} className="flex-1 flex items-center group min-h-[30px]">
                                        <div className="w-24 shrink-0 text-right pr-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">
                                            {inst.label}
                                        </div>
                                        <div className="flex-1 grid gap-[1px] h-full bg-neutral-900 rounded-sm border border-white/5" style={{ gridTemplateColumns: "repeat(16, 1fr)" }}>
                                            {pattern.map((step, stepIndex) => {
                                                const val = step[inst.id] || 0;
                                                const isActive = val > 0;
                                                const isCurrent = currentStep === stepIndex;

                                                return (
                                                    <div key={stepIndex} className={`relative flex items-center justify-center ${stepIndex % 4 === 0 ? "border-l border-white/10" : ""}`} style={{ backgroundColor: isCurrent ? "#333" : "#161616" }}>
                                                        {!isActive && <div className="w-1 h-1 bg-neutral-700 rounded-full opacity-30"></div>}
                                                        {isActive && (
                                                            <div className={`absolute inset-[1px] rounded-[1px] ${inst.color} shadow-sm`} style={{ opacity: 0.8 + (val * 0.2), transform: isActive ? "scale(1)" : "scale(0.8)", filter: isCurrent ? "brightness(1.5)" : "none" }}>
                                                                <div className="absolute bottom-0 left-0 right-0 bg-black/30" style={{ height: `${(1 - val) * 100}%` }}></div>
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
                    </div>
                )}

                {appMode === "arrangement" && (
                    <div className="flex-1 flex w-full h-full">
                        {/* LEFT PATTERN LIBRARY PANEL */}
                        <div className="w-64 bg-neutral-900 border-r border-neutral-800 p-4 flex flex-col shrink-0 shadow-lg z-10 h-full">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Archive size={14} /> Pattern Library
                            </h2>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {library.length === 0 && (
                                    <div className="text-xs text-gray-500 text-center p-4 border border-dashed border-neutral-700 rounded-lg">
                                        No patterns saved.<br />Go to Generator!
                                    </div>
                                )}
                                {library.map(libItem => (
                                    <div
                                        key={libItem.id}
                                        draggable="true"
                                        onDragStart={(e) => e.dataTransfer.setData("libraryId", libItem.id)}
                                        className="bg-neutral-800 border border-neutral-700 p-3 rounded-lg cursor-grab hover:bg-neutral-700 transition-colors shadow-sm active:cursor-grabbing group select-none"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-bold text-gray-200 truncate pr-2">{libItem.name}</span>
                                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${libItem.type === 'fill' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                {libItem.type}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                            <Layers size={10} /> Drag to timeline
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ARRANGEMENT TIMELINE CANVAS */}
                        <div className="flex-1 bg-[#080808] p-6 overflow-auto relative h-full">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Arrangement Timeline</h2>

                            <div className="flex items-start gap-4 pb-12 w-max h-full">
                                {segments.map((segment, segIndex) => (
                                    <div key={segment.id} className="w-48 shrink-0 flex flex-col h-fit">
                                        <div className="bg-neutral-800 text-center py-2 border-b-2 border-indigo-500 rounded-t-lg font-bold text-sm text-gray-200 shadow-sm relative group">
                                            <input
                                                value={segment.name}
                                                onChange={(e) => {
                                                    const clone = [...segments];
                                                    clone[segIndex].name = e.target.value;
                                                    setSegments(clone);
                                                }}
                                                className="bg-transparent text-center border-none outline-none w-full"
                                            />
                                        </div>
                                        <div className="bg-neutral-900/50 p-2 border border-t-0 border-neutral-800 rounded-b-lg flex flex-col gap-2 min-h-[100px]">
                                            {segment.bars.map((barLibId, barIndex) => {
                                                const activeLibItem = library.find(i => i.id === barLibId);

                                                // Calculate if this block is currently playing
                                                let precedingBars = 0;
                                                for (let i = 0; i < segIndex; i++) precedingBars += segments[i].bars.length;
                                                precedingBars += barIndex;

                                                const globalStartStep = precedingBars * 16;
                                                const isCurrentBar = isPlaying && currentStep >= globalStartStep && currentStep < globalStartStep + 16;

                                                return (
                                                    <div
                                                        key={barIndex}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={(e) => handleDropInSegment(e, segIndex, barIndex)}
                                                        className={`h-16 rounded-md border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-all ${activeLibItem ? 'border-transparent bg-neutral-800 shadow-sm' : 'border-neutral-700/50 hover:border-neutral-500 bg-neutral-900/20'}`}
                                                    >
                                                        {isCurrentBar && (
                                                            <div className="absolute inset-0 bg-white/5 z-0"></div>
                                                        )}

                                                        {isCurrentBar && (
                                                            <div
                                                                className="absolute top-0 bottom-0 bg-white/10 w-0 z-0 transition-all duration-75"
                                                                style={{ width: `${((currentStep % 16) / 16) * 100}%` }}
                                                            ></div>
                                                        )}

                                                        {activeLibItem ? (
                                                            <div className="relative z-10 flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-neutral-700/50 transition-colors" onClick={() => {
                                                                const clone = [...segments];
                                                                clone[segIndex] = { ...clone[segIndex], bars: [...clone[segIndex].bars] };
                                                                clone[segIndex].bars[barIndex] = null;
                                                                setSegments(clone);
                                                            }}>
                                                                <span className="text-xs font-bold text-gray-200">{activeLibItem.name}</span>
                                                                <span className={`text-[10px] mt-1 ${activeLibItem.type === 'fill' ? 'text-rose-400' : 'text-emerald-400'}`}>Click to Clear</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-neutral-600 font-medium relative z-10 pointer-events-none">Drop Pattern</span>
                                                        )}

                                                        <div className="absolute top-1 left-1.5 text-[9px] font-mono text-neutral-600 font-bold">B{barIndex + 1}</div>
                                                    </div>
                                                );
                                            })}
                                            <button
                                                onClick={() => {
                                                    const clone = [...segments];
                                                    clone[segIndex] = { ...clone[segIndex], bars: [...clone[segIndex].bars, null] };
                                                    setSegments(clone);
                                                }}
                                                className="h-8 border border-dashed border-neutral-700 text-neutral-500 rounded-md hover:bg-neutral-800 hover:text-white transition-all flex items-center justify-center mt-2 group"
                                            >
                                                <Plus size={14} className="group-hover:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setSegments([...segments, { id: `seg-${Date.now()}`, name: `Part ${segments.length + 1}`, bars: [null, null, null, null] }])}
                                    className="w-12 hover:w-32 h-10 bg-neutral-800 hover:bg-indigo-600 border border-neutral-700 rounded-lg text-white font-bold flex items-center justify-center transition-all overflow-hidden group shrink-0"
                                >
                                    <Plus size={18} className="shrink-0" />
                                    <span className="text-xs ml-2 w-0 overflow-hidden whitespace-nowrap group-hover:w-auto transition-all duration-300">Add Segment</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
            `}</style>
        </div>
    );
};

export default DrumFillGen;
