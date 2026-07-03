import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { mapToScene } from '@/domain/mapToScene';
import { recommendOutfit } from '@/domain/recommendOutfit';
import { FALLBACK_WEATHER } from '@/domain/defaults';
import { MAX_DPR } from '@/lib/quality';
import { useDisplayWeather } from '@/store/useAppStore';
import { Sky } from './Sky';
import { Fog } from './Fog';
import { Lighting } from './Lighting';
import { CameraRig } from './CameraRig';
import { WeatherFX } from './weather/WeatherFX';
import { Mascot } from './mascot/Mascot';
import { Ground } from './scenery/Ground';
import { Sun } from './scenery/Sun';
import { Moon } from './scenery/Moon';
import { Stars } from './scenery/Stars';
import { Birds } from './scenery/Birds';
import { Meteors } from './scenery/Meteors';
import { Wind } from './scenery/Wind';

/**
 * Root R3F canvas. The store's live weather is mapped to a SceneDescriptor and
 * flows into the sky, lighting, camera and procedural weather FX. The real
 * mascot arrives in M5.
 */
export const Scene = () => {
  const weather = useDisplayWeather();
  const current = weather ?? FALLBACK_WEATHER;
  const scene = useMemo(() => mapToScene(current), [current]);
  const outfit = useMemo(() => recommendOutfit(current), [current]);

  const isDay = current.isDay;
  const clearish = current.condition === 'clear' || current.condition === 'partlyCloudy';
  // Key light sits on the sun (day) / moon (night) side so shadows fall opposite.
  const keyPosition: [number, number, number] = isDay ? [-5, 10, 2] : [5, 10, 2];

  return (
    <Canvas
      shadows
      dpr={[1, MAX_DPR]}
      gl={{ powerPreference: 'high-performance', antialias: true }}
      camera={{ position: [0, 1.2, 6], fov: 50 }}
    >
      <Sky colors={scene.skyColors} />
      <Fog color={scene.skyColors[1]} density={scene.fogDensity} />
      <Lighting
        light={scene.light}
        ambientIntensity={scene.ambientIntensity}
        keyPosition={keyPosition}
      />
      <CameraRig sway={scene.cameraSway} />

      {/* Celestial bodies + birds, faded by time-of-day and conditions */}
      <Sun visible={isDay && clearish} />
      <Moon visible={!isDay} />
      <Stars visible={!isDay && clearish} />
      <Meteors visible={!isDay && clearish} />
      <Birds visible={isDay && clearish} />
      <Wind wind={scene.cameraSway} />

      <WeatherFX scene={scene} condition={current.condition} />

      <Mascot outfit={outfit} />
      <Ground condition={current.condition} isDay={current.isDay} wind={scene.cameraSway} />
    </Canvas>
  );
};
