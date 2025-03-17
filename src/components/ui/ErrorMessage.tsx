import React from 'react';

interface ErrorMessageProps {
  message: string;
  details?: string;
  onRetry?: () => void;
  variant?: 'error' | 'warning' | 'info';
}

/**
 * A reusable error message component
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  details,
  onRetry,
  variant = 'error',
}) => {
  // Determine styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-400 text-yellow-700',
          icon: 'text-yellow-400',
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-400 text-blue-700',
          icon: 'text-blue-400',
        };
      case 'error':
      default:
        return {
          container: 'bg-red-50 border-red-400 text-red-700',
          icon: 'text-red-400',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`rounded-md border p-4 ${styles.container}`} role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          {variant === 'error' && (
            <svg className={`h-5 w-5 ${styles.icon}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {variant === 'warning' && (
            <svg className={`h-5 w-5 ${styles.icon}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {variant === 'info' && (
            <svg className={`h-5 w-5 ${styles.icon}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium">{message}</h3>
          {details && <div className="mt-2 text-sm">{details}</div>}
          {onRetry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                className="rounded-md bg-white px-3 py-2 text-sm font-medium shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage; 