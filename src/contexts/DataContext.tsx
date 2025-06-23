import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { EcosystemData, DataContextType } from '../types/types';

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  data: EcosystemData;
  children: ReactNode;
}

export function DataProvider({ data, children }: DataProviderProps) {
  const [entityTypeFilter, setEntityTypeFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEntities = useMemo(() => {
    let filtered = [...data.entities];

    // Apply entity type filter
    if (entityTypeFilter.length > 0) {
      filtered = filtered.filter(entity => 
        entityTypeFilter.includes(entity.type)
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(entity => {
        return (
          entity.name.toLowerCase().includes(query) ||
          entity.slug.toLowerCase().includes(query) ||
          (entity.description && entity.description.toLowerCase().includes(query)) ||
          (entity.tags && entity.tags.some(tag => tag.toLowerCase().includes(query)))
        );
      });
    }

    return filtered;
  }, [data.entities, entityTypeFilter, searchQuery]);

  const setEntityTypeFilterHandler = (types: string[]) => {
    setEntityTypeFilter(types);
  };

  const searchEntities = (query: string) => {
    setSearchQuery(query);
  };

  const resetFilters = () => {
    setEntityTypeFilter([]);
    setSearchQuery('');
  };

  const contextValue: DataContextType = {
    data,
    filteredEntities,
    setEntityTypeFilter: setEntityTypeFilterHandler,
    searchEntities,
    resetFilters,
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
