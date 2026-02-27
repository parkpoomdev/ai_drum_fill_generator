import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, RefreshCw, Volume2, Sliders, Music, Zap, Activity, Download } from 'lucide-react';

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

    // 1. BASE GROOVE
    for (let i = 0; i < fillStartStep; i++) {
        // HiHats
        if (genre === 'jazz') {
            if (i % 4 === 0 || i % 4 === 3) pattern[i].hihat = 0.5 + (Math.random() * 0.2);
        } else {
            if (i % 2 === 0) pattern[i].hihat = 0.6 + (Math.random() * 0.2);
            if (genre === 'electronic' && intensity > 60) pattern[i].hihat = 0.5;
        }

        // Kick & Snare
        if (i === 0) pattern[i].kick = 1;
        if (i === 4 || i === 12) pattern[i].snare = 1;

        // Genre Flavor
        if (genre === 'funk') {
            if (i === 10) pattern[i].kick = 0.8;
            if (i === 7 || i === 9) pattern[i].snare = 0.3;
        } else if (genre === 'metal') {
            if (i === 2 || i === 3) pattern[i].kick = 0.9;
        } else if (genre === 'electronic') {
            if (i === 6) pattern[i].kick = 0.8;
        }
    }

    // 2. FILL LOGIC
    for (let i = fillStartStep; i < steps; i++) {
        const vol = intensity / 100;
        const densityThreshold = 100 - complexity;

        if (i === fillStartStep) pattern[i].snare = Math.max(0.6, vol);

        const rand = Math.random();

        if (genre === 'jazz') {
            if (Math.random() * 100 > densityThreshold) {
                if (rand < 0.3) pattern[i].snare = vol * Math.random();
                else if (rand < 0.5) pattern[i].tomHigh = vol * 0.8;
                else if (rand < 0.7) pattern[i].tomMid = vol * 0.8;
                else pattern[i].tomLow = vol * 0.8;
                if (i % 2 === 0) pattern[i].hihat = 0.4;
            }
        }
        else if (genre === 'metal') {
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
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1);
    const [bpm, setBpm] = useState(110);

    // Controls
    const [genre, setGenre] = useState('acoustic');
    const [complexity, setComplexity] = useState(60);
    const [intensity, setIntensity] = useState(70);
    const [fillAmount, setFillAmount] = useState(25);

    const [pattern, setPattern] = useState(() => generatePattern('acoustic', 60, 70, 25));

    // Refs
    const audioCtxRef = useRef(null);
    const nextNoteTimeRef = useRef(0);
    const currentStepRef = useRef(0);
    const timerIDRef = useRef(null);

    useEffect(() => {
        setPattern(generatePattern(genre, complexity, intensity, fillAmount));
    }, [genre, complexity, intensity, fillAmount]);

    // --- MIDI EXPORT LOGIC ---
    const exportMIDI = () => {
        // Helper to write Variable Length Quantity
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

        // Tempo
        const microSecondsPerBeat = Math.round(60000000 / bpm);

        // MTrk Data
        const trackData = [];

        // Add Tempo Meta Event (Delta 0, FF 51 03 tttttt)
        trackData.push(
            0x00, 0xFF, 0x51, 0x03,
            (microSecondsPerBeat >> 16) & 0xFF,
            (microSecondsPerBeat >> 8) & 0xFF,
            microSecondsPerBeat & 0xFF
        );

        // Collect Events
        const events = [];
        const GM_MAP = {
            kick: 36,     // C1
            snare: 38,    // D1
            hihat: 42,    // Closed HH
            tomHigh: 50,  // High Tom
            tomMid: 47,   // Low-Mid Tom
            tomLow: 43,   // High Floor Tom
            crash: 49     // Crash 1
        };

        pattern.forEach((step, index) => {
            const stepTick = index * ticksPer16th;

            Object.entries(step).forEach(([inst, val]) => {
                if (val > 0 && GM_MAP[inst]) {
                    const velocity = Math.min(127, Math.max(1, Math.floor(val * 127)));
                    const note = GM_MAP[inst];

                    // Note On
                    events.push({ tick: stepTick, type: 0x99, note, velocity }); // Channel 10 Note On
                    // Note Off (Length 60 ticks = 1/32 note approx, preventing overlap mess)
                    events.push({ tick: stepTick + 60, type: 0x89, note, velocity: 0 }); // Channel 10 Note Off
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

        // End of Track
        trackData.push(0x00, 0xFF, 0x2F, 0x00);

        // Build MThd
        const header = [
            0x4D, 0x54, 0x68, 0x64, // MThd
            0x00, 0x00, 0x00, 0x06, // Length 6
            0x00, 0x00, // Format 0
            0x00, 0x01, // 1 Track
            (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF
        ];

        // Build MTrk Header
        const trackHeader = [
            0x4D, 0x54, 0x72, 0x6B, // MTrk
            (trackData.length >> 24) & 0xFF,
            (trackData.length >> 16) & 0xFF,
            (trackData.length >> 8) & 0xFF,
            trackData.length & 0xFF
        ];

        const fileBytes = new Uint8Array([...header, ...trackHeader, ...trackData]);

        // Download
        const blob = new Blob([fileBytes], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `drum-fill-${genre}-${Date.now()}.mid`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const scheduleNote = (stepNumber, time) => {
        requestAnimationFrame(() => setCurrentStep(stepNumber));
        const step = pattern[stepNumber];
        if (!step) return;
        const ctx = audioCtxRef.current;

        if (step.kick > 0) playSound(ctx, 'kick', time, step.kick, genre);
        if (step.snare > 0) playSound(ctx, 'snare', time, step.snare, genre);
        if (step.hihat > 0) playSound(ctx, 'hihat', time, step.hihat, genre);
        if (step.tomHigh > 0) playSound(ctx, 'tomHigh', time, step.tomHigh, genre);
        if (step.tomMid > 0) playSound(ctx, 'tomMid', time, step.tomMid, genre);
        if (step.tomLow > 0) playSound(ctx, 'tomLow', time, step.tomLow, genre);
        if (step.crash > 0) playSound(ctx, 'crash', time, step.crash, genre);
    };

    const nextNote = () => {
        const secondsPerBeat = 60.0 / bpm;
        const secondsPer16th = secondsPerBeat / 4;
        nextNoteTimeRef.current += secondsPer16th;
        currentStepRef.current = (currentStepRef.current + 1) % 16;
    };

    const scheduler = useCallback(() => {
        while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
            scheduleNote(currentStepRef.current, nextNoteTimeRef.current);
            nextNote();
        }
        timerIDRef.current = setTimeout(scheduler, 25);
    }, [pattern, bpm, genre]);

    useEffect(() => {
        if (isPlaying) {
            if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
            if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
            currentStepRef.current = 0;
            nextNoteTimeRef.current = audioCtxRef.current.currentTime;
            scheduler();
        } else {
            clearTimeout(timerIDRef.current);
            setCurrentStep(-1);
        }
        return () => clearTimeout(timerIDRef.current);
    }, [isPlaying, scheduler]);

    const GenreBtn = ({ id, label, color }) => (
        <button
            onClick={() => setGenre(id)}
            className={`py-2 px-3 rounded-md text-sm font-medium transition-all border border-transparent ${genre === id ? `bg-${color}-600 text-white shadow-lg border-${color}-400` : 'bg-neutral-700 text-gray-400 hover:bg-neutral-600'}`}
        >
            {label}
        </button >
    );

    const instruments = [
        { id: 'crash', label: 'Crash', color: 'bg-purple-500' },
        { id: 'hihat', label: genre === 'jazz' ? 'Ride' : 'Hi-Hat', color: 'bg-yellow-500' },
        { id: 'tomHigh', label: 'Tom High', color: 'bg-orange-400' },
        { id: 'tomMid', label: 'Tom Mid', color: 'bg-orange-500' },
        { id: 'tomLow', label: 'Tom Low', color: 'bg-orange-600' },
        { id: 'snare', label: 'Snare', color: 'bg-red-500' },
        { id: 'kick', label: 'Kick', color: 'bg-blue-500' },
    ];

    return (
        <div className="min-h-screen bg-neutral-900 text-gray-200 p-4 font-sans flex flex-col items-center">
            <div className="w-full max-w-6xl bg-neutral-800 rounded-xl shadow-2xl overflow-hidden border border-neutral-700">

                {/* HEADER */}
                <div className="bg-neutral-900 p-6 border-b border-neutral-700 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-wider flex items-center gap-2">
                            <Activity className="text-emerald-500" /> PRO DRUM FILL GEN
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">Procedural Drum Pattern Generator</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-400">BPM</span>
                            <input
                                type="number"
                                value={bpm}
                                onChange={(e) => setBpm(Number(e.target.value))}
                                className="bg-neutral-800 text-emerald-400 font-mono font-bold text-right w-16 border-b border-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* CONTROLS AREA */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-700">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                                <Music size={14} /> Genre Style
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <GenreBtn id="acoustic" label="Rock / Pop" color="amber" />
                                <GenreBtn id="electronic" label="Trap / EDM" color="indigo" />
                                <GenreBtn id="jazz" label="Jazz / Fusion" color="sky" />
                                <GenreBtn id="metal" label="Metal" color="red" />
                                <GenreBtn id="funk" label="Funk" color="purple" />
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-400 flex items-center gap-1"><Zap size={12} /> Intensity</span>
                                    <span className="text-emerald-400 font-mono">{intensity}%</span>
                                </div>
                                <input type="range" min="0" max="100" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-400 flex items-center gap-1"><Sliders size={12} /> Complexity</span>
                                    <span className="text-indigo-400 font-mono">{complexity}%</span>
                                </div>
                                <input type="range" min="0" max="100" value={complexity} onChange={(e) => setComplexity(Number(e.target.value))} className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-400 flex items-center gap-1"><Volume2 size={12} /> Fill Length</span>
                                    <span className="text-rose-400 font-mono">{fillAmount}%</span>
                                </div>
                                <input type="range" min="0" max="100" value={fillAmount} onChange={(e) => setFillAmount(Number(e.target.value))} className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                                <div className="w-full h-1 bg-neutral-700 mt-1 rounded-full overflow-hidden flex justify-end">
                                    <div className="h-full bg-rose-500/50" style={{ width: `${fillAmount}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <div className="flex gap-2">
                                <button onClick={() => setIsPlaying(!isPlaying)} className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
                                    {isPlaying ? <><Square size={18} fill="currentColor" /> STOP</> : <><Play size={18} fill="currentColor" /> PLAY LOOP</>}
                                </button>
                                <button onClick={() => setPattern(generatePattern(genre, complexity, intensity, fillAmount))} className="px-4 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white border border-neutral-600" title="Generate New Pattern">
                                    <RefreshCw size={20} className={isPlaying ? 'animate-spin' : ''} />
                                </button>
                            </div>
                            <button
                                onClick={exportMIDI}
                                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-sm text-gray-300 flex items-center justify-center gap-2 transition-colors"
                            >
                                <Download size={16} /> Export MIDI File
                            </button>
                        </div>
                    </div>

                    {/* VISUALIZER (TIMELINE) */}
                    <div className="lg:col-span-8 bg-[#111] rounded-lg p-6 border border-neutral-700 flex flex-col relative shadow-inner">

                        {/* Timeline Header (Beat Numbers) - ALIGNED WITH GRID */}
                        <div className="flex items-center h-6 mb-2">
                            <div className="w-24 shrink-0"></div> {/* Spacer for Labels */}
                            <div className="flex-1 grid gap-[1px]" style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}>
                                {Array(16).fill(0).map((_, i) => (
                                    <div key={i} className="text-[10px] text-gray-500 text-center font-mono">
                                        {i % 4 === 0 ? (
                                            <span className="text-emerald-500 font-bold">{(i / 4) + 1}</span>
                                        ) : (
                                            <span className="opacity-20">·</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* PLAYBACK INDICATOR */}
                        <div className="absolute top-14 bottom-6 left-[2rem] right-6 pointer-events-none z-30">
                        </div>

                        {/* INSTRUMENT GRID */}
                        <div className="flex-1 flex flex-col gap-[2px] relative z-10">
                            {instruments.map((inst) => (
                                <div key={inst.id} className="flex items-center h-10 group">
                                    {/* Label */}
                                    <div className="w-24 shrink-0 text-right pr-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-end h-full font-mono">
                                        {inst.label}
                                    </div>

                                    {/* Grid Row */}
                                    <div
                                        className="flex-1 grid gap-[1px] h-full bg-neutral-900 rounded-sm overflow-hidden border border-white/5"
                                        style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}
                                    >
                                        {pattern && pattern.length > 0 ? pattern.map((step, stepIndex) => {
                                            const val = step ? step[inst.id] : 0;
                                            const isActive = val > 0;
                                            const isBeatStart = stepIndex % 4 === 0;
                                            const isFillZone = stepIndex >= (16 - Math.floor((fillAmount / 100) * 16));
                                            const isCurrent = currentStep === stepIndex;

                                            return (
                                                <div
                                                    key={`${inst.id}-${stepIndex}`}
                                                    className={`relative flex items-center justify-center transition-colors duration-75 ${isBeatStart ? 'border-l border-white/10' : ''}`}
                                                    style={{ backgroundColor: isCurrent ? '#333' : (isFillZone ? '#222' : '#161616') }}
                                                >
                                                    {/* Empty Step Marker */}
                                                    {!isActive && (
                                                        <div className="w-0.5 h-0.5 bg-neutral-700 rounded-full opacity-50"></div>
                                                    )}

                                                    {/* NOTE BLOCK */}
                                                    {isActive && (
                                                        <div
                                                            className={`absolute inset-[1px] rounded-[1px] ${inst.color} shadow-sm transition-all duration-100 z-10`}
                                                            style={{
                                                                opacity: 0.8 + (val * 0.2),
                                                                transform: isActive ? 'scale(1)' : 'scale(0.8)',
                                                                boxShadow: `0 0 5px ${inst.color}`,
                                                                filter: isCurrent ? 'brightness(1.5)' : 'none'
                                                            }}
                                                        >
                                                            {/* Velocity Bar */}
                                                            <div className="absolute bottom-0 left-0 right-0 bg-black/30" style={{ height: `${(1 - val) * 100}%` }}></div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }) : (
                                            Array(16).fill(0).map((_, i) => (
                                                <div key={i} className="bg-[#161616] border-l border-white/5"></div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer Info */}
                        <div className="mt-4 flex justify-between items-center text-[10px] text-gray-500 pt-2 border-t border-neutral-800">
                            <div>TIMELINE VIEW: 1 BAR (16 STEPS)</div>
                            <div className={`font-mono ${fillAmount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {fillAmount > 0
                                    ? `FILL ACTIVE: LAST ${Math.floor((fillAmount / 100) * 16)} STEPS`
                                    : 'FULL GROOVE'}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div >
    );
};

export default DrumFillGen;
