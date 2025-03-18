import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGetTripsQuery } from '../store/api/tripApi';
import EnhancedEldLogViewer from '../components/EnhancedEldLogViewer';
import { LoadingSpinner, ErrorMessage } from '../components/ui';
import trips from '../../trips.json';
import eld from '../../eld.json';

const EldLogsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedTripId, setSelectedTripId] = useState<number | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Number of trips per page
  const [showAllTripsInDropdown, setShowAllTripsInDropdown] = useState(false);
  // const { data: trips, isLoading, error } = useGetTripsQuery();
  // const data = trips;
  const isLoading = false;
  const error = null;

  


  console.log("data", trips)

  // Calculate total pages
  const totalTrips = trips?.length || 0;
  const totalPages = Math.ceil(totalTrips / pageSize);
  
  // Get current page trips
  const indexOfLastTrip = currentPage * pageSize;
  const indexOfFirstTrip = indexOfLastTrip - pageSize;
  const currentTrips = trips ? trips.slice(indexOfFirstTrip, indexOfLastTrip) : [];

  // Parse trip ID and page from URL query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tripId = searchParams.get('trip');
    const page = searchParams.get('page');
    
    if (tripId) {
      setSelectedTripId(Number(tripId));
      
      // If we have trips data and the selected trip is not on the current page,
      // find which page it should be on and navigate there
      if (trips && trips.length > 0) {
        const tripIndex = trips.findIndex((trip: any) => trip.id === Number(tripId));
        if (tripIndex !== -1) {
          const tripPage = Math.ceil((tripIndex + 1) / pageSize);
          if (tripPage !== currentPage) {
            setCurrentPage(tripPage);
            // Don't update URL here to avoid infinite loop
          }
        }
      }
    }
    
    if (page) {
      const pageNum = parseInt(page, 10);
      if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
        setCurrentPage(pageNum);
      }
    }
  }, [location.search, trips, pageSize, totalPages]);

  // Update URL when page changes
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    setCurrentPage(newPage);
    
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('page', newPage.toString());
    
    // Keep the trip parameter if it exists
    if (selectedTripId !== undefined) {
      searchParams.set('trip', selectedTripId.toString());
    }
    
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  // Helper function to safely get location address
  const getLocationAddress = (segment: any, isStart: boolean) => {
    if (!segment) return 'Unknown';
    
    const location = isStart ? segment.startLocation || segment.start_location : segment.endLocation || segment.end_location;
    return location?.address || 'Unknown location';
  };

  // Helper function to format trip description
  const formatTripDescription = (trip: any) => {
    try {
      // Format the date
      const startDate = trip.start_time ? new Date(trip.start_time).toLocaleDateString() : 'Unknown date';
      
      // For optimized trip responses (from list view), use the address fields directly
      if (!trip.segments || !Array.isArray(trip.segments) || trip.segments.length === 0) {
        // Check if we have direct location objects
        if (trip.pickup_location?.address || trip.dropoff_location?.address) {
          const startLocation = trip.pickup_location?.address || trip.current_location?.address || 'Unknown';
          const endLocation = trip.dropoff_location?.address || 'Unknown';
          return `${startDate} - ${startLocation} to ${endLocation}`;
        }
        
        // Check if we have the optimized format with address fields
        if ('current_location_address' in trip || 'pickup_location_address' in trip || 'dropoff_location_address' in trip) {
          const startLocation = trip.pickup_location_address || trip.current_location_address || 'Unknown';
          const endLocation = trip.dropoff_location_address || 'Unknown';
          return `${startDate} - ${startLocation} to ${endLocation}`;
        }
        
        // If we don't have segments or address fields, return a default message
        return `Trip #${trip.id || 'Unknown'} - ${startDate}`;
      }
      
      // For detailed trip responses with segments
      const firstSegment = trip.segments[0];
      const lastSegment = trip.segments[trip.segments.length - 1];
      
      const startLocation = getLocationAddress(firstSegment, true);
      const endLocation = getLocationAddress(lastSegment, false);
      
      return `${startDate} - ${startLocation} to ${endLocation}`;
    } catch (err) {
      console.error('Error formatting trip description:', err);
      return `Trip #${trip.id || 'Unknown'} - Details unavailable`;
    }
  };

  // Render pagination controls
  const renderPagination = () => {
    if (!trips || trips.length <= pageSize) return null;
    
    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-4 sm:px-8 mt-6 rounded-lg shadow-sm">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              currentPage === 1 
                ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
                : 'border-blue-300 text-blue-700 hover:bg-blue-50'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              currentPage === totalPages 
                ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
                : 'border-blue-300 text-blue-700 hover:bg-blue-50'
            }`}
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium text-gray-900">{indexOfFirstTrip + 1}</span> to{' '}
              <span className="font-medium text-gray-900">{Math.min(indexOfLastTrip, totalTrips)}</span> of{' '}
              <span className="font-medium text-gray-900">{totalTrips}</span> trips
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center rounded-l-md px-3 py-2 ${
                  currentPage === 1 
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                    : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-blue-600 focus:z-20 focus:outline-offset-0 transition-colors duration-200'
                }`}
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages around current page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                      currentPage === pageNum
                        ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:text-blue-600 focus:z-20 focus:outline-offset-0'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center rounded-r-md px-3 py-2 ${
                  currentPage === totalPages 
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                    : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-blue-600 focus:z-20 focus:outline-offset-0 transition-colors duration-200'
                }`}
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  // Handle trip selection change
  const handleTripSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    // Handle the "show all" option
    if (value === "show-all") {
      setShowAllTripsInDropdown(!showAllTripsInDropdown);
      return;
    }
    
    const tripId = value ? Number(value) : undefined;
    setSelectedTripId(tripId);
    
    // Update URL
    const searchParams = new URLSearchParams(location.search);
    if (tripId !== undefined) {
      searchParams.set('trip', tripId.toString());
      
      // If we have trips data, find which page the selected trip is on
      if (trips && trips.length > 0) {
        const tripIndex = trips.findIndex((trip: any) => trip.id === tripId);
        if (tripIndex !== -1) {
          const tripPage = Math.ceil((tripIndex + 1) / pageSize);
          
          // Update page in URL and state if needed
          if (tripPage !== currentPage) {
            setCurrentPage(tripPage);
            searchParams.set('page', tripPage.toString());
          }
        }
      }
    } else {
      searchParams.delete('trip');
    }
    
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  // Render trip options for dropdown
  const renderTripOptions = () => {
    if (!trips || trips.length === 0) {
      return <option value="" disabled>No trips available</option>;
    }
    
    // Determine which trips to show in the dropdown
    const tripsToShow = showAllTripsInDropdown ? trips : currentTrips;
    
    return (
      <>
        <option value="">-- Select a Trip --</option>
        <option value="show-all" className="text-blue-600 font-medium">
          {showAllTripsInDropdown ? "Show Current Page Only" : "Show All Trips"}
        </option>
        {tripsToShow.map((trip: any, index: number) => {
          const pageNum = showAllTripsInDropdown 
            ? Math.ceil((trips.findIndex((t: any) => t.id === trip.id) + 1) / pageSize)
            : currentPage;
          
          return (
            <option key={trip.id} value={trip.id}>
              {showAllTripsInDropdown ? `[Page ${pageNum}] ` : ''}
              {formatTripDescription(trip)}
            </option>
          );
        })}
      </>
    );
  };

  // Render empty state when no trips are available
  const renderEmptyState = () => {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No trips available</h3>
        <p className="mt-1 text-sm text-gray-500">Create a trip first to view ELD logs.</p>
        <div className="mt-6">
          <a
            href="/trip-planner"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Trip
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}

      {/* Main Content */}
      <section className="py-6 mb-10">
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="p-6 sm:p-8">
            {/* Error State */}
            {error && (
              <ErrorMessage 
                message="Error loading trips" 
                details={typeof error === 'string' ? error : 'Failed to load trip data. Please try again.'}
                variant="error"
              />
            )}
            
            {/* Trip Selection */}
            {!error && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-semibold text-gray-800">
                    Select Trip:
                  </label>
                  <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                </div>
                <div className="relative">
                  <select
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 appearance-none bg-white text-gray-700"
                    value={selectedTripId !== undefined ? selectedTripId : ''}
                    onChange={handleTripSelectionChange}
                  >
                    {renderTripOptions()}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                
                {selectedTripId && (
                  <div className="mt-3 text-right">
                    <a 
                      href={`/trips/${selectedTripId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200"
                    >
                      View Trip Details
                      <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            )}
            
            {/* Pagination Controls */}
            {renderPagination()}
            
            {/* Loading State */}
            {isLoading ? (
              <div className="py-10">
                <LoadingSpinner text="Loading trips..." />
              </div>
            ) : !trips || trips.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="mt-6 border-t border-gray-100 pt-6">
                {selectedTripId ? (
                  <div className="bg-white rounded-lg overflow-hidden">
                    <div className="bg-blue-50 p-3 mb-4 rounded-lg border border-blue-100">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-0.5">
                          <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">Multi-Day Trip Support</h3>
                          <div className="mt-1 text-sm text-blue-700">
                            <p>
                              This ELD log viewer now supports multi-day trips. If your trip spans multiple days or crosses midnight, 
                              you can select different dates from the dropdown in the viewer. Activities that cross midnight are highlighted.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <EnhancedEldLogViewer tripId={selectedTripId} />
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No trip selected</h3>
                    <p className="mt-1 text-sm text-gray-500">Select a trip from the dropdown to view ELD logs.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default EldLogsPage; 