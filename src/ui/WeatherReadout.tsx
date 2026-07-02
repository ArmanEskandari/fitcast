import type { Condition, WeatherState } from '@/domain/types';

const CONDITION_LABEL: Record<Condition, string> = {
  clear: 'Clear',
  partlyCloudy: 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Foggy',
  drizzle: 'Drizzle',
  rain: 'Rain',
  snow: 'Snow',
  thunder: 'Thunderstorm',
};

function uvLevel(uv: number): string {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very high';
  return 'Extreme';
}

/** Large current-temperature display + a row of detail stats (wind, humidity, UV). */
export const WeatherReadout = ({ weather }: { weather: WeatherState }) => {
  const uvHigh = weather.uvIndex >= 6 && weather.isDay;

  return (
    <div className="readout">
      <div className="temp">
        {Math.round(weather.tempC)}
        <sup>°</sup>
      </div>
      <div className="cond">
        {CONDITION_LABEL[weather.condition]}
        {!weather.isDay && ' · Night'}
      </div>
      <div className="feels">Feels like {Math.round(weather.feelsLikeC)}°</div>

      {/* Stats + UV hint collapse away in the mobile peek (see .collapsible). */}
      <div className="collapsible">
        <div className="collapsible-body">
          <div className="details">
            <span className="stat" title="Wind">
              💨 {Math.round(weather.windKph)} km/h
            </span>
            <span className="stat" title="Humidity">
              💧 {Math.round(weather.humidity)}%
            </span>
            {weather.precipMm > 0 && (
              <span className="stat" title="Precipitation">
                🌧️ {weather.precipMm} mm
              </span>
            )}
            <span className={`stat ${uvHigh ? 'stat-alert' : ''}`} title="UV index">
              ☀️ UV {Math.round(weather.uvIndex)} · {uvLevel(weather.uvIndex)}
            </span>
          </div>

          {uvHigh && <div className="uv-hint">🕶️ High UV — wear sunglasses</div>}
        </div>
      </div>
    </div>
  );
};
