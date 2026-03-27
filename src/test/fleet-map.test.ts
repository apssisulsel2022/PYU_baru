import { describe, it, expect, vi } from 'vitest';
import { fetchOSRMRoute } from '../lib/osrm';

// Mock fetch
global.fetch = vi.fn();

describe('OSRM Routing Utility', () => {
  it('should return input coordinates if less than 2 points are provided', async () => {
    const coords: [number, number][] = [[-6.2, 106.8]];
    const result = await fetchOSRMRoute(coords);
    expect(result).toEqual(coords);
  });

  it('should fetch and parse OSRM route correctly', async () => {
    const mockResponse = {
      code: 'Ok',
      routes: [
        {
          geometry: {
            coordinates: [
              [106.8, -6.2],
              [106.81, -6.21]
            ]
          }
        }
      ]
    };

    (fetch as any).mockResolvedValue({
      json: async () => mockResponse
    });

    const coords: [number, number][] = [[-6.2, 106.8], [-6.21, 106.81]];
    const result = await fetchOSRMRoute(coords);

    // OSRM [lng, lat] should be converted to [lat, lng]
    expect(result).toEqual([[-6.2, 106.8], [-6.21, 106.81]]);
  });

  it('should fallback to straight lines if OSRM fails', async () => {
    (fetch as any).mockResolvedValue({
      json: async () => ({ code: 'Error', message: 'Failed' })
    });

    const coords: [number, number][] = [[-6.2, 106.8], [-6.21, 106.81]];
    const result = await fetchOSRMRoute(coords);
    expect(result).toEqual(coords);
  });
});
