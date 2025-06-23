# Data Import & Development Workflow

This project includes a comprehensive data import system that fetches ecosystem data from the [OpenGov-Watch/polkadot-ecosystem-data](https://github.com/OpenGov-Watch/polkadot-ecosystem-data) repository. The system is designed for **development-time validation** with **runtime best-effort loading**.

## 🏗️ Architecture Philosophy

- **Development Time**: Full validation, schema compatibility checks, and data quality assurance
- **Runtime**: Fast loading with basic filtering, no validation overhead
- **Best Effort**: Application gracefully handles missing or malformed data

## 🚀 Quick Start

### Simple Update (Production)
```bash
npm run import-data full
```

### Development Workflow (Recommended)
```bash
# 1. Download data to temp directory
npm run import-data download

# 2. Check schema compatibility  
npm run check-compatibility

# 3. Validate downloaded data
npm run validate-temp-data

# 4. Deploy to production
npm run import-data deploy

# 5. Clean up temp files
npm run import-data cleanup
```

## 📋 Available Commands

### Import Commands
- **`npm run import-data download`** - Download and transform data to temp directory
- **`npm run import-data deploy`** - Deploy temp data to production  
- **`npm run import-data update`** - Download and deploy with validation prompts
- **`npm run import-data cleanup`** - Remove temporary files
- **`npm run import-data full`** - Complete process (no validation)

### Validation Commands
- **`npm run check-compatibility`** - Check if new schema is compatible with current app
- **`npm run validate-temp-data`** - Validate downloaded data in temp directory
- **`npm run validate-data`** - Validate current production data

### Help
- **`npm run import-data help`** - Show detailed command help
- **`npm run data-help`** - Alias for help

## 🔄 Development Workflow Detail

### Phase 1: Download
```bash
npm run import-data download
```
- Downloads 166 YAML files from OpenGov-Watch repository
- Transforms from source schema to application schema
- Saves to `temp-ecosystem-data/` directory
- Downloads source schema for compatibility checking

### Phase 2: Compatibility Check
```bash
npm run check-compatibility
```
- Compares application schema with downloaded schema
- Identifies breaking changes and warnings
- Reports new/removed properties
- Ensures app will continue working with new data

### Phase 3: Data Validation
```bash
npm run validate-temp-data
```
- Validates all downloaded entities against application schema
- Reports validation errors and warnings
- Ensures data quality before deployment
- Provides statistics on data completeness

### Phase 4: Deployment
```bash
npm run import-data deploy
```
- Copies validated data from temp to production
- Does NOT overwrite application schema
- Updates data files: `parachains.yml`, `dapps.yml`, `infrastructure.yml`

### Phase 5: Cleanup
```bash
npm run import-data cleanup
```
- Removes temporary files and directories
- Keeps production data intact

## 🔍 Schema Compatibility

The compatibility checker analyzes:
- **Breaking Changes**: New required fields, removed critical properties
- **Warnings**: Removed optional properties that may affect display
- **New Properties**: Additional data that can enhance the application
- **Structural Changes**: Changes in data organization

### Compatibility Report Example
```
🔍 Checking schema compatibility...
📊 Compatibility Report:
✅ Compatible: YES

✨ New Properties:
  + metrics.twitter_followers
  + web.discord
  + readiness.technology

⚠️  Warnings:
  - Property removed: legacy_field (may cause display issues)

✅ Schema update is safe to proceed!
```

## 📊 Data Quality Validation

### Validation Levels
1. **Schema Validation**: Ensures data conforms to expected structure
2. **Required Fields**: Verifies critical fields (slug, name, type) are present
3. **Format Validation**: Checks URLs, dates, and data types
4. **Consistency Checks**: Validates relationships and references

### Handling Validation Errors
- **< 10% errors**: Warnings only, safe to deploy
- **10-50% errors**: Deploy with caution, fix major issues
- **> 50% errors**: Halt deployment, investigate schema compatibility

## 🎯 Runtime Behavior

The application loads data with **best-effort approach**:

```typescript
// Runtime loading (no validation)
const entities = await loadEcosystemData();

// Basic filtering only
const validEntities = entities.filter(entity => 
  entity && entity.slug && entity.name && entity.type
);

// Graceful handling of missing data
const displayValue = entity.website || 'No website available';
```

### Benefits
- **Fast Loading**: No schema validation overhead
- **Graceful Degradation**: Missing fields don't break the UI
- **Flexibility**: Can handle evolving data structures
- **Performance**: Minimal runtime processing

## 🔧 Data Transformation

### Source Format (OpenGov-Watch)
```yaml
name: StellaSwap
category: [DeFi, Exchange]
web:
  site: https://stellaswap.com
  twitter: StellaSwap
metrics:
  twitter: [{date: 2023-12-31, value: 34825}]
  github: [{date: 2025-01-21, value: 1}]
```

### Application Format
```yaml
- slug: stellaswap
  name: StellaSwap
  type: defi
  website: https://stellaswap.com
  twitter: https://twitter.com/StellaSwap
  metrics:
    stars: 1
    twitter_followers: 34825
  tags: [defi, exchange]
  relationships: []
```

### Transformation Rules
- **slug**: Generated from name (lowercase, alphanumeric + hyphens)
- **type**: Mapped from categories (defi, parachain, infrastructure)
- **metrics**: Latest values extracted from time series
- **tags**: Combination of categories and ecosystems
- **URLs**: Auto-prefixed with `https://` if missing protocol

## 📁 File Structure

```
public/
├── data.schema.yml          # Application schema (maintained by developers)
└── data/
    ├── parachains.yml       # Layer-1 networks and parachains
    ├── dapps.yml           # DApps, DeFi, games, NFT platforms  
    └── infrastructure.yml   # Tools, wallets, APIs, infrastructure

temp-ecosystem-data/         # Temporary download directory
├── data.schema.yml         # Downloaded source schema
└── data/
    ├── parachains.yml      # Transformed data
    ├── dapps.yml          # Transformed data
    └── infrastructure.yml  # Transformed data

scripts/
├── import-ecosystem-data.ts    # Main import script
├── check-schema-compatibility.ts  # Schema compatibility checker
└── validate-temp-data.ts      # Temp data validator

src/scripts/
└── validate-data.ts           # Production data validator
```

## 🚨 Error Handling

### Common Issues & Solutions

**"Schema compatibility failed"**
```bash
# Check what changed
npm run check-compatibility

# Review breaking changes and update app if needed
# Then proceed with deployment
npm run import-data deploy
```

**"Too many validation errors"**
```bash
# Check specific errors
npm run validate-temp-data

# Fix major issues or proceed with caution
npm run import-data deploy
```

**"Temp directory not found"**
```bash
# Download data first
npm run import-data download
```

**"Runtime loading errors"**
```bash
# Validate production data
npm run validate-data

# Re-import if needed
npm run import-data update
```

## 🎮 Best Practices

### For Regular Updates
```bash
# Quick production update
npm run import-data full

# Check app still works
npm run dev
```

### For Development
```bash
# Careful validation workflow
npm run import-data download
npm run check-compatibility
npm run validate-temp-data
npm run import-data deploy
npm run validate-data
npm run import-data cleanup
```

### For CI/CD
```bash
# Automated validation
npm run import-data download
npm run check-compatibility || exit 1
npm run validate-temp-data || exit 1
npm run import-data deploy
npm run import-data cleanup
```

## 📈 Current Data Statistics

After import, the ecosystem includes:
- **15 Parachains** - Polkadot/Kusama parachains and Layer-1 networks
- **86 DApps** - DeFi protocols, games, NFT platforms, and applications  
- **65 Infrastructure** - Tools, wallets, APIs, and development infrastructure
- **Total: 166 entities** with comprehensive metadata

## 🔮 Future Enhancements

- **Automated CI/CD**: Scheduled data updates with automated testing
- **Delta Updates**: Only update changed entities
- **Multiple Sources**: Support for additional data repositories
- **Custom Transformations**: Configurable data transformation rules
- **Advanced Validation**: Business logic validation beyond schema
