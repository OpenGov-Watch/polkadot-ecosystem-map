import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';

const Navigation: React.FC = () => {
  const location = useLocation();
  const { config } = useConfig();

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h1>Polkadot Ecosystem</h1>
      </div>
      <div className="nav-links">
        <Link 
          to="/table" 
          className={location.pathname === '/table' ? 'active' : ''}
        >
          Table View
        </Link>
        <Link 
          to="/graph" 
          className={location.pathname === '/graph' ? 'active' : ''}
        >
          Graph View
        </Link>
      </div>
      <div className="nav-info">
        <span className="view-type">
          Current: {config.viewType === 'table' ? 'Table' : 'Graph'}
        </span>
        <span className="entity-count">
          Types: {config.entityTypes.join(', ')}
        </span>
      </div>
    </nav>
  );
};

export default Navigation;
