// Trip related types
export interface Location {
  address: string;
  lat: number;
  lng: number;
  // Add these for backward compatibility with backend
  latitude?: number;
  longitude?: number;
}

export interface TripDetails {
  currentLocation: Location;
  pickupLocation: Location;
  dropoffLocation: Location;
  currentCycleHours: number;
}

export interface RouteSegment {
  startLocation: Location;
  endLocation: Location;
  distance: number; // in miles
  duration: number; // in minutes
  type: 'drive' | 'rest' | 'sleep' | 'fuel' | 'pickup' | 'dropoff';
  start_time: string;
  end_time: string;
}

export interface TripRoute {
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number; // in minutes
  start_time: string;
  end_time: string;
}

// ELD Log related types
export enum DutyStatus {
  OFF = 'OFF',  // Off Duty
  SB = 'SB',    // Sleeper Berth
  D = 'D',      // Driving
  ON = 'ON'     // On Duty (Not Driving)
}

export interface LogEntry {
  status: DutyStatus;
  start_time: string;
  end_time: string;
  location: string;
  remarks: string;
  hosStatus?: HosStatus;
  fuelingStop?: FuelingStop;
  loadUnloadTime?: number;     // Time spent loading/unloading in minutes
  trafficDelay?: number;       // Traffic delay in minutes
  isPersonalUse?: boolean;     // Personal conveyance
  isYardMove?: boolean;        // Yard moves
  crosses_midnight?: boolean;  // Indicates if this entry crosses midnight
  is_continuation?: boolean;   // Indicates if this entry is a continuation from a previous day
  is_first_day?: boolean;      // Indicates if this entry is on the first day of a multi-day segment
  violations?: {
    type: 'driving_limit' | 'window_limit' | 'break_required' | 'cycle_limit';
    description: string;
    startTime: string;
    endTime: string;
  }[];
}

export interface DailyLog {
  date: string;
  entries: LogEntry[];
  startOdometer?: number;
  endOdometer?: number;
  carrier: string;
  driver: string;
  truckNumber: string;
  trailerNumber?: string;
  totalMiles?: number;
}

export interface EldLogs {
  logs: DailyLog[];
}

export interface HosLimits {
  drivingLimit: number;        // 11-hour driving limit
  windowLimit: number;         // 14-hour window
  breakRequired: number;       // 8 hours before 30-min break
  offDutyRequired: number;     // 10-hour off-duty period
  cycleLimit: number;         // 70-hour/8-day limit
}

export interface SplitSleeperBerth {
  firstPeriod: number;        // 7 or 8 hours
  secondPeriod: number;       // 3 or 2 hours respectively
  startTime: string;
  endTime: string;
  location: string;
}

export interface CycleHours {
  date: string;
  totalHours: number;
  drivingHours: number;
  onDutyHours: number;
  remainingHours: number;
}

export interface HosStatus {
  currentCycleHours: number;
  drivingHoursToday: number;
  onDutyHoursToday: number;
  hoursSinceLastBreak: number;
  hoursInCurrentWindow: number;
  lastRestPeriod: {
    startTime: string;
    endTime: string;
    duration: number;
    type: 'off_duty' | 'sleeper_berth';
  };
  cycleHoursLast8Days: CycleHours[];
}

export interface FuelingStop {
  location: string;
  timestamp: string;
  odometer: number;
  gallons: number;
  remarks: string;
}

// Add new interface for HOS calculations
export interface HosCalculation {
  availableDrivingHours: number;
  availableWindowHours: number;
  nextBreakTime: string | null;
  nextRestTime: string | null;
  cycleHoursRemaining: number;
  violations: {
    type: string;
    description: string;
    timestamp: string;
  }[];
  splitBerthEligible: boolean;
  personalConveyanceAvailable: boolean;
} 