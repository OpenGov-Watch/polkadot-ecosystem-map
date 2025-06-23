# Polkadot Ecosystem Renderer

A schema-driven 2D renderer for visualizing the Polkadot ecosystem. This application provides both table and graph views of ecosystem entities with configurable styling and physics parameters.

## Features

- **📊 Table View**: Dynamic columns with sorting, filtering, and pagination using TanStack Table
- **🕸️ Graph View**: Interactive force-directed network visualization using react-force-graph-2d
- **⚙️ Config-Driven**: All rendering options controlled via `render.yaml` configuration
- **✅ Data Validation**: Automatic validation of all data files against JSON schema
- **🎨 Customizable Styling**: Node colors, sizes, edge widths based on data properties
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🔄 Real-time Updates**: Hot reloading during development

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/polkadot-ecosystem-renderer.git
cd polkadot-ecosystem-renderer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Configuration

### Render Configuration (`render.yaml`)

Place a `render.yaml` file in the project root to configure the application:

```yaml
# View type: "table" or "graph"
viewType: "table"

# Entity types to include
entityTypes:
  - "parachain"
  - "dapp"
  - "infrastructure"

# Table configuration (when viewType is "table")
table:
  columns:
    - key: "name"
      label: "Name"
      type: "string"
      sortable: true
      filterable: true
    - key: "metrics.stars"
      label: "GitHub Stars"
      type: "number"
      sortable: true
  defaultSort:
    column: "metrics.stars"
    direction: "desc"
  pageSize: 25

# Graph configuration (when viewType is "graph")
graph:
  physics:
    alphaDecay: 0.0228
    chargeStrength: -30
    linkDistance: 30
  nodes:
    sizeBy:
      field: "metrics.stars"
      scale: "sqrt"
      domain: [0, 1000]
      range: [5, 20]
    colorBy:
      field: "type"
      range: ["#ff6b6b", "#4ecdc4", "#45b7d1"]
  width: 800
  height: 600
```

### Column Types

- `string`: Text display
- `number`: Numeric display with formatting
- `link`: Clickable URLs
- `tags`: Array of tags as badges
- `date`: Formatted dates

### Scaling Options

- `linear`: Direct proportional scaling
- `log`: Logarithmic scaling (good for wide ranges)
- `sqrt`: Square root scaling (moderate compression)

## Data Format

### Data Schema

All data files must conform to the schema defined in `public/data.schema.yml`. Each entity requires:

- `slug`: Unique identifier
- `name`: Display name
- `type`: Entity category
- `description`: Brief description (optional)
- `metrics`: Quantitative data (optional)
- `relationships`: Connections to other entities (optional)

### Sample Entity

```yaml
- slug: "acala"
  name: "Acala"
  type: "parachain"
  description: "Decentralized finance hub for Polkadot"
  website: "https://acala.network"
  github: "https://github.com/AcalaNetwork"
  metrics:
    stars: 692
    tvl: 45000000
  tags:
    - "defi"
    - "stablecoin"
  relationships:
    - target: "karura"
      type: "supports"
      weight: 8
```

### Data Files

Place YAML data files in `public/data/`:
- `public/data/parachains.yml`
- `public/data/dapps.yml`
- `public/data/infrastructure.yml`
- etc.

## Example Configurations

### Parachain-Only Table

```yaml
# examples/parachain-table.yaml
viewType: "table"
entityTypes:
  - "parachain"
table:
  columns:
    - key: "name"
      label: "Parachain Name"
      type: "string"
      sortable: true
    - key: "metrics.tvl"
      label: "TVL (USD)"
      type: "number"
      sortable: true
    - key: "website"
      label: "Website"
      type: "link"
  defaultSort:
    column: "metrics.tvl" 
    direction: "desc"
  pageSize: 50
```

### Full Graph with Custom Physics

