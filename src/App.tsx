import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { ConfigProvider } from './contexts/ConfigContext';
import TableView from './components/TableView';
import GraphView from './components/GraphView';
import Navigation from './components/Navigation';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { loadAndValidateData } from './services/dataService';
import { loadRenderConfig } from './services/configService';
import { EcosystemData, RenderConfig } from './types/types';
import './App.css';

function App() {
  const [data, setData] = useState<EcosystemData | null>(null);
  const [config, setConfig] = useState<RenderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        
        // Load and validate data
        const ecosystemData = await loadAndValidateData();
        setData(ecosystemData);
        
        // Load render configuration
        const renderConfig = await loadRenderConfig();
        setConfig(renderConfig);
        
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="error-container">
        <h1>Error</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!data || !config) {
    return (
      <div className="error-container">
        <h1>No Data Available</h1>
        <p>Failed to load ecosystem data or configuration.</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <DataProvider data={data}>
        <ConfigProvider config={config}>
          <Router>
            <div className="app">
              <Navigation />
              <main className="main-content">
                <Routes>
                  <Route 
                    path="/" 
                    element={
                      <Navigate 
                        to={config.viewType === 'table' ? '/table' : '/graph'} 
                        replace 
                      />
                    } 
                  />
                  <Route path="/table" element={<TableView />} />
                  <Route path="/graph" element={<GraphView />} />
                </Routes>
              </main>
            </div>
          </Router>
        </ConfigProvider>
      </DataProvider>
    </ErrorBoundary>
  );
}

export default App;
