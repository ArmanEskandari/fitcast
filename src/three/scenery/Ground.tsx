import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color,
  ConeGeometry,
  type Group,
  type InstancedMesh,
  MeshStandardMaterial,
  Object3D,
} from 'three';
import type { Condition } from '@/domain/types';
import { dampAlpha } from '@/lib/anim';
import { getQualityScale } from '@/lib/quality';

const dummy = new Object3D();

interface Placement {
  x: number;
  z: number;
  rot: number;
  scale: number;
}

/** Scatter `count` items in a ring, leaving the centre clear for the mascot. */
function scatter(count: number, rInner: number, rOuter: number): Placement[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const r = rInner + Math.random() * (rOuter - rInner);
    return {
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      rot: Math.random() * Math.PI * 2,
      scale: 0.6 + Math.random() * 0.8,
    };
  });
}

/** Static instanced field (rocks) — placed once. */
function Field({
  items,
  baseScale,
  yOffset,
  matRef,
  children,
}: {
  items: Placement[];
  baseScale: number;
  yOffset: number;
  matRef: React.Ref<MeshStandardMaterial>;
  children: React.ReactNode;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x, yOffset * it.scale, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.setScalar(baseScale * it.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [items, baseScale, yOffset]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      {children}
      <meshStandardMaterial ref={matRef} color="#5b6673" roughness={0.9} flatShading />
    </instancedMesh>
  );
}

/** Grass blades that bend downwind and gust, keyed to the wind magnitude. */
function Grass({
  items,
  wind,
  matRef,
}: {
  items: Placement[];
  wind: number;
  matRef: React.Ref<MeshStandardMaterial>;
}) {
  const ref = useRef<InstancedMesh>(null);
  // Cone with its base at the origin so it pivots at the ground when it leans.
  const geometry = useMemo(() => {
    const g = new ConeGeometry(0.06, 0.34, 4);
    g.translate(0, 0.17, 0);
    return g;
  }, []);
  const phases = useMemo(() => items.map((it) => it.x * 0.8 + it.z * 0.6), [items]);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      // Lean downwind (+x) with a gusting oscillation; amplitude tracks wind.
      const lean = wind * 0.55 * (0.55 + 0.45 * Math.sin(t * 2.6 + phases[i]));
      dummy.position.set(it.x, 0, it.z);
      dummy.rotation.set(0, 0, lean);
      dummy.scale.setScalar(it.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} castShadow receiveShadow>
      <meshStandardMaterial ref={matRef} color="#4a7a52" roughness={1} flatShading />
    </instancedMesh>
  );
}

/** A bush that buffets gently in the wind. */
const Bush = ({
  position,
  scale,
  material,
  wind,
  seed,
}: {
  position: [number, number, number];
  scale: number;
  material: MeshStandardMaterial;
  wind: number;
  seed: number;
}) => {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.z = wind * 0.14 * (0.5 + 0.5 * Math.sin(t * 1.8 + seed));
  });
  return (
    <group ref={group} position={position} scale={scale}>
      <mesh castShadow position={[0, 0.35, 0]} material={material}>
        <icosahedronGeometry args={[0.5, 0]} />
      </mesh>
      <mesh castShadow position={[0.34, 0.2, 0.12]} material={material}>
        <icosahedronGeometry args={[0.32, 0]} />
      </mesh>
      <mesh castShadow position={[-0.3, 0.18, -0.1]} material={material}>
        <icosahedronGeometry args={[0.28, 0]} />
      </mesh>
    </group>
  );
};

// Base palette + weather targets.
const BASE = {
  disc: new Color('#33463a'),
  grass: new Color('#4a7a52'),
  rock: new Color('#5b6673'),
  bush: new Color('#3c6b45'),
};
const SNOW = new Color('#e6edf5');
const NIGHT = new Color('#212c3d');

/** Blend a base color toward snow, then toward a cool night tint. */
function tintTo(out: Color, base: Color, snow: number, night: number) {
  out.copy(base);
  if (snow > 0) out.lerp(SNOW, snow);
  if (night > 0) out.lerp(NIGHT, night);
  return out;
}

/**
 * Grassy ground disc dressed with grass, rocks and bushes. Materials react to
 * weather (snow whitens, night cools/dims) and foliage sways with the wind.
 */
export const Ground = ({
  condition,
  isDay,
  wind,
}: {
  condition: Condition;
  isDay: boolean;
  wind: number;
}) => {
  const q = getQualityScale();
  const grass = useMemo(() => scatter(Math.floor(170 * q), 1.4, 5.9), [q]);
  const rocks = useMemo(() => scatter(Math.floor(14 * q) + 4, 1.7, 5.7), [q]);

  const discMat = useRef<MeshStandardMaterial>(null);
  const grassMat = useRef<MeshStandardMaterial>(null);
  const rockMat = useRef<MeshStandardMaterial>(null);
  const bush = useMemo(
    () => new MeshStandardMaterial({ color: BASE.bush.clone(), roughness: 1, flatShading: true }),
    [],
  );

  const tmp = useMemo(() => new Color(), []);
  const snow = condition === 'snow' ? 1 : 0;
  const night = isDay ? 0 : 0.4;

  useFrame((_, dt) => {
    const a = dampAlpha(dt);
    if (discMat.current) discMat.current.color.lerp(tintTo(tmp, BASE.disc, snow * 0.9, night), a);
    if (grassMat.current)
      grassMat.current.color.lerp(tintTo(tmp, BASE.grass, snow * 0.85, night), a);
    if (rockMat.current) rockMat.current.color.lerp(tintTo(tmp, BASE.rock, snow * 0.5, night), a);
    bush.color.lerp(tintTo(tmp, BASE.bush, snow * 0.6, night), a);
  });

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial ref={discMat} color="#33463a" roughness={0.95} />
      </mesh>

      <Grass items={grass} wind={wind} matRef={grassMat} />

      <Field items={rocks} baseScale={0.2} yOffset={0.05} matRef={rockMat}>
        <dodecahedronGeometry args={[1, 0]} />
      </Field>

      <Bush position={[3.6, 0, -1.4]} scale={1.1} material={bush} wind={wind} seed={0.4} />
      <Bush position={[-3.3, 0, -2.3]} scale={0.9} material={bush} wind={wind} seed={1.7} />
      <Bush position={[2.3, 0, 2.7]} scale={0.8} material={bush} wind={wind} seed={3.1} />
      <Bush position={[-2.6, 0, 2.2]} scale={0.7} material={bush} wind={wind} seed={4.6} />
    </group>
  );
};