```yaml
# examples/full-graph.yaml
viewType: "graph"
entityTypes:
  - "parachain"
  - "dapp"  
  - "infrastructure"
  - "wallet"
graph:
  physics:
    alphaDecay: 0.02
    chargeStrength: -100
    linkDistance: 50
    velocityDecay: 0.3
  nodes:
    sizeBy:
      field: "metrics.stars"
      scale: "log"
      domain: [1, 10000]
      range: [8, 30]
    colorBy:
      field: "type"
      range:
        - "#e74c3c"  # parachain
        - "#3498db"  # dapp
        - "#2ecc71"  # infrastructure
        - "#f39c12"  # wallet
  width: 1200
  height: 800
```

## Scripts

- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run validate-data` - Validate data files against schema

## Data Validation

The application automatically validates all data files against the schema on startup. For manual validation:

```bash
npm run validate-data
```

Validation errors will show:
- Which files contain invalid data
- Specific validation errors
- Suggested fixes

## Data Import & Development Workflow

This project features a sophisticated data import system with **development-time validation** and **runtime best-effort loading** for optimal performance and reliability.

### 🚀 Quick Production Update
```bash
npm run import-data full
```
One command downloads, transforms, and deploys **166 ecosystem entities**.

### 👨‍💻 Development Workflow (Recommended)
```bash
# 1. Download to temp directory
npm run import-data download

# 2. Check schema compatibility  
npm run check-compatibility

# 3. Validate data quality
npm run validate-temp-data

# 4. Deploy to production
npm run import-data deploy

# 5. Clean up
npm run import-data cleanup
```

### 🔧 Available Tools
- **Schema Compatibility**: `npm run check-compatibility` - Ensures new data won't break the app
- **Data Validation**: `npm run validate-temp-data` - Validates downloaded data quality
- **Production Check**: `npm run validate-data` - Validates current production data
- **Help**: `npm run import-data help` - Complete command reference

### 📊 Architecture Benefits
- **Development**: Full validation with schema compatibility checks
- **Runtime**: Fast loading with graceful error handling
- **Quality**: Ensures data integrity before deployment
- **Performance**: No validation overhead in production

For complete documentation, see [DATA_IMPORT.md](./DATA_IMPORT.md).

## Architecture

### Component Structure

```
src/
├── components/
│   ├── TableView.tsx      # TanStack Table implementation
│   ├── GraphView.tsx      # Force graph visualization
│   ├── Navigation.tsx     # App navigation
│   └── ...
├── contexts/
│   ├── DataContext.tsx    # Global data state
│   └── ConfigContext.tsx  # Configuration state
├── services/
│   ├── dataService.ts     # Data loading & validation
│   └── configService.ts   # Configuration loading
├── types/
│   └── types.ts          # TypeScript definitions
└── scripts/
    └── validate-data.ts  # CLI validation script
```

### Data Flow

1. **Startup**: Load and validate data files against schema
2. **Configuration**: Parse `render.yaml` and merge with defaults
3. **Rendering**: Display either TableView or GraphView based on config
4. **Interaction**: Handle user interactions (sorting, filtering, node selection)

## TypeScript Types

The application is fully typed with TypeScript. Types are defined in `src/types/types.ts` and include:

- `EcosystemEntity`: Individual entity data structure
- `EcosystemData`: Complete dataset with metadata
- `RenderConfig`: Configuration options
- `GraphNode`/`GraphLink`: Graph-specific types

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm run lint && npm run type-check && npm run validate-data`
5. Commit changes: `git commit -m 'Add feature'`
6. Push to branch: `git push origin feature-name`
7. Submit a pull request

## CI/CD

The project includes GitHub Actions workflows that:

- Validate data schema on every push
- Run linting and type checking
- Build the application
- Deploy to GitHub Pages (on main branch)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap

- [ ] Additional view types (hex-tile map, geographic map)
- [ ] Real-time data updates from external APIs
- [ ] Advanced filtering and search capabilities
- [ ] Export functionality (PNG, SVG, CSV)
- [ ] Plugin system for custom renderers
- [ ] Performance optimizations for large datasets

## Support

- Create an [issue](https://github.com/your-username/polkadot-ecosystem-renderer/issues) for bug reports
- Start a [discussion](https://github.com/your-username/polkadot-ecosystem-renderer/discussions) for questions
- Check the [wiki](https://github.com/your-username/polkadot-ecosystem-renderer/wiki) for detailed documentation
