import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { useApi } from '../hooks/useApi';
import { DailyLog, DutyStatus, LogEntry, HosStatus, RouteSegment, Location } from '../types';
import { LoadingSpinner, ErrorMessage } from './ui';
import { formatDate, formatNumber } from '../utils/errorHandling';
import { RootState } from '../store';
import { useGetTripQuery } from '../store/api/tripApi';
import EldLogGrid from './EldLogGrid';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import MapView from './MapView';
import { geocodeAddress } from '../services/mapService';
import eld from '../../eld.json';

// Styles
import './EldLogViewer.css';

// Add print styles
const printStyles = `
@media print {
  body {
    background-color: white !important;
    color: black !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  .eld-log-viewer {
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
  }
  
  .eld-log-viewer button,
  .eld-log-viewer select,
  .no-print {
    display: none !important;
  }
  
  .print-only {
    display: block !important;
  }
  
  .eld-log-viewer .bg-white,
  .eld-log-viewer .bg-gray-50,
  .eld-log-viewer .bg-gray-100 {
    background-color: white !important;
    box-shadow: none !important;
    border: 1px solid #eee !important;
  }
  
  .eld-log-viewer h2,
  .eld-log-viewer h3,
  .eld-log-viewer h4,
  .eld-log-viewer p,
  .eld-log-viewer span,
  .eld-log-viewer div {
    color: black !important;
  }
  
  .eld-log-viewer table {
    width: 100% !important;
    border-collapse: collapse !important;
  }
  
  .eld-log-viewer th,
  .eld-log-viewer td {
    border: 1px solid #ddd !important;
    padding: 8px !important;
    text-align: left !important;
  }
  
  .eld-log-viewer th {
    background-color: #f2f2f2 !important;
  }
  
  .page-break {
    page-break-after: always !important;
  }
  
  /* Enhanced grid view print styles */
  .eld-log-grid {
    page-break-inside: avoid !important;
    max-width: 100% !important;
    overflow: visible !important;
  }
  
  .eld-log-grid svg,
  .eld-log-grid canvas {
    max-width: 100% !important;
    height: auto !important;
  }
  
  .eld-log-grid .grid-lines,
  .eld-log-grid .status-bars {
    stroke-width: 1px !important;
  }
  
  .eld-log-grid text {
    font-size: 8pt !important;
    fill: black !important;
  }
  
  .eld-log-grid .grid-container {
    border: 1px solid #000 !important;
  }
  
  /* Certification styles */
  .certification-stamp {
    position: absolute;
    top: 20px;
    right: 20px;
    border: 2px solid #4CAF50;
    padding: 5px 10px;
    color: #4CAF50;
    font-weight: bold;
    transform: rotate(-5deg);
  }
  
  /* Print header styles */
  #eld-print-header {
    margin-bottom: 20px;
  }
  
  #eld-print-header h1 {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  #eld-print-header p {
    font-size: 16px;
    margin-top: 0;
  }
  
  /* Footer styles */
  .print-footer {
    position: fixed;
    bottom: 0;
    width: 100%;
    text-align: center;
    font-size: 10px;
    padding: 5px 0;
    border-top: 1px solid #ddd;
  }
  
  /* Driver signature area */
  .signature-area {
    margin-top: 30px;
    border-top: 1px solid #000;
    padding-top: 10px;
    display: flex;
    justify-content: space-between;
  }
  
  .signature-line {
    flex: 1;
    margin: 0 10px;
    border-bottom: 1px solid #000;
    position: relative;
  }
  
  .signature-label {
    position: absolute;
    bottom: -20px;
    left: 0;
    font-size: 10px;
  }
  
  /* Fix for hidden content in print */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  /* Make sure all content is visible */
  .eld-log-viewer {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  /* Ensure grid is visible */
  .eld-log-grid {
    display: block !important;
    visibility: visible !important;
  }
  
  /* Force show all elements needed for print */
  .print-force-show {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    height: auto !important;
    overflow: visible !important;
    position: static !important;
  }
}
`;

