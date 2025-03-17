import React from 'react';
import { RouteSegment } from '../services/mapService';
import { formatDuration } from '../utils/timeUtils';

interface TripSummaryProps {
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  estimatedArrival: Date;
  hosCompliance: {
    isCompliant: boolean;
    violations: {
      type: string;
      description: string;
      timestamp: string;
    }[];
    remainingDriveTime: number;
    nextBreakTime: string | null;
    nextRestTime: string | null;
    cycleHoursRemaining: number;
  };
}

const TripSummary: React.FC<TripSummaryProps> = ({
  segments,
  totalDistance,
  totalDuration,
  estimatedArrival,
  hosCompliance
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const calculateSegmentSummary = () => {
    const summary = segments.reduce((acc, segment) => {
      acc[segment.type] = (acc[segment.type] || 0) + segment.duration;
      return acc;
    }, {} as Record<string, number>);

    return [
      { label: 'Driving Time', value: summary.drive || 0, type: 'drive' },
      { label: 'Break Time', value: summary.break || 0, type: 'break' },
      { label: 'Rest Time', value: summary.rest || 0, type: 'rest' },
      { label: 'Loading Time', value: summary.load || 0, type: 'load' },
      { label: 'Unloading Time', value: summary.unload || 0, type: 'unload' },
      { label: 'Fueling Time', value: summary.fuel || 0, type: 'fuel' }
    ];
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Trip Summary</h2>

      {/* Overall Trip Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div>
          <div className="text-sm text-gray-600">Total Distance</div>
          <div className="text-2xl font-bold">{Math.round(totalDistance)} miles</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Total Duration</div>
          <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Estimated Arrival</div>
          <div className="text-2xl font-bold">{formatTime(estimatedArrival)}</div>
        </div>
      </div>

      {/* HOS Compliance Status */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4">HOS Compliance</h3>
        <div className={`p-4 rounded-lg ${hosCompliance.isCompliant ? 'bg-green-100' : 'bg-red-100'}`}>
          <div className={`text-lg font-bold mb-2 ${hosCompliance.isCompliant ? 'text-green-700' : 'text-red-700'}`}>
            {hosCompliance.isCompliant ? 'HOS Compliant' : 'HOS Violations Detected'}
          </div>
          
          {hosCompliance.violations.length > 0 && (
            <div className="space-y-2">
              {hosCompliance.violations.map((violation, index) => (
                <div key={index} className="text-red-600">
                  {violation.type}: {violation.description}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-sm text-gray-600">Remaining Drive Time</div>
              <div className="font-bold">{formatDuration(hosCompliance.remainingDriveTime)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Cycle Hours Remaining</div>
              <div className="font-bold">{formatDuration(hosCompliance.cycleHoursRemaining)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-sm text-gray-600">Next Break Required</div>
              <div className="font-bold">
                {hosCompliance.nextBreakTime
                  ? new Date(hosCompliance.nextBreakTime).toLocaleTimeString()
                  : 'Not required'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Next Rest Required</div>
              <div className="font-bold">
                {hosCompliance.nextRestTime
                  ? new Date(hosCompliance.nextRestTime).toLocaleTimeString()
                  : 'Not required'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Segment Breakdown */}
      <div>
        <h3 className="text-lg font-bold mb-4">Time Breakdown</h3>
        <div className="space-y-4">
          {calculateSegmentSummary().map(({ label, value, type }) => (
            <div key={type} className="flex items-center">
              <div className="w-32 text-gray-600">{label}</div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(value / totalDuration) * 100}%`,
                      backgroundColor: getSegmentColor(type as RouteSegment['type'])
                    }}
                  />
                </div>
              </div>
              <div className="w-24 text-right font-bold">{formatDuration(value)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const getSegmentColor = (type: RouteSegment['type']): string => {
  switch (type) {
    case 'drive':
      return '#3b82f6'; // blue
    case 'break':
      return '#10b981'; // green
    case 'rest':
      return '#6366f1'; // indigo
    case 'load':
      return '#f59e0b'; // amber
    case 'unload':
      return '#ef4444'; // red
    case 'fuel':
      return '#8b5cf6'; // purple
    default:
      return '#6b7280'; // gray
  }
};

export default TripSummary; 