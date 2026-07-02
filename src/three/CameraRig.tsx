import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useDeviceTilt } from './useDeviceTilt';

const HOME = new Vector3(0, 1.2, 6);
const TARGET = new Vector3(0, 1, 0);

/**
 * Idle camera parallax for depth. On desktop the camera drifts toward the
 * mouse; on touch devices it follows the phone's gyroscope instead (there's no
 * pointer to track). Amplitude grows with wind (`sway`, 0..1), so blustery
 * weather feels more restless. Damped for a smooth, floaty feel.
 */
export const CameraRig = ({ sway }: { sway: number }) => {
  const { camera, pointer } = useThree();
  const tilt = useDeviceTilt();
  const desired = useRef(new Vector3().copy(HOME));

  useFrame(() => {
    const amp = 0.4 + sway * 1.2;
    const ix = tilt ? tilt.current.x : pointer.x;
    const iy = tilt ? tilt.current.y : pointer.y;
    desired.current.set(HOME.x + ix * amp, HOME.y + iy * amp * 0.5, HOME.z);
    camera.position.lerp(desired.current, 0.05);
    camera.lookAt(TARGET);
  });

  return null;
};
