/**
 * Fetches a route from OSRM between multiple coordinates.
 * @param coords Array of [lat, lng]
 * @returns Promise with array of [lat, lng] for the route
 */
export async function fetchOSRMRoute(coords: [number, number][]): Promise<[number, number][]> {
  if (coords.length < 2) return coords;

  // OSRM expects coordinates in lng,lat format
  const coordString = coords.map(c => `${c[1]},${c[0]}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok') {
      console.warn('OSRM Route failed, falling back to straight lines:', data.message);
      return coords;
    }

    // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
    return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
  } catch (error) {
    console.error('Error fetching OSRM route:', error);
    return coords;
  }
}
