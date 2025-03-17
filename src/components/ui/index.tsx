import React from 'react';

// Error message component
interface ErrorMessageProps {
  message: string;
  details?: string;
  variant?: 'error' | 'warning' | 'info';
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  details, 
  variant = 'error' 
}) => {
  const bgColor = {
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  }[variant];
  
  const textColor = {
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800'
  }[variant];
  
  const iconColor = {
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  }[variant];
  
  return (
    <div className={`rounded-md ${bgColor} p-4 mb-4`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${textColor}`}>{message}</h3>
          {details && (
            <div className={`mt-2 text-sm ${textColor}`}>
              <p>{details}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Loading spinner component
interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  text = 'Loading...', 
  size = 'md' 
}) => {
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }[size];
  
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <svg className={`animate-spin ${sizeClass} text-blue-600`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
};

// Empty state component
interface EmptyStateProps {
  title: string;
  description?: string;
  actionText?: string;
  actionFn?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  actionFn,
  icon
}) => {
  return (
    <div className="text-center py-12 px-4 bg-gray-50 rounded-lg border border-gray-200">
      {icon || (
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {actionText && actionFn && (
        <div className="mt-6">
          <button
            type="button"
            onClick={actionFn}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
};

// Tab button component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export const TabButton: React.FC<TabButtonProps> = ({
  active,
  onClick,
  children
}) => {
  return (
    <button
      type="button"
      className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
        active
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}; 