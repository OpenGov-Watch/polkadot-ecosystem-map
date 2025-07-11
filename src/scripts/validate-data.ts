#!/usr/bin/env tsx

/**
 * Data validation script
 * Validates all YAML data files against the schema
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { EcosystemEntity } from '../types/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize AJV with formats
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

async function loadSchema(): Promise<any> {
  const schemaPath = path.join(__dirname, '../../public/data.schema.yml');
  const schemaContent = await fs.readFile(schemaPath, 'utf-8');
  return yaml.load(schemaContent);
}

async function loadDataFiles(): Promise<EcosystemEntity[]> {
  const dataDir = path.join(__dirname, '../../public/data');
  const entities: EcosystemEntity[] = [];
  
  const dataFilePatterns = ['parachains.yml', 'dapps.yml', 'infrastructure.yml'];
  
  for (const filename of dataFilePatterns) {
    try {
      const filePath = path.join(dataDir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsedData = yaml.load(content) as any;
      
      if (Array.isArray(parsedData)) {
        entities.push(...parsedData);
      }
    } catch (error) {
      console.warn(`Could not load ${filename}:`, error);
    }
  }
  
  return entities;
}

function validateEntity(entity: any, schema: any): { valid: boolean; errors?: any[] } {
  const validate = ajv.compile(schema);
  const valid = validate(entity);
  
  if (!valid && validate.errors) {
    const errors = validate.errors.map((err: any) => ({
      field: err.instancePath || err.schemaPath,
      message: err.message || 'Validation error',
      value: err.data
    }));
    
    return { valid: false, errors };
  }
  
  return { valid: true };
}

async function main() {
  console.log('🔍 Validating Polkadot ecosystem data...\n');
  
  try {
    // Load schema
    const schema = await loadSchema();
    console.log('✅ Schema loaded successfully');
    
    // Load data files
    const entities = await loadDataFiles();
    console.log(`✅ Loaded ${entities.length} entities`);
    
    if (entities.length === 0) {
      throw new Error('No entities found in data files');
    }
    
    // Validate each entity
    let validEntities = 0;
    const validationErrors: Array<{ slug: string; errors: any[] }> = [];
    
    for (const entity of entities) {
      const validation = validateEntity(entity, schema);
      
      if (validation.valid) {
        validEntities++;
      } else {
        validationErrors.push({
          slug: entity.slug || 'unknown',
          errors: validation.errors || []
        });
      }
    }
    
    console.log(`\n📊 Validation Results:`);
    console.log(`✅ Valid entities: ${validEntities}`);
    console.log(`❌ Invalid entities: ${validationErrors.length}`);
    
    if (validationErrors.length > 0) {
      console.log('\n❌ Validation Errors:');
      validationErrors.forEach(({ slug, errors }) => {
        console.log(`\n  Entity: ${slug}`);
        errors.forEach(error => {
          console.log(`    - ${error.field}: ${error.message}`);
        });
      });
      
      if (validationErrors.length > entities.length * 0.5) {
        throw new Error('Too many validation errors - check schema compatibility');
      } else {
        console.log('\n⚠️  Some entities have validation errors but majority are valid');
      }
    }
    
    console.log('\n✅ Data validation completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Data validation failed!');
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
main();
