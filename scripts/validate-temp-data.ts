#!/usr/bin/env tsx

/**
 * Temporary data validation script
 * Validates downloaded data in temp directory before deployment
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { EcosystemEntity } from '../src/types/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize AJV with formats
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

async function loadSchema(): Promise<any> {
  const schemaPath = path.join(__dirname, '../public/data.schema.yml');
  const schemaContent = await fs.readFile(schemaPath, 'utf-8');
  return yaml.load(schemaContent);
}

async function loadTempDataFiles(): Promise<EcosystemEntity[]> {
  const tempDataDir = path.join(__dirname, '../temp-ecosystem-data/data');
  const entities: EcosystemEntity[] = [];
  
  try {
    const files = await fs.readdir(tempDataDir);
    const yamlFiles = files.filter(file => file.endsWith('.yml'));
    
    for (const filename of yamlFiles) {
      try {
        const filePath = path.join(tempDataDir, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        const parsedData = yaml.load(content) as any;
        
        if (Array.isArray(parsedData)) {
          entities.push(...parsedData);
        }
      } catch (error) {
        console.warn(`Could not load ${filename}:`, error);
      }
    }
  } catch (error) {
    throw new Error(`Could not access temp data directory: ${error}`);
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
  console.log('🔍 Validating temporary ecosystem data...\n');
  
  try {
    // Check if temp directory exists
    const tempDir = path.join(__dirname, '../temp-ecosystem-data');
    try {
      await fs.access(tempDir);
    } catch {
      console.error('❌ Temp data directory not found!');
      console.log('💡 Run "npm run import-data download" first to download data');
      process.exit(1);
    }
    
    // Load schema
    const schema = await loadSchema();
    console.log('✅ Schema loaded successfully');
    
    // Load temp data files
    const entities = await loadTempDataFiles();
    console.log(`✅ Loaded ${entities.length} entities from temp directory`);
    
    if (entities.length === 0) {
      throw new Error('No entities found in temp data files');
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
      validationErrors.slice(0, 10).forEach(({ slug, errors }) => {
        console.log(`\n  Entity: ${slug}`);
        errors.forEach(error => {
          console.log(`    - ${error.field}: ${error.message}`);
        });
      });
      
      if (validationErrors.length > 10) {
        console.log(`\n  ... and ${validationErrors.length - 10} more errors`);
      }
      
      if (validationErrors.length > entities.length * 0.5) {
        console.log('\n❌ Too many validation errors - data may be incompatible');
        console.log('💡 Check schema compatibility with "npm run check-compatibility"');
        process.exit(1);
      } else {
        console.log('\n⚠️  Some entities have validation errors but majority are valid');
        console.log('💡 You may proceed with deployment, but fix errors for best results');
      }
    }
    
    console.log('\n✅ Temp data validation completed!');
    console.log('💡 Run "npm run import-data deploy" to deploy to production');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Temp data validation failed!');
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
main();
