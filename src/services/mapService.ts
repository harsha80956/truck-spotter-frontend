import { Location } from '../types';

export interface RouteSegment {
  distance: number;           // in miles
  duration: number;          // in minutes
  startLocation: string;
  endLocation: string;
  type: 'drive' | 'rest' | 'break' | 'load' | 'unload' | 'fuel';
  polyline?: string;         // Encoded polyline for the route segment
}

export interface RouteResponse {
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  bounds: {
    northeast: { lat: number; lng: number; };
    southwest: { lat: number; lng: number; };
  };
}

/**
 * Geocode an address to get coordinates
 */
export const geocodeAddress = async (address: string): Promise<Location> => {
  try {
    // Add a delay to comply with Nominatim's usage policy (1 request per second)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Using OpenStreetMap Nominatim API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Spotter-App/1.0', // Identify your application as per Nominatim's usage policy
          'Accept-Language': 'en' // Request English results
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    if (!data.length) {
      throw new Error('No results found');
    }

    // Extract the display name and coordinates
    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    return {
      address: result.display_name,
      lat,
      lng,
      latitude: lat,
      longitude: lng
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
};

/**
 * Reverse geocode coordinates to get an address
 */
export const reverseGeocode = async (latitude: number, longitude: number): Promise<Location> => {
  try {
    // Add a delay to comply with Nominatim's usage policy (1 request per second)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Using OpenStreetMap Nominatim API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Spotter-App/1.0', // Identify your application as per Nominatim's usage policy
          'Accept-Language': 'en' // Request English results
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const data = await response.json();
    const lat = parseFloat(data.lat);
    const lng = parseFloat(data.lon);
    
    return {
      address: data.display_name,
      lat,
      lng,
      latitude: lat,
      longitude: lng
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
};

/**
 * Calculate route between multiple points
 */
export const calculateRoute = async (
  waypoints: Location[]
): Promise<RouteResponse> => {
  try {
    // Using OSRM (Open Source Routing Machine) API
    const coordinates = waypoints
      .map(point => `${point.lng},${point.lat}`)
      .join(';');

    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&alternatives=false&steps=true`
    );

    if (!response.ok) {
      throw new Error('Route calculation failed');
    }

    const data = await response.json();
    if (!data.routes?.length) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    const segments: RouteSegment[] = [];

    // Convert OSRM response to our RouteSegment format
    let currentDistance = 0;
    let currentDuration = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      // Add loading/unloading time for first and last points
      if (i === 0) {
        segments.push({
          distance: 0,
          duration: 60, // 1 hour for loading
          startLocation: waypoints[i].address,
          endLocation: waypoints[i].address,
          type: 'load'
        });
      }

      // Add driving segment
      const legDistance = route.legs[i].distance / 1609.34; // Convert meters to miles
      const legDuration = route.legs[i].duration / 60; // Convert seconds to minutes

      segments.push({
        distance: legDistance,
        duration: legDuration,
        startLocation: waypoints[i].address,
        endLocation: waypoints[i + 1].address,
        type: 'drive',
        polyline: route.geometry // Encoded polyline for the route
      });

      currentDistance += legDistance;
      currentDuration += legDuration;

      // Add unloading time for the final destination
      if (i === waypoints.length - 2) {
        segments.push({
          distance: 0,
          duration: 60, // 1 hour for unloading
          startLocation: waypoints[i + 1].address,
          endLocation: waypoints[i + 1].address,
          type: 'unload'
        });
      }
    }

    return {
      segments,
      totalDistance: currentDistance,
      totalDuration: currentDuration,
      bounds: {
        northeast: {
          lat: route.bounds[1],
          lng: route.bounds[0]
        },
        southwest: {
          lat: route.bounds[3],
          lng: route.bounds[2]
        }
      }
    };
  } catch (error) {
    console.error('Route calculation error:', error);
    throw error;
  }
};

/**
 * Decode a polyline string into an array of coordinates
 */
export const decodePolyline = (encoded: string): [number, number][] => {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let shift = 0;
    let result = 0;

    do {
      const b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (result & 0x20);

    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      const b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (result & 0x20);

    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push([lat * 1e-5, lng * 1e-5]);
  }

  return points;
};

/**
 * Find rest areas or truck stops along a route
 */
export const findRestAreas = async (
  route: RouteSegment[]
): Promise<Location[]> => {
  try {
    const restAreas: Location[] = [];
    
    // Using OpenStreetMap Overpass API to find rest areas and truck stops
    for (const segment of route) {
      if (segment.type !== 'drive') continue;

      const [startLat, startLng] = decodePolyline(segment.polyline || '')[0];
      const query = `
        [out:json];
        (
          way["highway"="rest_area"](around:5000,${startLat},${startLng});
          way["amenity"="truck_stop"](around:5000,${startLat},${startLng});
        );
        out center;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });

      if (!response.ok) continue;

      const data = await response.json();
      for (const element of data.elements) {
        restAreas.push({
          address: element.tags.name || 'Unnamed Rest Area',
          lat: element.center.lat,
          lng: element.center.lon
        });
      }
    }

    return restAreas;
  } catch (error) {
    console.error('Error finding rest areas:', error);
    return [];
  }
}; 