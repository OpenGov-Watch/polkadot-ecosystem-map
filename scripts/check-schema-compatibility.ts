#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize AJV with formats
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

interface SchemaCompatibilityResult {
  compatible: boolean;
  breaking_changes: string[];
  warnings: string[];
  new_properties: string[];
  removed_properties: string[];
}

class SchemaCompatibilityChecker {
  private oldSchemaPath: string;
  private newSchemaPath: string;

  constructor(oldSchemaPath: string, newSchemaPath: string) {
    this.oldSchemaPath = oldSchemaPath;
    this.newSchemaPath = newSchemaPath;
  }

  async loadSchema(filePath: string): Promise<any> {
    const content = await fs.readFile(filePath, 'utf-8');
    return yaml.load(content);
  }

  extractProperties(schema: any, path: string = ''): Set<string> {
    const properties = new Set<string>();
    
    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        const fullPath = path ? `${path}.${key}` : key;
        properties.add(fullPath);
        
        if (typeof value === 'object' && value !== null) {
          const nested = this.extractProperties(value as any, fullPath);
          nested.forEach(prop => properties.add(prop));
        }
      }
    }
    
    return properties;
  }

  extractRequiredFields(schema: any, path: string = ''): Set<string> {
    const required = new Set<string>();
    
    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach((field: string) => {
        const fullPath = path ? `${path}.${field}` : field;
        required.add(fullPath);
      });
    }
    
    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          const nested = this.extractRequiredFields(value as any, fullPath);
          nested.forEach(field => required.add(field));
        }
      }
    }
    
    return required;
  }

  async checkCompatibility(): Promise<SchemaCompatibilityResult> {
    const result: SchemaCompatibilityResult = {
      compatible: true,
      breaking_changes: [],
      warnings: [],
      new_properties: [],
      removed_properties: []
    };

    try {
      const oldSchema = await this.loadSchema(this.oldSchemaPath);
      const newSchema = await this.loadSchema(this.newSchemaPath);

      // Extract properties from both schemas
      const oldProperties = this.extractProperties(oldSchema);
      const newProperties = this.extractProperties(newSchema);

      // Extract required fields
      const oldRequired = this.extractRequiredFields(oldSchema);
      const newRequired = this.extractRequiredFields(newSchema);

      // Find new properties
      newProperties.forEach(prop => {
        if (!oldProperties.has(prop)) {
          result.new_properties.push(prop);
        }
      });

      // Find removed properties
      oldProperties.forEach(prop => {
        if (!newProperties.has(prop)) {
          result.removed_properties.push(prop);
        }
      });

      // Check for breaking changes (new required fields)
      newRequired.forEach(field => {
        if (!oldRequired.has(field)) {
          result.breaking_changes.push(`New required field: ${field}`);
          result.compatible = false;
        }
      });

      // Check for breaking changes (removed required fields that we depend on)
      const criticalFields = ['slug', 'name', 'type'];
      criticalFields.forEach(field => {
        if (oldRequired.has(field) && !newRequired.has(field)) {
          result.breaking_changes.push(`Critical required field removed: ${field}`);
          result.compatible = false;
        }
      });

      // Warnings for removed non-critical properties
      result.removed_properties.forEach(prop => {
        if (!criticalFields.includes(prop.split('.')[0])) {
          result.warnings.push(`Property removed: ${prop} (may cause display issues)`);
        }
      });

      return result;

    } catch (error) {
      result.compatible = false;
      result.breaking_changes.push(`Failed to load schemas: ${error}`);
      return result;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: npm run check-schema-compatibility <old-schema> <new-schema>');
    process.exit(1);
  }

  const oldSchemaPath = path.resolve(args[0]);
  const newSchemaPath = path.resolve(args[1]);

  console.log('🔍 Checking schema compatibility...');
  console.log(`Old schema: ${oldSchemaPath}`);
  console.log(`New schema: ${newSchemaPath}`);

  const checker = new SchemaCompatibilityChecker(oldSchemaPath, newSchemaPath);
  const result = await checker.checkCompatibility();

  console.log('\n📊 Compatibility Report:');
  console.log(`✅ Compatible: ${result.compatible ? 'YES' : 'NO'}`);

  if (result.breaking_changes.length > 0) {
    console.log('\n❌ Breaking Changes:');
    result.breaking_changes.forEach(change => {
      console.log(`  - ${change}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }

  if (result.new_properties.length > 0) {
    console.log('\n✨ New Properties:');
    result.new_properties.forEach(prop => {
      console.log(`  + ${prop}`);
    });
  }

  if (result.removed_properties.length > 0) {
    console.log('\n🗑️  Removed Properties:');
    result.removed_properties.forEach(prop => {
      console.log(`  - ${prop}`);
    });
  }

  if (result.compatible) {
    console.log('\n✅ Schema update is safe to proceed!');
    process.exit(0);
  } else {
    console.log('\n❌ Schema update has breaking changes. Review before proceeding.');
    process.exit(1);
  }
}

if (import.meta.url === `file://${__filename}`) {
  main().catch(console.error);
}

export { SchemaCompatibilityChecker };
