#!/usr/bin/env tsx

/**
 * Data validation script
 * Validates all YAML data files against the schema
 */

import { validateDataOnly } from '../services/dataService';

async function main() {
  console.log('🔍 Validating Polkadot ecosystem data...\n');
  
  try {
    await validateDataOnly();
    console.log('\n✅ All data validation checks passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Data validation failed!');
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
main();
