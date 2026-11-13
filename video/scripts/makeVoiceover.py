#!/usr/bin/env python3
"""
Generates a synthetic narration track, one clip per script line.

  pip install kokoro-onnx soundfile
  # model files (Kokoro v1.0, Apache-2.0), saved anywhere:
  #   https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  #   https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
  npm run numbers                      # writes voiceover_lines.json
  python3 scripts/makeVoiceover.py /path/to/model-dir [voice] [speed]

Writes public/vo/<scene>_<n>.mp3 and src/voDurations.json (seconds per clip).
To use your own recorded voice instead, replace the mp3 files under the same
names and update the durations.
"""
import json, re, subprocess, sys, os
import soundfile as sf
from kokoro_onnx import Kokoro

model_dir = sys.argv[1]
voice = sys.argv[2] if len(sys.argv) > 2 else "am_michael"
speed = float(sys.argv[3]) if len(sys.argv) > 3 else 1.3

def spoken(t: str) -> str:
    """Rewrite on-screen copy into something a TTS engine reads correctly."""
    money = r"\$(\d[\d,]*\d|\d)( million)?"
    t = re.sub(money + r"(?= spread\b)", lambda m: f"{m.group(1)}{m.group(2) or ''} dollar", t)
    t = re.sub(money, lambda m: f"{m.group(1)}{m.group(2) or ''} dollars", t)
    t = t.replace(" x ", " times ")
    t = re.sub(r"\bISOs\b", "I S Os", t)
    return t

kokoro = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"), os.path.join(model_dir, "voices-v1.0.bin"))
lines = json.load(open("voiceover_lines.json"))
os.makedirs("public/vo", exist_ok=True)
for old in os.listdir("public/vo"):
    os.remove(os.path.join("public/vo", old))
durations = {}
for line in lines:
    samples, sr = kokoro.create(spoken(line["text"]), voice=voice, speed=speed, lang="en-us")
    wav = f"public/vo/{line['id']}.wav"
    sf.write(wav, samples, sr)
    mp3 = wav[:-4] + ".mp3"
    # trim leading/trailing silence, light loudness normalisation
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af",
        "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5",
        "-ar", "44100", "-b:a", "128k", mp3], check=True)
    os.remove(wav)
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3]))
    durations[line["id"]] = round(d, 2)
    print(f"{line['id']:16s} {d:5.2f}s  {spoken(line['text'])}")
json.dump(durations, open("src/voDurations.json", "w"), indent=2)
print("wrote public/vo/*.mp3 and src/voDurations.json")
