#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface OldDataItem {
  slug: string;
  name: string;
  type: string;
  description?: string;
  website?: string;
  github?: string;
  twitter?: string;
  metrics?: {
    stars?: number;
    forks?: number;
    contributors?: number;
    tvl?: number;
    tx_count?: number;
    market_cap?: number;
    [key: string]: any;
  };
  tags?: string[];
  relationships?: Array<{
    target: string;
    type: string;
    weight?: number;
  }>;
}

interface NewDataItem {
  name: string;
  category?: string[];
  description?: string;
  readiness?: {
    business?: string;
    technology?: string;
  };
  target_audience?: string[];
  ecosystem?: string[];
  layer?: string[];
  web?: {
    logo?: string;
    site?: string;
    twitter?: string;
    discord?: string;
    github?: string;
    documentation?: string;
    blog?: string;
    contact?: string;
    playstore?: string;
    appstore?: string;
    webstore?: string;
  };
  treasury_funded?: boolean;
  audit?: boolean;
  metrics?: {
    twitter?: Array<{ date: string; value: number }>;
    github?: Array<{ date: string; value: number }>;
    youtube?: Array<{ date: string; value: number }>;
    discord?: Array<{ date: string; value: number }>;
    blog?: Array<{ date: string; value: number }>;
    app_downloads?: Array<{ date: string; value: number }>;
    github_pushed_at?: Array<{ date: string; value: number }>;
  };
}

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/OpenGov-Watch/polkadot-ecosystem-data/20250623';

class EcosystemDataImporter {
  private outputDir: string;
  private tempDir: string;

  constructor(outputDir: string, tempDir?: string) {
    this.outputDir = outputDir;
    this.tempDir = tempDir || path.join(process.cwd(), 'temp-ecosystem-data');
  }

