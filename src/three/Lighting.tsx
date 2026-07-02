import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  type AmbientLight,
  Color,
  type DirectionalLight,
  type HemisphereLight,
  MathUtils,
  Vector3,
} from 'three';
import type { SceneDescriptor } from '@/domain/types';
import { TRANSITION_SPEED, dampAlpha } from '@/lib/anim';

type Props = Pick<SceneDescriptor, 'light' | 'ambientIntensity'> & {
  /** Key-light position — set to the sun (day) or moon (night) side so shadows
   *  fall opposite the visible light. */
  keyPosition: [number, number, number];
};

/**
 * Scene lighting from the descriptor. Intensities, key-light color, and the
 * key-light position damp toward their targets each frame so day↔night /
 * clear↔overcast changes glide (and the sun→moon swing moves shadows across).
 */
export const Lighting = ({ light, ambientIntensity, keyPosition }: Props) => {
  const dir = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const amb = useRef<AmbientLight>(null);
  const initialized = useRef(false);

  const targetColor = useMemo(() => new Color(), []);
  const targetPos = useMemo(() => new Vector3(), []);

  useEffect(() => {
    targetColor.set(light.color);
    targetPos.set(keyPosition[0], keyPosition[1], keyPosition[2]);
    if (!initialized.current && dir.current) {
      dir.current.color.copy(targetColor);
      dir.current.intensity = light.intensity;
      dir.current.position.copy(targetPos);
      if (amb.current) amb.current.intensity = ambientIntensity;
      if (hemi.current) hemi.current.intensity = ambientIntensity * 0.6;
      initialized.current = true;
    }
  }, [targetColor, targetPos, light.color, light.intensity, ambientIntensity, keyPosition]);

  useFrame((_, delta) => {
    const a = dampAlpha(delta);
    if (dir.current) {
      dir.current.color.lerp(targetColor, a);
      dir.current.position.lerp(targetPos, a);
      dir.current.intensity = MathUtils.damp(
        dir.current.intensity,
        light.intensity,
        TRANSITION_SPEED,
        delta,
      );
    }
    if (amb.current) {
      amb.current.intensity = MathUtils.damp(
        amb.current.intensity,
        ambientIntensity,
        TRANSITION_SPEED,
        delta,
      );
    }
    if (hemi.current) {
      hemi.current.intensity = MathUtils.damp(
        hemi.current.intensity,
        ambientIntensity * 0.6,
        TRANSITION_SPEED,
        delta,
      );
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} intensity={0} groundColor="#20304a" />
      <ambientLight ref={amb} intensity={0} />
      <directionalLight
        ref={dir}
        position={[-5, 10, 2]}
        intensity={0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
    </>
  );
};
