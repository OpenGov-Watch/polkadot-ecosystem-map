import { createContext, useContext, useState, ReactNode } from 'react';
import { RenderConfig, ConfigContextType } from '../types/types';

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

interface ConfigProviderProps {
  config: RenderConfig;
  children: ReactNode;
}

export function ConfigProvider({ config: initialConfig, children }: ConfigProviderProps) {
  const [config, setConfig] = useState<RenderConfig>(initialConfig);
  const updateConfig = (newConfig: Partial<RenderConfig>) => {
    setConfig((prevConfig: RenderConfig) => ({
      ...prevConfig,
      ...newConfig,
      // Deep merge for nested objects
      table: newConfig.table ? {
        ...prevConfig.table,
        ...newConfig.table,
        columns: newConfig.table.columns || prevConfig.table?.columns || []
      } : prevConfig.table,
      graph: newConfig.graph ? {
        ...prevConfig.graph,
        ...newConfig.graph,
        physics: {
          ...prevConfig.graph?.physics,
          ...newConfig.graph.physics
        },
        nodes: {
          ...prevConfig.graph?.nodes,
          ...newConfig.graph.nodes
        },
        edges: {
          ...prevConfig.graph?.edges,
          ...newConfig.graph.edges
        }
      } : prevConfig.graph
    }));
  };

  const contextValue: ConfigContextType = {
    config,
    updateConfig,
  };

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextType {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
