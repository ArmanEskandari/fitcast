import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type InstancedMesh, MathUtils, type Mesh, type MeshBasicMaterial, Object3D } from 'three';
import { TRANSITION_SPEED } from '@/lib/anim';
import { getQualityScale } from '@/lib/quality';

const Q = getQualityScale();
const MAX = Math.round(1500 * Q);
const MIN = Math.round(200 * Q);
const AREA = 9; // half-width of the spawn volume
const TOP = 15;

const dummy = new Object3D();

interface Drop {
  x: number;
  y: number;
  z: number;
  speed: number;
  len: number; // streak-length multiplier (motion blur)
}

/** A single ground ripple that expands and fades where a drop lands. */
const Splash = ({ density, seed }: { density: number; seed: number }) => {
  const ring = useRef<Mesh>(null);
  const mat = useRef<MeshBasicMaterial>(null);
  const st = useRef({
    x: 0,
    z: 0,
    t: (seed % 100) / 100,
    dur: 0.35 + (seed % 30) / 100,
  });

  const respawn = () => {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 5.6;
    st.current.x = Math.cos(a) * r;
    st.current.z = Math.sin(a) * r;
    st.current.t = 0;
    st.current.dur = 0.32 + Math.random() * 0.28;
  };

  useFrame((_, dt) => {
    const b = st.current;
    if (density < 0.04) {
      if (mat.current) mat.current.opacity = 0;
      return;
    }
    b.t += dt * (0.7 + density); // heavier rain cycles ripples faster
    const p = b.t / b.dur;
    if (p >= 1) {
      respawn();
      return;
    }
    if (ring.current) {
      ring.current.position.set(b.x, 0.02, b.z);
      const s = 0.15 + p * 0.55;
      ring.current.scale.set(s, s, s);
    }
    if (mat.current) mat.current.opacity = (1 - p) * 0.4 * Math.min(density * 2, 1);
  });

  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
      <ringGeometry args={[0.68, 1, 18]} />
      <meshBasicMaterial ref={mat} color="#cfe6ff" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
};

const Splashes = ({ density }: { density: number }) => {
  const count = Math.round(26 * Q);
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <Splash key={i} density={density} seed={i * 53 + 7} />
      ))}
    </group>
  );
};

/**
 * GPU-instanced rain. Streaks stretch with fall speed (motion blur) and lean
 * with the wind; the active `density` (0..1) is damped so rain fades in/out.
 * Ground ripples where drops land add realism.
 */
export const Rain = ({ density, wind }: { density: number; wind: number }) => {
  const ref = useRef<InstancedMesh>(null);
  const matRef = useRef<MeshBasicMaterial>(null);
  const current = useRef(0);

  const drops = useMemo<Drop[]>(
    () =>
      Array.from({ length: MAX }, () => ({
        x: (Math.random() * 2 - 1) * AREA,
        y: Math.random() * TOP,
        z: (Math.random() * 2 - 1) * AREA,
        speed: 14 + Math.random() * 10,
        len: 0.9 + Math.random() * 1.0,
      })),
    [],
  );

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;

    current.current = MathUtils.damp(current.current, density, TRANSITION_SPEED, delta);
    const d = current.current;

    if (matRef.current) matRef.current.opacity = Math.min(d / 0.25, 1) * 0.4;

    const count = d < 0.02 ? 0 : Math.floor(MIN + d * (MAX - MIN));
    mesh.count = count;
    if (count === 0) return;

    const drift = wind * 5;
    const tilt = Math.atan2(drift, 16); // lean along the fall+wind velocity

    for (let i = 0; i < count; i++) {
      const drop = drops[i];
      drop.y -= (drop.speed + d * 6) * delta;
      drop.x += drift * delta;
      if (drop.y < 0) {
        drop.y = TOP;
        drop.x = (Math.random() * 2 - 1) * AREA;
      }
      if (drop.x > AREA) drop.x -= AREA * 2;

      dummy.position.set(drop.x, drop.y, drop.z);
      dummy.rotation.set(0, 0, tilt);
      dummy.scale.set(1, drop.len, 1); // stretch = motion blur
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <boxGeometry args={[0.014, 0.55, 0.014]} />
        <meshBasicMaterial ref={matRef} color="#b9d2e8" transparent opacity={0} />
      </instancedMesh>
      <Splashes density={density} />
    </group>
  );
};
