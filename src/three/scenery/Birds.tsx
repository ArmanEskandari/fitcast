import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type Group, MathUtils, MeshBasicMaterial } from 'three';

/** A single V-shaped bird: two hinged wings that flap while it drifts across. */
const Bird = ({ visible, seed }: { visible: boolean; seed: number }) => {
  const group = useRef<Group>(null);
  const leftWing = useRef<Group>(null);
  const rightWing = useRef<Group>(null);

  // Deterministic per-seed start state (computed once).
  const state = useRef({
    x: ((seed * 97) % 260) / 10 - 13,
    y: 6 + ((seed * 37) % 45) / 10,
    z: -6 - ((seed * 53) % 90) / 10,
    speed: 0.7 + ((seed * 29) % 60) / 100,
    phase: (seed % 628) / 100,
  });

  // One shared silhouette material per bird so both wings fade together.
  const material = useMemo(
    () => new MeshBasicMaterial({ color: '#26323f', transparent: true, opacity: 0 }),
    [],
  );

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    const b = state.current;
    b.x += b.speed * dt;
    if (b.x > 13) b.x = -13;
    if (group.current) {
      group.current.position.set(b.x, b.y + Math.sin(t * 0.6 + b.phase) * 0.25, b.z);
    }
    const flap = Math.sin(t * 6 + b.phase) * 0.5;
    if (leftWing.current) leftWing.current.rotation.z = 0.15 + flap;
    if (rightWing.current) rightWing.current.rotation.z = -0.15 - flap;
    material.opacity = MathUtils.damp(material.opacity, visible ? 0.85 : 0, 3, dt);
  });

  return (
    <group ref={group} scale={0.7}>
      <group ref={leftWing}>
        <mesh material={material} position={[-0.28, 0, 0]}>
          <boxGeometry args={[0.56, 0.05, 0.18]} />
        </mesh>
      </group>
      <group ref={rightWing}>
        <mesh material={material} position={[0.28, 0, 0]}>
          <boxGeometry args={[0.56, 0.05, 0.18]} />
        </mesh>
      </group>
    </group>
  );
};

/** A small flock of birds, shown on calm daytime skies. */
export const Birds = ({ visible }: { visible: boolean }) => (
  <group>
    {Array.from({ length: 6 }, (_, i) => (
      <Bird key={i} visible={visible} seed={i * 131 + 7} />
    ))}
  </group>
);
