import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

/**
 * Stand-in mascot: a cute rounded blob that breathes gently. Proves the
 * subject sits correctly in the scene and casts shadow. Replaced by the real
 * rigged, weather-dressed model in M5.
 */
export const MascotPlaceholder = () => {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    // Subtle idle "breathing" bob.
    g.position.y = 0.9 + Math.sin(state.clock.elapsedTime * 1.5) * 0.04;
  });

  return (
    <group ref={ref} position={[0, 0.9, 0]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.4, 0.9, 8, 16]} />
        <meshStandardMaterial color="#6fd6a0" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshStandardMaterial color="#6fd6a0" roughness={0.6} />
      </mesh>
      {/* eyes */}
      <mesh position={[0.13, 1.02, 0.28]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#0b1220" />
      </mesh>
      <mesh position={[-0.13, 1.02, 0.28]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#0b1220" />
      </mesh>
    </group>
  );
};
