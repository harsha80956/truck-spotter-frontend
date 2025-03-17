import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Location } from '../../types';

interface LocationState {
  currentLocation: Location | null;
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  loading: boolean;
  error: string | null;
}

const initialState: LocationState = {
  currentLocation: null,
  pickupLocation: null,
  dropoffLocation: null,
  loading: false,
  error: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setCurrentLocation: (state, action: PayloadAction<Location>) => {
      state.currentLocation = action.payload;
    },
    setPickupLocation: (state, action: PayloadAction<Location>) => {
      state.pickupLocation = action.payload;
    },
    setDropoffLocation: (state, action: PayloadAction<Location>) => {
      state.dropoffLocation = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearLocations: (state) => {
      state.currentLocation = null;
      state.pickupLocation = null;
      state.dropoffLocation = null;
      state.error = null;
    },
  },
});

export const {
  setCurrentLocation,
  setPickupLocation,
  setDropoffLocation,
  setLoading,
  setError,
  clearLocations,
} = locationSlice.actions;

export default locationSlice.reducer; 