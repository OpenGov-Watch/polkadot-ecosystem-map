import * as yaml from 'js-yaml';
import { RenderConfig } from '../types/types';

/**
 * Default render configuration
 */
const defaultConfig: RenderConfig = {
  viewType: 'table',
  entityTypes: ['parachain', 'dapp', 'infrastructure'],
  table: {
    columns: [
      { key: 'name', label: 'Name', type: 'string', sortable: true, filterable: true },
      { key: 'type', label: 'Type', type: 'string', sortable: true, filterable: true },
      { key: 'description', label: 'Description', type: 'string', filterable: true },
      { key: 'metrics.stars', label: 'Stars', type: 'number', sortable: true },
      { key: 'website', label: 'Website', type: 'link' },
    ],
    defaultSort: {
      column: 'metrics.stars',
      direction: 'desc'
    },
    pageSize: 25
  },
  graph: {
    physics: {
      alphaDecay: 0.0228,
      chargeStrength: -30,
      linkDistance: 30,
      linkStrength: 1,
      velocityDecay: 0.4
    },
    nodes: {
      sizeBy: {
        property: 'size',
        field: 'metrics.stars',
        scale: 'sqrt',
        domain: [0, 1000],
        range: [5, 20]
      },
      colorBy: {
        property: 'color',
        field: 'type',
        scale: 'linear',
        range: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#fecca7', '#ff9999']
      },
      labelField: 'name',
      showLabels: true
    },
    edges: {
      widthBy: {
        property: 'width',
        field: 'weight',
        scale: 'linear',
        domain: [1, 10],
        range: [1, 5]
      },
      showLabels: false
    },
    width: 800,
    height: 600
  }
};

/**
 * Load render configuration from render.yaml
 */
export async function loadRenderConfig(): Promise<RenderConfig> {
  try {
    const response = await fetch('/render.yaml');
    
    if (!response.ok) {
      console.warn('render.yaml not found, using default configuration');
      return defaultConfig;
    }
    
    const yamlText = await response.text();
    const configData = yaml.load(yamlText) as Partial<RenderConfig>;
    
    // Merge with default config
    const mergedConfig = mergeConfigs(defaultConfig, configData);
    
    // Validate the merged config
    validateConfig(mergedConfig);
    
    console.log('Render configuration loaded successfully');
    return mergedConfig;
    
  } catch (error) {
    console.error('Failed to load render configuration:', error);
    console.warn('Falling back to default configuration');
    return defaultConfig;
  }
}

/**
 * Deep merge two configuration objects
 */
function mergeConfigs(defaultConfig: RenderConfig, userConfig: Partial<RenderConfig>): RenderConfig {
  const merged = { ...defaultConfig };
  
  if (userConfig.viewType) {
    merged.viewType = userConfig.viewType;
  }
  
  if (userConfig.entityTypes) {
    merged.entityTypes = userConfig.entityTypes;
  }
  
  if (userConfig.table) {
    merged.table = {
      ...defaultConfig.table!,
      ...userConfig.table,
      columns: userConfig.table.columns || defaultConfig.table!.columns
    };
  }
  
  if (userConfig.graph) {
    merged.graph = {
      ...defaultConfig.graph!,
      ...userConfig.graph,
      physics: {
        ...defaultConfig.graph!.physics,
        ...userConfig.graph.physics
      },
      nodes: {
        ...defaultConfig.graph!.nodes,
        ...userConfig.graph.nodes
      },
      edges: {
        ...defaultConfig.graph!.edges,
        ...userConfig.graph.edges
      }
    };
  }
  
  return merged;
}

/**
 * Validate render configuration
 */
