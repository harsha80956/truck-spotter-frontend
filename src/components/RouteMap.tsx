import React, { useEffect, useRef } from 'react';
import { RouteSegment } from '../services/mapService';
import { DutyStatus } from '../types';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface RouteMapProps {
  segments: RouteSegment[];
  bounds: {
    northeast: { lat: number; lng: number; };
    southwest: { lat: number; lng: number; };
  };
}

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';

const getSegmentColor = (type: RouteSegment['type']): string => {
  switch (type) {
    case 'drive':
      return '#3b82f6'; // blue
    case 'break':
      return '#10b981'; // green
    case 'rest':
      return '#6366f1'; // indigo
    case 'load':
      return '#f59e0b'; // amber
    case 'unload':
      return '#ef4444'; // red
    case 'fuel':
      return '#8b5cf6'; // purple
    default:
      return '#6b7280'; // gray
  }
};

const getSegmentIcon = (type: RouteSegment['type']): string => {
  switch (type) {
    case 'drive':
      return 'car';
    case 'break':
      return 'coffee';
    case 'rest':
      return 'bed';
    case 'load':
      return 'box';
    case 'unload':
      return 'box-open';
    case 'fuel':
      return 'gas-pump';
    default:
      return 'map-marker';
  }
};

const RouteMap: React.FC<RouteMapProps> = ({ segments, bounds }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      bounds: [
        [bounds.southwest.lng, bounds.southwest.lat],
        [bounds.northeast.lng, bounds.northeast.lat]
      ],
      fitBoundsOptions: { padding: 50 }
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    return () => {
      map.current?.remove();
    };
  }, [bounds]);

  useEffect(() => {
    if (!map.current) return;

    map.current.on('load', () => {
      // Add route line
      segments.forEach((segment, index) => {
        if (!segment.polyline || !map.current) return;

        const coordinates = decodePolyline(segment.polyline)
          .map(([lat, lng]) => [lng, lat]);

        map.current.addSource(`route-${index}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates
            }
          }
        });

        map.current.addLayer({
          id: `route-${index}`,
          type: 'line',
          source: `route-${index}`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': getSegmentColor(segment.type),
            'line-width': 4
          }
        });

        // Add markers for stops
        if (segment.type !== 'drive') {
          const marker = new mapboxgl.Marker({
            color: getSegmentColor(segment.type)
          })
            .setLngLat(coordinates[0])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 })
                .setHTML(`
                  <div class="p-2">
                    <h3 class="font-bold">${segment.type.charAt(0).toUpperCase() + segment.type.slice(1)} Stop</h3>
                    <p>Duration: ${segment.duration} minutes</p>
                    <p>Location: ${segment.startLocation}</p>
                  </div>
                `)
            )
            .addTo(map.current);
        }
      });
    });
  }, [segments]);

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg">
        <h4 className="font-bold mb-2">Legend</h4>
        <div className="space-y-2">
          {['drive', 'break', 'rest', 'load', 'unload', 'fuel'].map(type => (
            <div key={type} className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: getSegmentColor(type as RouteSegment['type']) }}
              />
              <span className="capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to decode polyline
const decodePolyline = (encoded: string): [number, number][] => {
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

export default RouteMap; 