  async downloadFile(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.statusText}`);
    }
    return response.text();
  }

  async downloadSchema(): Promise<string> {
    const schemaUrl = `${GITHUB_BASE_URL}/data.schema.yml`;
    console.log(`Downloading schema from ${schemaUrl}...`);
    return this.downloadFile(schemaUrl);
  }

  async getDataFileList(): Promise<string[]> {
    // Get the file list from GitHub API
    const apiUrl = 'https://api.github.com/repos/OpenGov-Watch/polkadot-ecosystem-data/contents/data?ref=20250623';
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to get file list: ${response.statusText}`);
    }
    
    const files = await response.json() as Array<{ name: string; type: string }>;
    return files
      .filter(file => file.type === 'file' && file.name.endsWith('.yaml'))
      .map(file => file.name);
  }

  async downloadDataFile(filename: string): Promise<NewDataItem> {
    const fileUrl = `${GITHUB_BASE_URL}/data/${filename}`;
    console.log(`Downloading ${filename}...`);
    const content = await this.downloadFile(fileUrl);
    return parseYaml(content) as NewDataItem;
  }

  categorizeEntity(newData: NewDataItem): string {
    if (!newData.category || newData.category.length === 0) {
      return 'infrastructure';
    }

    const categories = newData.category.map(c => c.toLowerCase());
    
    // Map new categories to old types
    if (categories.includes('wallet')) return 'wallet';
    if (categories.includes('defi') || categories.includes('exchange')) return 'defi';
    if (categories.includes('dapp') || categories.includes('game')) return 'dapp';
    if (categories.includes('bridge')) return 'bridge';
    if (categories.includes('nft')) return 'nft';
    if (categories.includes('oracle') || categories.includes('api') || categories.includes('infra')) return 'infrastructure';
    
    // Check if it's a parachain/layer-1
    if (newData.layer && newData.layer.includes('Layer-1')) return 'parachain';
    if (newData.readiness?.technology === 'Connected to Parachain' || 
        newData.readiness?.technology === 'Connected to Relay chain') return 'parachain';
    
    return 'infrastructure'; // default
  }

  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  transformToOldFormat(newData: NewDataItem): OldDataItem {
    const slug = this.generateSlug(newData.name);
    const type = this.categorizeEntity(newData);

    const oldData: OldDataItem = {
      slug,
      name: newData.name,
      type,
      description: newData.description,
    };    // Map web properties
    if (newData.web) {
      if (newData.web.site) {
        // Ensure website URL has protocol
        let website = newData.web.site;
        if (!website.startsWith('http://') && !website.startsWith('https://')) {
          website = `https://${website}`;
        }
        oldData.website = website;
      }
      if (newData.web.github) oldData.github = newData.web.github;
      if (newData.web.twitter) {
        // Handle twitter handle vs full URL
        const twitter = newData.web.twitter;
        oldData.twitter = twitter.startsWith('http') ? twitter : `https://twitter.com/${twitter}`;
      }
    }

    // Map metrics - take the latest values
    if (newData.metrics) {
      oldData.metrics = {};
      
      if (newData.metrics.github && newData.metrics.github.length > 0) {
        const latest = newData.metrics.github[newData.metrics.github.length - 1];
        oldData.metrics.stars = latest.value;
      }
      
      if (newData.metrics.twitter && newData.metrics.twitter.length > 0) {
        const latest = newData.metrics.twitter[newData.metrics.twitter.length - 1];
        // Store twitter followers in a custom field
        oldData.metrics.twitter_followers = latest.value;
      }
    }

    // Map categories to tags
    if (newData.category) {
      oldData.tags = newData.category.map(c => c.toLowerCase().replace(/\s+/g, '-'));
    }

    // Add ecosystem tags
    if (newData.ecosystem) {
      oldData.tags = [...(oldData.tags || []), ...newData.ecosystem.map(e => e.toLowerCase().replace(/\s+/g, '-'))];
    }

    // Remove duplicates
    if (oldData.tags) {
      oldData.tags = [...new Set(oldData.tags)];
    }

    // Initialize empty relationships for now
    oldData.relationships = [];

    return oldData;
  }

  async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async importData(): Promise<void> {
    console.log('Starting ecosystem data import...');
    
    // Create temp directory
    await this.ensureDirectoryExists(this.tempDir);
    
    try {
      // Download schema
      const schema = await this.downloadSchema();
      await fs.writeFile(path.join(this.tempDir, 'data.schema.yml'), schema);
      
      // Get list of data files
      const dataFiles = await this.getDataFileList();
      console.log(`Found ${dataFiles.length} data files`);
      
      // Download and transform data
      const transformedData: { [key: string]: OldDataItem[] } = {
        parachains: [],
        dapps: [],
        infrastructure: [],
      };
      
      let processedCount = 0;
      const totalFiles = dataFiles.length;
      
      for (const filename of dataFiles) {
        try {
          const newData = await this.downloadDataFile(filename);
          const oldData = this.transformToOldFormat(newData);
          
          // Categorize into appropriate file
          switch (oldData.type) {
            case 'parachain':
              transformedData.parachains.push(oldData);
              break;
            case 'dapp':
            case 'defi':
            case 'nft':
            case 'gaming':
              transformedData.dapps.push(oldData);
              break;
            default:
              transformedData.infrastructure.push(oldData);
              break;
          }
          
          processedCount++;
          if (processedCount % 10 === 0) {
            console.log(`Processed ${processedCount}/${totalFiles} files...`);
          }
        } catch (error) {
          console.warn(`Failed to process ${filename}:`, error);
        }
      }
      
      console.log(`Successfully processed ${processedCount}/${totalFiles} files`);
      
      // Write transformed data to temp directory
      const dataDir = path.join(this.tempDir, 'data');
      await this.ensureDirectoryExists(dataDir);
      
      for (const [filename, data] of Object.entries(transformedData)) {
        const filepath = path.join(dataDir, `${filename}.yml`);
        const yamlContent = stringifyYaml(data, { indent: 2 });
        await fs.writeFile(filepath, yamlContent);
        console.log(`Wrote ${data.length} items to ${filename}.yml`);
      }
      
      console.log(`\nImport completed! Data saved to: ${this.tempDir}`);
      console.log('\nSummary:');
      console.log(`- Parachains: ${transformedData.parachains.length}`);
      console.log(`- DApps: ${transformedData.dapps.length}`);
      console.log(`- Infrastructure: ${transformedData.infrastructure.length}`);
      
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }
  async copyToProduction(): Promise<void> {
    console.log('\nCopying data to production directory...');
    
    const tempDataDir = path.join(this.tempDir, 'data');
    await this.ensureDirectoryExists(this.outputDir);
    
    // Note: We DON'T copy the schema file as it would overwrite our application's schema
    // The downloaded schema is for the source format, not our transformed format
    
    // Copy data files
    const files = await fs.readdir(tempDataDir);
    for (const file of files) {
      const source = path.join(tempDataDir, file);
      const dest = path.join(this.outputDir, file);
      await fs.copyFile(source, dest);
      console.log(`Copied ${file}`);
    }
    
    console.log('Production copy completed!');
  }

  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
      console.log('Temporary files cleaned up');
    } catch (error) {
      console.warn('Failed to cleanup temp files:', error);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  const tempDir = path.join(__dirname, '..', 'temp-ecosystem-data');
  
  const importer = new EcosystemDataImporter(outputDir, tempDir);
  
  try {
    switch (command) {
      case 'download':
        console.log('� Downloading ecosystem data from OpenGov-Watch repository...');
        await importer.importData();
        console.log('✅ Download completed successfully!');
        console.log(`📁 Data saved to: ${tempDir}`);
        console.log('💡 Next steps:');
        console.log('  1. Run "npm run check-compatibility" to verify schema compatibility');
        console.log('  2. Run "npm run validate-temp-data" to validate the downloaded data');
        console.log('  3. Run "npm run import-data deploy" to deploy to production');
        break;
        
      case 'deploy':
        console.log('� Deploying data from temp to production...');
        await importer.copyToProduction();
        console.log('✅ Deployment completed successfully!');
        console.log('💡 Run "npm run validate-data" to verify production data');
        break;
        
      case 'update':
        console.log('🔄 Full workflow: download, validate, and deploy...');
        console.log('\n📥 Step 1: Downloading data...');
        await importer.importData();
        
        console.log('\n🔍 Step 2: Running validation...');
        // Here we would run validation but we'll let user do it manually
        console.log('⚠️  Please run validation manually:');
        console.log('  npm run check-compatibility');
        console.log('  npm run validate-temp-data');
        console.log('\n🚢 Step 3: Deploying to production...');
        await importer.copyToProduction();
        
        console.log('✅ Update completed successfully!');
        console.log('💡 Run "npm run import-data cleanup" to remove temp files');
        break;
        
      case 'cleanup':
        console.log('🧹 Cleaning up temporary files...');
        await importer.cleanup();
        console.log('✅ Cleanup completed!');
        break;
        
      case 'full':
        console.log('🔄 Full process: download, deploy, and cleanup...');
        await importer.importData();
        await importer.copyToProduction();
        await importer.cleanup();
        console.log('✅ Full process completed successfully!');
        console.log('⚠️  Note: No compatibility or validation checks were performed.');
        console.log('💡 For production use, consider using "update" command with manual validation.');
        break;
        
      default:
        console.log(`
🌐 Polkadot Ecosystem Data Importer

Usage: npm run import-data <command>

Development Workflow:
  download     Download and transform data to temp directory
  deploy       Deploy temp data to production directory
  update       Download, deploy (with manual validation prompts)
  cleanup      Remove temporary files

Quick Commands:
  full         Complete download, deploy, and cleanup (no validation)

Additional Tools:
  npm run check-compatibility    Check if new schema is compatible
  npm run validate-temp-data     Validate downloaded data
  npm run validate-data          Validate production data

Recommended Workflow:
  1. npm run import-data download     # Download to temp
  2. npm run check-compatibility      # Check schema compatibility  
  3. npm run validate-temp-data       # Validate temp data
  4. npm run import-data deploy       # Deploy to production
  5. npm run import-data cleanup      # Clean up temp files

Data source: https://github.com/OpenGov-Watch/polkadot-ecosystem-data/tree/20250623
        `);
        process.exit(0);
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
    console.log('\n💡 Try running with "help" for usage information');
    process.exit(1);
  }
}

main().catch(console.error);

export { EcosystemDataImporter };
