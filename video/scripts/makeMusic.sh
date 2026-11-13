#!/usr/bin/env bash
# Generates public/ambient.mp3: a soft synthesized pad (plain sine tones, so
# there is nothing to license). Replace the file with any royalty-free track
# of your own if you prefer.
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -y -loglevel error \
  -f lavfi -i "sine=frequency=110:duration=95" \
  -f lavfi -i "sine=frequency=164.81:duration=95" \
  -f lavfi -i "sine=frequency=220:duration=95" \
  -f lavfi -i "sine=frequency=277.18:duration=95" \
  -f lavfi -i "sine=frequency=329.63:duration=95" \
  -filter_complex "\
[0]volume=0.50,tremolo=f=0.11:d=0.5[a];\
[1]volume=0.34,tremolo=f=0.17:d=0.6[b];\
[2]volume=0.26,tremolo=f=0.13:d=0.6[c];\
[3]volume=0.16,tremolo=f=0.19:d=0.8[d];\
[4]volume=0.11,tremolo=f=0.23:d=0.8[e];\
[a][b][c][d][e]amix=inputs=5:normalize=0,lowpass=f=900,aecho=0.8:0.7:900|1400:0.35|0.25,\
afade=t=in:d=3,afade=t=out:st=90:d=5,volume=0.8,aformat=channel_layouts=stereo[out]" \
  -map "[out]" -c:a libmp3lame -b:a 128k public/ambient.mp3
echo "wrote public/ambient.mp3"
