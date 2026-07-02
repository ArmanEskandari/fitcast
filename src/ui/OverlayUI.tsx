import './ui.css';
import { useAppStore } from '@/store/useAppStore';
import { LocationBar } from './LocationBar';
import { LanguagePicker } from './LanguagePicker';
import { WeatherReadout } from './WeatherReadout';
import { AdviceCard } from './AdviceCard';
import { Assistant } from './Assistant';
import { DevWeatherCycler } from './DevWeatherCycler';

const DEV = process.env.NODE_ENV !== 'production';

/**
 * DOM overlay layered above the 3D canvas: location search + current
 * temperature up top, and the storytelling advice card at the bottom.
 * Falls back to loading / error status when there's no weather yet.
 */
export const OverlayUI = () => {
  const { status, weather, error } = useAppStore();

  return (
    <div className="ui-root">
      <div className="topbar">
        <div className="topbar-left">
          <LocationBar />
          <LanguagePicker />
        </div>
        {weather && <WeatherReadout weather={weather} />}
      </div>

      {weather ? (
        <AdviceCard weather={weather} />
      ) : status === 'error' ? (
        <div className="status glass err">{error}</div>
      ) : status === 'loading' || status === 'locating' ? (
        <div className="status glass">
          <span className="spinner" />
          {status === 'locating' ? 'Finding you…' : 'Loading weather…'}
        </div>
      ) : null}

      <Assistant />
      {DEV && <DevWeatherCycler />}
    </div>
  );
};
