import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type Group, MathUtils, type MeshBasicMaterial } from 'three';

/** A faint horizontal "speed line" that streaks downwind and recycles. */
const Gust = ({ wind, seed }: { wind: number; seed: number }) => {
  const group = useRef<Group>(null);
  const mat = useRef<MeshBasicMaterial>(null);
  const s = useRef({
    x: -15 + (seed % 30),
    y: 2 + (seed % 8),
    z: -3 - (seed % 11),
    len: 3 + (seed % 4),
  });

  useFrame((_, dt) => {
    const b = s.current;
    b.x += (6 + wind * 24) * dt; // drifts faster the windier it is
    if (b.x > 15) {
      b.x = -15;
      b.y = 2 + Math.random() * 8;
      b.z = -3 - Math.random() * 11;
    }
    if (group.current) group.current.position.set(b.x, b.y, b.z);
    // Only visible once it's genuinely breezy (~>20 km/h → wind > 0.35).
    const target = wind > 0.35 ? (wind - 0.35) * 0.55 : 0;
    if (mat.current) mat.current.opacity = MathUtils.damp(mat.current.opacity, target, 4, dt);
  });

  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={[s.current.len, 0.03, 0.03]} />
        <meshBasicMaterial ref={mat} color="#e3ecf4" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
};

/** Stylized wind gusts — invisible when calm, streaking across when windy. */
export const Wind = ({ wind }: { wind: number }) => (
  <group>
    {Array.from({ length: 6 }, (_, i) => (
      <Gust key={i} wind={wind} seed={i * 167 + 9} />
    ))}
  </group>
);
