#!/usr/bin/env python3
"""
Generates public/ambient.mp3: a soft, slow ambient bed synthesized from
scratch (warm pad chords plus a sparse bell-like arpeggio), so there is
nothing to license. Replace the file with any royalty-free track if you prefer.

  pip install numpy soundfile
  npm run music
"""
import subprocess
import numpy as np
import soundfile as sf

SR = 44100
BPM = 72
BEAT = 60 / BPM
BAR = 4 * BEAT
TOTAL = 96.0  # seconds; longer than the video, faded in the composition

def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)

# Am9 - Fmaj7 - Cmaj7 - G6 : calm, slightly hopeful
CHORDS = [
    [45, 52, 60, 64, 71],
    [41, 53, 57, 60, 64],
    [48, 55, 59, 64, 67],
    [43, 55, 59, 62, 64],
]

n = int(TOTAL * SR)
t = np.arange(n) / SR
left = np.zeros(n)
right = np.zeros(n)
rng = np.random.default_rng(4)

def add(buf_l, buf_r, start, sig, pan):
    i = int(start * SR)
    j = min(n, i + len(sig))
    if i >= n:
        return
    buf_l[i:j] += sig[: j - i] * (1 - pan)
    buf_r[i:j] += sig[: j - i] * pan

# pad: each chord lasts two bars, long attack and release so chords overlap
chord_len = 2 * BAR
for k in range(int(TOTAL / chord_len) + 1):
    chord = CHORDS[k % len(CHORDS)]
    dur = chord_len + 2.5
    tt = np.arange(int(dur * SR)) / SR
    env = np.clip(tt / 2.2, 0, 1) * np.clip((dur - tt) / 2.5, 0, 1)
    env = env ** 1.5
    for idx, m in enumerate(chord):
        f = hz(m)
        detune = 1 + 0.0025 * (idx % 2 * 2 - 1)
        sig = np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * detune * tt + 1.0)
        sig += 0.18 * np.sin(2 * np.pi * 2 * f * tt)  # a little warmth
        sig *= env * (0.11 if idx else 0.2) * (1 + 0.15 * np.sin(2 * np.pi * 0.13 * tt + idx))
        add(left, right, k * chord_len, sig, 0.35 + 0.3 * (idx / (len(chord) - 1)))

# sparse bell arpeggio: one soft note every beat or two, from the current chord
beat = 0
while beat * BEAT < TOTAL - 4:
    start = beat * BEAT
    chord = CHORDS[int(start / chord_len) % len(CHORDS)]
    m = chord[1 + rng.integers(0, 4)] + 12
    dur = 3.2
    tt = np.arange(int(dur * SR)) / SR
    f = hz(m)
    env = np.exp(-tt * 1.6) * np.clip(tt / 0.012, 0, 1)
    sig = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 4)) * env * 0.085
    add(left, right, start, sig, 0.25 + 0.5 * rng.random())
    beat += int(rng.choice([1, 2, 2, 3]))

# simple feedback delay for space
def echo(x, delay, fb):
    d = int(delay * SR)
    y = x.copy()
    for i in range(1, 4):
        y[i * d:] += x[: n - i * d] * fb ** i
    return y

left = echo(left, BEAT * 0.75, 0.38)
right = echo(right, BEAT * 1.0, 0.38)
mix = np.stack([left, right], axis=1)
mix /= np.max(np.abs(mix)) * 1.15
fade = np.clip(t / 3, 0, 1) * np.clip((TOTAL - t) / 5, 0, 1)
mix *= fade[:, None]
sf.write("public/ambient.wav", mix, SR)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", "public/ambient.wav",
                "-af", "lowpass=f=5200,loudnorm=I=-20:TP=-2", "-ar", "44100", "-b:a", "160k",
                "public/ambient.mp3"], check=True)
import os
os.remove("public/ambient.wav")
print("wrote public/ambient.mp3")
