#!/bin/bash
# Renders every 3D plate. Resumable: re-run to continue. 4:5 is cropped from 9x16.
cd "$(dirname "$0")"
for asp in 9x16 16x9; do
  for b in 5 1 2 3 4; do
    python3 render.py $b $asp --scale 0.5 --samples 32 2>&1 | grep -E "^(beat|DONE)|Error|Traceback" >> out/render.log
  done
  touch out/frames/$asp.done
done
