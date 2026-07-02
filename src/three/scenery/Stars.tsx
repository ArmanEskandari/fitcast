import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  MathUtils,
  type PointsMaterial,
} from 'three';
import { getQualityScale } from '@/lib/quality';

/**
 * Twinkling starfield on the upper sky dome. Fades in on clear/partly cloudy
 * nights and out otherwise.
 */
export const Stars = ({ visible }: { visible: boolean }) => {
  const mat = useRef<PointsMaterial>(null);

  const geometry = useMemo(() => {
    const count = Math.floor(260 * getQualityScale());
    const radius = 55;
    const positions: number[] = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random()); // upper hemisphere
      positions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi) + 4,
        radius * Math.sin(phi) * Math.sin(theta),
      );
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame((state, dt) => {
    if (!mat.current) return;
    const twinkle = 0.85 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    const target = visible ? twinkle : 0;
    mat.current.opacity = MathUtils.damp(mat.current.opacity, target, 3, dt);
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        ref={mat}
        color="#eaf2ff"
        size={0.5}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};
