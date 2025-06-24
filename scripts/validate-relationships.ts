import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

interface ManualRelationship {
  source: string;
  target: string;
  type: string;
  weight: number;
  description?: string;
  category?: string;
  bidirectional?: boolean;
}

interface RelationshipCategory {
  name: string;
  color: string;
  style?: 'solid' | 'dashed' | 'dotted';
  description?: string;
}

interface RelationshipType {
  name: string;
  description?: string;
  default_weight?: number;
  color?: string;
}

interface ManualRelationshipsConfig {
  relationships: ManualRelationship[];
  categories?: Record<string, RelationshipCategory>;
  types?: Record<string, RelationshipType>;
}

/**
 * Validate the relationships.yml file
 */
async function validateRelationshipsFile(): Promise<void> {
  const relationshipsPath = path.join(process.cwd(), 'public', 'relationships.yml');
  
  try {
    console.log('🔍 Validating relationships.yml...');
    
    // Check if file exists
    if (!fs.existsSync(relationshipsPath)) {
      console.log('❌ relationships.yml file not found at:', relationshipsPath);
      return;
    }
    
    // Read and parse the file
    const fileContent = fs.readFileSync(relationshipsPath, 'utf8');
    const config = yaml.load(fileContent) as ManualRelationshipsConfig;
    
    if (!config) {
      console.log('❌ Failed to parse relationships.yml');
      return;
    }
    
    let errors = 0;
    let warnings = 0;
    
    // Validate relationships array
    if (!Array.isArray(config.relationships)) {
      console.log('❌ relationships should be an array');
      errors++;
    } else {
      console.log(`📊 Found ${config.relationships.length} relationships`);
      
      // Validate each relationship
      config.relationships.forEach((rel, index) => {
        const relNumber = index + 1;
        
        // Required fields
        if (!rel.source) {
          console.log(`❌ Relationship ${relNumber}: missing 'source' field`);
          errors++;
        }
        if (!rel.target) {
          console.log(`❌ Relationship ${relNumber}: missing 'target' field`);
          errors++;
        }
        if (!rel.type) {
          console.log(`❌ Relationship ${relNumber}: missing 'type' field`);
          errors++;
        }
        if (typeof rel.weight !== 'number') {
          console.log(`❌ Relationship ${relNumber}: 'weight' must be a number`);
          errors++;
        } else if (rel.weight < 1 || rel.weight > 10) {
          console.log(`⚠️ Relationship ${relNumber}: weight ${rel.weight} outside recommended range 1-10`);
          warnings++;
        }
        
        // Check if relationship references itself
        if (rel.source === rel.target) {
          console.log(`⚠️ Relationship ${relNumber}: self-referential relationship (${rel.source} -> ${rel.target})`);
          warnings++;
        }
        
        // Check category reference
        if (rel.category && config.categories && !config.categories[rel.category]) {
          console.log(`⚠️ Relationship ${relNumber}: category '${rel.category}' not defined in categories section`);
          warnings++;
        }
        
        // Check type reference
        if (config.types && !config.types[rel.type]) {
          console.log(`⚠️ Relationship ${relNumber}: type '${rel.type}' not defined in types section`);
          warnings++;
        }
      });
    }
    
    // Validate categories
    if (config.categories) {
      const categoryCount = Object.keys(config.categories).length;
      console.log(`🏷️ Found ${categoryCount} categories`);
      
      Object.entries(config.categories).forEach(([key, category]) => {
        if (!category.name) {
          console.log(`❌ Category '${key}': missing 'name' field`);
          errors++;
        }
        if (!category.color) {
          console.log(`❌ Category '${key}': missing 'color' field`);
          errors++;
        } else if (!/^#[0-9A-Fa-f]{6}$/.test(category.color)) {
          console.log(`❌ Category '${key}': invalid color format '${category.color}' (should be #RRGGBB)`);
          errors++;
        }
        if (category.style && !['solid', 'dashed', 'dotted'].includes(category.style)) {
          console.log(`❌ Category '${key}': invalid style '${category.style}' (should be solid, dashed, or dotted)`);
          errors++;
        }
      });
    }
    
    // Validate types
    if (config.types) {
      const typeCount = Object.keys(config.types).length;
      console.log(`🔧 Found ${typeCount} relationship types`);
      
      Object.entries(config.types).forEach(([key, type]) => {
        if (!type.name) {
          console.log(`❌ Type '${key}': missing 'name' field`);
          errors++;
        }
        if (type.default_weight !== undefined && (type.default_weight < 1 || type.default_weight > 10)) {
          console.log(`⚠️ Type '${key}': default_weight ${type.default_weight} outside recommended range 1-10`);
          warnings++;
        }
        if (type.color && !/^#[0-9A-Fa-f]{6}$/.test(type.color)) {
          console.log(`❌ Type '${key}': invalid color format '${type.color}' (should be #RRGGBB)`);
          errors++;
        }
      });
    }
    
    // Summary
    console.log('\n📋 Validation Summary:');
    if (errors === 0) {
      console.log('✅ No errors found');
    } else {
      console.log(`❌ ${errors} error(s) found`);
    }
    
    if (warnings === 0) {
      console.log('✅ No warnings');
    } else {
      console.log(`⚠️ ${warnings} warning(s) found`);
    }
    
    if (errors === 0 && warnings === 0) {
      console.log('\n🎉 relationships.yml is valid!');
    }
    
  } catch (error) {
    console.log('❌ Error validating relationships.yml:', error);
  }
}

// Run validation
validateRelationshipsFile().catch(console.error);
