import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TripRoute } from '../../types';

// Define a backend trip type that uses snake_case and string dates
export interface BackendTripRoute {
  id?: number;
  segments: Array<{
    segment_type: 'drive' | 'rest' | 'sleep' | 'fuel' | 'pickup' | 'dropoff';
    type?: 'drive' | 'rest' | 'sleep' | 'fuel' | 'pickup' | 'dropoff';
    distance: number;
    duration: number;
    start_time: string;
    end_time: string;
    start_location: {
      address: string;
      lat: number;
      lng: number;
    };
    end_location: {
      address: string;
      lat: number;
      lng: number;
    };
  }>;
  total_distance: number;
  total_duration: number;
  start_time: string;
  end_time: string;
  created_at?: string;
  // Optimized trip properties
  current_location_address?: string;
  pickup_location_address?: string;
  dropoff_location_address?: string;
  segment_count?: number;
  // Location objects
  current_location?: {
    address: string;
    lat: number;
    lng: number;
  };
  pickup_location?: {
    address: string;
    lat: number;
    lng: number;
  };
  dropoff_location?: {
    address: string;
    lat: number;
    lng: number;
  };
}

interface TripState {
  currentTrip: BackendTripRoute | null;
  trips: BackendTripRoute[];
  loading: boolean;
  error: string | null;
}

const initialState: TripState = {
  currentTrip: null,
  trips: [],
  loading: false,
  error: null,
};

const tripSlice = createSlice({
  name: 'trip',
  initialState,
  reducers: {
    setCurrentTrip: (state, action: PayloadAction<BackendTripRoute>) => {
      state.currentTrip = action.payload;
    },
    setTrips: (state, action: PayloadAction<BackendTripRoute[]>) => {
      state.trips = action.payload;
    },
    addTrip: (state, action: PayloadAction<BackendTripRoute>) => {
      state.trips.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearTrip: (state) => {
      state.currentTrip = null;
      state.error = null;
    },
  },
});

export const {
  setCurrentTrip,
  setTrips,
  addTrip,
  setLoading,
  setError,
  clearTrip,
} = tripSlice.actions;

export default tripSlice.reducer; 