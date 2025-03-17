// Format a date to display in a user-friendly format
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Format a time to display in a user-friendly format
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format a datetime to display in a user-friendly format
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return 'Not scheduled';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    return dateObj.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date unavailable';
  }
};

// Calculate the duration between two dates in hours and minutes
export const calculateDuration = (startDate: Date, endDate: Date): string => {
  const durationMs = endDate.getTime() - startDate.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Convert minutes to hours and minutes format
export const minutesToHoursAndMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

// Get the hour from a date as a number (0-23)
export const getHour = (date: Date): number => {
  return date.getHours();
};

// Get the minute from a date as a number (0-59)
export const getMinute = (date: Date): number => {
  return date.getMinutes();
};

/**
 * Calculate grid position for a given time
 * @param time - Time in 24-hour format (HH:mm)
 * @returns Grid position (0-95 for 15-minute intervals)
 */
export const calculateGridPosition = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 4) + Math.floor(minutes / 15);
};

/**
 * Calculate width of a grid segment
 * @param startTime - Start time in 24-hour format (HH:mm)
 * @param endTime - End time in 24-hour format (HH:mm)
 * @returns Width in grid units
 */
export const calculateSegmentWidth = (startTime: string, endTime: string): number => {
  const startPosition = calculateGridPosition(startTime);
  const endPosition = calculateGridPosition(endTime);
  return endPosition - startPosition;
};

/**
 * Format a duration in minutes to a human-readable string
 * @param minutes - Duration in minutes
 * @returns Formatted string like "11:30" for 11 hours and 30 minutes
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Sanitize a date string before using it in date constructors
 * @param dateString - String representing a date
 * @returns A valid date string or null if invalid
 */
export const sanitizeDateString = (dateString: string | null | undefined): string | null => {
  if (!dateString) return null;
  
  try {
    // Attempt to parse the date string
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string: ${dateString}`);
      return null;
    }
    
    // Return the ISO string for consistency
    return date.toISOString();
  } catch (error) {
    console.error('Error parsing date string:', error);
    return null;
  }
};

/**
 * Split a segment that crosses midnight into separate day segments
 * @param segment - The segment that crosses midnight
 * @returns An array of segments split by day
 */
export const splitSegmentByDay = (segment: {
  start_time: string;
  end_time: string;
  [key: string]: any;
}): Array<{
  start_time: string;
  end_time: string;
  [key: string]: any;
}> => {
  const startDate = new Date(segment.start_time);
  const endDate = new Date(segment.end_time);
  
  // If start and end are on the same day, return the original segment
  if (startDate.toDateString() === endDate.toDateString()) {
    return [segment];
  }
  
  const result = [];
  let currentDate = new Date(startDate);
  
  // Set time to the start of the segment
  currentDate.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds());
  
  while (currentDate < endDate) {
    // Create end of day timestamp (23:59:59)
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    // If day end is after the segment end, use segment end
    const segmentEndTime = dayEnd > endDate ? endDate : dayEnd;
    
    // Create a segment for this day
    result.push({
      ...segment,
      start_time: currentDate.toISOString(),
      end_time: segmentEndTime.toISOString()
    });
    
    // Move to the next day at 00:00:00
    currentDate = new Date(dayEnd);
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }
  
  // If the last day's start time is exactly midnight and there's a previous segment,
  // we need to add the final day segment
  if (currentDate.getTime() === endDate.getTime() && result.length > 0) {
    return result;
  }
  
  // Add the final day segment if needed
  if (currentDate < endDate) {
    result.push({
      ...segment,
      start_time: currentDate.toISOString(),
      end_time: endDate.toISOString()
    });
  }
  
  return result;
};

/**
 * Group segments by day
 * @param segments - Array of segments with start_time and end_time
 * @returns Object with dates as keys and arrays of segments as values
 */
export const groupSegmentsByDay = (segments: Array<{
  start_time: string;
  end_time: string;
  [key: string]: any;
}>): Record<string, Array<{
  start_time: string;
  end_time: string;
  [key: string]: any;
}>> => {
  const result: Record<string, Array<any>> = {};
  
  segments.forEach(segment => {
    // Split segments that cross midnight
    const splitSegments = splitSegmentByDay(segment);
    
    splitSegments.forEach(splitSegment => {
      const date = new Date(splitSegment.start_time).toISOString().split('T')[0];
      
      if (!result[date]) {
        result[date] = [];
      }
      
      result[date].push(splitSegment);
    });
  });
  
  return result;
};

/**
 * Convert segment type to duty status
 * @param segmentType - The type of segment (DRIVE, LOADING, UNLOADING, REST, etc.)
 * @returns The corresponding duty status
 */
export const segmentTypeToDutyStatus = (segmentType: string): string => {
  switch (segmentType.toUpperCase()) {
    case 'DRIVE':
      return 'D'; // Driving
    case 'LOADING':
    case 'UNLOADING':
      return 'ON'; // On Duty (Not Driving)
    case 'REST':
    case 'SLEEP':
      return 'SB'; // Sleeper Berth (assuming REST is in sleeper berth)
    default:
      return 'OFF'; // Off Duty
  }
};

/**
 * Format ISO timestamp to 24-hour time format (HH:MM)
 * @param timestamp - ISO 8601 timestamp
 * @returns Time in HH:MM format
 */
export const formatISOToTimeString = (timestamp: string): string => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

/**
 * Get date string in YYYY-MM-DD format from ISO timestamp
 * @param timestamp - ISO 8601 timestamp
 * @returns Date in YYYY-MM-DD format
 */
export const getDateFromISOTimestamp = (timestamp: string): string => {
  return timestamp.split('T')[0];
};

/**
 * Calculate the total hours for a specific duty status within a day
 * @param segments - Array of segments for a day
 * @param dutyStatus - The duty status to calculate hours for
 * @returns Total hours in the specified duty status
 */
export const calculateDutyStatusHours = (
  segments: Array<{
    start_time: string;
    end_time: string;
    segment_type: string;
  }>,
  dutyStatus: string
): number => {
  return segments
    .filter(segment => segmentTypeToDutyStatus(segment.segment_type) === dutyStatus)
    .reduce((total, segment) => {
      const startTime = new Date(segment.start_time);
      const endTime = new Date(segment.end_time);
      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      return total + durationHours;
    }, 0);
}; 