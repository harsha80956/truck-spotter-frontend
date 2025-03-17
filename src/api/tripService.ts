import { TripDetails, TripRoute, EldLogs } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

// This service now uses direct API calls instead of hooks
export const tripService = {
  // Plan a trip with the given details
  planTrip: async (tripDetails: TripDetails): Promise<TripRoute> => {
    try {
      const response = await fetch(`${API_URL}/trips/plan/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_location: tripDetails.currentLocation.address,
          pickup_location: tripDetails.pickupLocation.address,
          dropoff_location: tripDetails.dropoffLocation.address,
          current_cycle_hours: tripDetails.currentCycleHours
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to plan trip');
      }

      return await response.json();
    } catch (error) {
      console.error('Error planning trip:', error);
      throw error;
    }
  },
  
  // Generate ELD logs for a trip
  generateEldLogs: async (tripId: number): Promise<EldLogs> => {
    try {
      const response = await fetch(`${API_URL}/trips/generate_eld_logs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trip_id: tripId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate ELD logs');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating ELD logs:', error);
      throw error;
    }
  },
  
  // Geocode an address
  geocode: async (address: string) => {
    try {
      const response = await fetch(`${API_URL}/locations/geocode/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error('Failed to geocode address');
      }

      return await response.json();
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  },
  
  // Get daily logs for a trip
  getDailyLogs: async (tripId: number) => {
    try {
      const response = await fetch(`${API_URL}/daily-logs/?trip_id=${tripId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get daily logs');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting daily logs:', error);
      throw error;
    }
  }
}; 