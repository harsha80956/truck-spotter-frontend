import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  LogEntry, 
  DailyLog, 
  HosStatus, 
  HosCalculation,
  HosLimits,
  SplitSleeperBerth,
  DutyStatus 
} from '../../types';

// Define backend types with snake_case and string dates
export interface BackendLogEntry {
  status: DutyStatus;
  start_time: string;
  end_time: string;
  location: string;
  remarks: string;
}

export interface BackendDailyLog {
  date: string;
  driver_name: string;
  carrier_name: string;
  truck_number: string;
  trailer_number?: string;
  start_odometer?: number;
  end_odometer?: number;
  total_miles?: number;
  entries: BackendLogEntry[];
  trip?: number;
}

export interface BackendEldLogs {
  logs: BackendDailyLog[];
}

interface EldLogState {
  logs: LogEntry[];
  dailyLogs: DailyLog[];
  hosStatus: HosStatus | null;
  hosCalculation: HosCalculation | null;
  hosLimits: HosLimits;
  splitBerth: SplitSleeperBerth | null;
  selectedLogId: number | null;
  loading: boolean;
  error: string | null;
}

const HOS_LIMITS: HosLimits = {
  drivingLimit: 11 * 60,      // 11 hours in minutes
  windowLimit: 14 * 60,       // 14 hours in minutes
  breakRequired: 8 * 60,      // 8 hours in minutes
  offDutyRequired: 10 * 60,   // 10 hours in minutes
  cycleLimit: 70 * 60,        // 70 hours in minutes
};

const initialState: EldLogState = {
  logs: [],
  dailyLogs: [],
  hosStatus: null,
  hosCalculation: null,
  hosLimits: HOS_LIMITS,
  splitBerth: null,
  selectedLogId: null,
  loading: false,
  error: null,
};

const eldLogSlice = createSlice({
  name: 'eldLog',
  initialState,
  reducers: {
    setLogs: (state, action: PayloadAction<LogEntry[]>) => {
      state.logs = action.payload;
    },
    setDailyLogs: (state, action: PayloadAction<DailyLog[]>) => {
      state.dailyLogs = action.payload;
    },
    setSelectedLogId: (state, action: PayloadAction<number | null>) => {
      state.selectedLogId = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    updateHosStatus: (state, action: PayloadAction<HosStatus>) => {
      state.hosStatus = action.payload;
    },
    updateHosCalculation: (state, action: PayloadAction<HosCalculation>) => {
      state.hosCalculation = action.payload;
    },
    setSplitBerth: (state, action: PayloadAction<SplitSleeperBerth | null>) => {
      state.splitBerth = action.payload;
    },
    addLogEntry: (state, action: PayloadAction<LogEntry>) => {
      state.logs.push(action.payload);
      // Recalculate HOS status when adding new log entry
      const newStatus = calculateHosStatus(state.logs, state.hosLimits);
      state.hosStatus = newStatus;
      state.hosCalculation = calculateAvailableHours(newStatus, state.hosLimits);
    },
    clearLogs: (state) => {
      state.logs = [];
      state.dailyLogs = [];
      state.hosStatus = null;
      state.hosCalculation = null;
      state.splitBerth = null;
      state.selectedLogId = null;
      state.error = null;
    },
  },
});

// Helper functions for HOS calculations
const calculateHosStatus = (logs: LogEntry[], limits: HosLimits): HosStatus => {
  // Implementation of HOS status calculation based on logs and limits
  // This would include:
  // - Calculating current cycle hours
  // - Tracking driving hours today
  // - Monitoring on-duty hours
  // - Checking time since last break
  // - Calculating hours in current window
  // - Tracking rest periods
  // - Maintaining 8-day cycle history
  return {
    currentCycleHours: 0, // Calculate from logs
    drivingHoursToday: 0, // Calculate from today's logs
    onDutyHoursToday: 0, // Calculate from today's logs
    hoursSinceLastBreak: 0, // Calculate from last break
    hoursInCurrentWindow: 0, // Calculate current 14-hour window
    lastRestPeriod: {
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 0,
      type: 'off_duty'
    },
    cycleHoursLast8Days: [] // Calculate rolling 8-day history
  };
};

const calculateAvailableHours = (
  status: HosStatus,
  limits: HosLimits
): HosCalculation => {
  // Implementation of available hours calculation
  // This would include:
  // - Calculating remaining driving hours
  // - Determining time left in 14-hour window
  // - Checking when next break is required
  // - Monitoring cycle hours remaining
  // - Checking for violations
  // - Determining split berth eligibility
  return {
    availableDrivingHours: 0, // Calculate remaining drive time
    availableWindowHours: 0, // Calculate remaining window time
    nextBreakTime: null, // Calculate next required break
    nextRestTime: null, // Calculate next required rest
    cycleHoursRemaining: 0, // Calculate remaining cycle hours
    violations: [], // Track any HOS violations
    splitBerthEligible: false, // Check split berth eligibility
    personalConveyanceAvailable: true // Check PC availability
  };
};

export const { 
  setLogs, 
  setDailyLogs, 
  setSelectedLogId,
  setLoading,
  setError,
  updateHosStatus, 
  updateHosCalculation,
  setSplitBerth,
  addLogEntry,
  clearLogs 
} = eldLogSlice.actions;

export default eldLogSlice.reducer; 