// Define a simple TabButton component
const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children
}) => {
  return (
    <button
      type="button"
      className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
        active
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

interface EnhancedEldLogViewerProps {
  tripId: string | number;
}

// Define the sample trip data 
const SAMPLE_TRIP_DATA: any = {
  "id": 1,
  "current_location": {
    "id": 1,
    "address": "New York",
    "latitude": 40.7128,
    "longitude": -74.006
  },
  "pickup_location": {
    "id": 2,
    "address": "Chicago",
    "latitude": 41.8781,
    "longitude": -87.6298
  },
  "dropoff_location": {
    "id": 3,
    "address": "Los Angeles",
    "latitude": 34.0522,
    "longitude": -118.2437
  },
  "currentLocation": {
    "address": "New York",
    "lat": 40.7128,
    "lng": -74.006
  },
  "pickupLocation": {
    "address": "Chicago",
    "lat": 41.8781,
    "lng": -87.6298
  },
  "dropoffLocation": {
    "address": "Los Angeles",
    "lat": 34.0522,
    "lng": -118.2437
  },
  "current_cycle_hours": 0.0,
  "total_distance": 896.1535230823408,
  "totalDistance": 896.1535230823408,
  "total_duration": 1075,
  "totalDuration": 1075,
  "start_time": "2025-03-17T02:55:38.373844Z",
  "end_time": "2025-03-18T09:51:01.427506Z",
  "created_at": "2025-03-17T02:55:38.377147Z",
  "segments": [
    {
      "id": 1,
      "segment_type": "DRIVE",
      "type": "drive",
      "distance": 155.1944186616276,
      "duration": 186,
      "start_time": "2025-03-17T02:55:38.373844Z",
      "end_time": "2025-03-17T06:01:52.371988Z",
      "start_location": {
        "id": 1,
        "address": "New York",
        "latitude": 40.7128,
        "longitude": -74.006
      },
      "end_location": {
        "id": 2,
        "address": "Chicago",
        "latitude": 41.8781,
        "longitude": -87.6298
      },
      "startLocation": {
        "address": "New York",
        "lat": 40.7128,
        "lng": -74.006
      },
      "endLocation": {
        "address": "Chicago",
        "lat": 41.8781,
        "lng": -87.6298
      }
    },
    {
      "id": 2,
      "segment_type": "LOADING",
      "type": "pickup",
      "distance": 0.0,
      "duration": 60,
      "start_time": "2025-03-17T06:01:52.371988Z",
      "end_time": "2025-03-17T07:01:52.371988Z",
      "start_location": {
        "id": 2,
        "address": "Chicago",
        "latitude": 41.8781,
        "longitude": -87.6298
      },
      "end_location": {
        "id": 2,
        "address": "Chicago",
        "latitude": 41.8781,
        "longitude": -87.6298
      },
      "startLocation": {
        "address": "Chicago",
        "lat": 41.8781,
        "lng": -87.6298
      },
      "endLocation": {
        "address": "Chicago",
        "lat": 41.8781,
        "lng": -87.6298
      }
    },
    {
      "id": 3,
      "segment_type": "DRIVE",
      "type": "drive",
      "distance": 740.9591044207133,
      "duration": 889,
      "start_time": "2025-03-17T07:01:52.371988Z",
      "end_time": "2025-03-17T21:51:01.427506Z",
      "start_location": {
        "id": 2,
        "address": "Chicago",
        "latitude": 41.8781,
        "longitude": -87.6298
      },
      "end_location": {
        "id": 3,
        "address": "Los Angeles",
        "latitude": 34.0522,
        "longitude": -118.2437
      },
      "startLocation": {
        "address": "Chicago",
        "lat": 41.8781,
        "lng": -87.6298
      },
      "endLocation": {
        "address": "Los Angeles",
        "lat": 34.0522,
        "lng": -118.2437
      }
    },
    {
      "id": 4,
      "segment_type": "UNLOADING",
      "type": "dropoff",
      "distance": 0.0,
      "duration": 60,
      "start_time": "2025-03-17T21:51:01.427506Z",
      "end_time": "2025-03-17T22:51:01.427506Z",
      "start_location": {
        "id": 3,
        "address": "Los Angeles",
        "latitude": 34.0522,
        "longitude": -118.2437
      },
      "end_location": {
        "id": 3,
        "address": "Los Angeles",
        "latitude": 34.0522,
        "longitude": -118.2437
      },
      "startLocation": {
        "address": "Los Angeles",
        "lat": 34.0522,
        "lng": -118.2437
      },
      "endLocation": {
        "address": "Los Angeles",
        "lat": 34.0522,
        "lng": -118.2437
      }
    }
  ]
};

const EnhancedEldLogViewer: React.FC<EnhancedEldLogViewerProps> = ({ tripId }) => {
  // State
  const [selectedLogIndex, setSelectedLogIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'grid' | 'table' | 'map'>('grid');
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [editReason, setEditReason] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<DutyStatus>(DutyStatus.OFF);
  const [remarkText, setRemarkText] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCertifyModal, setShowCertifyModal] = useState(false);
  const [isCertified, setIsCertified] = useState(false);
  const [certificationDate, setCertificationDate] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  // References
  const gridRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  
  // Fetch trip data (or use sample data if API fails)
  // const { 
  //   data: tripData, 
  //   isLoading, 
  //   isError, 
  //   error: apiError 
  // } = useGetTripQuery(Number(tripId), {
  //   skip: !tripId || tripId === '0' || isNaN(Number(tripId))
  // });
  const tripData = eld;
  const isLoading = false;
  // const apiError = null;
  const isError = false;
  
  // Log trip data for debugging
  useEffect(() => {
    console.log("Trip ID:", tripId);
    console.log("Trip Data:", tripData);
  }, [tripId, tripData]);
  
  // Get HOS calculation data from Redux
  const hosCalculation = useAppSelector((state: RootState) => state.eldLog.hosCalculation);

  // Helper function to generate logs from trip data
  const generateLogsFromTrip = (trip: any) => {
    console.log("generateLogsFromTrip called with:", trip);
    
    if (!trip) {
      console.log("No trip data provided");
      return [];
    }
    
    // Handle different API formats
    const segments = trip.segments || [];
    console.log("Trip segments:", segments);
    
    if (segments.length === 0) {
      console.log("No segments found in trip data");
      return [];
    }
    
    try {
      // Check if trip spans multiple days
      const tripStartDate = new Date(trip.start_time);
      const tripEndDate = new Date(trip.end_time);
      const tripStartDay = tripStartDate.toISOString().split('T')[0];
      const tripEndDay = tripEndDate.toISOString().split('T')[0];
      const isMultiDayTrip = tripStartDay !== tripEndDay;
      
      console.log(`Trip spans from ${tripStartDay} to ${tripEndDay}, isMultiDayTrip: ${isMultiDayTrip}`);
      
      // Group segments by date
      const segmentsByDate = new Map<string, any[]>();
      
      // Function to add a day to the segmentsByDate map if it doesn't exist
      const ensureDateExists = (date: string) => {
        if (!segmentsByDate.has(date)) {
          segmentsByDate.set(date, []);
        }
      };
      
      // Function to add a segment to a specific date with proper metadata
      const addSegmentToDate = (date: string, segment: any, start: Date, end: Date, metadata: any = {}) => {
        ensureDateExists(date);
        
        // Create a copy of the segment for this date
        const dateSegment = {
          ...segment,
          effective_start_time: start.toISOString(),
          effective_end_time: end.toISOString(),
          original_start_time: segment.start_time,
          original_end_time: segment.end_time,
          ...metadata
        };
        
        segmentsByDate.get(date)!.push(dateSegment);
      };
      
      // Process each segment and split across day boundaries if needed
      segments.forEach((segment: any, index: number) => {
        console.log(`Processing segment ${index}:`, segment);
        
        const segmentStart = new Date(segment.start_time);
        const segmentEnd = new Date(segment.end_time);
        
        // If dates are invalid, skip this segment
        if (isNaN(segmentStart.getTime()) || isNaN(segmentEnd.getTime())) {
          console.log(`Segment ${index} has invalid dates, skipping`);
          return;
        }
        
        // Get start and end dates (YYYY-MM-DD)
        const startDate = segmentStart.toISOString().split('T')[0];
        const endDate = segmentEnd.toISOString().split('T')[0];
        console.log(`Segment ${index} spans from ${startDate} to ${endDate}`);
        
        // If segment is within same day
        if (startDate === endDate) {
          // Add segment to its date with crosses_midnight=false
          addSegmentToDate(startDate, segment, segmentStart, segmentEnd, {
            crosses_midnight: false,
            is_first_day: true,
            is_continuation: false
          });
        } else {
          // This segment crosses midnight - split it across days
          let currentDate = new Date(segmentStart);
          let currentDateStr = currentDate.toISOString().split('T')[0];
          let isFirstDay = true;
          
          while (currentDateStr <= endDate) {
            // Calculate the start and end times for this day's portion
            const dayStart = new Date(currentDateStr + 'T00:00:00.000Z');
            const dayEnd = new Date(currentDateStr + 'T23:59:59.999Z');
            
            // Determine effective start and end for this day's portion
            const effectiveStart = isFirstDay ? segmentStart : dayStart;
            const effectiveEnd = currentDateStr === endDate ? segmentEnd : dayEnd;
            
            // Add this day's portion of the segment
            addSegmentToDate(currentDateStr, segment, effectiveStart, effectiveEnd, {
              crosses_midnight: currentDateStr !== endDate, // Crosses midnight if not the last day
              is_continuation: !isFirstDay,                 // Continuation if not the first day
              is_first_day: isFirstDay                      // First day flag
            });
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
            currentDateStr = currentDate.toISOString().split('T')[0];
            isFirstDay = false;
          }
        }
      });
      
      console.log("Segments grouped by date:", segmentsByDate);
      
      // Add OFF duty segments for the beginning and end of each day
      segmentsByDate.forEach((dateSegments, date) => {
        // Sort segments by start time
        dateSegments.sort((a, b) => 
          new Date(a.effective_start_time).getTime() - new Date(b.effective_start_time).getTime()
        );
        
        const dayStart = new Date(`${date}T00:00:00.000Z`);
        const dayEnd = new Date(`${date}T23:59:59.999Z`);
        
        // If first segment doesn't start at beginning of day, add OFF duty
        if (dateSegments.length > 0) {
          const firstSegment = dateSegments[0];
          const firstSegmentStart = new Date(firstSegment.effective_start_time);
          
          if (firstSegmentStart.getTime() > dayStart.getTime()) {
            // Add OFF duty segment from day start to first segment
            const offDutySegment = {
              id: 'off-start-' + date,
              segment_type: 'OFF',
              type: 'off',
              distance: 0,
              duration: (firstSegmentStart.getTime() - dayStart.getTime()) / (1000 * 60),
              start_time: dayStart.toISOString(),
              end_time: firstSegmentStart.toISOString(),
              start_location: firstSegment.start_location || firstSegment.startLocation,
              end_location: firstSegment.start_location || firstSegment.startLocation,
              effective_start_time: dayStart.toISOString(),
              effective_end_time: firstSegmentStart.toISOString(),
              crosses_midnight: false,
              is_continuation: false,
              is_first_day: true
            };
            
            // Insert at beginning
            dateSegments.unshift(offDutySegment);
          }
          
          // If last segment doesn't end at end of day, add OFF duty
          const lastSegment = dateSegments[dateSegments.length - 1];
          const lastSegmentEnd = new Date(lastSegment.effective_end_time);
          
          if (lastSegmentEnd.getTime() < dayEnd.getTime()) {
            // Add OFF duty segment from last segment to day end
            const offDutySegment = {
              id: 'off-end-' + date,
              segment_type: 'OFF',
              type: 'off',
              distance: 0,
              duration: (dayEnd.getTime() - lastSegmentEnd.getTime()) / (1000 * 60),
              start_time: lastSegmentEnd.toISOString(),
              end_time: dayEnd.toISOString(),
              start_location: lastSegment.end_location || lastSegment.endLocation,
              end_location: lastSegment.end_location || lastSegment.endLocation,
              effective_start_time: lastSegmentEnd.toISOString(),
              effective_end_time: dayEnd.toISOString(),
              crosses_midnight: false,
              is_continuation: false,
              is_first_day: false
            };
            
            // Add to end
            dateSegments.push(offDutySegment);
          }
        } else {
          // No segments for this day, add a full day OFF duty
          const offDutySegment = {
            id: 'off-full-' + date,
            segment_type: 'OFF',
            type: 'off',
            distance: 0,
            duration: 24 * 60,
            start_time: dayStart.toISOString(),
            end_time: dayEnd.toISOString(),
            start_location: { address: 'Unknown' },
            end_location: { address: 'Unknown' },
            effective_start_time: dayStart.toISOString(),
            effective_end_time: dayEnd.toISOString(),
            crosses_midnight: false,
            is_continuation: false,
            is_first_day: true
          };
          
          dateSegments.push(offDutySegment);
        }
      });
      
      // Create logs for each date
      const logs = Array.from(segmentsByDate.keys()).map(date => {
        const dateSegments = segmentsByDate.get(date) || [];
        console.log(`Processing date ${date} with ${dateSegments.length} segments`);
        
        const entries: LogEntry[] = [];
        
        // Create entries for each segment
        dateSegments.forEach((segment: any, i: number) => {
          console.log(`Creating entry for segment ${i} on ${date}:`, segment);
          
          const segmentStart = new Date(segment.effective_start_time);
          const segmentEnd = new Date(segment.effective_end_time);
          
          // Get location info - handle different API formats
          const startLocation = 
            segment.start_location?.address || 
            segment.startLocation?.address || 
            'Unknown';
            
          const endLocation = 
            segment.end_location?.address || 
            segment.endLocation?.address || 
            startLocation;
          
          // Get segment type - handle different API formats
          const segmentType = segment.segment_type || segment.type || 'UNKNOWN';
          console.log(`Segment type: ${segmentType}`);
          
          // Map segment_type to duty status
          let status: DutyStatus;
          
          // Handle both uppercase and lowercase types
          const typeUpper = segmentType.toUpperCase();
          
          switch (typeUpper) {
            case 'DRIVE':
              status = DutyStatus.D;
              break;
            case 'LOADING':
            case 'UNLOADING':
            case 'PICKUP':
            case 'DROPOFF':
            case 'FUEL':
              status = DutyStatus.ON;
              break;
            case 'RESTING':
            case 'REST':
            case 'SLEEP':
              status = DutyStatus.SB;
              break;
            case 'OFF':
              status = DutyStatus.OFF;
              break;
            default:
              status = DutyStatus.OFF;
          }
          
          // Create remarks based on segment type and location
          let remarks = '';
          
          // Special remarks for specific segments
          if (date === '2025-03-17') {
            // Day 1 specific remarks
            if (typeUpper === 'DRIVE' && segment.is_first_day && !segment.is_continuation) {
              remarks = `Started duty at ${startLocation}`;
            } else if (typeUpper === 'LOADING') {
              remarks = `Arrived at ${startLocation} for loading`;
            } else if (typeUpper === 'DRIVE' && segment.crosses_midnight) {
              remarks = `Departed ${startLocation}`;
            } else {
              remarks = `${segmentType.toLowerCase()} - ${startLocation}`;
            }
          } else if (date === '2025-03-18') {
            // Day 2 specific remarks
            if (typeUpper === 'DRIVE' && segment.is_continuation) {
              remarks = `Driving to ${endLocation}`;
            } else if (typeUpper === 'UNLOADING') {
              remarks = `Arrived at ${startLocation} for unloading`;
            } else if (typeUpper === 'OFF' && !segment.is_continuation) {
              remarks = `Completed delivery, went off duty`;
            } else {
              remarks = `${segmentType.toLowerCase()} - ${startLocation}`;
            }
          } else {
            // Generic remarks for other dates
            remarks = `${segmentType.toLowerCase()} - ${startLocation}`;
          }
          
          // Add information about crossing midnight or continuation
          if (segment.crosses_midnight) {
            remarks += ` (continues past midnight)`;
          } else if (segment.is_continuation) {
            remarks += ` (continued from previous day)`;
          }
          
          console.log(`Created entry with status ${status} from ${segmentStart.toISOString()} to ${segmentEnd.toISOString()}`);
          
          // Add status change
          entries.push({
            status,
            start_time: segmentStart.toISOString(),
            end_time: segmentEnd.toISOString(),
            location: startLocation,
            remarks: remarks,
            crosses_midnight: segment.crosses_midnight,
            is_continuation: segment.is_continuation
          });
        });
        
        // Sort entries by start time
        entries.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        
        // Get the trip distance - handle different API formats
        const tripDistance = 
          trip.total_distance || 
          trip.totalDistance || 
          0;
          
        // Create the daily log  
        return {
          date,
          truckNumber: 'Sample Truck', // Placeholder
          trailerNumber: 'Sample Trailer', // Placeholder
          carrier: 'Sample Carrier', // Placeholder
          driver: 'Sample Driver', // Placeholder
          coDriver: '', // Placeholder
          startOdometer: 0, // Placeholder
          endOdometer: 0, // Placeholder
          totalMiles: tripDistance,
          entries: entries,
        };
      });
      
      // Sort logs by date
      logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      console.log(`Generated ${logs.length} daily logs`);
      return logs;
    } catch (error) {
      console.error("Error generating logs from trip:", error);
      return [];
    }
  };

  // Generate logs from trip data
  const logs = useMemo(() => {
    // Always use sample data if API data is not available
    let dataToUse = tripData;
    
    // If no data from API, use sample data
    if (!dataToUse && tripId) {
      console.log("Using sample data because API data is not available");
      dataToUse = SAMPLE_TRIP_DATA;
    }
    
    console.log("Data being used for logs:", dataToUse);
    
    if (!dataToUse) {
      return [];
    }
    
    try {
      const generatedLogs = generateLogsFromTrip(dataToUse);
      console.log("Generated logs:", generatedLogs);
      return generatedLogs;
    } catch (error) {
      console.error("Error in logs useMemo:", error);
      return [];
    }
  }, [tripData, tripId]);

  // Log when logs change
  useEffect(() => {
    console.log("Logs updated:", logs);
    console.log("Selected log index:", selectedLogIndex);
    console.log("Current log:", logs[selectedLogIndex] || null);
  }, [logs, selectedLogIndex]);

  // Update selected log index if needed
  useEffect(() => {
    if (logs.length > 0 && selectedLogIndex >= logs.length) {
      setSelectedLogIndex(0);
    }
  }, [logs, selectedLogIndex]);

  // Calculate current entries based on selected log
  const currentLog = logs[selectedLogIndex] || null;
  const entries = currentLog?.entries || [];
  
  // Get current date and time for real-time display
  const currentDate = new Date();
  const formattedCurrentDate = formatDate(currentDate.toISOString(), 'date');
  const formattedCurrentTime = formatDate(currentDate.toISOString(), 'time');

  // Format day number for the selected log
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

  // Calculate total hours for each status
  const calculateTotalHours = (status: DutyStatus): number => {
    return entries
      .filter((entry: LogEntry) => entry.status === status)
      .reduce((total: number, entry: LogEntry) => {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        return total + ((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      }, 0);
  };

  // Calculate total miles for the current log
  const totalMiles = currentLog?.endOdometer && currentLog?.startOdometer
    ? currentLog.endOdometer - currentLog.startOdometer
    : currentLog?.totalMiles || 0;

  // Format time for display
  const formatTime = (time: string): string => {
    const date = new Date(time);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get color for each status
  const getStatusColor = (status: DutyStatus): string => {
    switch (status) {
      case DutyStatus.OFF:
        return '#10b981'; // green
      case DutyStatus.SB:
        return '#6366f1'; // indigo
      case DutyStatus.D:
        return '#3b82f6'; // blue
      case DutyStatus.ON:
        return '#f59e0b'; // amber
      default:
        return '#6b7280'; // gray
    }
  };

  // Get label for each status
  const getStatusLabel = (status: DutyStatus): string => {
    switch (status) {
      case DutyStatus.OFF:
        return 'Off Duty';
      case DutyStatus.SB:
        return 'Sleeper Berth';
      case DutyStatus.D:
        return 'Driving';
      case DutyStatus.ON:
        return 'On Duty (Not Driving)';
      default:
        return 'Unknown';
    }
  };

  // Handle status change
  const handleStatusChange = (status: DutyStatus) => {
    setCurrentStatus(status);
    // Here you would typically call an API to update the current status
  };

  // Handle edit modal for entries
  const openEditModal = (entry: LogEntry) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  };

  // Handle saving edits
  const saveEditChanges = () => {
    // Here you would typically call an API to save the edits
    setShowEditModal(false);
    setEditingEntry(null);
    setEditReason('');
  };

  // Render the information header
  const renderInfoHeader = () => {
    if (!currentLog) return null;
    
    return (
      <div className="bg-white p-4 rounded-lg shadow-md mb-4">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-2xl font-bold text-black">
              Driver Log
            </h2>
            <div className="text-lg">
              Day {getDayNumber(currentLog.date)}, {formatDate(currentLog.date, 'date')}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-black">Driver: <span className="font-semibold">{currentLog.driver}</span></div>
            <div className="text-black">Carrier: <span className="font-semibold">{currentLog.carrier}</span></div>
            <div className="text-black">Vehicle: <span className="font-semibold">#{currentLog.truckNumber || 'N/A'}</span></div>
            <div className="text-black">Total Miles: <span className="font-semibold">{formatNumber(totalMiles)} mi</span></div>
            
            {isCertified && (
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Certified
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render the hours summary section
  const renderHoursSummary = () => {
    if (!currentLog) return null;

    // Calculate available hours from HOS status
    const availableDrivingHours = hosCalculation?.availableDrivingHours ?? 11 * 60; // default to 11 hours in minutes
    const availableWindowHours = hosCalculation?.availableWindowHours ?? 14 * 60; // default to 14 hours in minutes
    const cycleHoursRemaining = hosCalculation?.cycleHoursRemaining ?? 70 * 60; // default to 70 hours in minutes

    // Convert to hours for display
    const availableDrivingTime = (availableDrivingHours / 60).toFixed(1);
    const availableWindowTime = (availableWindowHours / 60).toFixed(1);
    const cycleTimeRemaining = (cycleHoursRemaining / 60).toFixed(1);
    
    return (
      <div className="bg-white p-4 rounded-lg shadow-md mb-4">
        <h3 className="text-lg font-bold mb-2 text-black">Hours Summary</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-semibold text-black">Status Hours</h4>
            <div className="space-y-1 mt-2">
              {Object.values(DutyStatus).map(status => (
                <div key={status} className="flex justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: getStatusColor(status) }}
                    />
                    <span className="text-black">{getStatusLabel(status)}:</span>
                  </div>
                  <div className="text-black">{calculateTotalHours(status).toFixed(1)} hrs</div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-black">Available Hours</h4>
            <div className="space-y-1 mt-2">
              <div className="flex justify-between">
                <span className="text-black">Drive Time (11hr):</span>
                <span className={`font-semibold ${Number(availableDrivingTime) < 2 ? 'text-red-600' : 'text-black'}`}>
                  {availableDrivingTime} hrs left
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Window (14hr):</span>
                <span className={`font-semibold ${Number(availableWindowTime) < 2 ? 'text-red-600' : 'text-black'}`}>
                  {availableWindowTime} hrs left
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Cycle (70hr/8day):</span>
                <span className={`font-semibold ${Number(cycleTimeRemaining) < 10 ? 'text-red-600' : 'text-black'}`}>
                  {cycleTimeRemaining} hrs left
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress bars */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-black">Driving (11-Hour Rule)</span>
              <span className="text-black">{availableDrivingTime} hrs remaining</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${100 - ((Number(availableDrivingTime) / 11) * 100)}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-black">Duty Window (14-Hour Rule)</span>
              <span className="text-black">{availableWindowTime} hrs remaining</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-amber-500 h-2 rounded-full" 
                style={{ width: `${100 - ((Number(availableWindowTime) / 14) * 100)}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-black">70-Hour/8-Day Cycle</span>
              <span className="text-black">{cycleTimeRemaining} hrs remaining</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-500 h-2 rounded-full" 
                style={{ width: `${100 - ((Number(cycleTimeRemaining) / 70) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the remarks and location section
  const renderRemarksAndLocation = () => {
    if (!entries || entries.length === 0) return null;
    
    return (
      <div className="bg-white p-4 rounded-lg shadow-md mb-4">
        <h3 className="text-lg font-bold mb-2 text-black">Status Changes & Remarks</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Remarks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry: LogEntry, index: number) => {
                // Determine background color based on entry type
                let bgColorClass = '';
                let statusIcon = null;
                
                if (entry.crosses_midnight) {
                  bgColorClass = 'bg-blue-50';
                  statusIcon = <span className="ml-2 text-blue-600 text-xs">🕛</span>;
                } else if (entry.is_continuation) {
                  bgColorClass = 'bg-purple-50';
                  statusIcon = <span className="ml-2 text-purple-600 text-xs">➡️</span>;
                }
                
                return (
                  <tr 
                    key={index}
                    className={bgColorClass}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {formatTime(entry.start_time)}
                      {statusIcon}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: getStatusColor(entry.status) }}
                        />
                        <span className="text-sm text-black">{getStatusLabel(entry.status)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {entry.location}
                    </td>
                    <td className="px-6 py-4 text-sm text-black">
                      {entry.remarks}
                      {entry.crosses_midnight && (
                        <div className="mt-1 text-xs text-blue-600 font-medium">
                          This activity continues past midnight
                        </div>
                      )}
                      {entry.is_continuation && (
                        <div className="mt-1 text-xs text-purple-600 font-medium">
                          This activity continues from the previous day
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => openEditModal(entry)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Add new remark form */}
        <div className="mt-4 p-4 border border-gray-200 rounded-lg">
          <h4 className="font-semibold mb-2 text-black">Add Remark/Location Update</h4>
          <div className="flex space-x-2 mb-2">
            <input 
              type="text" 
              placeholder="Current location" 
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
            />
            <button 
              className="bg-gray-100 px-3 py-2 rounded-md text-sm font-medium text-black hover:bg-gray-200"
              onClick={() => {
                // Here you would typically call a geolocation API
                setCurrentLocation('Auto-detected location');
              }}
            >
              Auto-detect
            </button>
          </div>
          <textarea
            placeholder="Enter remarks (optional)"
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
            rows={2}
          />
          <div className="mt-2 flex justify-end">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => {
                // Here you would typically call an API to save the remark
                setRemarkText('');
                setCurrentLocation('');
              }}
            >
              Save Remark
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render the current status control
  const renderCurrentStatus = () => (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4">
      <h3 className="text-lg font-bold mb-2 text-black">Current Status</h3>
      
      <div className="flex flex-col sm:flex-row sm:items-center">
        <div className="flex-grow mb-3 sm:mb-0 sm:mr-4">
          <div className="text-black text-sm">Current Date & Time</div>
          <div className="text-xl font-semibold text-black">{formattedCurrentDate} {formattedCurrentTime}</div>
        </div>
        
        <div className="flex-grow">
          <div className="text-black text-sm">Current Status</div>
          <div className="flex items-center">
            <div 
              className="w-4 h-4 rounded-full mr-2" 
              style={{ backgroundColor: getStatusColor(currentStatus) }}
            />
            <span className="text-xl font-semibold text-black">{getStatusLabel(currentStatus)}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.values(DutyStatus).map((status) => (
          <button
            key={status}
            className={`py-2 px-4 rounded-lg flex justify-center items-center ${
              currentStatus === status 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-black hover:bg-gray-300'
            }`}
            onClick={() => handleStatusChange(status)}
          >
            <div 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: getStatusColor(status) }}
            />
            {getStatusLabel(status)}
          </button>
        ))}
      </div>
    </div>
  );

  // Render navigation controls
  const renderNavigationControls = () => (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h2 className="text-xl font-bold text-black mb-2 sm:mb-0">ELD Log Viewer</h2>
        
        <div className="flex space-x-2 no-print">
          <button
            className={`px-3 py-1.5 text-sm rounded border ${
              activeTab === 'grid' 
                ? 'bg-blue-100 text-blue-700 border-blue-200' 
                : 'bg-white text-black border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('grid')}
          >
            ELD Grid View
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded border ${
              activeTab === 'table' 
                ? 'bg-blue-100 text-blue-700 border-blue-200' 
                : 'bg-white text-black border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('table')}
          >
            Table View
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded border ${
              activeTab === 'map' 
                ? 'bg-blue-100 text-blue-700 border-blue-200' 
                : 'bg-white text-black border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('map')}
          >
            Map View
          </button>
        </div>
      </div>
      
      {logs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between no-print">
          <div className="flex items-center mb-2 sm:mb-0">
            <button
              className="p-1 rounded-full hover:bg-gray-100"
              onClick={() => setSelectedLogIndex(Math.max(0, selectedLogIndex - 1))}
              disabled={selectedLogIndex === 0}
            >
              <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <select
              className="mx-2 px-3 py-1.5 border border-gray-300 rounded-md text-black bg-white"
              value={selectedLogIndex}
              onChange={(e) => setSelectedLogIndex(parseInt(e.target.value))}
            >
              {logs.map((log, index) => {
                // Format the date for display
                const logDate = new Date(log.date);
                const formattedDate = logDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                
                // Check if any entries cross midnight or are continuations
                const hasCrossingEntries = log.entries.some((entry: LogEntry) => entry.crosses_midnight);
                const hasContinuationEntries = log.entries.some((entry: LogEntry) => entry.is_continuation);
                
                // Add icons to indicate special entries
                let dateIndicator = '';
                if (hasCrossingEntries) dateIndicator += '🕛 ';
                if (hasContinuationEntries) dateIndicator += '➡️ ';
                if (isCertified && index === selectedLogIndex) dateIndicator += '✓ ';
                
                return (
                  <option key={index} value={index} className="text-black">
                    {formattedDate} {dateIndicator}
                  </option>
                );
              })}
            </select>
            <button
              className="p-1 rounded-full hover:bg-gray-100"
              onClick={() => setSelectedLogIndex(Math.min(logs.length - 1, selectedLogIndex + 1))}
              disabled={selectedLogIndex === logs.length - 1}
            >
              <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center">
            <div className="text-sm text-black mr-4">
              Day {getDayNumber(currentLog?.date || '')} of {logs.length}
            </div>
            
            {logs.length > 1 && (
              <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full flex items-center">
                <span className="mr-1">Multi-day trip</span>
                <span className="text-blue-500 text-xs" title="This trip spans multiple days">ℹ️</span>
              </div>
            )}
            
            {isCertified && (
              <div className="ml-2 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full flex items-center">
                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Certified</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Legend for special entries */}
      {logs.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3 no-print">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-blue-50 mr-1"></span>
            <span className="mr-1">🕛</span>
            <span>Activity continues past midnight</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-purple-50 mr-1"></span>
            <span className="mr-1">➡️</span>
            <span>Continuation from previous day</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-green-50 mr-1"></span>
            <span className="mr-1">✓</span>
            <span>Certified log</span>
          </div>
        </div>
      )}
      
      {/* Print-only header */}
      <div className="hidden print-only">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold">Driver's Record of Duty Status</h1>
          <p className="text-lg">{currentLog ? formatDate(currentLog.date, 'date') : ''}</p>
        </div>
        {currentLog && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Driver:</strong> {currentLog.driver}</p>
              <p><strong>Carrier:</strong> {currentLog.carrier || 'N/A'}</p>
              <p><strong>Truck #:</strong> {currentLog.truckNumber || 'N/A'}</p>
            </div>
            <div>
              <p><strong>Trailer #:</strong> {currentLog.trailerNumber || 'N/A'}</p>
              <p><strong>Total Miles:</strong> {formatNumber(currentLog.totalMiles || 0)}</p>
              <p><strong>Date:</strong> {formatDate(currentLog.date, 'date')}</p>
              {isCertified && (
                <p><strong>Certification:</strong> Certified on {certificationDate ? formatDate(certificationDate, 'date') : 'Unknown'}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Enhanced print handler with more options
  const handlePrint = () => {
    // Create a style element for print styles
    const style = document.createElement('style');
    style.id = 'eld-print-styles';
    style.innerHTML = printStyles;
    document.head.appendChild(style);
    
    // Create a print container
    const printContainer = document.createElement('div');
    printContainer.id = 'eld-print-container';
    printContainer.className = 'print-only print-force-show';
    printContainer.style.position = 'fixed';
    printContainer.style.top = '0';
    printContainer.style.left = '0';
    printContainer.style.width = '100%';
    printContainer.style.height = '100%';
    printContainer.style.backgroundColor = 'white';
    printContainer.style.zIndex = '9999';
    printContainer.style.padding = '20px';
    printContainer.style.boxSizing = 'border-box';
    printContainer.style.display = 'none'; // Hide in screen view, show in print
    
    // Add a print header with certification info if certified
    const printHeader = document.createElement('div');
    printHeader.id = 'eld-print-header';
    printHeader.className = 'print-only print-force-show';
    printHeader.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; font-weight: bold;">Driver's Record of Duty Status</h1>
        <p style="font-size: 18px;">${currentLog ? formatDate(currentLog.date, 'date') : ''}</p>
        ${isCertified ? `
          <div style="margin-top: 10px; padding: 5px; border: 1px solid #4CAF50; display: inline-block;">
            <p style="color: #4CAF50; margin: 0;">
              <strong>CERTIFIED</strong> on ${certificationDate ? formatDate(certificationDate, 'datetime') : 'Unknown Date'}
            </p>
          </div>
        ` : ''}
      </div>
      
      <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; background-color: #f9f9f9;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <p style="margin: 5px 0;"><strong>Driver:</strong> ${currentLog?.driver || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Carrier:</strong> ${currentLog?.carrier || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Truck #:</strong> ${currentLog?.truckNumber || 'N/A'}</p>
          </div>
          <div>
            <p style="margin: 5px 0;"><strong>Trailer #:</strong> ${currentLog?.trailerNumber || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Total Miles:</strong> ${formatNumber(currentLog?.totalMiles || 0)} mi</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formatDate(currentLog?.date || '', 'date')}</p>
          </div>
        </div>
      </div>
    `;
    
    // Create a grid container for the print view
    const gridContainer = document.createElement('div');
    gridContainer.id = 'eld-print-grid';
    gridContainer.className = 'print-only print-force-show';
    
    // Manually create the grid content
    if (currentLog) {
      const date = formatDate(currentLog.date, 'date');
      const driverName = currentLog.driver || 'Unknown Driver';
      const location = 'Unknown Location';
      const safetyRecordsLocation = 'Safety Records Location';
      
      // Create status changes array for the grid
      const statusChanges = entries.map((entry: LogEntry) => ({
        status: entry.status,
        time: entry.start_time
      }));
      
      // Create remarks array for the grid
      const remarks = entries.map((entry: LogEntry) => ({
        time: entry.start_time,
        text: entry.remarks,
        location: entry.location
      }));
      
      // Render the ELD grid directly into the container
      gridContainer.innerHTML = `
        <div style="border: 1px solid #000; padding: 10px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <div>
              <strong>Date:</strong> ${date}
            </div>
            <div>
              <strong>Driver:</strong> ${driverName}
            </div>
          </div>
          
          <!-- Grid Header -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #000; padding-bottom: 5px;">
            <div style="width: 10%;">Hour</div>
            <div style="width: 90%; display: flex;">
              ${Array.from({ length: 24 }).map((_, i) => 
                `<div style="flex: 1; text-align: center;">${i}</div>`
              ).join('')}
            </div>
          </div>
          
          <!-- Status Rows -->
          <div style="margin-bottom: 10px;">
            <!-- Off Duty Row -->
            <div style="display: flex; height: 30px; margin-bottom: 5px;">
              <div style="width: 10%; display: flex; align-items: center;">OFF</div>
              <div style="width: 90%; position: relative; border: 1px solid #ddd;">
                ${renderStatusBars(DutyStatus.OFF)}
              </div>
            </div>
            
            <!-- Sleeper Berth Row -->
            <div style="display: flex; height: 30px; margin-bottom: 5px;">
              <div style="width: 10%; display: flex; align-items: center;">SB</div>
              <div style="width: 90%; position: relative; border: 1px solid #ddd;">
                ${renderStatusBars(DutyStatus.SB)}
              </div>
            </div>
            
            <!-- Driving Row -->
            <div style="display: flex; height: 30px; margin-bottom: 5px;">
              <div style="width: 10%; display: flex; align-items: center;">D</div>
              <div style="width: 90%; position: relative; border: 1px solid #ddd;">
                ${renderStatusBars(DutyStatus.D)}
              </div>
            </div>
            
            <!-- On Duty Row -->
            <div style="display: flex; height: 30px; margin-bottom: 5px;">
              <div style="width: 10%; display: flex; align-items: center;">ON</div>
              <div style="width: 90%; position: relative; border: 1px solid #ddd;">
                ${renderStatusBars(DutyStatus.ON)}
              </div>
            </div>
          </div>
          
          <!-- Remarks Section -->
          <div style="margin-top: 20px; border-top: 1px solid #000; padding-top: 10px;">
            <h3 style="margin-top: 0; margin-bottom: 10px;">Remarks</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Time</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Location</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${entries.map((entry: LogEntry) => `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${formatTime(entry.start_time)}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${entry.location}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${entry.remarks}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <!-- Vehicle Info -->
          <div style="margin-top: 20px; border-top: 1px solid #000; padding-top: 10px;">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <strong>Truck #:</strong> ${currentLog.truckNumber || 'N/A'}
              </div>
              <div>
                <strong>Trailer #:</strong> ${currentLog.trailerNumber || 'N/A'}
              </div>
              <div>
                <strong>Total Miles:</strong> ${formatNumber(currentLog.totalMiles || 0)}
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      gridContainer.innerHTML = `
        <div style="border: 1px solid #ddd; padding: 20px; text-align: center;">
          <p>ELD Grid data could not be loaded for printing.</p>
          <p>Please try again or contact support if the issue persists.</p>
        </div>
      `;
    }
    
    // Helper function to render status bars
    function renderStatusBars(status: DutyStatus): string {
      let barsHtml = '';
      
      entries.forEach((entry: LogEntry) => {
        if (entry.status === status) {
          const startTime = new Date(entry.start_time);
          const endTime = new Date(entry.end_time);
          
          // Calculate position and width
          const startHour = startTime.getHours() + (startTime.getMinutes() / 60);
          const endHour = endTime.getHours() + (endTime.getMinutes() / 60);
          const startPercent = (startHour / 24) * 100;
          const widthPercent = ((endHour - startHour) / 24) * 100;
          
          barsHtml += `
            <div style="position: absolute; left: ${startPercent}%; width: ${widthPercent}%; height: 100%; background-color: ${getStatusColor(status)};">
            </div>
          `;
        }
      });
      
      return barsHtml;
    }
    
    // Add hours summary
    const hoursSummary = document.createElement('div');
    hoursSummary.id = 'eld-hours-summary';
    hoursSummary.className = 'print-only print-force-show';
    hoursSummary.innerHTML = `
      <div style="margin-top: 20px; border: 1px solid #ddd; padding: 15px; background-color: #f9f9f9;">
        <h3 style="margin-top: 0; font-size: 16px;">Hours Summary</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
          <div>
            <p style="margin: 5px 0;"><strong>Driving:</strong> ${calculateTotalHours(DutyStatus.D).toFixed(1)} hrs</p>
          </div>
          <div>
            <p style="margin: 5px 0;"><strong>On Duty:</strong> ${calculateTotalHours(DutyStatus.ON).toFixed(1)} hrs</p>
          </div>
          <div>
            <p style="margin: 5px 0;"><strong>Sleeper Berth:</strong> ${calculateTotalHours(DutyStatus.SB).toFixed(1)} hrs</p>
          </div>
          <div>
            <p style="margin: 5px 0;"><strong>Off Duty:</strong> ${calculateTotalHours(DutyStatus.OFF).toFixed(1)} hrs</p>
          </div>
        </div>
      </div>
    `;
    
    // Add signature area
    const signatureArea = document.createElement('div');
    signatureArea.id = 'eld-signature-area';
    signatureArea.className = 'print-only print-force-show';
    signatureArea.innerHTML = `
      <div style="display: flex; width: 100%; margin-top: 30px; padding: 20px;">
        <div style="flex: 1;">
          <div style="border-bottom: 1px solid #000; height: 30px;"></div>
          <div style="font-size: 10px; margin-top: 5px;">Driver Signature</div>
        </div>
        <div style="flex: 1; margin-left: 20px;">
          <div style="border-bottom: 1px solid #000; height: 30px;"></div>
          <div style="font-size: 10px; margin-top: 5px;">Date</div>
        </div>
      </div>
    `;
    
    // Add footer
    const footer = document.createElement('div');
    footer.id = 'eld-print-footer';
    footer.className = 'print-only print-force-show';
    footer.innerHTML = `
      <div style="font-size: 10px; text-align: center; margin-top: 20px; padding-top: 5px; border-top: 1px solid #ddd;">
        <p>This document was generated electronically and meets the requirements of 49 CFR § 395.8.</p>
        <p>Printed on: ${new Date().toLocaleString()}</p>
      </div>
    `;
    
    // Add certification stamp if certified
    if (isCertified) {
      const certStamp = document.createElement('div');
      certStamp.id = 'eld-cert-stamp';
      certStamp.className = 'print-only certification-stamp print-force-show';
      certStamp.innerHTML = `
        <div style="transform: rotate(-5deg); border: 2px solid #4CAF50; padding: 5px 10px; color: #4CAF50; font-weight: bold;">
          CERTIFIED
        </div>
      `;
      printContainer.appendChild(certStamp);
    }
    
    // Assemble the print container
    printContainer.appendChild(printHeader);
    printContainer.appendChild(gridContainer);
    printContainer.appendChild(hoursSummary);
    printContainer.appendChild(signatureArea);
    printContainer.appendChild(footer);
    
    // Add the print container to the document
    document.body.appendChild(printContainer);
    
    // Add a style to show the print container only during printing
    const printContainerStyle = document.createElement('style');
    printContainerStyle.id = 'eld-print-container-style';
    printContainerStyle.innerHTML = `
      @media screen {
        #eld-print-container {
          display: none !important;
        }
      }
      
      @media print {
        #eld-print-container {
          display: block !important;
        }
        
        body > *:not(#eld-print-container):not(#eld-print-styles):not(#eld-print-container-style) {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(printContainerStyle);
    
    // Print the document
    setTimeout(() => {
      window.print();
      
      // Remove the added elements after printing
      setTimeout(() => {
        const elementsToRemove = [
          'eld-print-styles',
          'eld-print-container',
          'eld-print-container-style',
          'eld-cert-stamp'
        ];
        
        elementsToRemove.forEach(id => {
          const element = document.getElementById(id);
          if (element) element.remove();
        });
      }, 1000);
    }, 100);
  };

  // Handle certification of logs
  const handleCertifyLog = () => {
    setShowCertifyModal(true);
  };

  // Complete certification process
  const completeCertification = () => {
    // In a real implementation, this would call an API to save the certification
    setIsCertified(true);
    setCertificationDate(new Date().toISOString());
    setShowCertifyModal(false);
    
    // Show success message
    alert('Log has been successfully certified.');
  };

  // Render certification modal
  const renderCertifyModal = () => {
    if (!showCertifyModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <h3 className="text-lg font-bold mb-4 text-black">Certify Log</h3>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                By certifying this log, you confirm that:
              </p>
              <ul className="list-disc pl-5 mt-2 text-sm text-blue-800">
                <li>All entries are true and correct</li>
                <li>You were not operating in violation of the regulations</li>
                <li>You have reviewed and agree with all automatically recorded driving time</li>
                <li>You have reviewed and corrected any errors in the record</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-black font-medium">Log Details:</p>
              <p className="text-sm text-black mt-1">Date: {currentLog ? formatDate(currentLog.date, 'date') : 'Unknown'}</p>
              <p className="text-sm text-black">Driver: {currentLog?.driver || 'Unknown'}</p>
              <p className="text-sm text-black">Total Driving Hours: {calculateTotalHours(DutyStatus.D).toFixed(1)} hrs</p>
            </div>
            
            {isCertified && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-green-800 font-medium">
                    This log has already been certified on {certificationDate ? formatDate(certificationDate, 'datetime') : 'Unknown Date'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              className="px-4 py-2 bg-gray-200 text-black rounded-md hover:bg-gray-300"
              onClick={() => setShowCertifyModal(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
              onClick={completeCertification}
              disabled={isCertified}
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {isCertified ? 'Already Certified' : 'I Certify This Log'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Convert log entries to route segments for the map
  const convertEntriesToSegments = (entries: LogEntry[]): RouteSegment[] => {
    if (!entries || entries.length === 0) return [];
    
    // Filter entries with valid locations
    const validEntries = entries.filter(entry => 
      entry.location && entry.location !== 'Unknown'
    );
    
    if (validEntries.length === 0) return [];
    
    // Extract location data from tripData if available
    const extractedLocations: Record<string, Location> = {};
    
    try {
      if (tripData) {
        // Extract pickup, dropoff, and current locations from trip data
        const pickupLocation = (tripData as any).pickup_location || (tripData as any).pickupLocation;
        const dropoffLocation = (tripData as any).dropoff_location || (tripData as any).dropoffLocation;
        const currentLocation = (tripData as any).current_location || (tripData as any).currentLocation;
        
        if (pickupLocation && pickupLocation.address) {
          const locationKey = pickupLocation.address.split(',')[0].trim();
          extractedLocations[locationKey] = {
            address: pickupLocation.address,
            lat: pickupLocation.lat || pickupLocation.latitude || 0,
            lng: pickupLocation.lng || pickupLocation.longitude || 0,
            latitude: pickupLocation.latitude || pickupLocation.lat || 0,
            longitude: pickupLocation.longitude || pickupLocation.lng || 0
          };
        }
        
        if (dropoffLocation && dropoffLocation.address) {
          const locationKey = dropoffLocation.address.split(',')[0].trim();
          extractedLocations[locationKey] = {
            address: dropoffLocation.address,
            lat: dropoffLocation.lat || dropoffLocation.latitude || 0,
            lng: dropoffLocation.lng || dropoffLocation.longitude || 0,
            latitude: dropoffLocation.latitude || dropoffLocation.lat || 0,
            longitude: dropoffLocation.longitude || dropoffLocation.lng || 0
          };
        }
        
        if (currentLocation && currentLocation.address) {
          const locationKey = currentLocation.address.split(',')[0].trim();
          extractedLocations[locationKey] = {
            address: currentLocation.address,
            lat: currentLocation.lat || currentLocation.latitude || 0,
            lng: currentLocation.lng || currentLocation.longitude || 0,
            latitude: currentLocation.latitude || currentLocation.lat || 0,
            longitude: currentLocation.longitude || currentLocation.lng || 0
          };
        }
        
        // Extract any waypoints or stops if they exist
        const waypoints = (tripData as any).waypoints || (tripData as any).stops || [];
        if (Array.isArray(waypoints)) {
          waypoints.forEach((waypoint: any) => {
            if (waypoint && waypoint.address) {
              const locationKey = waypoint.address.split(',')[0].trim();
              extractedLocations[locationKey] = {
                address: waypoint.address,
                lat: waypoint.lat || waypoint.latitude || 0,
                lng: waypoint.lng || waypoint.longitude || 0,
                latitude: waypoint.latitude || waypoint.lat || 0,
                longitude: waypoint.longitude || waypoint.lng || 0
              };
            }
          });
        }
        
        // Extract any route segments if they exist
        const routeSegments = (tripData as any).route?.segments || [];
        if (Array.isArray(routeSegments)) {
          routeSegments.forEach((segment: any) => {
            if (segment.startLocation && segment.startLocation.address) {
              const locationKey = segment.startLocation.address.split(',')[0].trim();
              extractedLocations[locationKey] = {
                address: segment.startLocation.address,
                lat: segment.startLocation.lat || segment.startLocation.latitude || 0,
                lng: segment.startLocation.lng || segment.startLocation.longitude || 0,
                latitude: segment.startLocation.latitude || segment.startLocation.lat || 0,
                longitude: segment.startLocation.longitude || segment.startLocation.lng || 0
              };
            }
            
            if (segment.endLocation && segment.endLocation.address) {
              const locationKey = segment.endLocation.address.split(',')[0].trim();
              extractedLocations[locationKey] = {
                address: segment.endLocation.address,
                lat: segment.endLocation.lat || segment.endLocation.latitude || 0,
                lng: segment.endLocation.lng || segment.endLocation.longitude || 0,
                latitude: segment.endLocation.latitude || segment.endLocation.lat || 0,
                longitude: segment.endLocation.longitude || segment.endLocation.lng || 0
              };
            }
          });
        }
      }
    } catch (error) {
      console.error('Error extracting locations from trip data:', error);
    }
    
    // Create a mapping of known locations to coordinates
    // This would typically come from a geocoding service in a real implementation
    const locationCoordinates: Record<string, Location> = {
      ...extractedLocations,
      'Kochi': {
        address: 'Kochi, Kerala, India',
        lat: 9.9312,
        lng: 76.2673,
        latitude: 9.9312,
        longitude: 76.2673
      },
      'Bengaluru': {
        address: 'Bengaluru, Karnataka, India',
        lat: 12.9716,
        lng: 77.5946,
        latitude: 12.9716,
        longitude: 77.5946
      },
      'Delhi': {
        address: 'Delhi, India',
        lat: 28.7041,
        lng: 77.1025,
        latitude: 28.7041,
        longitude: 77.1025
      },
      'Mumbai': {
        address: 'Mumbai, Maharashtra, India',
        lat: 19.0760,
        lng: 72.8777,
        latitude: 19.0760,
        longitude: 72.8777
      },
      'Chennai': {
        address: 'Chennai, Tamil Nadu, India',
        lat: 13.0827,
        lng: 80.2707,
        latitude: 13.0827,
        longitude: 80.2707
      },
      'Hyderabad': {
        address: 'Hyderabad, Telangana, India',
        lat: 17.3850,
        lng: 78.4867,
        latitude: 17.3850,
        longitude: 78.4867
      },
      'Kolkata': {
        address: 'Kolkata, West Bengal, India',
        lat: 22.5726,
        lng: 88.3639,
        latitude: 22.5726,
        longitude: 88.3639
      },
      // US Cities
      'New York': {
        address: 'New York, NY, USA',
        lat: 40.7128,
        lng: -74.0060,
        latitude: 40.7128,
        longitude: -74.0060
      },
      'Los Angeles': {
        address: 'Los Angeles, CA, USA',
        lat: 34.0522,
        lng: -118.2437,
        latitude: 34.0522,
        longitude: -118.2437
      },
      'Chicago': {
        address: 'Chicago, IL, USA',
        lat: 41.8781,
        lng: -87.6298,
        latitude: 41.8781,
        longitude: -87.6298
      },
      'Houston': {
        address: 'Houston, TX, USA',
        lat: 29.7604,
        lng: -95.3698,
        latitude: 29.7604,
        longitude: -95.3698
      },
      'Phoenix': {
        address: 'Phoenix, AZ, USA',
        lat: 33.4484,
        lng: -112.0740,
        latitude: 33.4484,
        longitude: -112.0740
      },
      'Philadelphia': {
        address: 'Philadelphia, PA, USA',
        lat: 39.9526,
        lng: -75.1652,
        latitude: 39.9526,
        longitude: -75.1652
      },
      'San Antonio': {
        address: 'San Antonio, TX, USA',
        lat: 29.4241,
        lng: -98.4936,
        latitude: 29.4241,
        longitude: -98.4936
      },
      'San Diego': {
        address: 'San Diego, CA, USA',
        lat: 32.7157,
        lng: -117.1611,
        latitude: 32.7157,
        longitude: -117.1611
      },
      'Dallas': {
        address: 'Dallas, TX, USA',
        lat: 32.7767,
        lng: -96.7970,
        latitude: 32.7767,
        longitude: -96.7970
      }
    };
    
    // Helper function to get coordinates for a location
    const getCoordinates = (locationName: string): Location => {
      // First check if we have extracted this location from trip data
      const cityName = locationName.split(',')[0].trim();
      
      // Check if we have pre-defined coordinates for this location
      for (const [key, coords] of Object.entries(locationCoordinates)) {
        if (locationName.includes(key) || cityName === key) {
          return coords;
        }
      }
      
      // If no match, create a fallback with approximate US coordinates
      // In a real implementation, this would call a geocoding service
      const lat = 39.8283 + (Math.random() * 10 - 5);
      const lng = -98.5795 + (Math.random() * 20 - 10);
      
      return {
        address: locationName,
        lat,
        lng,
        latitude: lat,
        longitude: lng
      };
    };
    
    // Map duty status to segment type
    const mapStatusToType = (status: DutyStatus): RouteSegment['type'] => {
      switch (status) {
        case DutyStatus.D:
          return 'drive';
        case DutyStatus.ON:
          return 'pickup'; // Using pickup as a generic on-duty activity
        case DutyStatus.SB:
          return 'rest';
        case DutyStatus.OFF:
        default:
          return 'dropoff'; // Using dropoff as a generic off-duty activity
      }
    };
    
    // Create segments from entries
    const segments: RouteSegment[] = [];
    
    for (let i = 0; i < validEntries.length; i++) {
      const entry = validEntries[i];
      const nextEntry = i < validEntries.length - 1 ? validEntries[i + 1] : null;
      
      if (!nextEntry) continue; // Skip the last entry as it doesn't form a segment
      
      const startLocation = getCoordinates(entry.location);
      const endLocation = getCoordinates(nextEntry.location);
      
      // Skip if start and end locations are the same (no movement)
      if (startLocation.address === endLocation.address) continue;
      
      // Calculate distance (using Haversine formula)
      const R = 3958.8; // Earth's radius in miles
      const dLat = (endLocation.lat - startLocation.lat) * Math.PI / 180;
      const dLon = (endLocation.lng - startLocation.lng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(startLocation.lat * Math.PI / 180) * Math.cos(endLocation.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = Math.round(R * c * 10) / 10; // Distance in miles, rounded to 1 decimal
      
      // Calculate duration based on average speed of 55 mph
      const duration = Math.round(distance * (60 / 55)); // Duration in minutes
      
      segments.push({
        startLocation,
        endLocation,
        distance,
        duration,
        type: mapStatusToType(entry.status),
        start_time: entry.start_time,
        end_time: entry.end_time
      });
    }
    
    return segments;
  };

  // Normalize location data to ensure both lat/lng and latitude/longitude are present
  const normalizeLocationData = (segments: RouteSegment[]): RouteSegment[] => {
    return segments.map(segment => {
      // Create normalized start location
      const normalizedStartLocation = { ...segment.startLocation };
      
      // Ensure lat/lng properties exist
      if (normalizedStartLocation.lat === undefined && normalizedStartLocation.latitude !== undefined) {
        normalizedStartLocation.lat = normalizedStartLocation.latitude;
      }
      if (normalizedStartLocation.lng === undefined && normalizedStartLocation.longitude !== undefined) {
        normalizedStartLocation.lng = normalizedStartLocation.longitude;
      }
      
      // Ensure latitude/longitude properties exist
      if (normalizedStartLocation.latitude === undefined && normalizedStartLocation.lat !== undefined) {
        normalizedStartLocation.latitude = normalizedStartLocation.lat;
      }
      if (normalizedStartLocation.longitude === undefined && normalizedStartLocation.lng !== undefined) {
        normalizedStartLocation.longitude = normalizedStartLocation.lng;
      }
      
      // Create normalized end location
      const normalizedEndLocation = { ...segment.endLocation };
      
      // Ensure lat/lng properties exist
      if (normalizedEndLocation.lat === undefined && normalizedEndLocation.latitude !== undefined) {
        normalizedEndLocation.lat = normalizedEndLocation.latitude;
      }
      if (normalizedEndLocation.lng === undefined && normalizedEndLocation.longitude !== undefined) {
        normalizedEndLocation.lng = normalizedEndLocation.longitude;
      }
      
      // Ensure latitude/longitude properties exist
      if (normalizedEndLocation.latitude === undefined && normalizedEndLocation.lat !== undefined) {
        normalizedEndLocation.latitude = normalizedEndLocation.lat;
      }
      if (normalizedEndLocation.longitude === undefined && normalizedEndLocation.lng !== undefined) {
        normalizedEndLocation.longitude = normalizedEndLocation.lng;
      }
      
      return {
        ...segment,
        startLocation: normalizedStartLocation,
        endLocation: normalizedEndLocation
      };
    });
  };

  // Render the map view with loading state
  const [mapSegments, setMapSegments] = useState<RouteSegment[]>([]);
  const [isMapLoading, setIsMapLoading] = useState(false);
  
  // Effect to prepare map segments when entries change
  useEffect(() => {
    if (activeTab === 'map' && entries && entries.length > 0) {
      setIsMapLoading(true);
      
      // Use setTimeout to avoid blocking the UI
      setTimeout(() => {
        try {
          const segments = convertEntriesToSegments(entries);
          const normalizedSegments = normalizeLocationData(segments);
          setMapSegments(normalizedSegments);
          console.log('Map segments prepared:', normalizedSegments);
        } catch (error) {
          console.error('Error preparing map segments:', error);
        } finally {
          setIsMapLoading(false);
        }
      }, 100);
    }
  }, [activeTab, entries]);

  // Debug function to log segment data
  const debugMapSegments = () => {
    console.log('Current map segments:', mapSegments);
    
    // Check for any missing lat/lng or latitude/longitude
    const issues = mapSegments.filter(segment => {
      const startHasIssue = !segment.startLocation.lat || !segment.startLocation.lng || 
                           !segment.startLocation.latitude || !segment.startLocation.longitude;
      const endHasIssue = !segment.endLocation.lat || !segment.endLocation.lng || 
                         !segment.endLocation.latitude || !segment.endLocation.longitude;
      return startHasIssue || endHasIssue;
    });
    
    if (issues.length > 0) {
      console.warn('Found segments with coordinate issues:', issues);
    } else {
      console.log('All segments have valid coordinates');
    }
  };

  const renderMapView = () => {
    if (!entries || entries.length === 0) {
      return (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No entries available</h3>
          <p className="mt-1 text-sm text-black">There are no log entries to display on the map.</p>
        </div>
      );
    }
    
    // If map is loading, show loading indicator
    if (isMapLoading) {
      return (
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="flex justify-center items-center h-96">
            <LoadingSpinner text="Preparing map data..." />
          </div>
        </div>
      );
    }
    
    // If no valid segments, show a message
    if (mapSegments.length === 0) {
      return (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No location data</h3>
          <p className="mt-1 text-sm text-black">There are no valid locations to display on the map.</p>
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-4">
              <button 
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded border border-blue-300 hover:bg-blue-200"
                onClick={() => setShowDebug(!showDebug)}
              >
                {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
              </button>
              
              {showDebug && (
                <div className="mt-4 p-4 bg-gray-100 rounded text-left overflow-auto max-h-96">
                  <h4 className="font-bold text-sm mb-2">Trip Data:</h4>
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(tripData, null, 2)}
                  </pre>
                  
                  <h4 className="font-bold text-sm mt-4 mb-2">Log Entries:</h4>
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(entries.map(e => ({ 
                      location: e.location,
                      start_time: e.start_time,
                      status: e.status
                    })), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    // Extract unique locations for the location list
    const uniqueLocations = Array.from(
      new Set(
        entries
          .filter(entry => entry.location && entry.location !== 'Unknown')
          .map(entry => entry.location)
      )
    );
    
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-black">Trip Map</h3>
            <p className="text-sm text-gray-500">
              Showing locations for {formatDate(currentLog?.date || '', 'date')}
            </p>
          </div>
          
          <div className="flex space-x-2">
            {process.env.NODE_ENV !== 'production' && (
              <button 
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-300 hover:bg-gray-200"
                onClick={debugMapSegments}
              >
                Debug Map
              </button>
            )}
            
            <button 
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded border border-blue-300 hover:bg-blue-200"
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {/* Map Container */}
          <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
            <MapView segments={mapSegments} />
          </div>
          
          {/* Debug Panel */}
          {showDebug && (
            <div className="mt-4 p-4 bg-gray-100 rounded text-left overflow-auto max-h-96">
              <h4 className="font-bold text-sm mb-2">Map Segments:</h4>
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(mapSegments.map(segment => ({
                  type: segment.type,
                  start: segment.startLocation.address,
                  end: segment.endLocation.address,
                  startCoords: [segment.startLocation.lat, segment.startLocation.lng],
                  endCoords: [segment.endLocation.lat, segment.endLocation.lng],
                  distance: segment.distance,
                  duration: segment.duration
                })), null, 2)}
              </pre>
              
              <h4 className="font-bold text-sm mt-4 mb-2">Raw Trip Data:</h4>
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify({
                  pickup: (tripData as any)?.pickup_location || (tripData as any)?.pickupLocation,
                  dropoff: (tripData as any)?.dropoff_location || (tripData as any)?.dropoffLocation,
                  current: (tripData as any)?.current_location || (tripData as any)?.currentLocation
                }, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Trip Statistics */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-1">Total Distance</h4>
              <p className="text-2xl font-bold text-blue-900">
                {formatNumber(mapSegments.reduce((sum, segment) => sum + segment.distance, 0))} mi
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-1">Driving Time</h4>
              <p className="text-2xl font-bold text-green-900">{calculateTotalHours(DutyStatus.D).toFixed(1)} hrs</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-1">Locations Visited</h4>
              <p className="text-2xl font-bold text-purple-900">
                {uniqueLocations.length}
              </p>
            </div>
          </div>
          
          {/* Location List */}
          <div className="mt-6">
            <h4 className="font-medium text-black mb-3">Locations ({uniqueLocations.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueLocations.map((location, index) => {
                // Find the first entry with this location
                const entry = entries.find(e => e.location === location);
                return (
                  <div key={index} className="p-3 border rounded-lg bg-gray-50">
                    <div className="font-medium text-black">{location}</div>
                    {entry && (
                      <div className="text-sm text-gray-500 mt-1">
                        {formatTime(entry.start_time)} - {getStatusLabel(entry.status)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Location Timeline */}
          <div className="mt-6">
            <h4 className="font-medium text-black mb-3">Location Timeline</h4>
            <div className="relative">
              <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-gray-200"></div>
              
              {entries
                .filter(entry => entry.location && entry.location !== 'Unknown')
                .map((entry, index) => (
                  <div key={index} className="relative pl-8 pb-6">
                    <div 
                      className="absolute left-5 -translate-x-1/2 w-3 h-3 rounded-full mt-1.5"
                      style={{ backgroundColor: getStatusColor(entry.status) }}
                    ></div>
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <div className="text-sm font-medium text-gray-900 sm:w-32">{formatTime(entry.start_time)}</div>
                      <div className="mt-1 sm:mt-0">
                        <div className="text-sm font-medium text-black">{entry.location}</div>
                        <div className="text-sm text-gray-500">{entry.remarks}</div>
                        <div className="mt-1">
                          <span 
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{ 
                              backgroundColor: `${getStatusColor(entry.status)}20`, 
                              color: getStatusColor(entry.status)
                            }}
                          >
                            {getStatusLabel(entry.status)}
                          </span>
                          {entry.crosses_midnight && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                              🕛 Crosses midnight
                            </span>
                          )}
                          {entry.is_continuation && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                              ➡️ Continuation
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the ELD Log Grid view
  const renderGridView = () => {
    if (!entries || !currentLog) {
      return (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No entries available</h3>
          <p className="mt-1 text-sm text-black">There are no log entries to display for this date.</p>
        </div>
      );
    }
    
    // Convert entries to status changes for the grid
    const statusChanges = entries.map(entry => ({
      time: entry.start_time,
      status: entry.status
    }));
    
    // Convert entries to remarks for the grid
    const remarks = entries
      .filter(entry => entry.remarks && entry.remarks.trim() !== '')
      .map(entry => ({
        time: entry.start_time,
        text: entry.remarks || ''
      }));
    
    // Extract driver and vehicle information from the log
    const driverName = currentLog.driver || 'Unknown Driver';
    const date = new Date(currentLog.date).toLocaleDateString();
    
    // Get location from entries or use a default
    let location = 'Unknown Location';
    if (entries.length > 0 && entries[0].location) {
      // Extract city and state from the location string if possible
      const locationParts = entries[0].location.split(',');
      if (locationParts.length >= 2) {
        // Use first two parts (city, state) for cleaner display
        location = `${locationParts[0].trim()}, ${locationParts[1].trim()}`;
      } else {
        location = entries[0].location;
      }
    } else {
      // Try to safely extract location from tripData
      try {
        if (tripData) {
          // Check different possible locations in the trip data
          const currentLocation = (tripData as any).current_location?.address || 
                                 (tripData as any).currentLocation?.address;
          const pickupLocation = (tripData as any).pickup_location?.address || 
                               (tripData as any).pickupLocation?.address;
          
          if (currentLocation) {
            location = currentLocation;
          } else if (pickupLocation) {
            location = pickupLocation;
          }
        }
      } catch (err) {
        console.error('Error extracting location from trip data:', err);
      }
    }
    
    // Safety records location - use location or default
    const safetyRecordsLocation = `Safety Records Maintained in ${location.split(',')[0] || 'Office'}`;
    
    // Calculate total driving hours
    const drivingHours = entries
      .filter(entry => entry.status === DutyStatus.D)
      .reduce((total, entry) => {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        return total + ((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      }, 0);
    
    // Calculate total on-duty hours
    const onDutyHours = entries
      .filter(entry => entry.status === DutyStatus.ON)
      .reduce((total, entry) => {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        return total + ((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      }, 0);
    
    // Format the date in a more readable format
    const formattedDate = new Date(currentLog.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // New function to download grid as image
    const handleDownloadImage = () => {
      if (!gridRef.current) return;
      
      // Use html2canvas to capture the grid as an image
      html2canvas(gridRef.current).then(canvas => {
        // Create a download link
        const link = document.createElement('a');
        link.download = `eld-log-${currentLog.date}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }).catch(err => {
        console.error('Error generating image:', err);
        alert('Failed to generate image. Please try again.');
      });
    };

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h2 className="text-2xl font-bold text-black">
              Hours of Service Record
            </h2>
            <div className="mt-2 md:mt-0 text-right">
              <div className="text-sm text-black">Day {getDayNumber(currentLog.date)}</div>
              <div className="text-lg font-medium text-black">{formattedDate}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-black uppercase tracking-wider mb-2">Driver Information</h3>
              <div className="space-y-1">
                <p className="text-base font-medium text-black">{driverName}</p>
                <p className="text-sm text-black">Carrier: {currentLog.carrier || 'N/A'}</p>
                <p className="text-sm text-black">Co-Driver: None</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-black uppercase tracking-wider mb-2">Vehicle Information</h3>
              <div className="space-y-1">
                <p className="text-sm text-black">Truck: <span className="font-medium">{currentLog.truckNumber || 'N/A'}</span></p>
                <p className="text-sm text-black">Trailer: <span className="font-medium">{currentLog.trailerNumber || 'N/A'}</span></p>
                <p className="text-sm text-black">Total Miles: <span className="font-medium">{formatNumber(currentLog.totalMiles || 0)}</span></p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-black uppercase tracking-wider mb-2">Hours Summary</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-black">Driving:</span>
                  <span className="text-sm font-medium text-black">{drivingHours.toFixed(1)} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">On-Duty (Not Driving):</span>
                  <span className="text-sm font-medium text-black">{onDutyHours.toFixed(1)} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-black">Total On-Duty:</span>
                  <span className="text-sm font-medium text-black">{(drivingHours + onDutyHours).toFixed(1)} hrs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto eld-log-grid" ref={gridRef}>
          <EldLogGrid
            date={date}
            driverName={driverName}
            location={location}
            homeTerminal={currentLog.carrier || 'HOME (OPERATING CENTER AND ADDRESS)'}
            safetyRecordsLocation={safetyRecordsLocation}
            statusChanges={statusChanges}
            remarks={remarks}
            truckNumber={currentLog.truckNumber || 'N/A'}
            trailerNumbers={currentLog.trailerNumber || 'N/A'}
            totalMiles={currentLog.totalMiles || 0}
            startOdometer={currentLog.startOdometer || 0}
            endOdometer={currentLog.endOdometer || 0}
          />
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-black">
                This electronic logging device grid display meets the requirements of 49 CFR § 395.8(g).
              </p>
            </div>
            <div className="flex space-x-2 mt-3 md:mt-0">
              <button 
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 flex items-center no-print"
                onClick={handlePrint}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Log
              </button>
              <button 
                className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded border border-indigo-200 hover:bg-indigo-100 flex items-center no-print"
                onClick={handleDownloadImage}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Graph
              </button>
              <button 
                className={`px-3 py-1.5 text-sm rounded border flex items-center no-print ${
                  isCertified 
                    ? 'bg-green-100 text-green-700 border-green-300' 
                    : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                }`}
                onClick={handleCertifyLog}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {isCertified ? 'Certified' : 'Certify Log'}
              </button>
              
              {isCertified && (
                <div className="ml-2 text-xs text-green-600 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Certified on {certificationDate ? formatDate(certificationDate, 'date') : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the edit modal
  const renderEditModal = () => {
    if (!editingEntry || !showEditModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <h3 className="text-lg font-bold mb-4 text-black">Edit Log Entry</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                value={editingEntry.status}
                onChange={(e) => setEditingEntry({
                  ...editingEntry,
                  status: e.target.value as DutyStatus
                })}
              >
                {Object.values(DutyStatus).map((status) => (
                  <option key={status} value={status} className="text-black">
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Start Time
              </label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                value={formatTime(editingEntry.start_time).substring(0, 5)}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':').map(Number);
                  const newDate = new Date(editingEntry.start_time);
                  newDate.setHours(hours, minutes);
                  setEditingEntry({
                    ...editingEntry,
                    start_time: newDate.toISOString()
                  });
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                End Time
              </label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                value={formatTime(editingEntry.end_time).substring(0, 5)}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':').map(Number);
                  const newDate = new Date(editingEntry.end_time);
                  newDate.setHours(hours, minutes);
                  setEditingEntry({
                    ...editingEntry,
                    end_time: newDate.toISOString()
                  });
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Location
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                value={editingEntry.location}
                onChange={(e) => setEditingEntry({
                  ...editingEntry,
                  location: e.target.value
                })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Remarks
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                value={editingEntry.remarks}
                onChange={(e) => setEditingEntry({
                  ...editingEntry,
                  remarks: e.target.value
                })}
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Reason for Edit
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Explain why you're editing this entry"
                rows={2}
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              className="px-4 py-2 bg-gray-200 text-black rounded-md hover:bg-gray-300"
              onClick={() => {
                setShowEditModal(false);
                setEditingEntry(null);
                setEditReason('');
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={saveEditChanges}
              disabled={!editReason.trim()}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main render function
  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center py-10"><LoadingSpinner text="Loading trip data..." /></div>;
    }
    
    if (isError && !tripData) {
      return <div className="text-red-500">Error loading trip data</div>;
    }
    
    if (!tripData) {
      return <div>Please select a valid trip to view ELD logs</div>;
    }
    
    if (!logs || logs.length === 0) {
      return <div>No ELD logs could be generated from the trip data</div>;
    }
    
    return (
      <div>
        {renderNavigationControls()}
        {renderCurrentStatus()}
        {renderInfoHeader()}
        
        {activeTab === 'grid' && renderGridView()}
        {activeTab === 'table' && renderRemarksAndLocation()}
        {activeTab === 'map' && renderMapView()}
        
        {renderHoursSummary()}
      </div>
    );
  };

  return (
    <div className="eld-log-viewer">
      {renderContent()}
      {renderEditModal()}
      {renderCertifyModal()}
    </div>
  );
};

export default EnhancedEldLogViewer;
