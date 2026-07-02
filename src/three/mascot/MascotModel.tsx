import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Box3, type Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import type { Outfit } from '@/domain/types';
import { Accessories } from './Accessories';

/** Mascot model path (see public/models/README.md). */
export const MODEL_URL = '/models/mascot.glb';

/** Target on-screen height (world units) the model is normalized to. */
const TARGET_HEIGHT = 1.9;

/**
 * The real mascot: a rigged GLB with a looping idle animation. Suspends while
 * loading and throws to the ErrorBoundary in Mascot.tsx if the file is missing,
 * so the placeholder shows until the asset is added.
 *
 * The raw model comes in at an arbitrary scale/origin (typical of exported/AI
 * models), so we auto-normalize it: center on x/z, scale to TARGET_HEIGHT, and
 * sit its feet on the ground (y=0).
 *
 * `outfit` is threaded through now; accessory meshes get anchored to the model
 * next (M5 follow-up).
 */
export const MascotModel = ({ outfit }: { outfit: Outfit }) => {
  const group = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions, names } = useAnimations(animations, group);

  // Enable shadow casting and make PBR materials matte so they read well under
  // our scene lights (AI exports are often metallic and render near-black
  // without an environment map).
  useEffect(() => {
    scene.traverse((obj) => {
      obj.castShadow = true;
      if (obj instanceof Mesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m instanceof MeshStandardMaterial) {
            m.metalness = 0;
            m.roughness = 0.85;
          }
        }
      }
    });
  }, [scene]);

  // Normalize scale + position from the model's bounding box.
  useEffect(() => {
    const g = inner.current;
    if (!g) return;
    g.scale.setScalar(1);
    g.position.set(0, 0, 0);

    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    if (size.y === 0) return;

    const s = TARGET_HEIGHT / size.y;
    g.scale.setScalar(s);
    // Center on x/z, drop feet to y=0.
    g.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  }, [scene]);

  // Prefer a clip that reads as idle; fall back to the first available.
  const idleName = names.find((n) => /idle|survey|stand|breathing/i.test(n)) ?? names[0];

  // Play the chosen clip as a loop.
  useEffect(() => {
    if (!idleName) return;
    const action = actions[idleName];
    action?.reset().fadeIn(0.4).play();
    return () => {
      action?.fadeOut(0.3);
    };
  }, [actions, names, idleName]);

  // Fallback idle: if the model has no baked animation, add a gentle bob.
  const hasAnimation = names.length > 0;
  useFrame((state) => {
    if (hasAnimation || !group.current) return;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.04;
  });

  return (
    <group ref={group}>
      <group ref={inner}>
        <primitive object={scene} />
      </group>
      {/* Accessories live in normalized space (feet y=0, ~1.9 tall). */}
      <Accessories garments={outfit.garments} />
    </group>
  );
};
