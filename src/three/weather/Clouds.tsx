import { useMemo } from 'react';
import { Cloud, Clouds } from '@react-three/drei';
import { MeshBasicMaterial } from 'three';

const MAX_CLOUDS = 6;

/**
 * Volumetric cloud field. The number of puffs scales with `cloudCount`; `dark`
 * greys them down for overcast/stormy skies.
 */
export const CloudField = ({
  count,
  dark,
  wind = 0,
}: {
  count: number;
  dark: boolean;
  wind?: number;
}) => {
  const n = Math.min(count, MAX_CLOUDS);

  const puffs = useMemo(
    () =>
      Array.from({ length: MAX_CLOUDS }, (_, i) => ({
        x: (i - (MAX_CLOUDS - 1) / 2) * 4.2 + (i % 2 === 0 ? 1 : -1),
        y: 6.5 + (i % 3) * 0.8,
        z: -3 - (i % 2) * 2,
        seed: i + 1,
      })),
    [],
  );

  const color = dark ? '#8a94a2' : '#ffffff';
  const opacity = dark ? 0.85 : 0.55;

  // Always keep <Clouds> mounted (render 0 puffs when clear) so its texture
  // loads once and cloud-count changes don't remount / suspend the tree.
  return (
    <Clouds material={MeshBasicMaterial} limit={400}>
      {puffs.slice(0, n).map((p) => (
        <Cloud
          key={p.seed}
          seed={p.seed}
          position={[p.x, p.y, p.z]}
          bounds={[7, 1.5, 2]}
          volume={7}
          segments={22}
          color={color}
          opacity={opacity}
          speed={0.12 + wind * 0.5}
          growth={3}
        />
      ))}
    </Clouds>
  );
};
