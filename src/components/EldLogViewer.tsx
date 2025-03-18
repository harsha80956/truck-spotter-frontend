import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '../store/hooks';
import { useApi } from '../hooks/useApi';
import { DailyLog, DutyStatus, LogEntry, RouteSegment } from '../types';
import { printEldLogs } from '../utils/printUtils';
import { LoadingSpinner, EmptyState, ErrorMessage } from './ui';
import { formatDate, formatNumber, calculateDuration } from '../utils/errorHandling';
import MapView from './MapView';
import { RootState } from '../store';

// Add custom CSS for the ELD graph
import './EldLogViewer.css';

interface EldLogViewerProps {
  tripId?: number;
}

// Add this interface for HOS calculation periods
interface CalculationPeriod {
  id: number;
  startTime: Date;
  endTime: Date;
  excludedBreakId: number | null;
  drivingHours: number;
  onDutyHours: number;
  isCompliant: boolean;
}

const EldLogViewer: React.FC<EldLogViewerProps> = ({ tripId }) => {
  const { dailyLogs: reduxDailyLogs } = useAppSelector((state: RootState) => ({
    dailyLogs: state.eldLog.dailyLogs.map(log => ({
      ...log,
      driver_name: log.driver,
      carrier_name: log.carrier,
      entries: log.entries || []
    }))
  }));
  const [selectedLogIndex, setSelectedLogIndex] = useState(0);
  const [printError, setPrintError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'graph' | 'map'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(5);
  const logContentRef = useRef<HTMLDivElement>(null);
  
  const { 
    loading, 
    error, 
    getDailyLogsForTrip,
    dailyLogs,
    generateLogsForTrip
  } = useApi();

  // Use dailyLogs from the API hook if available, otherwise fall back to Redux
  const logs = dailyLogs || reduxDailyLogs || [];

  // Calculate pagination values
  const totalLogs = logs.length;
  const totalPages = Math.ceil(totalLogs / logsPerPage);
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);

  // Calculate day numbers for all logs based on chronological order
  const getDayNumber = (date: string) => {
    if (!logs || logs.length === 0) return 1;
    
    // Sort dates to determine chronological order
    const sortedDates = [...logs].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    // Find the index of the current date in the sorted array
    const index = sortedDates.findIndex(log => new Date(log.date).getTime() === new Date(date).getTime());
    
    // Day number is 1-indexed
    return index + 1;
  };

  // Format date as "Day X, Month Day"
  const formatEldDate = (date: string) => {
    if (!date) return 'Unknown Date';
    
    const dayNumber = getDayNumber(date);
    const formattedDate = formatDate(date, 'eld');
    
    return `Day ${dayNumber}, ${formattedDate}`;
  };

  useEffect(() => {
    if (tripId !== undefined && tripId !== null) {
      try {
        getDailyLogsForTrip(tripId);
      } catch (error) {
        console.error('Failed to get daily logs:', error);
      }
    }
  }, [tripId]);

  // Reset selected log index when logs change
  useEffect(() => {
    if (logs && logs.length > 0) {
      setSelectedLogIndex(0);
      setCurrentPage(1);
    }
  }, [logs]);

  const selectedLog = logs && logs.length > selectedLogIndex ? logs[selectedLogIndex] : null;

  const getStatusColor = (status: DutyStatus) => {
    switch (status) {
      case 'OFF':
        return 'bg-gray-100';
      case 'SB':
        return 'bg-blue-100';
      case 'D':
        return 'bg-green-100';
      case 'ON':
        return 'bg-amber-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getStatusBorderColor = (status: DutyStatus) => {
    switch (status) {
      case 'OFF':
        return 'border-gray-300';
      case 'SB':
        return 'border-blue-300';
      case 'D':
        return 'border-green-300';
      case 'ON':
        return 'border-amber-300';
      default:
        return 'border-gray-300';
    }
  };

  const getStatusLabel = (status: DutyStatus): string => {
    switch (status) {
      case 'OFF':
        return '1: OFF DUTY';
      case 'SB':
        return '2: SLEEPER BERTH';
      case 'D':
        return '3: DRIVING';
      case 'ON':
        return '4: ON DUTY (NOT DRIVING)';
      default:
        return 'Unknown';
    }
  };

  const handlePrint = () => {
    if (selectedLog) {
      try {
        const title = `ELD Log - ${selectedLog.driver || 'Unknown Driver'} - ${selectedLog.date ? formatEldDate(selectedLog.date) : 'Unknown Date'}`;
        if (logContentRef.current) {
          logContentRef.current.classList.add('print-section');
          printEldLogs(title);
          setTimeout(() => {
            if (logContentRef.current) {
              logContentRef.current.classList.remove('print-section');
            }
          }, 1000);
        }
        setPrintError(null);
      } catch (err) {
        console.error('Print error:', err);
        setPrintError('Failed to print. Please try again.');
      }
    } else {
      setPrintError('No log selected to print.');
    }
  };

  const handleRetry = () => {
    if (tripId !== undefined && tripId !== null) {
      getDailyLogsForTrip(tripId);
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  // Calculate total hours by status
  const calculateHoursByStatus = () => {
    if (!selectedLog || !selectedLog.entries) {
      return {
        'OFF': 0,
        'SB': 0,
        'D': 0,
        'ON': 0
      };
    }
    
    const hoursByStatus: Record<DutyStatus, number> = {
      'OFF': 0,
      'SB': 0,
      'D': 0,
      'ON': 0
    };
    
    selectedLog.entries.forEach((entry: LogEntry) => {
      const startTime = new Date(entry.start_time).getTime();
      const endTime = new Date(entry.end_time).getTime();
      const durationHours = (endTime - startTime) / (1000 * 60 * 60);
      
      if (entry.status in hoursByStatus) {
        hoursByStatus[entry.status] += durationHours;
      }
    });
    
    return hoursByStatus;
  };

  // Add this function to transform log entries to route segments for the map
  const transformLogEntriesToSegments = (): RouteSegment[] => {
    if (!selectedLog || !selectedLog.entries || selectedLog.entries.length === 0) {
      return [];
    }
    
    // Sort entries by start time
    const sortedEntries = [...selectedLog.entries].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    
    // Filter out entries without location data
    const entriesWithLocation = sortedEntries.filter(entry => entry.location);
    
    if (entriesWithLocation.length === 0) {
      return [];
    }
    
    // Create segments from consecutive entries
    const segments: RouteSegment[] = [];
    
    for (let i = 0; i < entriesWithLocation.length - 1; i++) {
      const currentEntry = entriesWithLocation[i];
      const nextEntry = entriesWithLocation[i + 1];
      
      // Skip if entries have the same location
      if (currentEntry.location === nextEntry.location) {
        continue;
      }
      
      // Calculate duration between entries
      const startTime = new Date(currentEntry.start_time);
      const endTime = new Date(nextEntry.start_time);
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      
      // Use actual location data if available
      const startLocation = currentEntry.location;
      const endLocation = nextEntry.location;
      
      // Create a segment
      const segment: RouteSegment = {
        type: currentEntry.status === 'D' ? 'drive' : 
              currentEntry.status === 'SB' ? 'sleep' :
              currentEntry.status === 'OFF' ? 'rest' : 'pickup',
        distance: Math.random() * 45 + 5, // Placeholder for actual distance calculation
        duration: durationMinutes,
        start_time: currentEntry.start_time,
        end_time: nextEntry.start_time,
        startLocation: {
          address: startLocation,
          lat: Math.random() * 10 + 35, // Placeholder for actual latitude
          lng: Math.random() * 20 - 100 // Placeholder for actual longitude
        },
        endLocation: {
          address: endLocation,
          lat: Math.random() * 10 + 35, // Placeholder for actual latitude
          lng: Math.random() * 20 - 100 // Placeholder for actual longitude
        }
      };
      
      segments.push(segment);
    }
    
    return segments;
  };

  // Render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
              currentPage === 1 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
              currentPage === totalPages ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{indexOfFirstLog + 1}</span> to{' '}
              <span className="font-medium">{Math.min(indexOfLastLog, totalLogs)}</span> of{' '}
              <span className="font-medium">{totalLogs}</span> logs
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${
                  currentPage === 1 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-500 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
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
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                      currentPage === pageNum
                        ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${
                  currentPage === totalPages 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-500 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
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

  // Define row heights for status positions - adjust to match the center of each row
  const rowHeights = [18, 42, 66, 90]; // Adjusted pixel positions for each status row (OFF, SB, D, ON)

  // Render the timeline graph
  const renderTimelineGraph = () => {
    if (!selectedLog || !selectedLog.entries || selectedLog.entries.length === 0) {
      return <div className="p-4 text-center text-gray-500">No data available for timeline</div>;
    }
    
    // Get the start and end of the day
    const dayStart = new Date(selectedLog.date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(selectedLog.date);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Sort entries for processing
    const sortedEntries = selectedLog.entries ? [...selectedLog.entries].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    ) : [];
    
    // Create a complete set of entries that includes all duty statuses
    const createCompleteEntries = (entries: LogEntry[]): LogEntry[] => {
      // First, create a map of the entire day with minute-by-minute status
      const totalMinutes = 24 * 60;
      const statusByMinute: DutyStatus[] = Array(totalMinutes).fill('OFF' as DutyStatus);
      
      // Fill in the status for each minute based on the entries
      entries.forEach(entry => {
        const startTime = new Date(entry.start_time);
        const endTime = new Date(entry.end_time);
        
        // Only process if within the day
        if (startTime <= dayEnd && endTime >= dayStart) {
          // Clamp times to day boundaries
          const clampedStart = startTime < dayStart ? dayStart : startTime;
          const clampedEnd = endTime > dayEnd ? dayEnd : endTime;
          
          // Calculate start and end minutes
          const startMinute = (clampedStart.getHours() * 60) + clampedStart.getMinutes();
          const endMinute = (clampedEnd.getHours() * 60) + clampedEnd.getMinutes();
          
          // Fill in the status for each minute in this range
          for (let minute = startMinute; minute <= endMinute && minute < totalMinutes; minute++) {
            statusByMinute[minute] = entry.status;
          }
        }
      });
      
      // Check which statuses are missing
      const statusesInData = new Set<DutyStatus>();
      statusByMinute.forEach(status => statusesInData.add(status));
      
      // Create a copy of the original entries
      const result = [...entries];
      
      // Add entries for missing statuses
      const allStatuses: DutyStatus[] = ['OFF', 'SB', 'D', 'ON'].map(s => s as DutyStatus);
      const missingStatuses = allStatuses.filter(status => !statusesInData.has(status));
      
      // If we have missing statuses, add them at different times of the day
      if (missingStatuses.length > 0) {
        // Create entries for each missing status
        missingStatuses.forEach((status, index) => {
          // Space them out throughout the day
          const hourOffset = 6 + (index * 6); // 6, 12, 18, 24 hours
          const startTime = new Date(dayStart);
          startTime.setHours(hourOffset, 0, 0, 0);
          
          const endTime = new Date(startTime);
          endTime.setMinutes(5); // 5-minute duration
          
          const testEntry: LogEntry = {
            status: status as DutyStatus,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            location: 'Test Location',
            remarks: `Added to ensure ${status} status is represented`
          };
          
          result.push(testEntry);
        });
      }
      
      return result;
    };
    
    // Create complete entries with all statuses represented
    const completeEntries = createCompleteEntries(sortedEntries);
    
    // Calculate hours by status for summary
    const hoursByStatus = calculateHoursByStatus();
    
    // Calculate total driving and on-duty hours
    const totalDrivingHours = hoursByStatus['D'];
    const totalOnDutyHours = hoursByStatus['D'] + hoursByStatus['ON'];
    
    // Find distinct locations for the location summary
    const locations = new Set<string>();
    completeEntries.forEach(entry => {
      if (entry.location) {
        locations.add(entry.location);
      }
    });
    
    // Create status line points
    const statusData = createStatusLinePoints(completeEntries);
    
    // Calculate day number
    const dayNumber = getDayNumber(selectedLog.date);
    
    // Find breaks (sleeper berth periods >= 2 hours)
    const breaks = completeEntries
      .filter(entry => 
        entry.status === 'SB' && 
        (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60 * 60) >= 2
      )
      .map((entry, index) => {
        const startTime = new Date(entry.start_time);
        const endTime = new Date(entry.end_time);
        const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        return {
          id: index + 1,
          startTime,
          endTime,
          durationHours,
          startMinutes: startTime.getHours() * 60 + startTime.getMinutes(),
          endMinutes: endTime.getHours() * 60 + endTime.getMinutes()
        };
      });
    
    // Get status background colors
    const statusBackgroundColors = {
      'OFF': 'bg-blue-50', // Light blue for Off Duty
      'SB': 'bg-blue-300', // Darker blue for Sleeper Berth
      'D': 'bg-amber-200', // Amber/yellow for Driving
      'ON': 'bg-amber-100' // Light amber for On Duty
    };
    
    // Get status hours for display
    const statusHours = {
      'OFF': (hoursByStatus['OFF'] || 0).toFixed(2),
      'SB': (hoursByStatus['SB'] || 0).toFixed(2),
      'D': (hoursByStatus['D'] || 0).toFixed(2),
      'ON': (hoursByStatus['ON'] || 0).toFixed(2)
    };
    
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        {/* Header with improved styling */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">
                Day {dayNumber}
          </h3>
              <p className="text-blue-100 mt-1">
                {formatDate(selectedLog.date, 'eld')}
              </p>
          </div>
            <div className="text-right">
              <div className="text-sm text-blue-100">Driver: <span className="font-semibold text-white">{selectedLog.driver}</span></div>
              <div className="text-sm text-blue-100">Carrier: <span className="font-semibold text-white">{selectedLog.carrier}</span></div>
        </div>
            </div>
            </div>
        
        {/* ELD Graph based on example image */}
        <div className="p-4 bg-blue-50">
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
            {/* Graph Container */}
            <div className="relative">
              {/* Hour markers - top */}
              <div className="flex border-b border-blue-300">
                <div className="w-24 flex-shrink-0 border-r border-blue-300 bg-blue-50 text-center py-1">
                  <span className="text-xs font-medium text-blue-800">Midnight</span>
            </div>
                <div className="flex-grow grid grid-cols-24">
                  {Array.from({ length: 24 }).map((_, i) => {
                    // Format hour labels
                    let hourLabel;
                    if (i === 0) hourLabel = "Midnight";
                    else if (i === 12) hourLabel = "Noon";
                    else hourLabel = i;
                    
                    return (
                      <div key={i} className="border-r border-blue-300 text-center py-1">
                        <span className="text-xs font-medium text-blue-800">{hourLabel}</span>
            </div>
                    );
                  })}
          </div>
                <div className="w-24 flex-shrink-0 border-l border-blue-300 bg-blue-50 text-center py-1">
                  <span className="text-xs font-medium text-blue-800">Hours</span>
          </div>
        </div>
        
              {/* Status rows with colored backgrounds */}
          <div className="flex">
                {/* Status labels */}
                <div className="w-24 flex-shrink-0 border-r border-blue-300">
                  <div className="h-12 border-b border-blue-300 flex items-center px-2 bg-blue-50">
                    <span className="text-xs font-medium text-blue-800">Off Duty</span>
              </div>
                  <div className="h-12 border-b border-blue-300 flex items-center px-2 bg-blue-50">
                    <span className="text-xs font-medium text-blue-800">Sleeper Berth</span>
              </div>
                  <div className="h-12 border-b border-blue-300 flex items-center px-2 bg-blue-50">
                    <span className="text-xs font-medium text-blue-800">Driving</span>
              </div>
                  <div className="h-12 border-b border-blue-300 flex items-center px-2 bg-blue-50">
                    <span className="text-xs font-medium text-blue-800">On Duty</span>
              </div>
            </div>
            
                {/* Graph area */}
            <div className="flex-grow relative">
                  {/* Status row backgrounds */}
                  <div className="absolute inset-0 grid grid-rows-4">
                    <div className={`h-12 border-b border-blue-300 ${statusBackgroundColors['OFF']}`}></div>
                    <div className={`h-12 border-b border-blue-300 ${statusBackgroundColors['SB']}`}></div>
                    <div className={`h-12 border-b border-blue-300 ${statusBackgroundColors['D']}`}></div>
                    <div className={`h-12 border-b border-blue-300 ${statusBackgroundColors['ON']}`}></div>
                  </div>
                  
                  {/* Grid lines */}
                  <div className="absolute inset-0 grid grid-cols-24 pointer-events-none">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="border-r border-blue-200 relative">
                        {/* Quarter-hour tick marks */}
                        <div className="absolute left-1/4 inset-y-0 border-l border-blue-200"></div>
                        <div className="absolute left-1/2 inset-y-0 border-l border-blue-200"></div>
                        <div className="absolute left-3/4 inset-y-0 border-l border-blue-200"></div>
                        
                        {/* Add vertical tick marks in each cell */}
                        <div className="absolute inset-0 flex flex-col">
                          {['OFF', 'SB', 'D', 'ON'].map((status) => (
                            <div key={status} className="flex-1 border-b border-blue-200 relative">
                              {/* 15-minute tick marks */}
                              <div className="absolute inset-0 flex">
                                {Array.from({ length: 4 }).map((_, j) => {
                                  const position = j * 25;
                  return (
                                    <div key={j} className="flex-1 relative">
                                      <div 
                                        className="absolute top-0 w-px h-2 bg-blue-300" 
                                        style={{ left: `${position}%` }}
                                      ></div>
                                      <div 
                                        className="absolute bottom-0 w-px h-2 bg-blue-300" 
                                        style={{ left: `${position}%` }}
                                      ></div>
                    </div>
                  );
                })}
              </div>
                            </div>
                ))}
              </div>
                </div>
                    ))}
            </div>
            
                  {/* Status line */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    {/* Colored horizontal segments */}
                    {statusData.segments.map((segment, index) => (
                      <line
                        key={`segment-${index}`}
                        x1={segment.x1}
                        y1={segment.y1}
                        x2={segment.x2}
                        y2={segment.y2}
                        stroke="black"
                        strokeWidth="5"
                        strokeLinecap="square"
                      />
                    ))}
                    
                    {/* Vertical transitions */}
                    {statusData.transitions.map((transition, index) => (
                      <line
                        key={`transition-${index}`}
                        x1={transition.x}
                        y1={transition.y1}
                        x2={transition.x}
                        y2={transition.y2}
                        stroke="black"
                        strokeWidth="5"
                        strokeLinecap="square"
                      />
                    ))}
                  </svg>
                  
                  {/* Break labels */}
                  {breaks.map((breakItem) => {
                    const startPercent = (breakItem.startMinutes / (24 * 60)) * 100;
                    const endPercent = (breakItem.endMinutes / (24 * 60)) * 100;
                    const width = endPercent - startPercent;
              
              return (
                      <div 
                        key={breakItem.id}
                        className="absolute bg-white border border-gray-300 rounded px-2 py-0.5 text-xs font-medium text-center"
                        style={{ 
                          left: `${startPercent + (width / 2) - 5}%`, 
                          top: '36px',
                          transform: 'translateX(-50%)',
                          zIndex: 10
                        }}
                      >
                        Break {breakItem.id}
                </div>
              );
            })}
                  
                  {/* Sequence markers */}
                  {completeEntries
                    .filter((entry, index, arr) => 
                    // Only show entries where status changes or first entry
                    index === 0 || entry.status !== arr[index-1].status
                  )
                    .slice(0, 3) // Limit to 3 markers to avoid clutter
                    .map((entry, index) => {
                      const entryTime = new Date(entry.start_time);
                      const minutesSinceMidnight = entryTime.getHours() * 60 + entryTime.getMinutes();
                      const positionPercent = (minutesSinceMidnight / (24 * 60)) * 100;
                      
                      // Determine arrow direction based on index
                      const arrowDirection = index % 2 === 0 ? 'left' : 'right';
                    
                    return (
                        <div 
                          key={index}
                          className="absolute bottom-0"
                          style={{ 
                            left: `${positionPercent}%`, 
                            bottom: '-20px'
                          }}
                        >
                          <div className="flex items-center">
                            {arrowDirection === 'left' ? (
                              <>
                                <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                                  {index + 1}
                                </div>
                                <div className="w-4 h-0.5 bg-gray-400"></div>
                                <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-gray-400"></div>
                              </>
                            ) : (
                              <>
                                <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-gray-400"></div>
                                <div className="w-4 h-0.5 bg-gray-400"></div>
                                <div className="w-6 h-6 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs font-bold">
                                  {index + 1}
                                </div>
                              </>
                            )}
                          </div>
                      </div>
                    );
                    })
                  }
              </div>
                
                {/* Hours column */}
                <div className="w-24 flex-shrink-0 border-l border-blue-300">
                  <div className="h-12 border-b border-blue-300 flex items-center justify-center bg-blue-50">
                    <span className="text-xs font-medium text-blue-800">{statusHours['OFF']}</span>
            </div>
                  <div className="h-12 border-b border-blue-300 flex items-center justify-center bg-blue-50">
                    <span className="text-xs font-medium text-blue-800">{statusHours['SB']}</span>
          </div>
                  <div className="h-12 border-b border-blue-300 flex items-center justify-center bg-blue-50">
                    <span className="text-xs font-medium text-blue-800">{statusHours['D']}</span>
        </div>
                  <div className="h-12 border-b border-blue-300 flex items-center justify-center bg-blue-50">
                    <span className="text-xs font-medium text-blue-800">{statusHours['ON']}</span>
      </div>
                </div>
              </div>
              
              {/* Hour markers - bottom */}
              <div className="flex border-t border-blue-300">
                <div className="w-24 flex-shrink-0 border-r border-blue-300 bg-blue-50 text-center py-1">
                  <span className="text-xs font-medium text-blue-800">Midnight</span>
                </div>
                <div className="flex-grow grid grid-cols-24">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="border-r border-blue-300 text-center py-1">
                      <span className="text-xs font-medium text-blue-800">{i}</span>
                    </div>
                  ))}
                </div>
                <div className="w-24 flex-shrink-0 border-l border-blue-300 bg-blue-50 text-center py-1">
                  <span className="text-xs font-medium text-blue-800"></span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Qualifying Rest Breaks Section */}
          {breaks.length > 0 && (
            <div className="mt-6 border border-gray-300 rounded-lg overflow-hidden bg-white">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                <h4 className="font-medium text-gray-700">Qualifying Rest Breaks</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Break</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Break Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {breaks.map((breakItem) => (
                      <tr key={breakItem.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{breakItem.id}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          Day {dayNumber}, {formatDate(breakItem.startTime.toString(), 'time')}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          Day {dayNumber}, {formatDate(breakItem.endTime.toString(), 'time')}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {(breakItem.durationHours || 0).toFixed(1)} hours in sleeper berth
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper function to process entries for timeline visualization
  const processEntriesForTimeline = (entries: LogEntry[], dayStart: Date, dayEnd: Date) => {
    if (!entries || entries.length === 0) return [];
    
    const result = [];
    
    for (const entry of entries) {
      const startTime = new Date(Math.max(dayStart.getTime(), new Date(entry.start_time).getTime()));
      const endTime = new Date(Math.min(dayEnd.getTime(), new Date(entry.end_time).getTime()));
      
      // Skip if entry is outside the day
      if (startTime >= endTime) continue;
      
      // Calculate minutes from midnight
      const startMinutes = (startTime.getHours() * 60) + startTime.getMinutes();
      const endMinutes = (endTime.getHours() * 60) + endTime.getMinutes();
      
      result.push({
        status: entry.status as DutyStatus,
        startTime,
        endTime,
        startMinutes,
        endMinutes,
        location: entry.location || null,
        remarks: entry.remarks || null
      });
    }
    
    return result;
  };

  // Helper function to create status line points for the SVG polyline
  const createStatusLinePoints = (entries: LogEntry[]): { points: string; segments: { x1: string; y1: number; x2: string; y2: number; color: string }[]; transitions: { x: string; y1: number; y2: number }[] } => {
    if (!entries || entries.length === 0) return { points: '', segments: [], transitions: [] };
    
    const segments: { x1: string; y1: number; x2: string; y2: number; color: string }[] = [];
    const transitions: { x: string; y1: number; y2: number }[] = [];
    const totalMinutes = 24 * 60;
    
    // Sort entries by start time
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    
    // Get the day start and end
    const dayStart = new Date(sortedEntries[0].start_time);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Create a timeline of all status changes throughout the day
    const statusByMinute: DutyStatus[] = Array(totalMinutes).fill('OFF' as DutyStatus);
    
    // Fill in the status for each minute based on the entries
    sortedEntries.forEach(entry => {
      const startTime = new Date(entry.start_time);
      const endTime = new Date(entry.end_time);
      
      // Only process if within the day
      if (startTime <= dayEnd && endTime >= dayStart) {
        // Clamp times to day boundaries
        const clampedStart = startTime < dayStart ? dayStart : startTime;
        const clampedEnd = endTime > dayEnd ? dayEnd : endTime;
        
        // Calculate start and end minutes
        const startMinute = (clampedStart.getHours() * 60) + clampedStart.getMinutes();
        const endMinute = (clampedEnd.getHours() * 60) + clampedEnd.getMinutes();
        
        // Fill in the status for each minute in this range
        for (let minute = startMinute; minute <= endMinute && minute < totalMinutes; minute++) {
          statusByMinute[minute] = entry.status;
        }
      }
    });
    
    // Now create segments based on continuous status periods
    let currentStatus = statusByMinute[0];
    let segmentStart = 0;
    
    for (let minute = 1; minute < totalMinutes; minute++) {
      // If status changes or we're at the end of the day, create a segment
      if (statusByMinute[minute] !== currentStatus || minute === totalMinutes - 1) {
        // Calculate positions
        const startX = (segmentStart / totalMinutes) * 100;
        const endX = (minute / totalMinutes) * 100;
        
        // Add the segment
        segments.push({
          x1: `${startX}%`,
          y1: rowHeights[getStatusIndex(currentStatus)],
          x2: `${endX}%`,
          y2: rowHeights[getStatusIndex(currentStatus)],
          color: 'black'
        });
        
        // Add a transition if status is changing and not at the end of the day
        if (minute < totalMinutes - 1 && statusByMinute[minute] !== currentStatus) {
          transitions.push({
            x: `${endX}%`,
            y1: rowHeights[getStatusIndex(currentStatus)],
            y2: rowHeights[getStatusIndex(statusByMinute[minute])]
          });
        }
        
        // Update for next segment
        currentStatus = statusByMinute[minute];
        segmentStart = minute;
      }
    }
    
    // Ensure we have a segment to the end of the day
    const lastMinute = totalMinutes - 1;
    const lastStatus = statusByMinute[lastMinute];
    const lastX = (lastMinute / totalMinutes) * 100;
    
    if (segments.length === 0 || parseFloat(segments[segments.length - 1].x2) < 100) {
      segments.push({
        x1: `${lastX}%`,
        y1: rowHeights[getStatusIndex(lastStatus)],
        x2: '100%',
        y2: rowHeights[getStatusIndex(lastStatus)],
        color: 'black'
      });
    }
    
    return { points: '', segments, transitions };
  };

  // Helper function to get the index of a status for positioning
  const getStatusIndex = (status: DutyStatus): number => {
    switch (status) {
      case 'OFF': return 0;
      case 'SB': return 1;
      case 'D': return 2;
      case 'ON': return 3;
      default: return 0;
    }
  };

  // Update the renderLogContent function to use tabs with a more professional design
  const renderLogContent = () => {
    if (!selectedLog) return null;
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-lg">
        {/* Log Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {formatEldDate(selectedLog.date)}
              </h2>
              <p className="text-gray-600 mt-1">
                Driver: <span className="font-medium">{selectedLog.driver}</span> • 
                Carrier: <span className="font-medium">{selectedLog.carrier}</span>
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            </div>
          </div>
          
          {/* Vehicle Info */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <div className="text-sm font-semibold text-gray-700">Truck Number</div>
              </div>
              <div className="text-lg font-bold text-gray-900 mt-1">{selectedLog.truckNumber || 'N/A'}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
                </svg>
                <div className="text-sm font-semibold text-gray-700">Trailer Number</div>
              </div>
              <div className="text-lg font-bold text-gray-900 mt-1">{selectedLog.trailerNumber || 'N/A'}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                <div className="text-sm font-semibold text-gray-700">Total Miles</div>
              </div>
              <div className="text-lg font-bold text-gray-900 mt-1">{formatNumber(selectedLog.totalMiles || 0)} miles</div>
            </div>
          </div>
          
          {printError && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
              {printError}
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('graph')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'graph'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Graph View
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'table'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'map'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Map View
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'graph' && renderTimelineGraph()}
          {activeTab === 'table' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 shadow-md border-gray-300 border rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      End Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Duration
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Location
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedLog.entries && selectedLog.entries.map((entry: LogEntry, index: number) => {
                    // Determine background color based on status for better visibility
                    const statusBgColor = entry.status === 'OFF' ? 'bg-gray-50' :
                                          entry.status === 'SB' ? 'bg-blue-50' :
                                          entry.status === 'D' ? 'bg-green-50' :
                                          'bg-amber-50';
                    
                    return (
                      <tr key={index} className={`hover:bg-gray-50 ${statusBgColor}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-4 h-4 rounded-sm ${getStatusColor(entry.status)} mr-2 border ${getStatusBorderColor(entry.status)}`}></div>
                            <div className="text-sm font-semibold text-gray-900">
                              {getStatusLabel(entry.status)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDate(entry.start_time, 'time')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDate(entry.end_time, 'time')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {calculateDuration(entry.start_time, entry.end_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 max-w-xs truncate">
                          {entry.location || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 max-w-xs truncate">
                          {entry.remarks || ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'map' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Route Map</h3>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden p-4">
                <p className="text-sm text-gray-500 mb-4">
                  This map shows the driver's route based on the duty status changes and locations recorded in the ELD log.
                </p>
                <div className="h-96 overflow-hidden rounded-lg border border-gray-200">
                  <MapView segments={transformLogEntriesToSegments()} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main component return
  if (loading) {
    return <LoadingSpinner text="Loading ELD logs..." />;
  }

  if (error) {
    return (
      <div className="py-6">
        <ErrorMessage 
          message="Error loading ELD logs" 
          details={error}
          variant="error"
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="py-8">
        <EmptyState
          title="No ELD logs available"
          description="There are no ELD logs available for this trip. Try generating logs first."
          icon={
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          actionText="Generate Logs"
          onAction={() => {
            if (tripId) {
              try {
                generateLogsForTrip(tripId);
              } catch (error) {
                console.error('Failed to generate logs:', error);
              }
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Log Selection */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-md">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            Daily Logs ({logs.length})
          </h3>
          <p className="text-sm text-gray-500">
            Select a log to view detailed information
          </p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentLogs.map((log, index) => (
              <button
                key={indexOfFirstLog + index}
                onClick={() => setSelectedLogIndex(indexOfFirstLog + index)}
                className={`text-left p-4 rounded-lg border transition-colors duration-200 ${
                  selectedLogIndex === (indexOfFirstLog + index)
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{formatEldDate(log.date)}</div>
                <div className="text-sm text-gray-500 mt-1">{log.driver}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">{formatNumber(log.totalMiles || 0)} miles</span>
                  <span className="text-xs text-gray-500">{log.entries?.length || 0} entries</span>
                </div>
              </button>
            ))}
          </div>
          
          {/* Pagination for logs */}
          {renderPagination()}
        </div>
      </div>

      {/* Selected Log Content */}
      <div ref={logContentRef}>
        {selectedLog && renderLogContent()}
      </div>
    </div>
  );
};

export default EldLogViewer; 