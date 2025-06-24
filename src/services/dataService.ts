import * as yaml from 'js-yaml';
import { EcosystemData, EcosystemEntity, ManualRelationshipsConfig, EnhancedRelationship } from '../types/types';

/**
 * Fetch and parse YAML files from the data directory
 * This is a runtime function that loads data without validation
 */
async function fetchDataFiles(): Promise<EcosystemEntity[]> {
  const entities: EcosystemEntity[] = [];
  
  try {
    // Try to fetch known file patterns
    const dataFilePatterns = [
      'parachains',
      'dapps', 
      'infrastructure',
      'tools',
      'wallets',
      'bridges',
      'defi',
      'nft',
      'gaming'
    ];
    
    for (const pattern of dataFilePatterns) {
      try {
        const response = await fetch(`/data/${pattern}.yml`);
        if (response.ok) {
          const yamlText = await response.text();
          const parsedData = yaml.load(yamlText) as any;
          
          // Handle different YAML structures
          if (Array.isArray(parsedData)) {
            entities.push(...parsedData);
          } else if (parsedData && typeof parsedData === 'object') {
            // If it's an object, look for arrays of entities
            Object.values(parsedData).forEach(value => {
              if (Array.isArray(value)) {
                entities.push(...value);
              }
            });
          }
        }
      } catch (error) {
        console.warn(`Could not load ${pattern}.yml:`, error);
      }
    }
    
    // Also try to load from a single data.yml file
    try {
      const response = await fetch('/data.yml');
      if (response.ok) {
        const yamlText = await response.text();
        const parsedData = yaml.load(yamlText) as any;
        
        if (Array.isArray(parsedData)) {
          entities.push(...parsedData);
        } else if (parsedData && parsedData.entities && Array.isArray(parsedData.entities)) {
          entities.push(...parsedData.entities);
        }
      }
    } catch (error) {
      console.warn('Could not load data.yml:', error);
    }
    
  } catch (error) {
    console.error('Failed to fetch data files:', error);
    throw new Error('Failed to load ecosystem data files');
  }
  
  return entities;
}

/**
 * Extract relationships from entities and convert to enhanced format
 */
function extractEntityRelationships(entities: EcosystemEntity[]): EnhancedRelationship[] {
  const relationships: EnhancedRelationship[] = [];

  entities.forEach(entity => {
    if (entity.relationships) {
      entity.relationships.forEach(rel => {
        relationships.push({
          source: entity.slug,
          target: rel.target,
          type: rel.type,
          weight: rel.weight || 1,
          isManual: false
        });
      });
    }
  });

  return relationships;
}

/**
 * Convert manual relationships to enhanced format
 */
function processManualRelationships(manualConfig: ManualRelationshipsConfig): EnhancedRelationship[] {
  const relationships: EnhancedRelationship[] = [];

  manualConfig.relationships.forEach(rel => {
    // Add the primary relationship
    relationships.push({
      ...rel,
      isManual: true
    });

    // Add reverse relationship if bidirectional
    if (rel.bidirectional) {
      relationships.push({
        source: rel.target,
        target: rel.source,
        type: rel.type,
        weight: rel.weight,
        description: rel.description,
        category: rel.category,
        bidirectional: false, // Don't create another reverse
        isManual: true,
        metadata: rel.metadata
      });
    }
  });

  return relationships;
}

/**
 * Merge entity relationships with manual relationships
 */
function mergeRelationships(
  entityRelationships: EnhancedRelationship[],
  manualRelationships: EnhancedRelationship[]
): EnhancedRelationship[] {
  const relationshipMap = new Map<string, EnhancedRelationship>();

  // Add entity relationships first
  entityRelationships.forEach(rel => {
    const key = `${rel.source}-${rel.target}-${rel.type}`;
    relationshipMap.set(key, rel);
  });

  // Add manual relationships, potentially overriding entity relationships
  manualRelationships.forEach(rel => {
    const key = `${rel.source}-${rel.target}-${rel.type}`;
    if (relationshipMap.has(key)) {
      // Manual relationship overrides entity relationship
      console.log(`Manual relationship overriding entity relationship: ${key}`);
    }
    relationshipMap.set(key, rel);
  });

  return Array.from(relationshipMap.values());
}

