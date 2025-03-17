import React from 'react';
import { Link } from 'react-router-dom';
import { useGetTripsQuery } from '../store/api/tripApi';
import { TripRoute } from '../types';
import { LoadingSpinner, EmptyState, ErrorMessage } from './ui';
import { formatDate, formatNumber, safelyAccessProperty } from '../utils/errorHandling';

const TripHistory: React.FC = () => {
  const { data: trips, isLoading, error, refetch } = useGetTripsQuery();

  // Helper function to safely access nested properties
  const getAddressFromSegment = (trip: TripRoute, isStart: boolean) => {
    try {
      if (!trip.segments || trip.segments.length === 0) {
        return 'Unknown location';
      }
      
      if (isStart) {
        return safelyAccessProperty(trip.segments[0], 'startLocation.address', 'Unknown location');
      } else {
        const lastSegment = trip.segments[trip.segments.length - 1];
        return safelyAccessProperty(lastSegment, 'endLocation.address', 'Unknown location');
      }
    } catch (e) {
      return 'Unknown location';
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading trips..." />;
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage 
          message="Error loading trips" 
          details="There was a problem fetching your trip history. Please try again later."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!trips || trips.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="No trips found"
          description="Start planning your first trip to see it here."
          actionText="Plan a Trip"
          actionLink="/trip-planner"
          icon={
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid gap-4">
        {trips.map((trip: TripRoute, index: number) => (
          <div key={index} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow duration-200">
            <h3 className="font-medium text-lg text-gray-900">Trip #{index + 1}</h3>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <p>
                <span className="font-medium">From:</span> {getAddressFromSegment(trip, true)}
              </p>
              <p>
                <span className="font-medium">To:</span> {getAddressFromSegment(trip, false)}
              </p>
              <p>
                <span className="font-medium">Distance:</span> {formatNumber(trip.totalDistance)} miles
              </p>
              <p>
                <span className="font-medium">Duration:</span> {typeof trip.totalDuration === 'number' ? `${(trip.totalDuration / 60).toFixed(2)} hours` : 'N/A'}
              </p>
              <p>
                <span className="font-medium">Start Time:</span> {formatDate(trip.start_time)}
              </p>
              <p>
                <span className="font-medium">End Time:</span> {formatDate(trip.end_time)}
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <Link
                to={`/eld-logs?trip=${index}`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View ELD Logs
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripHistory; 