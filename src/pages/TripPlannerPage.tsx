import React from 'react';
import TripPlanner from '../components/TripPlanner';

const TripPlannerPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900">Trip Planner</h1>
              <p className="mt-1 text-sm text-gray-500">
                Plan your truck route with optimized breaks and generate ELD logs
              </p>
            </div>
          </div>
        </div>
      </header>
      
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-gray-900">How it works</h2>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="relative bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          1
                        </div>
                        <h3 className="text-sm font-medium text-gray-900">Enter Locations</h3>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Enter your current location, pickup, and dropoff addresses
                      </p>
                    </div>
                    
                    <div className="relative bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          2
                        </div>
                        <h3 className="text-sm font-medium text-gray-900">Plan Your Trip</h3>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Get an optimized route with required breaks and rest periods
                      </p>
                    </div>
                    
                    <div className="relative bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          3
                        </div>
                        <h3 className="text-sm font-medium text-gray-900">Generate ELD Logs</h3>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Create compliant electronic logging device (ELD) records
                      </p>
                    </div>
                  </div>
                </div>
                
                <TripPlanner />
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 overflow-hidden sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} TruckSpotter. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TripPlannerPage; 