import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const progressPercentage = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full max-w-xs bg-gray-700 rounded-full h-2.5 mt-4">
      <div
        className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-linear"
        style={{ width: `${progressPercentage}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;
