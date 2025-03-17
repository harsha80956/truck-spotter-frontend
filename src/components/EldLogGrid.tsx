import React, { useRef, useEffect, useMemo, useState } from 'react';
import { DutyStatus } from '../types';

interface StatusChange {
  time: string;
  status: DutyStatus;
}

interface Remark {
  time: string;
  text: string;
}

interface EldLogGridProps {
  location?: string;
  homeTerminal?: string;
  safetyRecordsLocation?: string;
  date: string;
  driverName?: string;
  statusChanges: StatusChange[];
  remarks?: Remark[];
  truckNumber?: string;
  trailerNumbers?: string;
  totalMiles?: number;
  startOdometer?: number;
  endOdometer?: number;
}

interface Tooltip {
  x: number;
  y: number;
  text: string;
  visible: boolean;
}

const EldLogGrid: React.FC<EldLogGridProps> = ({
  location = 'Unknown',
  homeTerminal = 'HOME (OPERATING CENTER AND ADDRESS)',
  safetyRecordsLocation = 'Safety Records Maintained at Company Address',
  date,
  driverName = 'Driver Name',
  statusChanges = [],
  remarks = [],
  truckNumber = 'N/A',
  trailerNumbers = 'N/A',
  totalMiles = 0,
  startOdometer = 0,
  endOdometer = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>({ x: 0, y: 0, text: '', visible: false });
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  
  const baseGridWidth = 1200;
  const headerHeight = 100;
  const gridHeight = 400;
  const remarksHeight = 150;
  const totalHeight = headerHeight + gridHeight + remarksHeight;
  
  // Actual dimensions with zoom
  const gridWidth = baseGridWidth * zoom;
  
  // Define grid colors
  const gridLineColor = '#4682B4'; // More saturated blue for grid lines like in the image
  const gridBackgroundColor = '#F0F8FF'; // Very light blue background
  const statusLineColor = '#000000'; // Black for status lines
  const textColor = '#000000'; // Black for text
  
  // Convert time string (HH:MM) to minutes since midnight
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    
    // Handle ISO string format
    if (timeStr.includes('T')) {
      const date = new Date(timeStr);
      return date.getHours() * 60 + date.getMinutes();
    }
    
    // Handle HH:MM format
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  // Minutes to formatted time string
  const minutesToTimeString = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  // Convert minutes to x position on the grid
  const minutesToX = (minutes: number): number => {
    return (minutes / (24 * 60)) * gridWidth;
  };
  
  // Convert x position to minutes
  const xToMinutes = (x: number): number => {
    return (x / gridWidth) * (24 * 60);
  };
  
  // Get y position for a duty status
  const getStatusY = (status: DutyStatus): number => {
    const statusHeight = gridHeight / 4;
    switch(status) {
      case DutyStatus.OFF:
        return headerHeight + statusHeight * 0.5;
      case DutyStatus.SB:
        return headerHeight + statusHeight * 1.5;
      case DutyStatus.D:
        return headerHeight + statusHeight * 2.5;
      case DutyStatus.ON:
        return headerHeight + statusHeight * 3.5;
      default:
        return headerHeight + statusHeight * 0.5;
    }
  };
  
  // Get duty status from y position
  const getStatusFromY = (y: number): DutyStatus | null => {
    const statusHeight = gridHeight / 4;
    const relativeY = y - headerHeight;
    
    if (relativeY < 0) return null;
    
    if (relativeY < statusHeight) return DutyStatus.OFF;
    if (relativeY < statusHeight * 2) return DutyStatus.SB;
    if (relativeY < statusHeight * 3) return DutyStatus.D;
    if (relativeY < statusHeight * 4) return DutyStatus.ON;
    
    return null;
  };
  
  // Get duty status label
  const getStatusLabel = (status: DutyStatus): string => {
    switch(status) {
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
  
  // Sort status changes by time
  const sortedStatusChanges = useMemo(() => {
    return [...statusChanges].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [statusChanges]);
  
  // Draw the grid and status lines
  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas and apply transform for pan/zoom
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    
    // Draw background
    ctx.fillStyle = gridBackgroundColor;
    ctx.fillRect(0, headerHeight, gridWidth, gridHeight);
    
    // Draw header section
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, gridWidth, headerHeight);
    
    // Draw header text - larger and positioned like in the image
    ctx.fillStyle = textColor;
    ctx.font = 'bold 22px Arial';
    // Center the location text at the top
    const locationText = location;
    const locationMetrics = ctx.measureText(locationText);
    ctx.fillText(locationText, (gridWidth - locationMetrics.width) / 2, 30);
    
    // Draw underline for location
    ctx.beginPath();
    ctx.moveTo((gridWidth - locationMetrics.width) / 2 - 20, 35);
    ctx.lineTo((gridWidth + locationMetrics.width) / 2 + 20, 35);
    ctx.strokeStyle = textColor;
    ctx.stroke();
    
    // Draw home terminal and safety records info aligned to sides
    ctx.font = '14px Arial';
    ctx.fillText(homeTerminal, 20, 55);
    ctx.fillText(safetyRecordsLocation, gridWidth - 20 - ctx.measureText(safetyRecordsLocation).width, 55);
    
    // Draw smaller driver info below if needed
    ctx.font = '12px Arial';
    ctx.fillText(`Driver: ${driverName}`, 20, 75);
    ctx.fillText(`Truck #: ${truckNumber}`, gridWidth/4, 75);
    ctx.fillText(`Trailer #: ${trailerNumbers}`, gridWidth/2, 75);
    ctx.fillText(`Miles: ${totalMiles}`, 3*gridWidth/4, 75);
    
    // Add time labels at the top and bottom - midnight, noon format as in image
    ctx.font = 'bold 12px Arial';
    ctx.fillText('midnight', 0, headerHeight - 20);
    ctx.fillText('noon', gridWidth/2 - 20, headerHeight - 20);
    
    // Draw duty status labels with row numbers like in the image
    const statusHeight = gridHeight / 4;
    ctx.fillText('1: OFF DUTY', 10, headerHeight + statusHeight * 0.5);
    ctx.fillText('2: SLEEPER', 10, headerHeight + statusHeight * 1.5);
    ctx.fillText('   BERTH', 10, headerHeight + statusHeight * 1.5 + 15);
    ctx.fillText('3: DRIVING', 10, headerHeight + statusHeight * 2.5);
    ctx.fillText('4: ON DUTY', 10, headerHeight + statusHeight * 3.5);
    ctx.fillText('   (NOT DRIVING)', 10, headerHeight + statusHeight * 3.5 + 15);
    
    // Draw hour markers and grid lines
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      const y = headerHeight + (i * statusHeight);
      ctx.moveTo(0, y);
      ctx.lineTo(gridWidth, y);
      ctx.stroke();
    }
    
    // Vertical grid lines (hours)
    ctx.font = '11px Arial';
    for (let hour = 0; hour <= 24; hour++) {
      const x = (hour / 24) * gridWidth;
      
      // Draw hour line
      ctx.beginPath();
      ctx.moveTo(x, headerHeight);
      ctx.lineTo(x, headerHeight + gridHeight);
      ctx.stroke();
      
      // Draw hour numbers at top and bottom as in the image
      if (hour > 0 && hour < 13) {
        // Morning hours (1-12)
        ctx.fillText(hour.toString(), x - 5, headerHeight - 5);
        ctx.fillText(hour.toString(), x - 5, headerHeight + gridHeight + 15);
      } else if (hour > 12 && hour < 24) {
        // Afternoon/evening hours (1-11)
        ctx.fillText((hour - 12).toString(), x - 5, headerHeight - 5);
        ctx.fillText((hour - 12).toString(), x - 5, headerHeight + gridHeight + 15);
      }
    }
    
    // Quarter-hour grid lines (lighter)
    ctx.strokeStyle = 'rgba(70, 130, 180, 0.5)';
    for (let hour = 0; hour < 24; hour++) {
      for (let quarter = 1; quarter <= 3; quarter++) {
        const x = ((hour + quarter / 4) / 24) * gridWidth;
        ctx.beginPath();
        ctx.moveTo(x, headerHeight);
        ctx.lineTo(x, headerHeight + gridHeight);
        ctx.stroke();
      }
    }
    
    // Draw time labels at bottom of grid for midnight and noon
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Midnight', 0, headerHeight + gridHeight + 30);
    ctx.fillText('noon', gridWidth/2 - 20, headerHeight + gridHeight + 30);
    
    // Draw status changes with thicker lines like in the image
    if (sortedStatusChanges.length > 0) {
      ctx.strokeStyle = statusLineColor;
      ctx.lineWidth = 3; // Thicker lines to match the image
      
      // Initial status
      let prevStatus = sortedStatusChanges[0].status;
      let prevX = 0;
      let prevY = getStatusY(prevStatus);
      
      for (let i = 0; i < sortedStatusChanges.length; i++) {
        const { time, status } = sortedStatusChanges[i];
        const x = minutesToX(timeToMinutes(time));
        const y = getStatusY(status);
        
        // Draw horizontal line from previous point to current time
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, prevY);
        ctx.stroke();
        
        // Draw vertical line for status change
        ctx.beginPath();
        ctx.moveTo(x, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        prevX = x;
        prevY = y;
        prevStatus = status;
      }
      
      // Draw final horizontal line to end of day
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(gridWidth, prevY);
      ctx.stroke();
    }
    
    // Draw remarks section
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, headerHeight + gridHeight, gridWidth, remarksHeight);
    
    // Draw "REMARKS" text larger like in the image
    ctx.fillStyle = textColor;
    ctx.font = 'bold 18px Arial';
    ctx.fillText('REMARKS', 20, headerHeight + gridHeight + 30);
    
    // Draw horizontal line under REMARKS header
    ctx.beginPath();
    ctx.moveTo(20, headerHeight + gridHeight + 35);
    ctx.lineTo(150, headerHeight + gridHeight + 35);
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.font = '12px Arial';
    let remarkY = headerHeight + gridHeight + 60;
    
    // Sort remarks by time
    const sortedRemarks = [...remarks].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    
    // Draw marks on the grid where remarks exist
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1;
    sortedRemarks.forEach(remark => {
      const x = minutesToX(timeToMinutes(remark.time));
      
      // Draw a small mark on the bottom of the grid
      ctx.beginPath();
      ctx.moveTo(x, headerHeight + gridHeight - 5);
      ctx.lineTo(x, headerHeight + gridHeight + 10);
      ctx.stroke();
    });
    
    // Draw the actual remarks text
    sortedRemarks.forEach(remark => {
      const timeStr = remark.time.includes('T') 
        ? new Date(remark.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        : remark.time;
      
      ctx.fillText(`${timeStr} - ${remark.text}`, 20, remarkY);
      remarkY += 20;
      
      // If remarks exceed the space, add ellipsis to the last visible one
      if (remarkY > headerHeight + gridHeight + remarksHeight - 10) {
        ctx.fillText('...', 20, remarkY - 20);
        return; // Break the loop
      }
    });
    
    // Draw certification section
    ctx.font = 'bold 12px Arial';
    ctx.fillText('CERTIFICATION:', 700, headerHeight + gridHeight + 20);
    ctx.font = '10px Arial';
    ctx.fillText('I certify that my entries are true and correct', 700, headerHeight + gridHeight + 40);
    
    ctx.beginPath();
    ctx.moveTo(700, headerHeight + gridHeight + 70);
    ctx.lineTo(1000, headerHeight + gridHeight + 70);
    ctx.stroke();
    
    ctx.fillText('Driver Signature', 830, headerHeight + gridHeight + 85);
    
    // Draw zoom level indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, 10, 80, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px Arial';
    ctx.fillText(`Zoom: ${(zoom * 100).toFixed(0)}%`, 15, 23);
    
    // Restore canvas state
    ctx.restore();
  };
  
  // Canvas mouse events for interactivity
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / canvas.width) - pan.x;
    const y = (e.clientY - rect.top) / (rect.height / canvas.height) - pan.y;
    
    // Handle dragging
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setPan({
        x: pan.x + deltaX,
        y: pan.y + deltaY
      });
      
      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
      
      return;
    }
    
    // Check if mouse is over a status line
    if (y >= headerHeight && y <= headerHeight + gridHeight) {
      const minutes = xToMinutes(x);
      const status = getStatusFromY(y);
      
      if (status !== null) {
        // Find the status at this time
        const timeStr = minutesToTimeString(Math.floor(minutes));
        
        let statusAtTime = DutyStatus.OFF; // Default status
        
        // Find what status was active at this time
        for (const change of sortedStatusChanges) {
          const changeTime = timeToMinutes(change.time);
          if (changeTime <= minutes) {
            statusAtTime = change.status;
          } else {
            break; // Changes are sorted, so we can stop once we're past the current time
          }
        }
        
        if (status === statusAtTime) {
          // Mouse is over an active status line
          setTooltip({
            x: e.clientX,
            y: e.clientY,
            text: `${timeStr} - ${getStatusLabel(status)}`,
            visible: true
          });
          return;
        }
      }
    }
    
    // If we get here, mouse is not over a status line
    setTooltip({ ...tooltip, visible: false });
  };
  
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Middle mouse button or space+click for panning
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
      e.preventDefault();
    }
  };
  
  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleCanvasMouseLeave = () => {
    setIsDragging(false);
    setTooltip({ ...tooltip, visible: false });
  };
  
  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert mouse position to canvas coordinates
    const canvasX = mouseX / (rect.width / canvas.width) - pan.x;
    const canvasY = mouseY / (rect.height / canvas.height) - pan.y;
    
    // Calculate new zoom level
    const zoomDelta = -e.deltaY * 0.001;
    const newZoom = Math.max(0.5, Math.min(3, zoom + zoomDelta));
    
    // Calculate new pan to zoom on mouse position
    const newPanX = pan.x - ((canvasX * newZoom / zoom) - canvasX);
    const newPanY = pan.y - ((canvasY * newZoom / zoom) - canvasY);
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };
  
  // Reset view button
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  
  // Draw initially and on prop changes
  useEffect(() => {
    drawGrid();
  }, [
    location, date, driverName, statusChanges, remarks, 
    truckNumber, trailerNumbers, totalMiles, zoom, pan
  ]);
  
  return (
    <div className="eld-log-grid relative">
      <div className="controls absolute top-2 right-2 z-10 flex space-x-2">
        <button 
          className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
          onClick={() => setZoom(Math.min(3, zoom + 0.1))}
        >
          +
        </button>
        <button 
          className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
          onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
        >
          -
        </button>
        <button 
          className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm"
          onClick={resetView}
        >
          Reset
        </button>
      </div>
      
      <canvas 
        ref={canvasRef} 
        width={baseGridWidth} 
        height={totalHeight}
        onMouseMove={handleCanvasMouseMove}
        onMouseDown={handleCanvasMouseDown}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
        onWheel={handleCanvasWheel}
        style={{ 
          maxWidth: '100%', 
          height: 'auto',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      />
      
      {tooltip.visible && (
        <div 
          className="absolute bg-gray-800 text-white px-2 py-1 rounded text-xs pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            zIndex: 20
          }}
        >
          {tooltip.text}
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500">
        <p>Mouse wheel to zoom, Alt+Click and drag to pan. Hover over status lines for details.</p>
      </div>
    </div>
  );
};

export default EldLogGrid; 