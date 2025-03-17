import React from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  actionLink?: string;
  onAction?: () => void;
}

/**
 * A reusable empty state component
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  actionLink,
  onAction,
}) => {
  // Default icon if none provided
  const defaultIcon = (
    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );

  // Render action button or link
  const renderAction = () => {
    if (!actionText) return null;

    const buttonClasses = "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700";

    if (actionLink) {
      return (
        <Link to={actionLink} className={buttonClasses}>
          {actionText}
        </Link>
      );
    }

    if (onAction) {
      return (
        <button onClick={onAction} className={buttonClasses}>
          {actionText}
        </button>
      );
    }

    return null;
  };

  return (
    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
      <div className="mx-auto">
        {icon || defaultIcon}
      </div>
      <h3 className="mt-2 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-gray-500">{description}</p>
      {(actionText && (actionLink || onAction)) && (
        <div className="mt-6">
          {renderAction()}
        </div>
      )}
    </div>
  );
};

export default EmptyState; 