#!/bin/sh
# Builds and renders every v4 shot. Pass "preview" for half-res stills only. Board goes last (it uses the other shots' stills).
cd "$(dirname "$0")/.."
B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
MODE="$1"
for s in ${SHOTS:-hook because church nothing whatif elijah tiles tomb gallery desk phone sermon people dawn board}; do
  start=$(date +%s)
  LOGIA_NARR=hear-v4.json "$B" -b --factory-startup -P blender/shots_v4.py -- $s $MODE 2>&1 | grep -E "RENDERED|Error|Traceback|line [0-9]+, in|Exception" | head -6
  echo "$s took $(( $(date +%s) - start ))s"
done
