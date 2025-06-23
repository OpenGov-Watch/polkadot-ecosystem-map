import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as yaml from 'js-yaml';
import { EcosystemData, EcosystemEntity, ValidationResult } from '../types/types';

// Initialize AJV with formats
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

let dataSchema: any = null;

/**
 * Load and parse the data schema from data.schema.yml
 */
async function loadDataSchema(): Promise<any> {
  if (dataSchema) return dataSchema;
  
  try {
    const response = await fetch('/data.schema.yml');
    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`);
    }
    const schemaText = await response.text();
    dataSchema = yaml.load(schemaText);
    return dataSchema;
  } catch (error) {
    console.error('Failed to load data schema:', error);
    throw new Error('Could not load data schema. Make sure data.schema.yml exists in the public directory.');
  }
}

/**
 * Validate a single entity against the schema
 */
function validateEntity(entity: any, schema: any): ValidationResult {
  const validate = ajv.compile(schema);
  const valid = validate(entity);
  
  if (!valid && validate.errors) {    const errors = validate.errors.map((err: any) => ({
      field: err.instancePath || err.schemaPath,
      message: err.message || 'Validation error',
      value: err.data
    }));
    
    return { valid: false, errors };
  }
  
  return { valid: true };
}

/**
 * Fetch and parse YAML files from the data directory
 */
async function fetchDataFiles(): Promise<EcosystemEntity[]> {
  const entities: EcosystemEntity[] = [];
  
  try {
    // First, try to get the list of data files
    // In a real implementation, you might have an index file or API endpoint
    // For now, we'll try to fetch known file patterns
    
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
 * Extract relationships from entities
 */
function extractRelationships(entities: EcosystemEntity[]) {
  const relationships: Array<{
    source: string;
    target: string;
    type: string;
    weight?: number;
  }> = [];
  
  entities.forEach(entity => {
    if (entity.relationships) {
      entity.relationships.forEach(rel => {
        relationships.push({
          source: entity.slug,
          target: rel.target,
          type: rel.type,
          weight: rel.weight || 1
        });
      });
    }
  });
  
  return relationships;
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
 * Main function to load and validate all ecosystem data
 */
export async function loadAndValidateData(): Promise<EcosystemData> {
  console.log('Loading ecosystem data...');
  
  try {
    // Load schema
    const schema = await loadDataSchema();
    console.log('Schema loaded successfully');
    
    // Fetch all data files
    const rawEntities = await fetchDataFiles();
    console.log(`Loaded ${rawEntities.length} raw entities`);
    
    if (rawEntities.length === 0) {
      throw new Error('No data files found. Make sure data files are available in the public/data directory.');
    }
    
    // Validate each entity
    const validatedEntities: EcosystemEntity[] = [];
    const validationErrors: Array<{ slug: string; errors: any[] }> = [];
    
    rawEntities.forEach((entity, index) => {
      if (!entity.slug) {
        entity.slug = `entity-${index}`;
      }
      
      const validation = validateEntity(entity, schema);
      
      if (validation.valid) {
        validatedEntities.push(entity);
      } else {
        validationErrors.push({
          slug: entity.slug || `entity-${index}`,
          errors: validation.errors || []
        });
      }
    });
    
    // Log validation results
    if (validationErrors.length > 0) {
      console.warn(`Validation errors found in ${validationErrors.length} entities:`);
      validationErrors.forEach(({ slug, errors }) => {
        console.warn(`- ${slug}:`, errors);
      });
      
      // Depending on requirements, you might want to halt here
      // For now, we'll continue with valid entities only
      if (validatedEntities.length === 0) {
        throw new Error('No valid entities found after validation. Please check your data files and schema.');
      }
    }
    
    // Extract relationships and generate metadata
    const relationships = extractRelationships(validatedEntities);
    const metadata = generateMetadata(validatedEntities);
      const ecosystemData: EcosystemData = {
      entities: validatedEntities,
      entityTypes: metadata.entityTypes,
      relationships,
      metadata: {
        lastUpdated: metadata.lastUpdated,
        totalEntities: metadata.totalEntities,
        entityTypeCounts: metadata.entityTypeCounts
      }
    };
    
    console.log('Data loading and validation completed successfully');
    console.log(`Valid entities: ${validatedEntities.length}`);
    console.log(`Relationships: ${relationships.length}`);
    console.log(`Entity types: ${metadata.entityTypes.join(', ')}`);
    
    return ecosystemData;
    
  } catch (error) {
    console.error('Failed to load and validate data:', error);
    throw error;
  }
}

/**
 * Validate data on demand (for CLI usage)
 */
export async function validateDataOnly(): Promise<void> {
  try {
    await loadAndValidateData();
    console.log('✅ Data validation passed');
  } catch (error) {
    console.error('❌ Data validation failed:', error);
    process.exit(1);
  }
}
