import { apiSlice } from './apiSlice';
import { Location } from '../../types';
import { geocodeAddress, reverseGeocode } from '../../services/mapService';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';

// Define the geocode request type
interface GeocodeRequest {
  address: string;
}

// Define the reverse geocode request type
interface ReverseGeocodeRequest {
  latitude: number;
  longitude: number;
}

// Transform backend location to frontend format
const transformLocation = (location: { address: string; latitude: number; longitude: number }): Location => ({
  address: location.address,
  lat: location.latitude || 0,
  lng: location.longitude || 0,
  // Also include the original properties for backward compatibility
  latitude: location.latitude || 0,
  longitude: location.longitude || 0
});

// Create a custom error
const createError = (message: string): FetchBaseQueryError => ({
  status: 'CUSTOM_ERROR',
  data: undefined,
  error: message
});

// Extend the API slice with location endpoints
export const locationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    geocode: builder.mutation<Location, GeocodeRequest>({
      queryFn: async (request) => {
        try {
          const result = await geocodeAddress(request.address);
          // Make sure result has all required properties
          const location = {
            address: result.address,
            latitude: result.latitude || 0,
            longitude: result.longitude || 0
          };
          return { 
            data: transformLocation(location)
          };
        } catch (error) {
          return {
            error: createError('Failed to geocode address')
          };
        }
      },
      invalidatesTags: ['Location'],
    }),

    reverseGeocode: builder.mutation<Location, ReverseGeocodeRequest>({
      queryFn: async (request) => {
        try {
          const result = await reverseGeocode(request.latitude, request.longitude);
          // Make sure result has all required properties
          const location = {
            address: result.address,
            latitude: result.latitude || 0,
            longitude: result.longitude || 0
          };
          return { 
            data: transformLocation(location)
          };
        } catch (error) {
          return {
            error: createError('Failed to reverse geocode coordinates')
          };
        }
      },
      invalidatesTags: ['Location'],
    }),
  }),
});

// Export the auto-generated hooks
export const { useGeocodeMutation } = locationApi; 