# Mascot model

The mascot is loaded from **`mascot.glb`** (see `src/three/mascot/MascotModel.tsx`,
`/models/mascot.glb`). Currently RobotExpressive (see CREDITS.md).

To swap the mascot, drop any rigged GLB here as `mascot.glb`. The loader:
- **auto-normalizes** scale/position (centers x/z, scales to a target height, feet at y=0)
- **picks an idle clip by name** (matches `idle`/`survey`/`stand`/`breathing`), else the first clip
- falls back to a placeholder blob if the file is missing

## Recommended
- Format: **GLB** (binary glTF, textures embedded)
- **Rigged** with a looping idle clip (bipedal preferred so accessories fit)
- Faces **+Z**, standing upright
- Keep it light (< ~5 MB, < ~150k triangles) for smooth web performance
