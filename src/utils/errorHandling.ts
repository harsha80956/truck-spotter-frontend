/**
 * Utility functions for handling errors and edge cases
 */

/**
 * Safely format a date string to a localized string
 * @param dateString - The date string to format
 * @param format - The format to use (date, time, datetime, or eld)
 * @returns Formatted date string or fallback text
 */
export const formatDate = (
  dateString: string | Date | undefined | null,
  format: 'date' | 'time' | 'datetime' | 'eld' = 'datetime'
): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    switch (format) {
      case 'date':
        return date.toLocaleDateString();
      case 'time':
        return date.toLocaleTimeString();
      case 'eld':
        // Format as "Day X, Month Day" (e.g., "Day 1, March 14")
        // The day number will need to be calculated elsewhere based on trip start date
        const month = date.toLocaleString('en-US', { month: 'long' });
        const day = date.getDate();
        // This just returns the formatted date without the "Day X" prefix
        // The dayNumber would be added by the component using this function
        return `${month} ${day}`;
      case 'datetime':
      default:
        return date.toLocaleString();
    }
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Invalid Date';
  }
};

/**
 * Safely format a number with specified precision
 * @param value - The number to format
 * @param precision - Number of decimal places
 * @param fallback - Text to show if value is invalid
 * @returns Formatted number string or fallback text
 */
export const formatNumber = (
  value: number | undefined | null,
  precision: number = 2,
  fallback: string = 'N/A'
): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return fallback;
  }
  
  try {
    return value.toFixed(precision);
  } catch (e) {
    console.error('Error formatting number:', e);
    return fallback;
  }
};

/**
 * Safely access nested object properties
 * @param obj - The object to access
 * @param path - Path to the property (e.g., 'user.address.street')
 * @param fallback - Value to return if property doesn't exist
 * @returns The property value or fallback
 */
export const safelyAccessProperty = <T>(
  obj: any,
  path: string,
  fallback: T
): T => {
  try {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === undefined || result === null) {
        return fallback;
      }
      result = result[key];
    }
    
    return (result === undefined || result === null) ? fallback : result;
  } catch (e) {
    console.error(`Error accessing property ${path}:`, e);
    return fallback;
  }
};

/**
 * Calculate duration between two dates in hours and minutes
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Formatted duration string (e.g., "2h 30m")
 */
export const calculateDuration = (
  startDate: string | undefined,
  endDate: string | undefined
): string => {
  if (!startDate || !endDate) {
    return '0h 0m';
  }
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return '0h 0m';
    }
    
    const durationMs = end.getTime() - start.getTime();
    
    // Handle negative duration
    if (durationMs < 0) {
      return '0h 0m';
    }
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  } catch (e) {
    console.error('Error calculating duration:', e);
    return '0h 0m';
  }
};

/**
 * Validate an email address
 * @param email - Email address to validate
 * @returns Whether the email is valid
 */
export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Truncate text to a specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add to truncated text
 * @returns Truncated text
 */
export const truncateText = (
  text: string | undefined | null,
  maxLength: number = 50,
  suffix: string = '...'
): string => {
  if (!text) return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + suffix;
}; 