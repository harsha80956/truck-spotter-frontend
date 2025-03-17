import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { HosStatus, HosCalculation } from '../types';
import { formatDuration, formatDateTime } from '../utils/timeUtils';

const HosStatusDisplay: React.FC = () => {
  const hosStatus = useSelector((state: RootState) => state.eldLog.hosStatus);
  const hosCalculation = useSelector((state: RootState) => state.eldLog.hosCalculation);

  if (!hosStatus || !hosCalculation) {
    return <div>Loading HOS status...</div>;
  }

  const renderViolations = () => {
    if (!hosCalculation.violations.length) {
      return <div className="text-green-600">No HOS violations</div>;
    }

    return (
      <div className="text-red-600">
        <h4 className="font-bold">Violations:</h4>
        <ul>
          {hosCalculation.violations.map((violation, index) => (
            <li key={index}>
              {violation.type}: {violation.description} at {formatDateTime(violation.timestamp)}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderTimeRemaining = () => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="font-bold">Drive Time</h4>
        <div className="text-2xl">{formatDuration(hosCalculation.availableDrivingHours)}</div>
        <div className="text-sm text-gray-600">remaining</div>
      </div>
      <div>
        <h4 className="font-bold">Window Time</h4>
        <div className="text-2xl">{formatDuration(hosCalculation.availableWindowHours)}</div>
        <div className="text-sm text-gray-600">remaining</div>
      </div>
    </div>
  );

  const renderNextBreaks = () => (
    <div className="mt-4">
      <h4 className="font-bold">Required Breaks</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm">Next 30-min Break:</div>
          <div>{hosCalculation.nextBreakTime ? formatDateTime(hosCalculation.nextBreakTime) : 'Not required'}</div>
        </div>
        <div>
          <div className="text-sm">Next Rest Period:</div>
          <div>{hosCalculation.nextRestTime ? formatDateTime(hosCalculation.nextRestTime) : 'Not required'}</div>
        </div>
      </div>
    </div>
  );

  const renderCycleHours = () => (
    <div className="mt-4">
      <h4 className="font-bold">Cycle Hours (70-hour/8-day)</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm">Used:</div>
          <div className="text-xl">{formatDuration(hosStatus.currentCycleHours)}</div>
        </div>
        <div>
          <div className="text-sm">Remaining:</div>
          <div className="text-xl">{formatDuration(hosCalculation.cycleHoursRemaining)}</div>
        </div>
      </div>
      <div className="mt-2">
        <h5 className="font-bold text-sm">Last 8 Days</h5>
        <div className="grid grid-cols-4 gap-2">
          {hosStatus.cycleHoursLast8Days.map((day, index) => (
            <div key={index} className="text-center">
              <div className="text-xs">{new Date(day.date).toLocaleDateString()}</div>
              <div>{formatDuration(day.totalHours)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSplitBerthStatus = () => (
    <div className="mt-4">
      <h4 className="font-bold">Split Sleeper Berth</h4>
      <div>
        {hosCalculation.splitBerthEligible ? (
          <div className="text-green-600">Eligible for split berth</div>
        ) : (
          <div className="text-gray-600">Not eligible for split berth</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">Hours of Service Status</h3>
      
      {renderTimeRemaining()}
      {renderNextBreaks()}
      {renderCycleHours()}
      {renderSplitBerthStatus()}
      {renderViolations()}

      <div className="mt-4 text-sm text-gray-600">
        Last updated: {formatDateTime(new Date().toISOString())}
      </div>
    </div>
  );
};

export default HosStatusDisplay; 