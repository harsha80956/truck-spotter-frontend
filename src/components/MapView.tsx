import React, { useEffect, useRef, useState } from 'react';
import { RouteSegment } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  segments: RouteSegment[];
}

const MapView: React.FC<MapViewProps> = ({ segments }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  
  // Debug log the segments
  useEffect(() => {
    console.log("MapView received segments:", JSON.stringify(segments, null, 2));
  }, [segments]);
  
  // Initialize the map
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current) {
      // Create the map instance
      leafletMapRef.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true
      }).setView([39.8283, -98.5795], 4); // Center on US
      
      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(leafletMapRef.current);
      
      setIsMapReady(true);
    }
    
    // Return a cleanup function to destroy the map when the component unmounts
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);
  
  // Fix map size issues when the component is initially hidden
  useEffect(() => {
    if (leafletMapRef.current && isMapReady) {
      // Use setTimeout to ensure the map is properly rendered
      const resizeTimer = setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
        console.log("Map size invalidated to fix rendering issues");
      }, 100);
      
      return () => clearTimeout(resizeTimer);
    }
  }, [isMapReady]);
  
  // Update the map when segments change
  useEffect(() => {
    if (!leafletMapRef.current || !isMapReady || segments.length === 0) return;
    
    const map = leafletMapRef.current;
    
    // Clear existing markers and routes
    map.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });
    
    // Create markers and route lines
    const markers: L.Marker[] = [];
    const routePoints: L.LatLng[] = [];
    const bounds = new L.LatLngBounds([]);
    
    // Filter out segments with invalid coordinates
    const validSegments = segments.filter(segment => {
      const hasValidStart = segment.startLocation && 
                           typeof segment.startLocation.lat === 'number' && 
                           typeof segment.startLocation.lng === 'number' &&
                           !isNaN(segment.startLocation.lat) && 
                           !isNaN(segment.startLocation.lng);
      
      const hasValidEnd = segment.endLocation && 
                         typeof segment.endLocation.lat === 'number' && 
                         typeof segment.endLocation.lng === 'number' &&
                         !isNaN(segment.endLocation.lat) && 
                         !isNaN(segment.endLocation.lng);
      
      if (!hasValidStart || !hasValidEnd) {
        console.warn("Skipping segment with invalid coordinates:", segment);
      }
      
      return hasValidStart && hasValidEnd;
    });
    
    console.log(`Found ${validSegments.length} valid segments out of ${segments.length} total`);
    
    // If no valid segments, show a default map view
    if (validSegments.length === 0) {
      console.warn("No valid segments found for the map");
      map.setView([39.8283, -98.5795], 4); // Center on US
      
      // Add a message to the map
      const messageControl = new L.Control({ position: 'bottomleft' });
      messageControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'map-message');
        div.innerHTML = `
          <div style="
            background-color: white;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            max-width: 300px;
          ">
            <p style="margin: 0; color: #666;">
              <strong>No valid route data available.</strong><br>
              The map cannot display the route because location coordinates are missing or invalid.
            </p>
          </div>
        `;
        return div;
      };
      messageControl.addTo(map);
      
      return;
    }
    
    // Process each segment
    validSegments.forEach((segment, index) => {
      if (!segment.startLocation || !segment.endLocation) return;
      
      // Log segment type for debugging
      console.log(`Map segment ${index}:`, {
        type: segment.type,
        startLocation: segment.startLocation,
        endLocation: segment.endLocation
      });
      
      // Make sure segment type is properly normalized
      const segmentType = segment.type || 'drive';
      
      const startLatLng = new L.LatLng(segment.startLocation.lat, segment.startLocation.lng);
      const endLatLng = new L.LatLng(segment.endLocation.lat, segment.endLocation.lng);
      
      // Add points to route
      routePoints.push(startLatLng);
      if (index === validSegments.length - 1) {
        routePoints.push(endLatLng);
      }
      
      // Extend bounds
      bounds.extend(startLatLng);
      bounds.extend(endLatLng);
      
      // Create marker for start location
      const startIcon = getMarkerIcon(segmentType);
      const startMarker = L.marker(startLatLng, { icon: startIcon })
        .addTo(map)
        .bindPopup(createPopupContent(segment, 'start'));
      
      markers.push(startMarker);
      
      // Create marker for end location if it's the last segment
      if (index === validSegments.length - 1) {
        const endIcon = getMarkerIcon('dropoff');
        const endMarker = L.marker(endLatLng, { icon: endIcon })
          .addTo(map)
          .bindPopup(createPopupContent(segment, 'end'));
        
        markers.push(endMarker);
      }
      
      // Create segment line with appropriate styling
      const lineColor = getSegmentLineColor(segmentType);
      const lineStyle = {
        color: lineColor,
        weight: 4,
        opacity: 0.8,
        dashArray: segmentType === 'drive' ? '' : '5, 10'
      };
      
      const segmentLine = L.polyline([startLatLng, endLatLng], lineStyle).addTo(map);
      
      // Add popup to line segment
      segmentLine.bindPopup(createPopupContent(segment, 'segment'));
    });
    
    // Create route line for the entire trip
    if (routePoints.length > 1) {
      const routeLine = L.polyline(routePoints, { 
        color: '#3B82F6', 
        weight: 2,
        opacity: 0.5
      }).addTo(map);
    }
    
    // Add legend to map
    addLegendToMap(map);
    
    // Add debug control in development mode
    if (process.env.NODE_ENV !== 'production') {
      const debugControl = new L.Control({ position: 'bottomright' });
      debugControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'debug-control');
        div.innerHTML = `
          <button style="
            background-color: white;
            border: 1px solid #ccc;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            box-shadow: 0 0 5px rgba(0,0,0,0.2);
          ">Debug Map Data</button>
        `;
        
        div.onclick = function() {
          console.log('Map Debug Info:');
          console.log('Current segments:', segments);
          console.log('Valid segments:', validSegments);
          console.log('Map bounds:', bounds);
          console.log('Route points:', routePoints);
          alert(`Map has ${validSegments.length} valid segments out of ${segments.length} total. Check console for details.`);
        };
        
        return div;
      };
      debugControl.addTo(map);
    }
    
    // Fit map to bounds with padding
    if (!bounds.isValid()) {
      map.setView([39.8283, -98.5795], 4); // Default view if bounds are invalid
    } else {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
    
  }, [segments, isMapReady]);
  
  // Helper function to get marker icon based on segment type
  const getMarkerIcon = (type: string): L.DivIcon => {
    let iconColor = '';
    let iconSize = 12;
    
    if (!type) {
      iconColor = '#3B82F6'; // default blue
    } else {
      const normalizedType = type.toLowerCase().trim();
      
      switch (normalizedType) {
        case 'drive':
        case 'driving':
          iconColor = '#3B82F6'; // blue
          break;
        case 'rest':
        case 'break':
          iconColor = '#6B7280'; // gray
          break;
        case 'sleep':
          iconColor = '#10B981'; // green
          break;
        case 'fuel':
        case 'fueling':
          iconColor = '#F59E0B'; // yellow
          break;
        case 'pickup':
        case 'loading':
          iconColor = '#8B5CF6'; // purple
          iconSize = 14;
          break;
        case 'dropoff':
        case 'delivery':
        case 'unloading':
          iconColor = '#EF4444'; // red
          iconSize = 14;
          break;
        default:
          iconColor = '#3B82F6'; // blue
      }
    }
    
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          background-color: ${iconColor}; 
          width: ${iconSize}px; 
          height: ${iconSize}px; 
          border-radius: 50%; 
          border: 2px solid white;
          box-shadow: 0 0 4px rgba(0,0,0,0.4);
        "></div>
      `,
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize/2, iconSize/2]
    });
  };
  
  // Helper function to get segment line color
  const getSegmentLineColor = (type: string): string => {
    if (!type) return '#3B82F6'; // default blue
    
    const normalizedType = type.toLowerCase().trim();
    
    switch (normalizedType) {
      case 'drive':
      case 'driving':
        return '#3B82F6'; // blue
      case 'rest':
      case 'break':
        return '#6B7280'; // gray
      case 'sleep':
        return '#10B981'; // green
      case 'fuel':
      case 'fueling':
        return '#F59E0B'; // yellow
      case 'pickup':
      case 'loading':
        return '#8B5CF6'; // purple
      case 'dropoff':
      case 'delivery':
      case 'unloading':
        return '#EF4444'; // red
      default:
        return '#3B82F6'; // blue
    }
  };
  
  // Helper function to get segment type label
  const getSegmentTypeLabel = (type: string | undefined): string => {
    if (!type) return 'Unknown Activity';
    
    const normalizedType = typeof type === 'string' ? type.toLowerCase().trim() : '';
    
    switch (normalizedType) {
      case 'drive':
      case 'driving':
        return 'Driving';
      case 'rest':
      case 'break':
        return 'Rest Break';
      case 'sleep':
        return 'Sleep Period';
      case 'fuel':
      case 'fueling':
        return 'Fuel Stop';
      case 'pickup':
      case 'loading':
        return 'Pickup Location';
      case 'dropoff':
      case 'delivery':
      case 'unloading':
        return 'Dropoff Location';
      default:
        // Format unknown types to be readable
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };
  
  // Helper function to create popup content
  const createPopupContent = (segment: RouteSegment, contentType: 'start' | 'end' | 'segment'): string => {
    const segmentType = segment.type || 'drive';
    
    if (contentType === 'start') {
      return `
        <div class="popup-content">
          <h3 class="font-bold text-sm">${getSegmentTypeLabel(segment.type)}</h3>
          <p class="text-xs">${segment.startLocation?.address || getLocationFallback(segment.type, 'start')}</p>
          <p class="text-xs mt-1"><strong>Start:</strong> ${segment.start_time ? new Date(segment.start_time).toLocaleString() : 'Not scheduled'}</p>
          ${segment.type === 'drive' ? `<p class="text-xs"><strong>Distance:</strong> ${((segment.distance || 0) > 0 ? (segment.distance || 0).toFixed(2) : '0.00')} miles</p>` : ''}
          ${segment.type === 'drive' ? `<p class="text-xs"><strong>Duration:</strong> ${((segment.duration || 0) / 60).toFixed(2)} hours</p>` : ''}
        </div>
      `;
    } else if (contentType === 'end') {
      return `
        <div class="popup-content">
          <h3 class="font-bold text-sm">Destination</h3>
          <p class="text-xs">${segment.endLocation?.address || getLocationFallback(segment.type, 'end')}</p>
          <p class="text-xs mt-1"><strong>Arrival:</strong> ${segment.end_time ? new Date(segment.end_time).toLocaleString() : 'Not scheduled'}</p>
        </div>
      `;
    } else {
      return `
        <div class="popup-content">
          <h3 class="font-bold text-sm">${getSegmentTypeLabel(segment.type)}</h3>
          <p class="text-xs mt-1"><strong>Start:</strong> ${segment.start_time ? new Date(segment.start_time).toLocaleString() : 'Not scheduled'}</p>
          <p class="text-xs"><strong>End:</strong> ${segment.end_time ? new Date(segment.end_time).toLocaleString() : 'Not scheduled'}</p>
          <p class="text-xs"><strong>Duration:</strong> ${((segment.duration || 0) / 60).toFixed(2)} hours</p>
          ${segment.type === 'drive' ? `<p class="text-xs"><strong>Distance:</strong> ${((segment.distance || 0) > 0 ? (segment.distance || 0).toFixed(2) : '0.00')} miles</p>` : ''}
        </div>
      `;
    }
  };
  
  // Helper function to get location fallback name
  const getLocationFallback = (segmentType: string | undefined, position: 'start' | 'end'): string => {
    if (!segmentType) return position === 'start' ? 'Starting point' : 'Destination';
    
    const normalizedType = typeof segmentType === 'string' ? segmentType.toLowerCase().trim() : '';
    
    switch (normalizedType) {
      case 'pickup':
      case 'loading':
        return 'Pickup location';
      case 'dropoff':
      case 'delivery':
      case 'unloading':
        return 'Delivery location';
      case 'rest':
      case 'break':
        return 'Rest stop';
      case 'sleep':
        return 'Sleep location';
      case 'fuel':
      case 'fueling':
        return 'Fuel stop';
      case 'drive':
      case 'driving':
      default:
        return position === 'start' ? 'Starting point' : 'Destination';
    }
  };
  
  // Helper function to add legend to map
  const addLegendToMap = (map: L.Map) => {
    // Remove existing legend if any
    const existingLegend = document.querySelector('.map-legend');
    if (existingLegend) {
      existingLegend.remove();
    }
    
    // Create a custom control class
    class LegendControl extends L.Control {
      constructor(options?: L.ControlOptions) {
        super(options);
      }
      
      onAdd(map: L.Map): HTMLElement {
        const div = L.DomUtil.create('div', 'map-legend bg-white p-2 rounded shadow-md text-xs');
        
        div.innerHTML = `
          <h4 class="font-bold mb-1">Legend</h4>
          <div class="grid grid-cols-1 gap-1">
            <div class="flex items-center">
              <span class="inline-block w-3 h-3 rounded-full mr-1" style="background-color: #3B82F6;"></span>
              <span>Driving</span>
            </div>
            <div class="flex items-center">
              <span class="inline-block w-3 h-3 rounded-full mr-1" style="background-color: #6B7280;"></span>
              <span>Rest Break</span>
            </div>
            <div class="flex items-center">
              <span class="inline-block w-3 h-3 rounded-full mr-1" style="background-color: #10B981;"></span>
              <span>Sleep Period</span>
            </div>
            <div class="flex items-center">
              <span class="inline-block w-3 h-3 rounded-full mr-1" style="background-color: #8B5CF6;"></span>
              <span>Pickup</span>
            </div>
            <div class="flex items-center">
              <span class="inline-block w-3 h-3 rounded-full mr-1" style="background-color: #EF4444;"></span>
              <span>Dropoff</span>
            </div>
          </div>
        `;
        
        // Prevent clicks on the legend from propagating to the map
        L.DomEvent.disableClickPropagation(div);
        
        return div;
      }
    }
    
    // Add the legend to the map
    const legend = new LegendControl({ position: 'bottomright' });
    legend.addTo(map);
  };
  
  return (
    <div className="relative w-full h-full" style={{ minHeight: '400px' }}>
      <div ref={mapRef} className="w-full h-full" />
      {segments.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-70">
          <div className="text-center p-4">
            <p className="text-gray-500">No route data available</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView; 