function validateConfig(config: RenderConfig): void {
  if (!['table', 'graph'].includes(config.viewType)) {
    throw new Error(`Invalid viewType: ${config.viewType}. Must be 'table' or 'graph'.`);
  }
  
  if (!Array.isArray(config.entityTypes) || config.entityTypes.length === 0) {
    throw new Error('entityTypes must be a non-empty array');
  }
  
  if (config.viewType === 'table' && !config.table) {
    throw new Error('Table configuration is required when viewType is "table"');
  }
  
  if (config.viewType === 'graph' && !config.graph) {
    throw new Error('Graph configuration is required when viewType is "graph"');
  }
  
  // Validate table configuration
  if (config.table) {
    if (!Array.isArray(config.table.columns) || config.table.columns.length === 0) {
      throw new Error('Table must have at least one column defined');
    }
    
    config.table.columns.forEach((column, index) => {
      if (!column.key || !column.label) {
        throw new Error(`Column ${index} must have both 'key' and 'label' properties`);
      }
      
      if (!['string', 'number', 'date', 'link', 'tags'].includes(column.type)) {
        throw new Error(`Invalid column type: ${column.type}`);
      }
    });
  }
  
  // Validate graph configuration
  if (config.graph) {
    const { physics, nodes, edges } = config.graph;
    
    if (physics) {
      Object.entries(physics).forEach(([key, value]) => {
        if (typeof value !== 'number') {
          throw new Error(`Physics parameter ${key} must be a number`);
        }
      });
    }
    
    if (nodes && nodes.sizeBy) {
      validateStylingRule(nodes.sizeBy, 'node sizeBy');
    }
    
    if (nodes && nodes.colorBy) {
      validateStylingRule(nodes.colorBy, 'node colorBy');
    }
    
    if (edges && edges.widthBy) {
      validateStylingRule(edges.widthBy, 'edge widthBy');
    }
  }
}

/**
 * Validate styling rule configuration
 */
function validateStylingRule(rule: any, context: string): void {
  if (!rule.property || !rule.field) {
    throw new Error(`${context} must have 'property' and 'field' defined`);
  }
  
  if (!['linear', 'log', 'sqrt'].includes(rule.scale)) {
    throw new Error(`${context} scale must be 'linear', 'log', or 'sqrt'`);
  }
  
  if (rule.domain && (!Array.isArray(rule.domain) || rule.domain.length !== 2)) {
    throw new Error(`${context} domain must be an array of two numbers`);
  }
  
  if (rule.range && !Array.isArray(rule.range)) {
    throw new Error(`${context} range must be an array`);
  }
}

/**
 * Get default configuration for a specific view type
 */
export function getDefaultConfigForViewType(viewType: 'table' | 'graph'): RenderConfig {
  return {
    ...defaultConfig,
    viewType
  };
}

/**
 * Create a sample parachain-only table configuration
 */
export function createParachainTableConfig(): RenderConfig {
  return {
    viewType: 'table',
    entityTypes: ['parachain'],
    table: {
      columns: [
        { key: 'name', label: 'Parachain Name', type: 'string', sortable: true, filterable: true },
        { key: 'description', label: 'Description', type: 'string', filterable: true },
        { key: 'metrics.tx_count', label: 'Transactions', type: 'number', sortable: true },
        { key: 'metrics.tvl', label: 'TVL', type: 'number', sortable: true },
        { key: 'website', label: 'Website', type: 'link' },
        { key: 'github', label: 'GitHub', type: 'link' }
      ],
      defaultSort: {
        column: 'metrics.tvl',
        direction: 'desc'
      },
      pageSize: 50
    }
  };
}

/**
 * Create a sample full-graph configuration with custom physics
 */
export function createFullGraphConfig(): RenderConfig {
  return {
    viewType: 'graph',
    entityTypes: ['parachain', 'dapp', 'infrastructure', 'defi', 'wallet', 'bridge'],
    graph: {
      physics: {
        alphaDecay: 0.02,
        chargeStrength: -100,
        linkDistance: 50,
        linkStrength: 0.5,
        velocityDecay: 0.3,
        gravity: 0.1
      },
      nodes: {
        sizeBy: {
          property: 'size',
          field: 'metrics.stars',
          scale: 'log',
          domain: [1, 10000],
          range: [8, 30]
        },
        colorBy: {
          property: 'color',
          field: 'type',
          scale: 'linear',
          range: [
            '#e74c3c', // parachain - red
            '#3498db', // dapp - blue  
            '#2ecc71', // infrastructure - green
            '#f39c12', // defi - orange
            '#9b59b6', // wallet - purple
            '#1abc9c'  // bridge - teal
          ]
        },
        labelField: 'name',
        showLabels: true
      },
      edges: {
        widthBy: {
          property: 'width',
          field: 'weight',
          scale: 'sqrt',
          domain: [1, 20],
          range: [1, 8]
        },
        colorBy: {
          property: 'color',
          field: 'type',
          scale: 'linear',
          range: ['#95a5a6', '#34495e', '#7f8c8d']
        },
        showLabels: false
      },
      width: 1200,
      height: 800
    }
  };
}
