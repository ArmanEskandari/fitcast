import { useEffect } from 'react';
import './App.css';
import { Scene } from '@/three/Scene';
import { OverlayUI } from '@/ui/OverlayUI';
import { useAppStore } from '@/store/useAppStore';

/**
 * App shell. The 3D canvas fills the viewport; the DOM UI overlay
 * (location bar, advice card) will layer on top from M7.
 * DevWeatherPanel is a temporary M1 harness for the data layer.
 */
// Dev-only: expose the store so weather states can be injected from the console
// or an automated visual check (e.g. forcing snow/thunder).
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as Window & { __fitcastStore?: typeof useAppStore }).__fitcastStore = useAppStore;
}

const App = () => {
  // Load a default location on first mount so the scene reacts to real weather.
  useEffect(() => {
    if (useAppStore.getState().status === 'idle') {
      void useAppStore.getState().loadByCity('London');
    }
  }, []);

  return (
    <div className="app">
      <Scene />
      <OverlayUI />
    </div>
  );
};

export default App;
