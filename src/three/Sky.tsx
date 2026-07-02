import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Color, type ShaderMaterial } from 'three';
import { dampAlpha } from '@/lib/anim';

const RADIUS = 100;

const vertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float radius;
  varying vec3 vWorldPosition;
  void main() {
    float h = clamp(vWorldPosition.y / radius * 0.5 + 0.5, 0.0, 1.0);
    // Ease the horizon a touch so the gradient isn't a flat lerp.
    h = smoothstep(0.0, 1.0, h);
    gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
    // Re-encode from linear working space to the renderer's output color
    // space (sRGB) so palette hex values display as intended.
    #include <colorspace_fragment>
  }
`;

/**
 * Full-scene sky: an inward-facing sphere with a vertical color gradient. The
 * shader colors damp toward the target palette each frame, so weather changes
 * cross-fade the sky smoothly rather than snapping.
 */
export const Sky = ({ colors }: { colors: [string, string] }) => {
  const matRef = useRef<ShaderMaterial>(null);
  const initialized = useRef(false);

  const uniforms = useMemo(
    () => ({
      topColor: { value: new Color('#000000') },
      bottomColor: { value: new Color('#000000') },
      radius: { value: RADIUS },
    }),
    [],
  );

  const targetTop = useMemo(() => new Color(), []);
  const targetBottom = useMemo(() => new Color(), []);

  useEffect(() => {
    targetTop.set(colors[0]);
    targetBottom.set(colors[1]);
    // Snap on first mount so the sky doesn't fade in from black.
    if (!initialized.current) {
      uniforms.topColor.value.copy(targetTop);
      uniforms.bottomColor.value.copy(targetBottom);
      initialized.current = true;
    }
  }, [uniforms, targetTop, targetBottom, colors]);

  useFrame((_, delta) => {
    const a = dampAlpha(delta);
    uniforms.topColor.value.lerp(targetTop, a);
    uniforms.bottomColor.value.lerp(targetBottom, a);
  });

  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 32, 16]} />
      <shaderMaterial
        ref={matRef}
        side={BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
};
