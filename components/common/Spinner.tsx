
import React from 'react';

interface SpinnerProps {
  small?: boolean;
  large?: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({ small, large }) => {
  const sizeClasses = large ? 'w-12 h-12' : (small ? 'w-5 h-5 mr-2' : 'w-8 h-8');
  const borderClasses = large ? 'border-4' : (small ? 'border-2' : 'border-4');
  
  return (
    <div className={`animate-spin rounded-full ${sizeClasses} ${borderClasses} border-t-primary border-r-primary border-b-transparent border-l-transparent`}></div>
  );
};

export default Spinner;
