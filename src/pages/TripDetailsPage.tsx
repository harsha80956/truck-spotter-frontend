import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { useApi } from '../hooks/useApi';
import MapView from '../components/MapView';
import EldLogViewer from '../components/EldLogViewer';
import { RouteSegment, Location } from '../types';

// Define the backend location type
interface BackendLocation {
  id: number;
  address: string;
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
}

// Define the backend segment type
interface BackendSegment {
  id: number;
  segment_type: string;
  type?: 'drive' | 'rest' | 'sleep' | 'fuel' | 'pickup' | 'dropoff';
  distance: number;
  duration: number;
  start_time: string;
  end_time: string;
  start_location: BackendLocation;
  end_location: BackendLocation;
}

// Define the trip list item type (from /api/trips/)
interface TripListItem {
  id: number;
  current_location_address: string;
  pickup_location_address: string;
  dropoff_location_address: string;
  total_distance: number;
  total_duration: number;
  start_time: string;
  end_time: string;
  created_at: string;
  segment_count: number;
}

// Define the trip detail type (from /api/trips/{id}/)
interface TripDetail {
  id: number;
  current_location: BackendLocation;
  pickup_location: BackendLocation;
  dropoff_location: BackendLocation;
  current_cycle_hours: number;
  total_distance: number;
  total_duration: number;
  start_time: string;
  end_time: string;
  created_at: string;
  segments: BackendSegment[];
}

// Combined type that can handle both formats
type TripData = TripListItem | TripDetail;

// Type guard to check if trip data is detailed
const isTripDetail = (trip: TripData): trip is TripDetail => {
  return (trip as TripDetail).segments !== undefined;
};

// Helper function to transform backend segments to frontend format
const transformSegmentsToFrontendFormat = (segments: BackendSegment[]): RouteSegment[] => {
  console.log("Raw segments from backend:", JSON.stringify(segments, null, 2));
  
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    console.warn("No segments provided to transform");
    return [];
  }
  
  return segments.map((segment, index) => {
    console.log(`Processing segment ${index}:`, segment);
    
    // Check if type exists
    if (!segment || (segment.type === undefined && segment.segment_type === undefined)) {
      console.error(`Segment ${index} is missing type:`, segment);
    }
    
    // Directly map backend segment types to frontend types
    let frontendType: 'drive' | 'rest' | 'sleep' | 'fuel' | 'pickup' | 'dropoff';
    
    // Use type if available, fall back to segment_type, or use default
    const segmentType = segment?.type || segment?.segment_type || 'drive';
    
    // If segmentType is already in the correct format, use it directly
    if (['drive', 'rest', 'sleep', 'fuel', 'pickup', 'dropoff'].includes(segmentType)) {
      frontendType = segmentType as 'drive' | 'rest' | 'sleep' | 'fuel' | 'pickup' | 'dropoff';
    } else {
      // Otherwise map from backend format
      switch (segmentType) {
        case 'DRIVE':
          frontendType = 'drive';
          break;
        case 'LOADING':
          frontendType = 'pickup';
          break;
        case 'UNLOADING':
          frontendType = 'dropoff';
          break;
        case 'REST':
          frontendType = 'rest';
          break;
        case 'SLEEP':
          frontendType = 'sleep';
          break;
        case 'FUEL':
          frontendType = 'fuel';
          break;
        default:
          console.warn(`Unknown segment type: ${segmentType}, defaulting to drive`);
          frontendType = 'drive';
      }
    }
    
    console.log('Mapped segment type:', segmentType, 'to:', frontendType);
    
    // Helper function to extract location data safely
    const extractLocation = (location: any, position: 'start' | 'end') => {
      if (!location) {
        console.warn(`Missing ${position} location for segment ${index}`);
        return {
          address: getDefaultLocationName(frontendType, position),
          lat: 0,
          lng: 0
        };
      }
      
      // Try to extract coordinates from various possible formats
      let lat = 0;
      let lng = 0;
      
      if (typeof location.latitude === 'number' && !isNaN(location.latitude)) {
        lat = location.latitude;
      } else if (typeof location.lat === 'number' && !isNaN(location.lat)) {
        lat = location.lat;
      }
      
      if (typeof location.longitude === 'number' && !isNaN(location.longitude)) {
        lng = location.longitude;
      } else if (typeof location.lng === 'number' && !isNaN(location.lng)) {
        lng = location.lng;
      }
      
      // Log if we couldn't find valid coordinates
      if (lat === 0 && lng === 0) {
        console.warn(`Could not extract valid coordinates for ${position} location:`, location);
      }
      
      return {
        address: location.address || getDefaultLocationName(frontendType, position),
        lat,
        lng
      };
    };
    
    // Create a new segment with the frontend format
    const frontendSegment: RouteSegment = {
      type: frontendType,
      distance: segment?.distance || 0,
      duration: segment?.duration || 0,
      start_time: segment?.start_time,
      end_time: segment?.end_time,
      startLocation: extractLocation(segment?.start_location, 'start'),
      endLocation: extractLocation(segment?.end_location, 'end')
    };
    
    return frontendSegment;
  });
};

