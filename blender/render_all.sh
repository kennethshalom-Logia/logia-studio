#!/bin/sh
# Renders every 3D shot to public/3d/<shot>.mp4. Re-run after the narration changes.
cd "$(dirname "$0")/.."
B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
for s in room tiles tomb bible; do
  start=$(date +%s)
  "$B" -b --factory-startup -P blender/shot_$s.py 2>&1 | grep -E "RENDERED|Error|Traceback"
  echo "$s took $(( $(date +%s) - start ))s"
done