/**
 * Generate metadata about the dataset
 */
function generateMetadata(entities: EcosystemEntity[]) {
  const entityTypeCounts: Record<string, number> = {};
  const entityTypes = new Set<string>();
  
  entities.forEach(entity => {
    entityTypes.add(entity.type);
    entityTypeCounts[entity.type] = (entityTypeCounts[entity.type] || 0) + 1;
  });
  
  return {
    lastUpdated: new Date().toISOString(),
    totalEntities: entities.length,
    entityTypeCounts,
    entityTypes: Array.from(entityTypes)
  };
}

/**
 * Fetch and parse manual relationships from relationships.yml
 */
async function fetchManualRelationships(): Promise<ManualRelationshipsConfig | null> {
  try {
    const response = await fetch('/relationships.yml');
    if (response.ok) {
      const yamlText = await response.text();
      const parsedData = yaml.load(yamlText) as ManualRelationshipsConfig;
      console.log(`Loaded ${parsedData.relationships?.length || 0} manual relationships`);
      return parsedData;
    }
  } catch (error) {
    console.warn('Could not load relationships.yml:', error);
  }
  return null;
}

/**
 * Main function to load ecosystem data (no validation at runtime)
 */
export async function loadEcosystemData(): Promise<EcosystemData> {
  console.log('Loading ecosystem data...');
  
  try {
    // Fetch all data files
    const entities = await fetchDataFiles();
    console.log(`Loaded ${entities.length} entities`);
    
    if (entities.length === 0) {
      throw new Error('No data files found. Make sure data files are available in the public/data directory.');
    }
    
    // Filter out any obviously broken entities (best effort)
    const validEntities = entities.filter(entity => {
      return entity && entity.slug && entity.name && entity.type;
    });
    
    if (validEntities.length < entities.length) {
      console.warn(`Filtered out ${entities.length - validEntities.length} invalid entities`);
    }
    
    // Extract entity relationships
    const entityRelationships = extractEntityRelationships(validEntities);
    
    // Load manual relationships
    const manualRelationshipsConfig = await fetchManualRelationships();
    const manualRelationships = manualRelationshipsConfig 
      ? processManualRelationships(manualRelationshipsConfig)
      : [];
    
    // Merge all relationships
    const allRelationships = mergeRelationships(entityRelationships, manualRelationships);
    
    // Generate metadata
    const metadata = generateMetadata(validEntities);
    
    console.log(`Successfully loaded ${validEntities.length} valid entities`);
    console.log(`Loaded ${entityRelationships.length} entity relationships`);
    console.log(`Loaded ${manualRelationships.length} manual relationships`);
    console.log(`Total relationships: ${allRelationships.length}`);
    console.log('Entity types:', metadata.entityTypes);
    console.log('Entity counts:', metadata.entityTypeCounts);
      return {
      entities: validEntities,
      entityTypes: metadata.entityTypes,
      relationships: allRelationships,
      manualRelationshipsConfig: manualRelationshipsConfig || undefined,
      metadata: {
        ...metadata,
        totalEntities: validEntities.length,
        totalRelationships: allRelationships.length,
        manualRelationships: manualRelationships.length
      }
    };
    
  } catch (error) {
    console.error('Failed to load ecosystem data:', error);
    throw new Error(`Failed to load ecosystem data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Cache for loaded data
 */
let cachedData: EcosystemData | null = null;

/**
 * Get ecosystem data with caching
 */
export async function getEcosystemData(): Promise<EcosystemData> {
  if (!cachedData) {
    cachedData = await loadEcosystemData();
  }
  return cachedData;
}

/**
 * Clear the cache (useful for development)
 */
export function clearDataCache(): void {
  cachedData = null;
}
