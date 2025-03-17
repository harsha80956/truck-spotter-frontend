import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { useApi } from '../hooks/useApi';
import { TripDetails, DutyStatus } from '../types';
import { LoadingSpinner, ErrorMessage } from './ui';
import { formatDate, formatNumber } from '../utils/errorHandling';
import { BackendTripRoute } from '../store/slices/tripSlice';
import { BackendDailyLog } from '../store/slices/eldLogSlice';
import { useNavigate } from 'react-router-dom';
import { addLogEntry } from '../store/slices/eldLogSlice';

interface TripState {
  currentTrip: BackendTripRoute | null;
}

interface EldLogState {
  dailyLogs: BackendDailyLog[];
}

interface Location {
  address: string;
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
}

interface TripPlannerFormData {
  currentLocation: Location;
  pickupLocation: Location;
  deliveryLocation: Location;
  currentCycleHours: number;
  currentStatus: DutyStatus;
  startDateTime: string;
  vehicleDetails?: {
    truckNumber: string;
    trailerNumber: string;
    odometer: number;
  };
}

interface TripPlannerState {
  loading: boolean;
  error: string | null;
  route: any | null;
}

const TripPlanner: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { 
    currentLocation, 
    pickupLocation, 
    dropoffLocation 
  } = useAppSelector(state => state.location);
  
  const { currentTrip } = useAppSelector((state): TripState => state.trip as TripState);
  const { dailyLogs } = useAppSelector((state): EldLogState => ({
    dailyLogs: state.eldLog.dailyLogs.map(log => ({
      ...log,
      driver_name: log.driver,
      carrier_name: log.carrier,
      truck_number: log.truckNumber,
      trailer_number: log.trailerNumber,
      total_miles: log.totalMiles,
      entries: log.entries || []
    }))
  }));
  
  const [currentAddress, setCurrentAddress] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [cycleHours, setCycleHours] = useState(0);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  const { 
    loading, 
    error, 
    geocodeAddress, 
    planTripWithDetails, 
    generateLogsForTrip 
  } = useApi();

  const [formData, setFormData] = useState<TripPlannerFormData>({
    currentLocation: { address: '', latitude: 0, longitude: 0 },
    pickupLocation: { address: '', latitude: 0, longitude: 0 },
    deliveryLocation: { address: '', latitude: 0, longitude: 0 },
    currentCycleHours: 0,
    currentStatus: DutyStatus.OFF,
    startDateTime: new Date().toISOString().slice(0, 16),
    vehicleDetails: {
      truckNumber: '',
      trailerNumber: '',
      odometer: 0
    }
  });

  const [state, setState] = useState<TripPlannerState>({
    loading: false,
    error: null,
    route: null
  });

  // Reset validation errors when inputs change
  useEffect(() => {
    if (formSubmitted) {
      validateInputs();
    }
  }, [currentAddress, pickupAddress, dropoffAddress, cycleHours, formSubmitted]);

  // Update form data when Redux location state changes
  useEffect(() => {
    if (currentLocation) {
      setFormData(prev => ({
        ...prev,
        currentLocation: {
          address: currentLocation.address,
          latitude: currentLocation.lat,
          longitude: currentLocation.lng
        }
      }));
    }
  }, [currentLocation]);

  useEffect(() => {
    if (pickupLocation) {
      setFormData(prev => ({
        ...prev,
        pickupLocation: {
          address: pickupLocation.address,
          latitude: pickupLocation.lat,
          longitude: pickupLocation.lng
        }
      }));
    }
  }, [pickupLocation]);

  useEffect(() => {
    if (dropoffLocation) {
      setFormData(prev => ({
        ...prev,
        deliveryLocation: {
          address: dropoffLocation.address,
          latitude: dropoffLocation.lat,
          longitude: dropoffLocation.lng
        }
      }));
    }
  }, [dropoffLocation]);

  // Update cycle hours in form data when it changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      currentCycleHours: cycleHours
    }));
  }, [cycleHours]);

  const validateInputs = () => {
    const errors: {[key: string]: string} = {};
    
    if (!currentAddress.trim()) {
      errors.currentAddress = 'Current location is required';
    }
    
    if (!pickupAddress.trim()) {
      errors.pickupAddress = 'Pickup location is required';
    }
    
    if (!dropoffAddress.trim()) {
      errors.dropoffAddress = 'Dropoff location is required';
    }
    
    if (cycleHours < 0 || cycleHours > 70) {
      errors.cycleHours = 'Cycle hours must be between 0 and 70';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGeocodeCurrentLocation = async () => {
    if (!currentAddress.trim()) {
      setValidationErrors({...validationErrors, currentAddress: 'Current location is required'});
      return;
    }
    
    try {
      await geocodeAddress(currentAddress, 'current');
      // Clear validation error if successful
      const newErrors = {...validationErrors};
      delete newErrors.currentAddress;
      setValidationErrors(newErrors);
    } catch (err) {
      console.error('Error geocoding current location:', err);
      setValidationErrors({
        ...validationErrors, 
        currentAddress: 'Failed to geocode address. Please try a different address.'
      });
    }
  };

  const handleGeocodePickupLocation = async () => {
    if (!pickupAddress.trim()) {
      setValidationErrors({...validationErrors, pickupAddress: 'Pickup location is required'});
      return;
    }
    
    try {
      await geocodeAddress(pickupAddress, 'pickup');
      // Clear validation error if successful
      const newErrors = {...validationErrors};
      delete newErrors.pickupAddress;
      setValidationErrors(newErrors);
    } catch (err) {
      console.error('Error geocoding pickup location:', err);
      setValidationErrors({
        ...validationErrors, 
        pickupAddress: 'Failed to geocode address. Please try a different address.'
      });
    }
  };

  const handleGeocodeDropoffLocation = async () => {
    if (!dropoffAddress.trim()) {
      setValidationErrors({...validationErrors, dropoffAddress: 'Dropoff location is required'});
      return;
    }
    
    try {
      await geocodeAddress(dropoffAddress, 'dropoff');
      // Clear validation error if successful
      const newErrors = {...validationErrors};
      delete newErrors.dropoffAddress;
      setValidationErrors(newErrors);
    } catch (err) {
      console.error('Error geocoding dropoff location:', err);
      setValidationErrors({
        ...validationErrors, 
        dropoffAddress: 'Failed to geocode address. Please try a different address.'
      });
    }
  };

  const handlePlanTrip = async () => {
    setFormSubmitted(true);
    
    if (!validateInputs()) {
      return;
    }
    
    if (!currentLocation || !pickupLocation || !dropoffLocation) {
      setValidationErrors({
        ...validationErrors,
        form: 'Please geocode all locations before planning a trip'
      });
      return;
    }

    try {
      const tripDetails: TripDetails = {
        currentLocation,
        pickupLocation,
        dropoffLocation,
        currentCycleHours: cycleHours,
      };

      const trip = await planTripWithDetails(tripDetails);
      console.log('Trip planned:', trip);
      
      // Generate ELD logs for the trip
      if (trip && trip.id) {
        try {
          await generateLogsForTrip(trip.id);
        } catch (logErr) {
          console.error('Error generating ELD logs:', logErr);
          // Don't block the user if ELD log generation fails
          setValidationErrors({
            ...validationErrors,
            eldLogs: 'Failed to generate ELD logs, but trip was planned successfully.'
          });
        }
      }
      
      // Clear form errors on success
      const newErrors = {...validationErrors};
      delete newErrors.form;
      setValidationErrors(newErrors);
      
      // Navigate to the trip details page
      if (trip && trip.id) {
        navigate(`/trips/${trip.id}`);
      }
    } catch (err) {
      console.error('Error planning trip:', err);
      setValidationErrors({
        ...validationErrors,
        form: 'Failed to plan trip. Please try again with different locations.'
      });
    }
  };

  // Calculate day numbers for all logs based on chronological order
  const getDayNumber = (date: string) => {
    if (!dailyLogs || dailyLogs.length === 0) return 1;
    
    // Sort dates to determine chronological order
    const sortedDates = [...dailyLogs].sort((a, b) => {
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

  // Function to render the status line for the ELD log grid
  const renderStatusLine = (entries: any[] | undefined, log: BackendDailyLog) => {
    if (!entries || entries.length === 0) return null;
    
    // Status row positioning map - match DOT paper logbook format
    const statusMap: Record<string, number> = {
      'OFF': 3.5,     // First row - Off Duty
      'SB': 10.5,     // Second row - Sleeper Berth
      'D': 17.5,      // Third row - Driving
      'ON': 24.5      // Fourth row - On Duty (Not Driving)
    };
    
    // Sort entries by time
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    
    // Create points to draw the path
    const points: Array<{x: number, y: number, entry: any, isStart: boolean, time: Date}> = [];
    
    // Parse the date from the first entry to get day boundaries
    const entryDate = sortedEntries.length > 0 ? new Date(sortedEntries[0].start_time) : new Date();
    const dayStart = new Date(entryDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(entryDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Handle previous day entries that extend into current day
    let previousDayEntry = null;
    for (const entry of sortedEntries) {
      const entryStartTime = new Date(entry.start_time);
      if (entryStartTime < dayStart) {
        previousDayEntry = entry;
      }
    }
    
    // If we have an entry from the previous day, add it as a starting point
    if (previousDayEntry) {
      const entryEndTime = new Date(previousDayEntry.end_time);
      if (entryEndTime > dayStart) {
        const y = statusMap[previousDayEntry.status] || 0;
        points.push({
          x: 0, // Start at midnight
          y,
          entry: previousDayEntry,
          isStart: false,
          time: dayStart
        });
      }
    } else if (sortedEntries.length > 0) {
      // If no previous day entry but we have entries, start with the first entry's status at midnight
      const firstEntry = sortedEntries[0];
      const firstEntryStartTime = new Date(firstEntry.start_time);
      
      // Only add this if the first entry starts after midnight (otherwise it will be added normally)
      if (firstEntryStartTime > dayStart) {
        // Default to Off Duty if no previous status is known
        const y = statusMap['OFF'];
        points.push({
          x: 0, // Start at midnight
          y,
          entry: firstEntry,
          isStart: false,
          time: dayStart
        });
      }
    }
    
    sortedEntries.forEach(entry => {
      const startTime = new Date(entry.start_time);
      const endTime = new Date(entry.end_time);
      
      // Ensure times are within the day bounds
      const clampedStartTime = new Date(Math.max(dayStart.getTime(), startTime.getTime()));
      const clampedEndTime = new Date(Math.min(dayEnd.getTime(), endTime.getTime()));
      
      // Only add if the entry is actually within the current day
      if (clampedEndTime > clampedStartTime) {
        // Calculate hour percentage through the day (0-100%)
        const startHour = clampedStartTime.getHours() + (clampedStartTime.getMinutes() / 60);
        const endHour = clampedEndTime.getHours() + (clampedEndTime.getMinutes() / 60);
        
        const startPercent = (startHour / 24) * 100;
        const endPercent = (endHour / 24) * 100;
        
        // Get Y position
        const y = statusMap[entry.status] || 0;
        
        // Add the start and end points
        points.push({ 
          x: startPercent, 
          y, 
          entry,
          isStart: true,
          time: clampedStartTime
        });
        
        points.push({ 
          x: endPercent, 
          y, 
          entry,
          isStart: false,
          time: clampedEndTime
        });
      }
    });
    
    // Handle entries that extend into the next day
    const entriesExtendingToNextDay = sortedEntries.filter(entry => {
      const entryEndTime = new Date(entry.end_time);
      return entryEndTime > dayEnd;
    });
    
    // If we have an entry extending to the next day, ensure we have a point at midnight
    if (entriesExtendingToNextDay.length > 0) {
      const lastEntry = entriesExtendingToNextDay[0];
      const y = statusMap[lastEntry.status] || 0;
      
      // Add a point at the end of the day
      points.push({
        x: 100, // End at midnight
        y,
        entry: lastEntry,
        isStart: false,
        time: dayEnd
      });
    } else if (points.length > 0) {
      // If no entry extends to next day, but we have entries, end with the last status at midnight
      const lastPoint = points[points.length - 1];
      
      // Only add this if the last point isn't already at the end of day
      if (lastPoint.x < 100) {
        points.push({
          x: 100, // End at midnight
          y: lastPoint.y,
          entry: lastPoint.entry,
          isStart: false,
          time: dayEnd
        });
      }
    }
    
    // Sort points by x (time)
    points.sort((a, b) => a.x - b.x);
    
    // Create path string for SVG
    if (points.length < 2) return null;
    
    let path = `M ${points[0].x}% ${points[0].y}px`;
    
    for (let i = 1; i < points.length; i++) {
      if (points[i].y !== points[i-1].y) {
        // Add vertical line if status changed
        path += ` L ${points[i].x}% ${points[i-1].y}px`;  // Vertical line start
        path += ` L ${points[i].x}% ${points[i].y}px`;    // Vertical line end
      } else {
        // Continue horizontal line
        path += ` L ${points[i].x}% ${points[i].y}px`;
      }
    }
    
    // Create tooltips for each segment and time markers
    const tooltips = [];
    const timeMarkers = [];
    
    // Add time markers at important status changes for key data points
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const isStatusChangePoint = 
        i === 0 || 
        i === points.length - 1 || 
        (i > 0 && points[i].y !== points[i-1].y);
      
      // Add time markers at status change points for better data visibility
      if (isStatusChangePoint) {
        const timeString = formatDate(point.time.toISOString(), 'time');
        const xPos = point.x;
        const yPos = point.y;
        
        timeMarkers.push(
          <g key={`marker-${i}`} className="time-marker" transform={`translate(${xPos}%, ${yPos}px)`}>
            <line 
              x1="0" 
              y1="-2" 
              x2="0" 
              y2="2" 
              stroke="black" 
              strokeWidth="1"
            />
            <text 
              x="0" 
              y="-3" 
              textAnchor="middle" 
              className="text-[6px] font-medium fill-gray-700"
              transform="rotate(-35)"
            >
              {timeString}
            </text>
          </g>
        );
      }
    }
    
    // Create the segment tooltips
    for (let i = 0; i < points.length - 1; i++) {
      // Only create tooltips between consecutive points from the same entry
      if (points[i].entry === points[i+1].entry && points[i].y === points[i+1].y) {
        const entry = points[i].entry;
        const startX = points[i].x;
        const endX = points[i+1].x;
        const y = points[i].y;
        
        // Calculate duration for tooltips
        const startTime = points[i].time;
        const endTime = points[i+1].time;
        const durationHours = ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) || 0).toFixed(1);
        
        // Get status label
        const getStatusLabel = (status: string) => {
          switch (status) {
            case 'OFF': return 'Off Duty';
            case 'SB': return 'Sleeper Berth';
            case 'D': return 'Driving';
            case 'ON': return 'On Duty (Not Driving)';
            default: return status || 'Unknown';
          }
        };
        
        // Create title for the segment tooltip
        const tooltipTitle = `${getStatusLabel(entry.status)}: ${formatDate(startTime.toISOString(), 'time')} - ${formatDate(endTime.toISOString(), 'time')} (${durationHours}h)`;
        const tooltipLocation = entry.location ? `Location: ${entry.location}` : '';
        
        tooltips.push(
          <g key={`tooltip-${i}`}>
            {/* Invisible wider line for better hover detection */}
            <line 
              x1={`${startX}%`} 
              y1={`${y}px`}
              x2={`${endX}%`} 
              y2={`${y}px`}
              stroke="transparent" 
              strokeWidth="12"
              className="cursor-pointer"
            >
              <title>{tooltipTitle}{tooltipLocation ? `\n${tooltipLocation}` : ''}</title>
            </line>
          </g>
        );
      }
    }
    
    // Create mileage data overlay for driving segments
    const renderMileageData = () => {
      // If there's no total miles data, skip this
      if (!log.total_miles) return null;
      
      // Filter for driving status entries only
      const drivingEntries = sortedEntries.filter(entry => entry.status === 'D');
      
      if (drivingEntries.length === 0) return null;
      
      // Calculate miles per driving segment based on duration
      const totalDrivingMinutes = drivingEntries.reduce((total, entry) => {
        const startTime = new Date(Math.max(dayStart.getTime(), new Date(entry.start_time).getTime()));
        const endTime = new Date(Math.min(dayEnd.getTime(), new Date(entry.end_time).getTime()));
        return total + ((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      }, 0);
      
      // Create data points for mileage accumulation
      const mileagePoints: Array<{x: number, y: number, miles: number, time: Date}> = [];
      let accumulatedMiles = 0;
      
      // Start at 0 miles at beginning of day
      mileagePoints.push({
        x: 0,
        y: 28, // Position at bottom of chart for visualization
        miles: 0,
        time: dayStart
      });
      
      // For each driving segment, calculate accumulated miles
      drivingEntries.forEach(entry => {
        const startTime = new Date(Math.max(dayStart.getTime(), new Date(entry.start_time).getTime()));
        const endTime = new Date(Math.min(dayEnd.getTime(), new Date(entry.end_time).getTime()));
        
        // Calculate entry duration and percentage of total driving
        const entryMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        if (entryMinutes <= 0) return; // Skip if no duration
        
        const entryPercentage = entryMinutes / totalDrivingMinutes;
        // Ensure total_miles is not undefined
        const totalMiles = log.total_miles || 0;
        const entryMiles = totalMiles * entryPercentage;
        
        // Calculate start position
        const startHour = startTime.getHours() + (startTime.getMinutes() / 60);
        const startPercent = (startHour / 24) * 100;
        
        // Add start point with current accumulated miles
        mileagePoints.push({
          x: startPercent,
          y: 28,
          miles: accumulatedMiles,
          time: startTime
        });
        
        // Update accumulated miles
        accumulatedMiles += entryMiles;
        
        // Calculate end position
        const endHour = endTime.getHours() + (endTime.getMinutes() / 60);
        const endPercent = (endHour / 24) * 100;
        
        // Add end point with updated accumulated miles
        mileagePoints.push({
          x: endPercent,
          y: 28,
          miles: accumulatedMiles,
          time: endTime
        });
      });
      
      // Add end of day point if needed
      if (mileagePoints[mileagePoints.length - 1].x < 100) {
        mileagePoints.push({
          x: 100,
          y: 28,
          miles: accumulatedMiles, // Final miles total
          time: dayEnd
        });
      }
      
      // Create SVG path for mileage line
      let mileagePath = '';
      if (mileagePoints.length >= 2) {
        // Calculate max height of 15px for visualization
        const maxY = 15;
        const totalMiles = log.total_miles || 0;
        
        mileagePath = `M ${mileagePoints[0].x}% ${28}px`;
        
        for (let i = 1; i < mileagePoints.length; i++) {
          const point = mileagePoints[i];
          // Scale miles to a percentage of total for y-position
          const scaledY = 28 - (point.miles / totalMiles) * maxY;
          mileagePath += ` L ${point.x}% ${scaledY}px`;
        }
      }
      
      // Show milestone markers at key mileage points
      const milestonePoints = mileagePoints.filter((point, i, arr) => 
        // Only show at start, end, or significant mile increases (10% of total)
        i === 0 || i === arr.length - 1 || 
        (i > 0 && (point.miles - arr[i-1].miles) > (log.total_miles || 0) * 0.1)
      );
      
      // Get total miles safely
      const totalMiles = log.total_miles || 0;
      
      return (
        <>
          {/* Mileage accumulation line */}
          {mileagePath && (
            <path 
              d={mileagePath} 
              stroke="#2563EB" 
              strokeWidth="1.5" 
              strokeDasharray="2,2"
              fill="none"
            />
          )}
          
          {/* Milestone markers */}
          {milestonePoints.map((point, i) => (
            <g key={`mile-${i}`}>
              <circle 
                cx={`${point.x}%`} 
                cy={`${28 - (point.miles / totalMiles) * 15}px`} 
                r="2.5"
                fill="#2563EB"
                stroke="white"
                strokeWidth="1"
              />
              {/* Only show text for significant milestones */}
              {(i === 0 || i === milestonePoints.length - 1 || point.miles > 20) && (
                <text 
                  x={`${point.x}%`} 
                  y={`${28 - (point.miles / totalMiles) * 15 - 5}px`}
                  textAnchor="middle" 
                  fontSize="7" 
                  fill="#2563EB"
                  fontWeight="500"
                >
                  {Math.round(point.miles)} mi
                </text>
              )}
            </g>
          ))}
        </>
      );
    };
    
    // Render speed indicators for driving segments
    const renderSpeedIndicators = () => {
      // Filter for driving entries only
      const drivingEntries = sortedEntries.filter(entry => entry.status === 'D');
      if (drivingEntries.length === 0 || !log.total_miles) return null;
      
      // Skip if there are no miles to calculate speeds
      if (log.total_miles <= 0) return null;
      
      // Calculate total driving time
      const totalDrivingMinutes = drivingEntries.reduce((total, entry) => {
        const startTime = new Date(Math.max(dayStart.getTime(), new Date(entry.start_time).getTime()));
        const endTime = new Date(Math.min(dayEnd.getTime(), new Date(entry.end_time).getTime()));
        return total + ((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      }, 0);
      
      const speedMarkers: React.ReactNode[] = [];
      const totalMiles = log.total_miles || 0;
      
      // Calculate speed for each driving segment
      drivingEntries.forEach((entry, index) => {
        const startTime = new Date(Math.max(dayStart.getTime(), new Date(entry.start_time).getTime()));
        const endTime = new Date(Math.min(dayEnd.getTime(), new Date(entry.end_time).getTime()));
        
        // Calculate segment duration in minutes
        const entryMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        if (entryMinutes < 5) return; // Skip very short segments
        
        // Calculate percentage of total driving time and miles
        const entryPercentage = entryMinutes / totalDrivingMinutes;
        const entryMiles = totalMiles * entryPercentage;
        
        // Calculate average speed (mph)
        const entryHours = entryMinutes / 60;
        const avgSpeed = Math.round(entryMiles / entryHours);
        
        // Calculate position in the middle of the segment
        const midTime = new Date((startTime.getTime() + endTime.getTime()) / 2);
        const midHour = midTime.getHours() + (midTime.getMinutes() / 60);
        const xPos = (midHour / 24) * 100;
        
        // Only show if reasonable speed
        if (avgSpeed <= 0 || avgSpeed > 120) return;
        
        // Add speed marker
        speedMarkers.push(
          <g key={`speed-${index}`} transform={`translate(${xPos}%, ${statusMap['D']}px)`}>
            <circle 
              cx="0" 
              cy="0" 
              r="8"
              fill="#047857"
              fillOpacity="0.7"
              stroke="white"
              strokeWidth="1"
            />
            <text 
              x="0" 
              y="0" 
              textAnchor="middle" 
              dominantBaseline="middle"
              fontSize="7" 
              fontWeight="bold"
              fill="white"
            >
              {avgSpeed}
            </text>
            <text 
              x="0" 
              y="12" 
              textAnchor="middle" 
              fontSize="6" 
              fill="#047857"
              fontWeight="500"
            >
              mph
            </text>
            <title>Average Speed: {avgSpeed} mph
Duration: {Math.round(entryMinutes)} min
Distance: ~{Math.round(entryMiles)} mi</title>
          </g>
        );
      });
      
      return speedMarkers;
    };
    
    return (
      <>
        {/* Main status line - thick black line like DOT paper logs */}
        <path 
          d={path} 
          stroke="black" 
          strokeWidth="3" 
          fill="none"
          className="status-line"
        />
        
        {/* Mileage data visualization */}
        {renderMileageData()}
        
        {/* Speed indicators */}
        {renderSpeedIndicators()}
        
        {/* Tooltips and time markers */}
        {tooltips}
        {timeMarkers}
      </>
    );
  };
  
  // Render location markers at status change points
  const renderLocationMarkers = (entries: any[] | undefined) => {
    if (!entries) return null;
    
    return entries.map((entry, index) => {
      const location = entry.start_location || entry.end_location;
      if (!location) return null;
      
      return (
        <div key={index} className="absolute transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-white rounded-lg shadow-lg p-2 text-xs">
            {location.address}
          </div>
        </div>
      );
    });
  };

  const handleLocationChange = async (
    locationKey: keyof Pick<TripPlannerFormData, 'currentLocation' | 'pickupLocation' | 'deliveryLocation'>,
    address: string
  ) => {
    try {
      // Update the form data with the new address
      setFormData(prev => ({
        ...prev,
        [locationKey]: {
          ...prev[locationKey],
          address
        }
      }));

      // Update the corresponding address state
      if (locationKey === 'currentLocation') {
        setCurrentAddress(address);
      } else if (locationKey === 'pickupLocation') {
        setPickupAddress(address);
      } else {
        setDropoffAddress(address);
      }

      // Clear any previous validation errors for this field
      const fieldError = locationKey === 'currentLocation' ? 'currentAddress' :
                        locationKey === 'pickupLocation' ? 'pickupAddress' :
                        'dropoffAddress';
      
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldError];
        return newErrors;
      });

    } catch (err) {
      console.error('Error updating location:', err);
      setState(prev => ({ ...prev, error: 'Failed to update address' }));
    }
  };

  // Add getCurrentLocation function to get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setValidationErrors(prev => ({
        ...prev,
        currentAddress: 'Geolocation is not supported by your browser'
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use reverse geocoding to get address from coordinates
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'Spotter-App/1.0',
                'Accept-Language': 'en'
              }
            }
          );
          
          if (!response.ok) {
            throw new Error('Reverse geocoding failed');
          }

          const data = await response.json();
          const address = data.display_name;

          // Update form data with current location
          setFormData(prev => ({
            ...prev,
            currentLocation: {
              address,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          }));

          // Update the current address state
          setCurrentAddress(address);

          // Clear validation errors for current address
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.currentAddress;
            return newErrors;
          });

          // Trigger geocoding to store in Redux
          await geocodeAddress(address, 'current');
          
          setState(prev => ({ ...prev, loading: false, error: null }));
        } catch (err) {
          console.error('Error getting current location:', err);
          setState(prev => ({ 
            ...prev, 
            loading: false,
            error: 'Failed to get current location. Please enter address manually.'
          }));
          setValidationErrors(prev => ({
            ...prev,
            currentAddress: 'Failed to get current location. Please enter address manually.'
          }));
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setState(prev => ({ 
          ...prev, 
          loading: false,
          error: 'Failed to get current location. Please enter address manually.'
        }));
        setValidationErrors(prev => ({
          ...prev,
          currentAddress: `Failed to get current location: ${error.message}`
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const calculateRoute = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Validate required data
      if (!currentLocation || !pickupLocation || !dropoffLocation) {
        throw new Error('All locations must be geocoded before calculating the route');
      }
      
      console.log('Current location:', currentLocation);
      console.log('Pickup location:', pickupLocation);
      console.log('Dropoff location:', dropoffLocation);
      
      // Prepare data for API call
      const routeData = {
        currentLocation: {
          address: currentLocation?.address || '',
          latitude: currentLocation?.lat || 0,
          longitude: currentLocation?.lng || 0
        },
        pickupLocation: {
          address: pickupLocation?.address || '',
          latitude: pickupLocation?.lat || 0,
          longitude: pickupLocation?.lng || 0
        },
        dropoffLocation: {
          address: dropoffLocation?.address || '',
          latitude: dropoffLocation?.lat || 0,
          longitude: dropoffLocation?.lng || 0
        },
        currentCycleHours: cycleHours,
        currentStatus: formData.currentStatus,
        startDateTime: formData.startDateTime,
        vehicleDetails: formData.vehicleDetails
      };
      
      console.log('Calculating route with data:', routeData);
      
      // Try the API call with error handling
      try {
        // First try with the /api/route-calculator endpoint
        const response = await fetch('/api/route-calculator/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(routeData),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API error response:', errorData);
          throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`);
        }
        
        const routeResult = await response.json();
        console.log('Route calculation successful:', routeResult);
        
        // Update state with the calculated route
        setState(prev => ({
          ...prev,
          route: routeResult,
          error: null,
        }));
        
        // If the trip has an ID, navigate to the trip details page
        if (routeResult && routeResult.id) {
          navigate(`/trips/${routeResult.id}`);
        }
        
        return; // Exit early if successful
      } catch (apiError) {
        console.error('Primary API endpoint failed:', apiError);
        
        // Try fallback to the planTripWithDetails function from useApi hook
        try {
          console.log('Trying fallback method...');
          const tripDetails = {
            currentLocation,
            pickupLocation,
            dropoffLocation,
            currentCycleHours: cycleHours,
          };
          
          // Use the planTripWithDetails function from useApi hook
          const trip = await planTripWithDetails(tripDetails);
          console.log('Trip planned using fallback:', trip);
          
          // Update state with the calculated route
          setState(prev => ({
            ...prev,
            route: trip,
            error: null,
          }));
          
          // If the trip has an ID, navigate to the trip details page
          if (trip && trip.id) {
            navigate(`/trips/${trip.id}`);
          }
          
          return; // Exit early if successful
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
          throw new Error('Both API endpoints failed. Please try again later.');
        }
      }
    } catch (err) {
      console.error('Error calculating route:', err);
      setState(prev => ({ 
        ...prev, 
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to calculate route' 
      }));
    }
  };

  // Helper function to get descriptive location names
  const getLocationLabel = (segmentType: string | undefined, position: 'start' | 'end'): string => {
    if (!segmentType) {
      return position === 'start' ? 'Starting point' : 'Destination';
    }
    
    switch (segmentType.toLowerCase()) {
      case 'pickup':
        return 'Pickup location';
      case 'dropoff':
        return 'Delivery location';
      case 'rest':
        return 'Rest stop';
      case 'sleep':
        return 'Sleep location';
      case 'fuel':
        return 'Fuel stop';
      case 'drive':
        return position === 'start' ? 'Starting point' : 'Destination';
      default:
        return position === 'start' ? 'Starting point' : 'Destination';
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Global error message */}
      {state.error && (
        <ErrorMessage 
          message="API Error" 
          details={state.error}
          variant="error"
        />
      )}
      
      {/* Form validation error */}
      {validationErrors.form && (
        <ErrorMessage 
          message="Form Error" 
          details={validationErrors.form}
          variant="error"
        />
      )}
      
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Trip Information</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Location
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                <input
                  type="text"
                  className={`w-full sm:rounded-l-md rounded-md sm:rounded-r-none border ${validationErrors.currentAddress ? 'border-red-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter current location"
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                />
                <div className="flex w-full sm:w-auto">
                  <button
                    type="button"
                    className="flex-1 sm:flex-none bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-l-md sm:rounded-none border-blue-600"
                    onClick={handleGeocodeCurrentLocation}
                    disabled={state.loading}
                  >
                    {state.loading ? '...' : 'Geocode'}
                  </button>
                  <button
                    type="button"
                    className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-r-md transition-colors"
                    onClick={getCurrentLocation}
                    disabled={state.loading}
                  >
                    {state.loading ? '...' : 'Current'}
                  </button>
                </div>
              </div>
              {currentLocation && (
                <div className="mt-1 text-xs text-gray-500">
                  Coordinates: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                </div>
              )}
              {validationErrors.currentAddress && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.currentAddress}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Location
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                <input
                  type="text"
                  className={`w-full sm:rounded-l-md rounded-md sm:rounded-r-none border ${validationErrors.pickupAddress ? 'border-red-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter pickup location"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                />
                <button
                  type="button"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 sm:rounded-r-md rounded-md sm:rounded-l-none transition-colors"
                  onClick={handleGeocodePickupLocation}
                  disabled={state.loading}
                >
                  {state.loading ? '...' : 'Geocode'}
                </button>
              </div>
              {pickupLocation && (
                <div className="mt-1 text-xs text-gray-500">
                  Coordinates: {pickupLocation.lat.toFixed(6)}, {pickupLocation.lng.toFixed(6)}
                </div>
              )}
              {validationErrors.pickupAddress && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.pickupAddress}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dropoff Location
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                <input
                  type="text"
                  className={`w-full sm:rounded-l-md rounded-md sm:rounded-r-none border ${validationErrors.dropoffAddress ? 'border-red-500' : 'border-gray-300'} px-3 py-2  focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter dropoff location"
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                />
                <button
                  type="button"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 sm:rounded-r-md rounded-md sm:rounded-l-none transition-colors"
                  onClick={handleGeocodeDropoffLocation}
                  disabled={state.loading}
                >
                  {state.loading ? '...' : 'Geocode'}
                </button>
              </div>
              {dropoffLocation && (
                <div className="mt-1 text-xs text-gray-500">
                  Coordinates: {dropoffLocation.lat.toFixed(6)}, {dropoffLocation.lng.toFixed(6)}
                </div>
              )}
              {validationErrors.dropoffAddress && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.dropoffAddress}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Cycle Hours</label>
              <input
                type="number"
                value={cycleHours}
                onChange={(e) => setCycleHours(Number(e.target.value))}
                min="0"
                max="70"
                step="0.25"
                className={`mt-1 block w-full px-3 py-2 border ${validationErrors.cycleHours ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              {validationErrors.cycleHours && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.cycleHours}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
              <select
                value={formData.currentStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, currentStatus: e.target.value as DutyStatus }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
              >
                <option value={DutyStatus.OFF}>Off Duty</option>
                <option value={DutyStatus.SB}>Sleeper Berth</option>
                <option value={DutyStatus.D}>Driving</option>
                <option value={DutyStatus.ON}>On Duty (Not Driving)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date/Time</label>
              <input
                type="datetime-local"
                value={formData.startDateTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startDateTime: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6 border-t pt-4">
          <h3 className="text-lg font-medium mb-3 text-gray-800">Vehicle Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Truck Number</label>
              <input
                type="text"
                value={formData.vehicleDetails?.truckNumber}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vehicleDetails: { ...prev.vehicleDetails!, truckNumber: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trailer Number</label>
              <input
                type="text"
                value={formData.vehicleDetails?.trailerNumber}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vehicleDetails: { ...prev.vehicleDetails!, trailerNumber: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Odometer</label>
              <input
                type="number"
                value={formData.vehicleDetails?.odometer}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vehicleDetails: { ...prev.vehicleDetails!, odometer: Number(e.target.value) }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                min="0"
                step="1"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <button
            onClick={calculateRoute}
            disabled={state.loading || !currentLocation || !pickupLocation || !dropoffLocation}
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
          >
            {state.loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Calculating Route...
              </>
            ) : state.error ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Try Again
              </>
            ) : 'Calculate Route'}
          </button>
        </div>
      </div>
      
      {/* ELD Logs error */}
      {validationErrors.eldLogs && (
        <ErrorMessage 
          message="ELD Logs Warning" 
          details={validationErrors.eldLogs}
          variant="warning"
        />
      )}
      
      {currentTrip && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Trip Details</h2>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-blue-800">Total Distance</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-800">{formatNumber(currentTrip.total_distance)} miles</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-green-800">Total Duration</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-800">
                  {currentTrip.total_duration !== undefined ? `${((currentTrip.total_duration || 0) / 60).toFixed(2)} hours` : 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-3 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">Start Time</p>
                <p className="font-semibold text-gray-800">{formatDate(currentTrip.start_time)}</p>
              </div>
              
              <div className="p-3 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">End Time</p>
                <p className="font-semibold text-gray-800">{formatDate(currentTrip.end_time)}</p>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4 flex items-center text-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Route Segments
              </h3>
              
              {currentTrip.segments && currentTrip.segments.length > 0 ? (
                <div className="space-y-4">
                  {currentTrip.segments.map((segment, index) => (
                    <div key={index} className="border-l-4 border-indigo-500 pl-4 py-3 bg-gray-50 rounded-r-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-wrap justify-between items-center mb-2">
                        <h4 className="text-md font-semibold text-indigo-700">
                          {segment.type || segment.segment_type || 'Segment'} {index + 1}
                        </h4>
                        <div className="flex space-x-3 text-sm">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                            {formatNumber(segment.distance)} mi
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                            {segment.duration !== undefined ? `${((segment.duration || 0) / 60).toFixed(1)} hrs` : 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-600">Start: <span className="font-medium text-gray-800">{formatDate(segment.start_time)}</span></p>
                          {segment.start_location && (
                            <p className="text-gray-600">From: <span className="font-medium text-gray-800">{segment.start_location.address || getLocationLabel(segment.type || segment.segment_type, 'start')}</span></p>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-600">End: <span className="font-medium text-gray-800">{formatDate(segment.end_time)}</span></p>
                          {segment.end_location && (
                            <p className="text-gray-600">To: <span className="font-medium text-gray-800">{segment.end_location.address || getLocationLabel(segment.type || segment.segment_type, 'end')}</span></p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                  <p className="text-gray-500 italic">No route segments available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {dailyLogs && dailyLogs.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">ELD Logs</h2>
          <div className="space-y-4">
            {dailyLogs.map((log, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-md overflow-hidden">
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h3 className="text-lg font-medium text-blue-900">{formatEldDate(log.date)}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3 border border-blue-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-700">Driver</div>
                        <div className="font-bold text-gray-900">{log.driver_name || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-3 border border-green-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-5h2a1 1 0 00.7-.3l2-2A1 1 0 0016 6h-4a1 1 0 00-1-1H5.05A2.5 2.5 0 010 4.9V5a1 1 0 001 1zm0 8a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-700">Carrier</div>
                        <div className="font-bold text-gray-900">{log.carrier_name || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mr-3 border border-yellow-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-700">Total Miles</div>
                        <div className="font-bold text-gray-900">{formatNumber(log.total_miles)} miles</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {log.entries && log.entries.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      Duty Status Timeline
                    </h4>
                    <div className="overflow-x-auto">
                      <div className="min-w-full bg-white rounded-lg border border-gray-300 shadow-md overflow-hidden">
                        {/* Header with day and driver info */}
                        <div className="bg-white px-4 py-2 border-b border-gray-300">
                          <div className="text-center">
                            <h3 className="text-sm font-bold text-gray-900">{formatEldDate(log.date)}</h3>
                            <p className="text-xs text-gray-600">Driver: {log.driver_name} | Carrier: {log.carrier_name}</p>
                          </div>
                        </div>
                        
                        {/* Main grid with blue background */}
                        <div className="relative bg-blue-50">
                          {/* Hour markers */}
                          <div className="flex h-6 border-b border-blue-400">
                            <div className="w-16 sm:w-20 flex-shrink-0 border-r border-blue-400 bg-blue-100 flex items-center justify-center font-semibold text-gray-800 text-xs">
                              midnight
                            </div>
                            {/* Only show key hours (0, 3, 6, 9, 12, 15, 18, 21) */}
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={i} 
                                className={`flex-1 text-center text-xs font-medium border-r border-blue-300 flex flex-col justify-center ${i === 4 ? 'bg-blue-100' : ''}`}
                              >
                                <span className="font-semibold text-blue-800 text-[10px] sm:text-xs">
                                  {i === 0 ? '3am' : i === 4 ? 'noon' : i === 1 ? '6am' : i === 2 ? '9am' : i === 5 ? '3pm' : i === 6 ? '6pm' : i === 7 ? '9pm' : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                          
                          {/* Status grid */}
                          <div className="relative">
                            {/* Night time shading (midnight to 6 AM) */}
                            <div className="absolute top-0 left-0 w-1/4 h-28 bg-blue-100 opacity-30 z-0"></div>
                            
                            <div className="flex">
                              {/* Status Labels */}
                              <div className="w-16 sm:w-20 flex-shrink-0">
                                <div className="h-7 border-b border-blue-400 px-1 flex items-center">
                                  <span className="text-[9px] sm:text-xs font-semibold text-blue-800">1: OFF DUTY</span>
                                </div>
                                <div className="h-7 border-b border-blue-400 px-1 flex items-center">
                                  <span className="text-[9px] sm:text-xs font-semibold text-blue-800">2: SLEEPER</span>
                                </div>
                                <div className="h-7 border-b border-blue-400 px-1 flex items-center">
                                  <span className="text-[9px] sm:text-xs font-semibold text-blue-800">3: DRIVING</span>
                                </div>
                                <div className="h-7 border-b border-blue-400 px-1 flex items-center">
                                  <span className="text-[9px] sm:text-xs font-semibold text-blue-800">4: ON DUTY</span>
                                </div>
                              </div>
                              
                              {/* Status grid area */}
                              <div className="flex-grow relative">
                                {/* Vertical hour dividers */}
                                {Array.from({ length: 25 }).map((_, i) => (
                                  <div 
                                    key={i} 
                                    className={`absolute top-0 h-28 border-r ${i % 3 === 0 ? 'border-blue-400' : 'border-blue-200'}`}
                                    style={{ left: `${(i / 24) * 100}%` }}
                                  ></div>
                                ))}
                                
                                {/* Horizontal grid lines */}
                                <div className="absolute top-7 left-0 w-full h-px bg-blue-400"></div>
                                <div className="absolute top-14 left-0 w-full h-px bg-blue-400"></div>
                                <div className="absolute top-21 left-0 w-full h-px bg-blue-400"></div>
                                <div className="absolute top-28 left-0 w-full h-px bg-blue-400"></div>
                                
                                {/* Status line visualization */}
                                <svg className="absolute top-0 left-0 w-full h-28" preserveAspectRatio="none">
                                  {renderStatusLine(log.entries, log)}
                                </svg>
                                
                                {/* Location markers */}
                                <svg className="absolute top-0 left-0 w-full h-28" preserveAspectRatio="none" style={{ zIndex: 20 }}>
                                  {renderLocationMarkers(log.entries)}
                                </svg>
                              </div>
                            </div>
                            
                            {/* Bottom hour markers */}
                            <div className="flex h-6 border-t border-blue-400">
                              <div className="w-16 sm:w-20 flex-shrink-0 border-r border-blue-400 bg-blue-100 flex items-center justify-center text-xs font-semibold text-gray-800">
                                midnight
                              </div>
                              {/* Only show key hours (0, 3, 6, 9, 12, 15, 18, 21) */}
                              {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} 
                                  className={`flex-1 text-center text-xs font-medium border-r border-blue-300 flex flex-col justify-center ${i === 4 ? 'bg-blue-100' : ''}`}
                                >
                                  <span className="font-semibold text-blue-800 text-[10px] sm:text-xs">
                                    {i === 0 ? '3am' : i === 4 ? 'noon' : i === 1 ? '6am' : i === 2 ? '9am' : i === 5 ? '3pm' : i === 6 ? '6pm' : i === 7 ? '9pm' : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <button
                        onClick={() => navigate(`/logs?trip=${log.trip || ''}`)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                      >
                        View full log details
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">No log entries available</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TripPlanner; 