// Helper function to normalize segment types
const normalizeSegmentType = (type: string | undefined): 'drive' | 'rest' | 'sleep' | 'fuel' | 'pickup' | 'dropoff' => {
  if (!type) return 'drive';
  
  const uppercaseType = typeof type === 'string' ? type.toUpperCase() : '';
  const lowercaseType = typeof type === 'string' ? type.toLowerCase() : '';
  
  console.log('Segment type before normalization:', type, 'uppercase:', uppercaseType);
  
  let result: 'drive' | 'rest' | 'sleep' | 'fuel' | 'pickup' | 'dropoff';
  
  // First check for exact uppercase matches from the backend
  switch (uppercaseType) {
    case 'DRIVE':
      result = 'drive';
      break;
    case 'LOADING':
      result = 'pickup';
      break;
    case 'UNLOADING':
      result = 'dropoff';
      break;
    case 'REST':
      result = 'rest';
      break;
    case 'SLEEP':
      result = 'sleep';
      break;
    case 'FUEL':
      result = 'fuel';
      break;
    default:
      // Fall back to lowercase checks for other formats
      switch (lowercaseType) {
        case 'drive':
        case 'driving':
          result = 'drive';
          break;
        case 'rest':
        case 'break':
          result = 'rest';
          break;
        case 'sleep':
          result = 'sleep';
          break;
        case 'fuel':
        case 'fueling':
          result = 'fuel';
          break;
        case 'pickup':
        case 'loading':
          result = 'pickup';
          break;
        case 'dropoff':
        case 'delivery':
        case 'unloading':
          result = 'dropoff';
          break;
        default:
          console.warn(`Unknown segment type: ${type}, defaulting to drive`);
          result = 'drive';
      }
  }
  
  console.log('Normalized result:', result);
  return result;
};

// Helper function to get default location names based on segment type
const getDefaultLocationName = (segmentType: string, position: 'start' | 'end'): string => {
  switch (segmentType) {
    case 'pickup':
      return 'Pickup location';
    case 'dropoff':
      return 'Delivery location';
    case 'rest':
      return 'Rest stop';
    case 'sleep':
      return 'Sleep location';
    case 'fuel':
      return 'Fuel stop';
    case 'drive':
      return position === 'start' ? 'Starting point' : 'Destination';
    default:
      return position === 'start' ? 'Starting point' : 'Destination';
  }
};

// Helper function to format duration in hours and minutes
const formatDuration = (minutes: number | null | undefined): string => {
  if (minutes == null) return '0h 0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

// Helper function to format date and time
const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Unknown';
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleString(undefined, options);
};

// Helper function to calculate trip progress percentage
const calculateTripProgress = (startTime: string | null | undefined, endTime: string | null | undefined): number => {
  if (!startTime || !endTime) return 0;
  
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const now = Date.now();
  
  // If trip hasn't started yet
  if (now < start) return 0;
  
  // If trip is completed
  if (now > end) return 100;
  
  // Calculate progress
  const totalDuration = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / totalDuration) * 100);
};

