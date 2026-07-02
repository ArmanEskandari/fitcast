import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type InstancedMesh, MathUtils, type MeshBasicMaterial, Object3D } from 'three';
import { TRANSITION_SPEED } from '@/lib/anim';
import { getQualityScale } from '@/lib/quality';

const MAX = Math.round(1000 * getQualityScale());
const MIN = Math.round(150 * getQualityScale());
const AREA = 9;
const TOP = 14;

const dummy = new Object3D();

interface Flake {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
  drift: number;
}

/**
 * GPU-instanced snow. The active `density` (0..1) is the target; the effect
 * damps toward it so snow fades in/out. Flakes fall slowly with a gentle sway.
 */
export const Snow = ({ density }: { density: number }) => {
  const ref = useRef<InstancedMesh>(null);
  const matRef = useRef<MeshBasicMaterial>(null);
  const current = useRef(0);

  const flakes = useMemo<Flake[]>(
    () =>
      Array.from({ length: MAX }, () => ({
        x: (Math.random() * 2 - 1) * AREA,
        y: Math.random() * TOP,
        z: (Math.random() * 2 - 1) * AREA,
        speed: 1 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
        drift: 0.3 + Math.random() * 0.5,
      })),
    [],
  );

  useFrame((state, delta) => {
    const mesh = ref.current;
    if (!mesh) return;

    current.current = MathUtils.damp(current.current, density, TRANSITION_SPEED, delta);
    const d = current.current;

    if (matRef.current) matRef.current.opacity = Math.min(d / 0.25, 1) * 0.9;

    const count = d < 0.02 ? 0 : Math.floor(MIN + d * (MAX - MIN));
    mesh.count = count;
    if (count === 0) return;

    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const f = flakes[i];
      f.y -= f.speed * delta;
      if (f.y < 0) f.y = TOP;

      dummy.position.set(f.x + Math.sin(t + f.phase) * f.drift, f.y, f.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX]} frustumCulled={false}>
      <sphereGeometry args={[0.05, 6, 6]} />
      <meshBasicMaterial ref={matRef} color="#ffffff" transparent opacity={0} />
    </instancedMesh>
  );
};
