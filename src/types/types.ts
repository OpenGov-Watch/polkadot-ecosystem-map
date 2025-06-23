// Base entity interface that all ecosystem entities implement
export interface EcosystemEntity {
  slug: string;
  name: string;
  type: string;
  description?: string;
  website?: string;
  github?: string;
  twitter?: string;  metrics?: {
    stars?: number;
    forks?: number;
    contributors?: number;
    tx_count?: number;
    tvl?: number;
    market_cap?: number;
    twitter_followers?: number;
    [key: string]: number | undefined;
  };
  tags?: string[];
  relationships?: Array<{
    target: string;
    type: string;
    weight?: number;
  }>;
  [key: string]: any; // Allow additional properties
}

// Collection of all ecosystem data
export interface EcosystemData {
  entities: EcosystemEntity[];
  entityTypes: string[];
  relationships: Array<{
    source: string;
    target: string;
    type: string;
    weight?: number;
  }>;
  metadata: {
    lastUpdated: string;
    totalEntities: number;
    entityTypeCounts: Record<string, number>;
  };
}

// Configuration for table columns
export interface TableColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'link' | 'tags';
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
}

// Configuration for graph physics
export interface GraphPhysics {
  alphaDecay?: number;
  chargeStrength?: number;
  linkDistance?: number;
  linkStrength?: number;
  velocityDecay?: number;
  gravity?: number;
}

// Configuration for styling rules
export interface StylingRule {
  property: string; // e.g., 'size', 'color', 'width'
  field: string; // field to base styling on
  scale: 'linear' | 'log' | 'sqrt';
  domain?: [number, number];
  range?: [number, number] | string[];
}

// Configuration for node styling
export interface NodeStyling {
  sizeBy?: StylingRule;
  colorBy?: StylingRule;
  labelField?: string;
  showLabels?: boolean;
}

// Configuration for edge styling
export interface EdgeStyling {
  widthBy?: StylingRule;
  colorBy?: StylingRule;
  showLabels?: boolean;
}

// Main render configuration
export interface RenderConfig {
  viewType: 'table' | 'graph';
  entityTypes: string[];
  table?: {
    columns: TableColumn[];
    defaultSort?: {
      column: string;
      direction: 'asc' | 'desc';
    };
    pageSize?: number;
  };
  graph?: {
    physics: GraphPhysics;
    nodes: NodeStyling;
    edges: EdgeStyling;
    width?: number;
    height?: number;
  };
}

// Context types
export interface DataContextType {
  data: EcosystemData;
  filteredEntities: EcosystemEntity[];
  setEntityTypeFilter: (types: string[]) => void;
  searchEntities: (query: string) => void;
  resetFilters: () => void;
}

export interface ConfigContextType {
  config: RenderConfig;
  updateConfig: (newConfig: Partial<RenderConfig>) => void;
}

// Graph-specific types
export interface GraphNode extends EcosystemEntity {
  id: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  weight?: number;
}
