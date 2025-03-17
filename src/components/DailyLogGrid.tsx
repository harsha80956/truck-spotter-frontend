import React from 'react';
import { DutyStatus } from '../types';
import { formatDuration } from '../utils/timeUtils';

interface LogEntry {
  status: DutyStatus;
  startTime: string;
  endTime: string;
  location: string;
  remarks: string;
}

interface DailyLogGridProps {
  date: string;
  entries: LogEntry[];
  driverName: string;
  carrierName: string;
  truckNumber: string;
  trailerNumber: string;
  startOdometer: number;
  endOdometer: number;
  totalMiles: number;
}

const GRID_HOURS = 24;
const SEGMENTS_PER_HOUR = 4; // 15-minute segments
const TOTAL_SEGMENTS = GRID_HOURS * SEGMENTS_PER_HOUR;

const DailyLogGrid: React.FC<DailyLogGridProps> = ({
  date,
  entries,
  driverName,
  carrierName,
  truckNumber,
  trailerNumber,
  startOdometer,
  endOdometer,
  totalMiles
}) => {
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

  const calculateGridPosition = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * SEGMENTS_PER_HOUR) + Math.floor(minutes / 15);
  };

  const calculateSegmentWidth = (startTime: string, endTime: string): number => {
    const startPosition = calculateGridPosition(startTime);
    const endPosition = calculateGridPosition(endTime);
    return endPosition - startPosition;
  };

  const calculateTotalHours = (status: DutyStatus): number => {
    return entries
      .filter(entry => entry.status === status)
      .reduce((total, entry) => {
        const start = new Date(`2000-01-01T${entry.startTime}`);
        const end = new Date(`2000-01-01T${entry.endTime}`);
        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Daily Log</h2>
          <div className="text-lg">{new Date(date).toLocaleDateString()}</div>
        </div>
        <div className="text-right">
          <div>Driver: {driverName}</div>
          <div>Carrier: {carrierName}</div>
          <div>Truck: {truckNumber}</div>
          <div>Trailer: {trailerNumber}</div>
        </div>
      </div>

      {/* Grid Header */}
      <div className="flex border-b border-gray-300 mb-2">
        <div className="w-24">Status</div>
        <div className="flex-1 grid grid-cols-24">
          {Array.from({ length: GRID_HOURS }).map((_, hour) => (
            <div key={hour} className="text-center text-sm">
              {hour.toString().padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>

      {/* Grid Body */}
      <div className="space-y-1">
        {Object.values(DutyStatus).map(status => (
          <div key={status} className="flex items-center">
            <div className="w-24 text-sm">{getStatusLabel(status)}</div>
            <div className="flex-1 h-6 bg-gray-100 relative">
              {entries
                .filter(entry => entry.status === status)
                .map((entry, index) => {
                  const startSegment = calculateGridPosition(entry.startTime);
                  const width = calculateSegmentWidth(entry.startTime, entry.endTime);
                  return (
                    <div
                      key={index}
                      className="absolute h-full"
                      style={{
                        left: `${(startSegment / TOTAL_SEGMENTS) * 100}%`,
                        width: `${(width / TOTAL_SEGMENTS) * 100}%`,
                        backgroundColor: getStatusColor(status)
                      }}
                      title={`${entry.startTime} - ${entry.endTime}\n${entry.location}\n${entry.remarks}`}
                    />
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-bold mb-2">Hours Summary</h3>
          <div className="space-y-1">
            {Object.values(DutyStatus).map(status => (
              <div key={status} className="flex justify-between">
                <div>{getStatusLabel(status)}:</div>
                <div>{formatDuration(calculateTotalHours(status) * 60)}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-bold mb-2">Mileage Summary</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <div>Start Odometer:</div>
              <div>{startOdometer.toLocaleString()} mi</div>
            </div>
            <div className="flex justify-between">
              <div>End Odometer:</div>
              <div>{endOdometer.toLocaleString()} mi</div>
            </div>
            <div className="flex justify-between font-bold">
              <div>Total Miles:</div>
              <div>{totalMiles.toLocaleString()} mi</div>
            </div>
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div className="mt-6">
        <h3 className="font-bold mb-2">Remarks</h3>
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div key={index} className="text-sm">
              <span className="font-bold">{entry.startTime} - {entry.endTime}:</span>
              {' '}{entry.location} - {entry.remarks}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyLogGrid; 