"""Temp music placeholder: a quiet synthesized pad, generated here so there is nothing to license.
Replace out/temp_music.wav (or pass --music) with the licensed track."""
import wave, numpy as np
import config as C

def make(path, dur=C.DURATION, sr=48000):
    t = np.arange(int(dur * sr)) / sr
    chords = [(146.83, 220.00, 277.18, 329.63), (123.47, 185.00, 246.94, 329.63),
              (110.00, 164.81, 220.00, 277.18), (146.83, 220.00, 293.66, 369.99)]
    seg = dur / len(chords)
    L = np.zeros_like(t); R = np.zeros_like(t)
    for i, ch in enumerate(chords):
        env = np.clip((t - i * seg + 1.5) / 3.0, 0, 1) * np.clip(((i + 1) * seg + 1.5 - t) / 3.0, 0, 1)
        env = env * env * (3 - 2 * env)
        for j, f in enumerate(ch):
            for det, pan in ((-0.6, 0.3), (0.7, 0.7)):
                ph = 2 * np.pi * (f + det) * t + 0.4 * np.sin(2 * np.pi * 0.11 * t + j)
                s = (np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)) * env / (1 + j * 0.35)
                L += s * (1 - pan); R += s * pan
    L += 0.5 * np.sin(2 * np.pi * 73.42 * t) * 0.6; R += 0.5 * np.sin(2 * np.pi * 73.42 * t) * 0.6
    master = np.clip(t / 1.5, 0, 1) * np.clip((dur - t) / 4.0, 0, 1)
    st = np.stack([L, R], 1) * master[:, None]
    st = st / np.abs(st).max() * 0.35
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((st * 32767).astype("<i2").tobytes())

if __name__ == "__main__":
    import os
    make(os.path.join(C.OUT, "temp_music.wav")); print("ok")
