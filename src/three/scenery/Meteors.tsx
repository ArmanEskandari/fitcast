import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, type Group, MeshBasicMaterial } from 'three';

const DUR = 1.0; // seconds a streak is visible
const Z = -32; // far back, in front of the starfield

/** One shooting star: waits, then streaks diagonally across the sky and fades. */
const Meteor = ({ visible, seed }: { visible: boolean; seed: number }) => {
  const group = useRef<Group>(null);
  const s = useRef({
    wait: 0.5 + (seed % 22) / 10,
    t: (seed % 20) / 10,
    active: false,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    life: 0,
  });

  // Shared bright material so the streak + head fade together.
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#eef4ff',
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useFrame((_, dt) => {
    const b = s.current;
    if (!visible) {
      b.active = false;
      b.t = 0;
      material.opacity = 0;
      return;
    }

    if (!b.active) {
      b.t += dt;
      if (b.t < b.wait) return;
      b.active = true;
      b.life = 0;
      b.x = -13 + Math.random() * 26;
      b.y = 9 + Math.random() * 7;
      const angle = -0.5 - Math.random() * 0.5; // heading downward
      const speed = 28 + Math.random() * 14;
      b.dx = Math.cos(angle) * speed * (Math.random() < 0.5 ? 1 : -1);
      b.dy = Math.sin(angle) * speed;
      return;
    }

    b.life += dt;
    const p = b.life / DUR;
    if (p >= 1) {
      b.active = false;
      b.t = 0;
      b.wait = 1.2 + Math.random() * 3; // more frequent than before
      material.opacity = 0;
      return;
    }
    b.x += b.dx * dt;
    b.y += b.dy * dt;
    if (group.current) {
      group.current.position.set(b.x, b.y, Z);
      group.current.rotation.z = Math.atan2(b.dy, b.dx);
    }
    material.opacity = Math.sin(p * Math.PI); // ramp up then down
  });

  return (
    <group ref={group} position={[0, 20, Z]}>
      {/* trailing streak */}
      <mesh material={material}>
        <boxGeometry args={[4.8, 0.1, 0.1]} />
      </mesh>
      {/* bright head at the leading edge */}
      <mesh material={material} position={[2.4, 0, 0]}>
        <sphereGeometry args={[0.16, 12, 12]} />
      </mesh>
    </group>
  );
};

/** Shooting stars, shown on clear nights. */
export const Meteors = ({ visible }: { visible: boolean }) => (
  <group>
    {Array.from({ length: 5 }, (_, i) => (
      <Meteor key={i} visible={visible} seed={i * 173 + 11} />
    ))}
  </group>
);
