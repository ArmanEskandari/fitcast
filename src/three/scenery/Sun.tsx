import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, MathUtils, type MeshBasicMaterial } from 'three';

/**
 * Warm sun disc with an additive glow, up in the sky. Fades in on clear/partly
 * cloudy days and out otherwise (so day↔night and weather changes cross-fade).
 */
export const Sun = ({ visible }: { visible: boolean }) => {
  const core = useRef<MeshBasicMaterial>(null);
  const glow = useRef<MeshBasicMaterial>(null);

  useFrame((_, dt) => {
    const t = visible ? 1 : 0;
    if (core.current) core.current.opacity = MathUtils.damp(core.current.opacity, t, 3, dt);
    if (glow.current) glow.current.opacity = MathUtils.damp(glow.current.opacity, t * 0.5, 3, dt);
  });

  return (
    <group position={[-6, 7, -19]}>
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial ref={core} color="#ffe39a" transparent opacity={0} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.4, 24, 24]} />
        <meshBasicMaterial
          ref={glow}
          color="#ffc65e"
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};
