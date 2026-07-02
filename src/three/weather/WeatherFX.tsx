import { Suspense } from 'react';
import type { Condition, SceneDescriptor } from '@/domain/types';
import { Rain } from './Rain';
import { Snow } from './Snow';
import { CloudField } from './Clouds';
import { Thunder } from './Thunder';

const DARK_CLOUD: Condition[] = ['cloudy', 'rain', 'drizzle', 'thunder'];

/**
 * Procedural weather effects, chosen from the SceneDescriptor:
 * clouds (count-scaled), rain or snow particles, and lightning flashes.
 */
export const WeatherFX = ({
  scene,
  condition,
}: {
  scene: SceneDescriptor;
  condition: Condition;
}) => {
  // Rain and Snow stay mounted with a target density (0 when inactive) so they
  // fade in/out on weather changes instead of popping.
  const rainDensity = scene.precip.type === 'rain' ? scene.precip.density : 0;
  const snowDensity = scene.precip.type === 'snow' ? scene.precip.density : 0;

  return (
    <>
      {/* Isolate cloud loading: if a cloud texture suspends, only clouds pause
          briefly — the rest of the scene keeps rendering. */}
      <Suspense fallback={null}>
        <CloudField
          count={scene.cloudCount}
          dark={DARK_CLOUD.includes(condition)}
          wind={scene.cameraSway}
        />
      </Suspense>
      <Rain density={rainDensity} wind={scene.cameraSway} />
      <Snow density={snowDensity} />
      {scene.lightning && <Thunder />}
    </>
  );
};
