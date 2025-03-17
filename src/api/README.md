# API Integration

This directory contains the API integration layer for the TruckSpotter application. It provides a bridge between the frontend components and the backend API.

## Architecture

The API integration is built using Redux Toolkit and RTK Query. This provides several benefits:

1. **Automatic Caching**: RTK Query automatically caches API responses, reducing unnecessary network requests.
2. **Loading and Error States**: RTK Query provides loading and error states for each API call.
3. **Optimistic Updates**: RTK Query supports optimistic updates for a better user experience.
4. **Type Safety**: TypeScript integration ensures type safety throughout the application.

## API Structure

The API is organized into the following files:

- `tripService.ts`: A service that provides a wrapper around the Redux API hooks for backward compatibility.
- `../store/api/apiSlice.ts`: The base API slice that configures RTK Query.
- `../store/api/locationApi.ts`: API endpoints for location-related operations.
- `../store/api/tripApi.ts`: API endpoints for trip-related operations.

## Endpoints

### Location API

- `geocode`: Converts an address to coordinates.

### Trip API

- `getTrips`: Gets all trips.
- `getTrip`: Gets a single trip by ID.
- `planTrip`: Plans a trip with HOS compliance.
- `generateEldLogs`: Generates ELD logs for a trip.
- `getDailyLogs`: Gets daily logs for a trip.

## Usage

### Using the API Hooks

```typescript
import { useApi } from '../hooks/useApi';

const MyComponent = () => {
  const { 
    loading, 
    error, 
    geocodeAddress, 
    planTripWithDetails, 
    generateLogsForTrip 
  } = useApi();

  const handleGeocodeAddress = async () => {
    try {
      const location = await geocodeAddress('123 Main St', 'current');
      console.log('Geocoded location:', location);
    } catch (err) {
      console.error('Error geocoding address:', err);
    }
  };

  // ... other handlers
};
```

### Using the Trip Service (Legacy)

```typescript
import { tripService } from '../api/tripService';

const planTrip = async () => {
  try {
    const tripDetails = {
      currentLocation: { lat: 40.7128, lng: -74.0060, address: 'New York, NY' },
      pickupLocation: { lat: 41.8781, lng: -87.6298, address: 'Chicago, IL' },
      dropoffLocation: { lat: 34.0522, lng: -118.2437, address: 'Los Angeles, CA' },
      currentCycleHours: 0
    };
    
    const trip = await tripService.planTrip(tripDetails);
    console.log('Trip planned:', trip);
  } catch (error) {
    console.error('Error planning trip:', error);
  }
};
```

## Error Handling

All API calls include error handling to ensure a smooth user experience. Errors are caught and displayed to the user when appropriate.

## Environment Variables

The API integration uses the following environment variables:

- `VITE_API_URL`: The base URL for the API. Defaults to `http://localhost:8000/api`.

## Future Improvements

- Add authentication to API requests.
- Implement request throttling and debouncing.
- Add offline support with local storage caching.
 