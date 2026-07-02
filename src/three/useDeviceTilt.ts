import { useEffect, useRef } from 'react';

interface Tilt {
  x: number;
  y: number;
}

/** iOS exposes a permission gate not present in the standard lib types. */
type DeviceOrientationEventIOS = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/**
 * On touch devices, reports a normalized tilt (-1..1 on each axis) from the
 * gyroscope so the camera can parallax as the user moves their phone. Returns
 * `null` on non-touch devices (the camera should follow the mouse there).
 *
 * The first reading calibrates "level", so tilt is relative to however the
 * device is being held. On iOS, motion access requires a user gesture, so we
 * request permission on the first tap.
 */
export function useDeviceTilt(): React.RefObject<Tilt> | null {
  const isTouch =
    typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches ?? false);
  const ref = useRef<Tilt>({ x: 0, y: 0 });
  const calibration = useRef<{ beta: number; gamma: number } | null>(null);

  useEffect(() => {
    if (!isTouch) return;

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      if (!calibration.current) calibration.current = { beta: e.beta, gamma: e.gamma };
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      // ~25° of tilt maps to full deflection.
      ref.current.x = clamp((e.gamma - calibration.current.gamma) / 25);
      ref.current.y = clamp(-(e.beta - calibration.current.beta) / 25);
    };

    const listen = () => window.addEventListener('deviceorientation', onOrient);

    const requestPermission = (DeviceOrientationEvent as DeviceOrientationEventIOS)
      .requestPermission;

    if (typeof requestPermission === 'function') {
      // iOS: must ask from within a user gesture.
      const ask = async () => {
        try {
          const result = await requestPermission.call(DeviceOrientationEvent);
          if (result === 'granted') listen();
        } catch {
          /* permission denied — camera simply stays still */
        }
        window.removeEventListener('touchend', ask);
        window.removeEventListener('click', ask);
      };
      window.addEventListener('touchend', ask, { once: true });
      window.addEventListener('click', ask, { once: true });
      return () => {
        window.removeEventListener('touchend', ask);
        window.removeEventListener('click', ask);
        window.removeEventListener('deviceorientation', onOrient);
      };
    }

    // Android and others: no permission needed.
    listen();
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, [isTouch]);

  return isTouch ? ref : null;
}
