# Manual Relationship Curation

This document explains how to manually define relationships between nodes in the Polkadot Ecosystem Map.

## Overview

The manual relationship system allows you to define static connections between entities that are separate from the main data import workflow. These relationships are defined in `public/relationships.yml` and are automatically loaded and merged with entity-embedded relationships.

## File Structure

### `public/relationships.yml`
The main configuration file for manual relationships.

### `public/relationships.schema.yml`
Schema definition for validation (documentation purposes).

### `scripts/validate-relationships.ts`
Validation script to check the relationships file format.

## Relationship File Format

```yaml
# Manual Relationship Definitions
relationships:
  - source: "entity-slug-1"
    target: "entity-slug-2"
    type: "partnership"
    weight: 8
    description: "Strategic partnership description"
    category: "strategic"
    bidirectional: true
    metadata:
      established: "2022-03-15"
      source_url: "https://example.com/announcement"
      confidence: 9
      notes: "Additional context"

# Category definitions for styling
categories:
  strategic:
    name: "Strategic Partnerships"
    color: "#4CAF50"
    style: "solid"
    description: "Business partnerships and alliances"

# Type definitions
types:
  partnership:
    name: "Partnership"
    description: "Strategic business partnership"
    default_weight: 8
    color: "#4CAF50"
```

## Relationship Properties

### Required Fields
- `source`: Slug of the source entity
- `target`: Slug of the target entity  
- `type`: Type of relationship (e.g., "partnership", "dependency", "integration")
- `weight`: Relationship strength/importance (1-10)

### Optional Fields
- `description`: Human-readable description
- `category`: Category for grouping and styling
- `bidirectional`: Whether to create reverse relationship (default: false)
- `metadata`: Additional information
  - `established`: Date relationship was established
  - `source_url`: URL to documentation
  - `confidence`: Confidence level (1-10)
  - `notes`: Additional notes

## Relationship Types

### Built-in Types
- `partnership`: Strategic business partnership
- `dependency`: Technical or operational dependency
- `integration`: Product or service integration
- `competitor`: Competing products or services
- `parent_child`: Hierarchical relationship
- `uses`: One entity uses another's service/product

### Custom Types
You can define custom relationship types in the `types` section.

## Categories

Categories allow you to group relationships for styling and filtering:

### Built-in Categories
- `strategic`: Strategic partnerships (green, solid)
- `technical`: Technical dependencies (blue, dashed)
- `integration`: Product integrations (orange, dotted)
- `market`: Market relationships (purple, solid)

### Custom Categories
Define custom categories with:
- `name`: Display name
- `color`: Hex color code (#RRGGBB)
- `style`: Line style (solid, dashed, dotted)
- `description`: Optional description

## Visualization Configuration

Control relationship display in `public/render.yaml`:

```yaml
graph:
  edges:
    # Show/hide relationship types
    showManualRelationships: true
    showEntityRelationships: true
    
    # Style by category or type
    styleByCategory: true
    styleByType: false
    
    # Filter by types/categories
    relationshipTypes: []  # Empty = show all
    relationshipCategories: []  # Empty = show all
```

## Usage Examples

### 1. Simple Partnership
```yaml
- source: "polkadot"
  target: "kusama"
  type: "partnership"
  weight: 10
  description: "Polkadot and Kusama are sister networks"
```

### 2. Technical Dependency
```yaml
- source: "astar"
  target: "polkadot"
  type: "dependency"
  weight: 10
  description: "Astar runs as a parachain on Polkadot"
  category: "technical"
```

### 3. Bidirectional Integration
```yaml
- source: "moonbeam"
  target: "metamask"
  type: "integration"
  weight: 7
  description: "MetaMask supports Moonbeam network"
  category: "integration"
  bidirectional: true
```

## Validation

Run the validation script to check your relationships file:

```bash
npm run validate-relationships
```

Or using the TypeScript compiler:
```bash
npx tsx scripts/validate-relationships.ts
```

## Best Practices

### 1. Use Meaningful Slugs
Ensure entity slugs match exactly what's in your data files.

### 2. Consistent Weighting
- 1-3: Weak relationships
- 4-6: Moderate relationships  
- 7-8: Strong relationships
- 9-10: Critical relationships

### 3. Categorize Relationships
Use categories to organize and style different types of relationships.

### 4. Document Sources
Include `metadata.source_url` for verification.

### 5. Regular Validation
Run validation after making changes to catch errors early.

## Troubleshooting

### Common Issues

1. **Relationship not showing**: Check that both source and target entities exist and are included in the current filter.

2. **Styling not applied**: Ensure categories are properly defined and `styleByCategory` is enabled.

3. **Validation errors**: Run the validation script to identify format issues.

### Debugging

1. Check browser console for relationship loading messages
2. Verify entity slugs match exactly
3. Ensure YAML syntax is correct
4. Check that referenced categories/types are defined

## Migration from Entity Relationships

To migrate from entity-embedded relationships to manual relationships:

1. Extract relationships from entity YAML files
2. Convert to manual relationship format
3. Add to `relationships.yml`
4. Remove from entity files (optional)

Manual relationships will override entity relationships with the same source, target, and type.
