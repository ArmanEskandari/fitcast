import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, MathUtils, type MeshBasicMaterial } from 'three';

/**
 * Pale moon with a soft cool glow and a couple of subtle craters. Fades in at
 * night (any non-foggy condition) and out during the day.
 */
export const Moon = ({ visible }: { visible: boolean }) => {
  const body = useRef<MeshBasicMaterial>(null);
  const glow = useRef<MeshBasicMaterial>(null);
  const craterA = useRef<MeshBasicMaterial>(null);
  const craterB = useRef<MeshBasicMaterial>(null);

  useFrame((_, dt) => {
    const t = visible ? 1 : 0;
    if (body.current) body.current.opacity = MathUtils.damp(body.current.opacity, t, 3, dt);
    if (glow.current) glow.current.opacity = MathUtils.damp(glow.current.opacity, t * 0.4, 3, dt);
    const c = t * 0.5;
    if (craterA.current)
      craterA.current.opacity = MathUtils.damp(craterA.current.opacity, c, 3, dt);
    if (craterB.current)
      craterB.current.opacity = MathUtils.damp(craterB.current.opacity, c, 3, dt);
  });

  return (
    <group position={[6, 7.5, -19]}>
      <mesh>
        <sphereGeometry args={[1.3, 32, 32]} />
        <meshBasicMaterial ref={body} color="#e9eefb" transparent opacity={0} toneMapped={false} />
      </mesh>
      {/* craters, just in front of the body's face */}
      <mesh position={[0.34, 0.26, 1.18]}>
        <circleGeometry args={[0.26, 16]} />
        <meshBasicMaterial
          ref={craterA}
          color="#c3cbdd"
          transparent
          opacity={0}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-0.38, -0.3, 1.15]}>
        <circleGeometry args={[0.18, 16]} />
        <meshBasicMaterial
          ref={craterB}
          color="#c3cbdd"
          transparent
          opacity={0}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.2, 24, 24]} />
        <meshBasicMaterial
          ref={glow}
          color="#aecbff"
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