// Get segment type label and style information
const getSegmentTypeLabel = (type: string): { name: string; bgColor: string; textColor: string; icon: string } => {
  if (!type) {
    return { name: 'Unknown Activity', bgColor: 'bg-gray-100', textColor: 'text-gray-800', icon: '📝' };
  }

  const normalizedType = typeof type === 'string' ? type.toLowerCase().trim() : '';
  
  switch (normalizedType) {
    case 'drive':
    case 'driving':
      return { name: 'Driving', bgColor: 'bg-blue-100', textColor: 'text-blue-800', icon: '🚚' };
    case 'rest':
    case 'break':
      return { name: 'Rest Break', bgColor: 'bg-orange-100', textColor: 'text-orange-800', icon: '☕' };
    case 'sleep':
      return { name: 'Sleep Period', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800', icon: '😴' };
    case 'fuel':
    case 'fueling':
      return { name: 'Fuel Stop', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', icon: '⛽' };
    case 'pickup':
    case 'loading':
      return { name: 'Pickup', bgColor: 'bg-green-100', textColor: 'text-green-800', icon: '📦' };
    case 'dropoff':
    case 'delivery':
    case 'unloading':
      return { name: 'Dropoff', bgColor: 'bg-red-100', textColor: 'text-red-800', icon: '🏁' };
    default:
      // Try to generate a meaningful name from the type string
      const formattedType = type ? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Activity';
      return { 
        name: formattedType || 'Other Activity', 
        bgColor: 'bg-gray-100', 
        textColor: 'text-gray-800', 
        icon: '📝' 
      };
  }
};

// Helper function to determine if a segment type is pickup or dropoff
const isPickupOrDropoff = (segmentType: string): boolean => {
  return segmentType === 'pickup' || segmentType === 'dropoff';
};

// Helper function to get appropriate location label based on segment type
const getLocationLabel = (segmentType: string): string => {
  switch (segmentType) {
    case 'pickup':
      return 'Pickup location';
    case 'dropoff':
      return 'Delivery location';
    case 'rest':
      return 'Rest stop';
    case 'sleep':
      return 'Sleep location';
    case 'fuel':
      return 'Fuel stop';
    default:
      return 'Location';
  }
};

// Helper function to map segment types (kept for backward compatibility)
const mapSegmentType = (type: string | undefined): 'drive' | 'rest' | 'sleep' | 'fuel' | 'pickup' | 'dropoff' => {
  if (!type) {
    console.warn("Received undefined segment type, defaulting to drive");
    return 'drive';
  }
  
  // If the type is already in the correct format, return it
  if (['drive', 'rest', 'sleep', 'fuel', 'pickup', 'dropoff'].includes(type)) {
    return type as 'drive' | 'rest' | 'sleep' | 'fuel' | 'pickup' | 'dropoff';
  }
  
  // Otherwise, map from backend format
  switch (type) {
    case 'DRIVE':
      return 'drive';
    case 'LOADING':
      return 'pickup';
    case 'UNLOADING':
      return 'dropoff';
    case 'REST':
      return 'rest';
    case 'SLEEP':
      return 'sleep';
    case 'FUEL':
      return 'fuel';
    default:
      console.warn(`Unknown segment type in mapSegmentType: ${type}, defaulting to drive`);
      return 'drive';
  }
};

const TripDetailsPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const tripId = id ? parseInt(id, 10) : undefined;
  
  const { currentTrip } = useAppSelector(state => state.trip as { currentTrip: TripData });
  const { loading, error, getTripById, generateLogsForTrip } = useApi();
  
  const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
  const [generatingLogs, setGeneratingLogs] = useState(false);
  const [tripProgress, setTripProgress] = useState(0);
  
  useEffect(() => {
    if (tripId) {
      console.log("Loading trip data for ID:", tripId);
      getTripById(tripId);
    }
  }, [tripId]);
  
  // Log trip data when it changes
  useEffect(() => {
    if (currentTrip) {
      console.log("Current trip data:", currentTrip);
      if (isTripDetail(currentTrip)) {
        console.log("Trip segments:", currentTrip.segments);
      }
    }
  }, [currentTrip]);
  
  // Calculate trip progress when trip data changes
  useEffect(() => {
    if (currentTrip) {
      const progress = calculateTripProgress(currentTrip.start_time, currentTrip.end_time);
      setTripProgress(progress);
    }
  }, [currentTrip]);
  
  const handleGenerateLogs = async () => {
    if (!tripId) return;
    
    setGeneratingLogs(true);
    try {
      await generateLogsForTrip(tripId);
      setActiveTab('logs');
    } catch (err) {
      console.error('Error generating logs:', err);
    } finally {
      setGeneratingLogs(false);
    }
  };

  // Get location address based on trip data format
  const getLocationAddress = (trip: TripData, locationType: 'current' | 'pickup' | 'dropoff'): string => {
    if (!trip) return 'No trip data available';
    
    if (isTripDetail(trip)) {
      // For detailed trip data
      switch (locationType) {
        case 'current':
          return trip.current_location?.address || 'Starting point';
        case 'pickup':
          return trip.pickup_location?.address || 'Pickup location';
        case 'dropoff':
          return trip.dropoff_location?.address || 'Delivery location';
        default:
          return 'Location not specified';
      }
    } else {
      // For list trip data
      switch (locationType) {
        case 'current':
          return trip.current_location_address || 'Starting point';
        case 'pickup':
          return trip.pickup_location_address || 'Pickup location';
        case 'dropoff':
          return trip.dropoff_location_address || 'Delivery location';
        default:
          return 'Location not specified';
      }
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center p-12 h-screen bg-gray-50">
        <div className="flex flex-col items-center text-center max-w-md p-6 bg-white rounded-xl shadow-md">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Trip Details</h2>
          <p className="text-gray-600">Retrieving trip information and segments. This may take a moment...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-md mb-6">
          <div className="flex items-center mb-4">
            <svg className="h-8 w-8 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold">Error Loading Trip Details</h2>
          </div>
          <p className="mb-4">We encountered a problem while trying to load the trip details. This could be due to network issues or because the trip data is unavailable.</p>
          <div className="bg-red-100 p-4 rounded-md border border-red-300 mb-4">
            <p className="font-mono text-sm">{error}</p>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => getTripById(tripId as number)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 shadow-sm"
            >
              Try Again
            </button>
            <button 
              onClick={() => navigate('/trips')}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors duration-200 shadow-sm"
            >
              Back to Trip List
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!currentTrip) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded shadow-md mb-6">
          <div className="flex items-center">
            <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">Trip not found</p>
          </div>
          <p className="mt-2">The trip may have been deleted or you may have entered an invalid URL.</p>
          <button 
            onClick={() => navigate('/trip-planner')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200 shadow-sm"
          >
            Back to Trip Planner
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trip #{currentTrip.id} Details</h1>
          <p className="text-gray-500 mt-1">Created on {new Date(currentTrip.created_at).toLocaleDateString()}</p>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200 flex items-center"
        >
          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </div>
      
      {/* Trip Summary Card */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {getLocationAddress(currentTrip, 'pickup')} to {getLocationAddress(currentTrip, 'dropoff')}
              </h2>
              <p className="text-gray-500">
                {formatDateTime(currentTrip.start_time)} - {formatDateTime(currentTrip.end_time)}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <div className="text-center">
              <div className="text-sm text-gray-500">Distance</div>
              <div className="text-xl font-bold text-gray-900">{(currentTrip.total_distance || 0).toFixed(1)} mi</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Duration</div>
              <div className="text-xl font-bold text-gray-900">{formatDuration(currentTrip.total_duration)}</div>
            </div>
            {isTripDetail(currentTrip) && (
              <div className="text-center">
                <div className="text-sm text-gray-500">Cycle Hours</div>
                <div className="text-xl font-bold text-gray-900">{(currentTrip.current_cycle_hours || 0).toFixed(1)}h</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Trip Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Trip Progress</h3>
            <span className="text-sm font-medium text-gray-700">{tripProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${tripProgress}%` }}
            ></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Route Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Current Location</p>
                <p className="font-medium text-gray-900">{getLocationAddress(currentTrip, 'current')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pickup Location</p>
                <p className="font-medium text-gray-900">{getLocationAddress(currentTrip, 'pickup')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Dropoff Location</p>
                <p className="font-medium text-gray-900">{getLocationAddress(currentTrip, 'dropoff')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Trip Timeline</h2>
            <div className="relative pt-1">
              <div className="flex items-center mb-4">
                <div className="bg-blue-500 rounded-full h-6 w-6 flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Trip Start</p>
                  <p className="text-xs text-gray-500">{formatDateTime(currentTrip.start_time)}</p>
                </div>
              </div>
              
              <div className="ml-3 relative border-l-2 border-blue-200 pl-6 pb-4">
                {isTripDetail(currentTrip) && currentTrip.segments && currentTrip.segments.length > 0 && (
                  <div className="space-y-4">
                    {currentTrip.segments.map((segment, index) => {
                      // Ensure type exists
                      const segmentType = segment?.type || 'drive';
                      
                      // Log the segment type
                      console.log(`Timeline segment ${index}:`, {
                        original: segmentType,
                        mapped: segmentType
                      });
                      
                      const { name, icon } = getSegmentTypeLabel(segmentType);
                      return (
                        <div key={segment.id || index} className="relative">
                          <div className="absolute -left-8 mt-1.5 h-3 w-3 rounded-full bg-blue-300"></div>
                          <p className="text-sm font-medium text-gray-900">{icon} {name}</p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(segment.start_time)} - {formatDuration(segment.duration)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="flex items-center">
                <div className="bg-green-500 rounded-full h-6 w-6 flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Trip End</p>
                  <p className="text-xs text-gray-500">{formatDateTime(currentTrip.end_time)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {isTripDetail(currentTrip) && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Route Map</h2>
            <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
              {currentTrip.segments && currentTrip.segments.length > 0 ? (
                <MapView segments={transformSegmentsToFrontendFormat(currentTrip.segments)} />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center p-6 max-w-md">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No route data available</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      This trip doesn't have any route segments to display on the map.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="flex border-b">
          <button
            className={`px-6 py-4 font-medium transition-colors duration-200 ${activeTab === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('details')}
          >
            Route Segments
          </button>
          <button
            className={`px-6 py-4 font-medium transition-colors duration-200 ${activeTab === 'logs' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('logs')}
          >
            ELD Logs
          </button>
        </div>
        
        <div className="p-6">
          {activeTab === 'details' ? (
            <>
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Route Segments</h3>
                <button
                  onClick={handleGenerateLogs}
                  disabled={generatingLogs}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {generatingLogs ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Generate ELD Logs
                    </>
                  )}
                </button>
              </div>
              
              {isTripDetail(currentTrip) ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentTrip.segments.map((segment, index) => {
                        // Ensure type exists
                        const segmentType = segment?.type || 'drive';
                        
                        // Log the segment type
                        console.log(`Table segment ${index}:`, {
                          original: segmentType,
                          mapped: segmentType
                        });
                        
                        const { name, bgColor, textColor, icon } = getSegmentTypeLabel(segmentType);
                        return (
                          <tr key={segment.id || index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
                                {icon} {name}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {formatDateTime(segment.start_time)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {formatDateTime(segment.end_time)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {isPickupOrDropoff(segmentType)
                                ? (segment.start_location?.address || getLocationLabel(segmentType))
                                : `${segment.start_location?.address || 'Starting point'} → ${segment.end_location?.address || 'Destination'}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {(segment.distance || 0) > 0 
                                ? `${(segment.distance || 0).toFixed(2)} miles` 
                                : '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {formatDuration(segment.duration)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Detailed segment information is not available in the list view. 
                        <button 
                          onClick={() => getTripById(currentTrip.id)}
                          className="ml-2 font-medium text-yellow-700 underline hover:text-yellow-600"
                        >
                          Load detailed view
                        </button>
                      </p>
                      <p className="mt-2 text-sm text-yellow-700">
                        This trip has {(currentTrip as TripListItem).segment_count} segments in total.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg">
              <EldLogViewer tripId={tripId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripDetailsPage; 