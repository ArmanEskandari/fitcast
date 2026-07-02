import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, type FogExp2, MathUtils } from 'three';
import { TRANSITION_SPEED, dampAlpha } from '@/lib/anim';

/** Maps descriptor fogDensity (0..1) to an exponential fog density. */
const MAX_FOG = 0.08;

/**
 * Scene fog that damps its density and color toward targets, so fog rolls in
 * and clears gradually. `density` is the descriptor's 0..1 value.
 */
export const Fog = ({ color, density }: { color: string; density: number }) => {
  const ref = useRef<FogExp2>(null);
  const target = useMemo(() => new Color(color), [color]);

  useEffect(() => {
    target.set(color);
  }, [target, color]);

  useFrame((_, delta) => {
    const fog = ref.current;
    if (!fog) return;
    fog.density = MathUtils.damp(fog.density, density * MAX_FOG, TRANSITION_SPEED, delta);
    fog.color.lerp(target, dampAlpha(delta));
  });

  return <fogExp2 attach="fog" ref={ref} args={[color, 0]} />;
};
