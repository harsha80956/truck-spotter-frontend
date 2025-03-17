import { useState, useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { 
  useGeocodeMutation 
} from '../store/api/locationApi';
import { 
  usePlanTripMutation, 
  useGenerateEldLogsMutation, 
  useGetDailyLogsQuery,
  useGetTripsQuery,
  useGetTripQuery
} from '../store/api/tripApi';
import { 
  setCurrentLocation, 
  setPickupLocation, 
  setDropoffLocation 
} from '../store/slices/locationSlice';
import { 
  setCurrentTrip, 
  setTrips,
  BackendTripRoute
} from '../store/slices/tripSlice';
import { 
  setLogs, 
  setDailyLogs,
  BackendEldLogs,
  BackendDailyLog,
  BackendLogEntry
} from '../store/slices/eldLogSlice';
import { Location, TripDetails, DailyLog, LogEntry, TripRoute, RouteSegment } from '../types';

// Define API base URL
const API_BASE_URL = 'http://localhost:8001/api';

interface ApiResponse<T> {
  data: T;
  error?: string;
}

interface BackendSegment extends Omit<RouteSegment, 'type' | 'startLocation' | 'endLocation'> {
  segment_type: 'drive' | 'rest' | 'sleep' | 'fuel' | 'pickup' | 'dropoff';
  type?: 'drive' | 'rest' | 'sleep' | 'fuel' | 'pickup' | 'dropoff';
  start_location: Location;
  end_location: Location;
}

export const useApi = () => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTripId, setCurrentTripId] = useState<number | null>(null);
  const [dailyLogsId, setDailyLogsId] = useState<number | null>(null);

  // RTK Query hooks
  const [geocode] = useGeocodeMutation();
  const [planTrip] = usePlanTripMutation();
  const [generateEldLogs] = useGenerateEldLogsMutation();
  const { data: trips } = useGetTripsQuery();
  const { data: tripData, isLoading: isTripLoading, error: tripError } = useGetTripQuery(
    currentTripId as number, 
    { skip: currentTripId === null }
  );
  const { data: dailyLogsData, isLoading: isDailyLogsLoading, error: dailyLogsError } = useGetDailyLogsQuery(
    dailyLogsId as number,
    { skip: dailyLogsId === null }
  );

  // Convert backend log entry to frontend format
  const convertLogEntry = (entry: BackendLogEntry): LogEntry => ({
    status: entry.status,
    start_time: entry.start_time,
    end_time: entry.end_time,
    location: entry.location,
    remarks: entry.remarks
  });

  // Convert backend daily log to frontend format
  const convertDailyLog = (log: BackendDailyLog): DailyLog => ({
    date: log.date,
    driver: log.driver_name,
    carrier: log.carrier_name,
    entries: log.entries.map(convertLogEntry),
    startOdometer: log.start_odometer,
    endOdometer: log.end_odometer,
    truckNumber: log.truck_number || '',
    trailerNumber: log.trailer_number,
    totalMiles: log.total_miles
  });

  // Convert frontend trip to backend format
  const convertToBackendTrip = (trip: TripRoute): BackendTripRoute => ({
    ...trip,
    total_distance: trip.totalDistance,
    total_duration: trip.totalDuration,
    segments: trip.segments.map((segment: RouteSegment): BackendSegment => ({
      ...segment,
      segment_type: segment.type,
      start_location: segment.startLocation,
      end_location: segment.endLocation
    }))
  });

  // Convert backend trip to frontend format
  const convertToFrontendTrip = (trip: BackendTripRoute): TripRoute => ({
    ...trip,
    totalDistance: trip.total_distance,
    totalDuration: trip.total_duration,
    segments: trip.segments.map(segment => ({
      ...segment,
      type: segment.segment_type,
      startLocation: segment.start_location,
      endLocation: segment.end_location
    }))
  });

  // Effect to update the current trip in Redux when trip data is loaded
  useEffect(() => {
    if (tripData && !isTripLoading && !tripError) {
      dispatch(setCurrentTrip(convertToBackendTrip(tripData)));
    }
  }, [tripData, isTripLoading, tripError, dispatch]);

  // Effect to update daily logs in Redux when data is loaded
  useEffect(() => {
    if (dailyLogsData && !isDailyLogsLoading && !dailyLogsError) {
      const convertedLogs = (dailyLogsData as BackendDailyLog[]).map(convertDailyLog);
      dispatch(setDailyLogs(convertedLogs));
      setLoading(false);
    } else if (isDailyLogsLoading) {
      setLoading(true);
    } else if (dailyLogsError) {
      setError('Failed to fetch daily logs');
      setLoading(false);
    }
  }, [dailyLogsData, isDailyLogsLoading, dailyLogsError, dispatch]);

  // Geocode an address and store the result in Redux
  const geocodeAddress = async (address: string, locationType: 'current' | 'pickup' | 'dropoff'): Promise<Location> => {
    setLoading(true);
    setError(null);
    try {
      const location = await geocode({ address }).unwrap();
      
      // Store the location in Redux based on the type
      switch (locationType) {
        case 'current':
          dispatch(setCurrentLocation(location));
          break;
        case 'pickup':
          dispatch(setPickupLocation(location));
          break;
        case 'dropoff':
          dispatch(setDropoffLocation(location));
          break;
      }
      
      setLoading(false);
      return location;
    } catch (err) {
      setError('Failed to geocode address');
      setLoading(false);
      throw err;
    }
  };

  // Plan a trip and store the result in Redux
  const planTripWithDetails = async (tripDetails: TripDetails): Promise<BackendTripRoute> => {
    setLoading(true);
    setError(null);
    try {
      const requestData = {
        current_location: tripDetails.currentLocation.address,
        pickup_location: tripDetails.pickupLocation.address,
        dropoff_location: tripDetails.dropoffLocation.address,
        current_cycle_hours: tripDetails.currentCycleHours,
      };
      
      const response = await planTrip(requestData).unwrap();
      const backendTrip = convertToBackendTrip(response);
      dispatch(setCurrentTrip(backendTrip));
      
      setLoading(false);
      return backendTrip;
    } catch (err) {
      setError('Failed to plan trip');
      setLoading(false);
      throw err;
    }
  };

  // Generate ELD logs for a trip and store the result in Redux
  const generateLogsForTrip = async (tripId: number): Promise<BackendEldLogs> => {
    setLoading(true);
    setError(null);
    try {
      const response = await generateEldLogs({ trip_id: tripId }).unwrap();
      const backendLogs: BackendEldLogs = {
        logs: response.logs.map(log => ({
          date: log.date,
          driver_name: log.driver,
          carrier_name: log.carrier,
          truck_number: log.truckNumber,
          trailer_number: log.trailerNumber,
          start_odometer: log.startOdometer,
          end_odometer: log.endOdometer,
          total_miles: log.totalMiles,
          entries: log.entries.map(entry => ({
            status: entry.status,
            start_time: entry.start_time,
            end_time: entry.end_time,
            location: entry.location,
            remarks: entry.remarks
          }))
        }))
      };

      // Convert backend logs to frontend format before dispatching
      const frontendLogs = backendLogs.logs.map(log => ({
        date: log.date,
        driver: log.driver_name,
        carrier: log.carrier_name,
        truckNumber: log.truck_number,
        trailerNumber: log.trailer_number,
        startOdometer: log.start_odometer,
        endOdometer: log.end_odometer,
        totalMiles: log.total_miles,
        entries: log.entries.map(entry => ({
          status: entry.status,
          start_time: entry.start_time,
          end_time: entry.end_time,
          location: entry.location,
          remarks: entry.remarks
        }))
      }));

      dispatch(setDailyLogs(frontendLogs));
      
      setLoading(false);
      return backendLogs;
    } catch (err) {
      setError('Failed to generate ELD logs');
      setLoading(false);
      throw err;
    }
  };

  // Get daily logs for a trip
  const getDailyLogsForTrip = (tripId: number): void => {
    console.log('getDailyLogsForTrip called with tripId:', tripId);
    setLoading(true);
    setError(null);
    try {
      console.log('Setting dailyLogsId to fetch logs:', tripId);
      setDailyLogsId(tripId);
    } catch (err) {
      const errorMsg = `Failed to fetch daily logs: ${err}`;
      console.error(errorMsg);
      setError(errorMsg);
      setLoading(false);
    }
  };

  // Get all trips and store the result in Redux
  const getAllTrips = (): ApiResponse<BackendTripRoute[] | undefined> => {
    if (trips) {
      const backendTrips = trips.map(convertToBackendTrip);
      dispatch(setTrips(backendTrips));
      return { data: backendTrips };
    }
    return { data: undefined, error: error || undefined };
  };

  // Get a single trip by ID
  const getTripById = (id: number) => {
    console.log(`Setting current trip ID: ${id}`);
    // Instead of making a direct fetch call, set the currentTripId
    // which will trigger the useGetTripQuery hook
    setCurrentTripId(id);
    return tripData;
  };

  return {
    loading: loading || isTripLoading || isDailyLogsLoading,
    error: error || (tripError ? 'Failed to fetch trip' : null) || (dailyLogsError ? 'Failed to fetch daily logs' : null),
    dailyLogs: dailyLogsData ? (dailyLogsData as BackendDailyLog[]).map(convertDailyLog) : undefined,
    geocodeAddress,
    planTripWithDetails,
    generateLogsForTrip,
    getDailyLogsForTrip,
    getAllTrips,
    getTripById,
  };
}; 