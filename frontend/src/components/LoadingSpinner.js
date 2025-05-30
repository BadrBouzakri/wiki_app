import React from 'react';
import classNames from 'classnames';

const LoadingSpinner = ({ size = 'md', color = 'primary', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    primary: 'text-primary-600',
    white: 'text-white',
    gray: 'text-gray-600'
  };

  return (
    <div className={classNames(
      'animate-spin rounded-full border-2 border-current border-t-transparent',
      sizeClasses[size],
      colorClasses[color],
      className
    )}>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;