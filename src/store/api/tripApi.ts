import { apiSlice } from './apiSlice';
import { TripRoute, EldLogs } from '../../types';

// Define the ELD logs request type
interface EldLogsRequest {
  trip_id: number;
}

// Define the backend trip request format
interface TripPlanRequest {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_hours: number;
}

// Define the backend location format
interface BackendLocation {
  id: number;
  address: string;
  latitude: number;
  longitude: number;
}

// Define the optimized trip list response format
interface OptimizedTripResponse {
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

// Define the paginated response format
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Helper function to transform backend location to frontend format
const transformLocation = (location: BackendLocation | null | undefined) => {
  if (!location) return { address: 'Unknown', lat: 0, lng: 0 };
  return {
    address: location.address,
    lat: location.latitude,
    lng: location.longitude
  };
};

// Helper function to transform segment data
const transformSegment = (segment: any) => {
  // Create a new segment object without the backend location properties
  const { start_location, end_location, ...rest } = segment;
  
  // Map segment_type from backend format to frontend format
  const mapSegmentType = (type: string): 'drive' | 'rest' | 'sleep' | 'fuel' | 'pickup' | 'dropoff' => {
    switch (type) {
      case 'DRIVE': return 'drive';
      case 'REST': return 'rest';
      case 'SLEEP': return 'sleep';
      case 'FUEL': return 'fuel';
      case 'LOADING': return 'pickup';
      case 'UNLOADING': return 'dropoff';
      default: 
        console.warn(`Unknown segment type: ${type}, defaulting to drive`);
        return 'drive';
    }
  };
  
  return {
    ...rest,
    // Transform segment_type to frontend format as 'type'
    type: segment.segment_type ? mapSegmentType(segment.segment_type) : 'drive',
    // Store ISO strings instead of Date objects
    start_time: segment.start_time,
    end_time: segment.end_time,
    // Transform locations to frontend format
    startLocation: transformLocation(start_location),
    endLocation: transformLocation(end_location)
  };
};

// Helper function to transform optimized trip list response
const transformOptimizedTrip = (trip: OptimizedTripResponse): TripRoute => {
  return {
    id: trip.id,
    current_location: { address: trip.current_location_address },
    pickup_location: { address: trip.pickup_location_address },
    dropoff_location: { address: trip.dropoff_location_address },
    total_distance: trip.total_distance,
    total_duration: trip.total_duration,
    start_time: trip.start_time,
    end_time: trip.end_time,
    created_at: trip.created_at,
    segments: [],
    // Add these properties to make them directly accessible
    current_location_address: trip.current_location_address,
    pickup_location_address: trip.pickup_location_address,
    dropoff_location_address: trip.dropoff_location_address,
    segment_count: trip.segment_count
  } as unknown as TripRoute;
};

// Extend the API slice with trip endpoints
export const tripApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all trips
    getTrips: builder.query<TripRoute[], void>({
      query: () => '/trips/',
      providesTags: ['Trip'],
      transformResponse: (response: PaginatedResponse<OptimizedTripResponse> | OptimizedTripResponse[]) => {
        // Handle paginated response - extract the results array
        const tripsArray = 'results' in response ? response.results : response;
        return tripsArray.map(transformOptimizedTrip);
      }
    }),
    
    // Get a single trip by ID
    getTrip: builder.query<TripRoute, number>({
      query: (id) => `/trips/${id}/`,
      providesTags: (result, error, id) => [{ type: 'Trip', id }],
      transformResponse: (response: any) => ({
        ...response,
        // Store ISO strings instead of Date objects
        start_time: response.start_time,
        end_time: response.end_time,
        segments: response.segments.map(transformSegment)
      })
    }),
    
    // Plan a trip
    planTrip: builder.mutation<TripRoute, TripPlanRequest>({
      query: (tripDetails) => ({
        url: '/trips/plan/',
        method: 'POST',
        body: tripDetails,
      }),
      invalidatesTags: ['Trip'],
      transformResponse: (response: any) => {
        // Remove top-level location objects
        const { current_location, pickup_location, dropoff_location, ...rest } = response;
        
        return {
          ...rest,
          // Store ISO strings instead of Date objects
          start_time: response.start_time,
          end_time: response.end_time,
          segments: response.segments.map(transformSegment)
        };
      }
    }),
    
    // Generate ELD logs for a trip
    generateEldLogs: builder.mutation<EldLogs, EldLogsRequest>({
      query: (request) => ({
        url: '/trips/generate_eld_logs/',
        method: 'POST',
        body: request,
      }),
      invalidatesTags: ['EldLog'],
    }),
    
    // Get daily logs for a trip
    getDailyLogs: builder.query<any[], number>({
      query: (tripId) => `/daily-logs/?trip_id=${tripId}`,
      providesTags: ['DailyLog'],
      transformResponse: (response: PaginatedResponse<any> | any[]) => {
        console.log('getDailyLogs response:', response);
        // Handle paginated response - extract the results array if it exists
        return 'results' in response ? response.results : response;
      },
      // Add error handling
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (err) {
          console.error('Error fetching daily logs:', err);
        }
      },
    }),
  }),
});

// Export the auto-generated hooks
export const {
  useGetTripsQuery,
  useGetTripQuery,
  usePlanTripMutation,
  useGenerateEldLogsMutation,
  useGetDailyLogsQuery,
} = tripApi; 