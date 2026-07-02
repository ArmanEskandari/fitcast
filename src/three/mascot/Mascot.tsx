import { Component, Suspense, type ReactNode } from 'react';
import type { Outfit } from '@/domain/types';
import { MascotModel } from './MascotModel';
import { MascotPlaceholder } from './MascotPlaceholder';

/**
 * Renders its fallback if the GLB model fails to load (e.g. not added yet).
 * Once public/models/fox.glb exists, the real mascot appears automatically.
 */
class ModelBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Mascot entry point. Shows the placeholder while the model loads or if it's
 * absent; otherwise the rigged, weather-dressed fox.
 */
export const Mascot = ({ outfit }: { outfit: Outfit }) => {
  return (
    <ModelBoundary fallback={<MascotPlaceholder />}>
      <Suspense fallback={<MascotPlaceholder />}>
        <MascotModel outfit={outfit} />
      </Suspense>
    </ModelBoundary>
  );
};
