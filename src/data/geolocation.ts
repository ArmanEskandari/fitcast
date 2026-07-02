export interface Coords {
  lat: number;
  lon: number;
}

/**
 * Promisified browser geolocation. Rejects with a friendly message when the
 * API is unavailable, denied, or times out.
 */
export function getCurrentPosition(options?: PositionOptions): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err.message || 'Unable to get your location.')),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000, ...options },
    );
  });
}
