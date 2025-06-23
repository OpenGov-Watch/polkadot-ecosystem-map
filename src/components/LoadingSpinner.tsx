import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading Polkadot Ecosystem Data...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
