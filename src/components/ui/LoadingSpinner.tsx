import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  fullPage?: boolean;
}

/**
 * A reusable loading spinner component
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  text = 'Loading...',
  fullPage = false,
}) => {
  // Determine spinner size
  const spinnerSizeClasses = {
    small: 'h-6 w-6 border-b-2',
    medium: 'h-10 w-10 border-b-2',
    large: 'h-16 w-16 border-b-3',
  };

  // Determine text size
  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  const containerClasses = fullPage
    ? 'fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50'
    : 'flex justify-center items-center py-8';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center">
        <div
          className={`animate-spin rounded-full ${spinnerSizeClasses[size]} border-blue-600`}
          role="status"
          aria-label="Loading"
        />
        {text && (
          <span className={`mt-4 text-gray-600 ${textSizeClasses[size]}`}>
            {text}
          </span>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner; 