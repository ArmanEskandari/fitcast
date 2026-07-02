import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { PointLight } from 'three';

type Pt = [number, number, number];

/** Build a jagged top-to-ground bolt path with a random horizontal origin. */
function makeBolt(): Pt[] {
  const x0 = -5 + Math.random() * 10;
  const z = -6;
  const top = 13;
  const bottom = 1.5;
  const segments = 6;
  const points: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const edge = i === 0 || i === segments ? 0.25 : 1;
    const x = x0 + (Math.random() - 0.5) * 1.8 * edge;
    points.push([x, top + (bottom - top) * t, z]);
  }
  return points;
}

/**
 * Occasional lightning: a random-interval flash (overhead point light) paired
 * with a visible jagged bolt that snaps on and fades fast. Rendered only for
 * thunderstorm conditions (see WeatherFX / SceneDescriptor.lightning).
 */
export const Thunder = () => {
  const light = useRef<PointLight>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const core = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const glow = useRef<any>(null);
  const [points, setPoints] = useState<Pt[]>(() => makeBolt());

  const timer = useRef(0);
  const nextAt = useRef(1.5 + Math.random() * 3);
  const flash = useRef(0);
  const boltOpacity = useRef(0);

  useFrame((_, delta) => {
    timer.current += delta;

    if (timer.current >= nextAt.current) {
      flash.current = 1;
      boltOpacity.current = 1;
      timer.current = 0;
      nextAt.current = 2 + Math.random() * 5;
      setPoints(makeBolt()); // new jag each strike (infrequent)
    }

    // Light: quick decay with a little bounce for a double-strike flicker.
    flash.current = Math.max(0, flash.current - delta * 3.5);
    if (light.current) {
      const flicker = flash.current > 0.5 ? flash.current : flash.current * 0.6;
      light.current.intensity = flicker * 60;
    }

    // Bolt: snaps to full then fades quickly (a touch slower than the flash).
    boltOpacity.current = Math.max(0, boltOpacity.current - delta * 3.5);
    if (core.current?.material) core.current.material.opacity = boltOpacity.current;
    if (glow.current?.material) glow.current.material.opacity = boltOpacity.current * 0.5;
  });

  return (
    <>
      <pointLight
        ref={light}
        position={[1, 12, -3]}
        color="#eaf0ff"
        intensity={0}
        distance={80}
        decay={0.6}
      />
      {/* soft glow behind + bright core */}
      <Line
        ref={glow}
        points={points}
        color="#9ec5ff"
        lineWidth={9}
        transparent
        opacity={0}
        toneMapped={false}
      />
      <Line
        ref={core}
        points={points}
        color="#ffffff"
        lineWidth={3.5}
        transparent
        opacity={0}
        toneMapped={false}
      />
    </>
  );
};
