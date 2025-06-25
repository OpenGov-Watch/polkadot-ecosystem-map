import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useData } from '../contexts/DataContext';
import { useConfig } from '../contexts/ConfigContext';
import { GraphNode, GraphLink, GraphPhysics } from '../types/types';
import PhysicsControls from './PhysicsControls';

const GraphView: React.FC = () => {
  const { filteredEntities, data } = useData();
  const { config } = useConfig();
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [physics, setPhysics] = useState<GraphPhysics>(() => config.graph?.physics || {});
  const forceRef = useRef<any>();

  // Default physics values
  const defaultPhysics: GraphPhysics = {
    alphaDecay: 0.0228,
    chargeStrength: -30,
    linkDistance: 30,
    linkStrength: 1,
    velocityDecay: 0.4,
    gravity: 0
  };

  // Handle physics changes
  const handlePhysicsChange = useCallback((newPhysics: GraphPhysics) => {
    setPhysics(newPhysics);
  }, []);  // Reset physics to defaults
  const handlePhysicsReset = useCallback(() => {
    setPhysics(defaultPhysics);
  }, []);

  // Update D3 forces when physics change
  useEffect(() => {
    if (forceRef.current) {
      const fg = forceRef.current;
      
      // Update charge force (node repulsion)
      if (physics.chargeStrength !== undefined) {
        fg.d3Force('charge')?.strength(physics.chargeStrength);
      }
      
      // Update link force (edge attraction)
      if (physics.linkDistance !== undefined || physics.linkStrength !== undefined) {
        const linkForce = fg.d3Force('link');
        if (linkForce) {
          if (physics.linkDistance !== undefined) {
            linkForce.distance(physics.linkDistance);
          }
          if (physics.linkStrength !== undefined) {
            linkForce.strength(physics.linkStrength);
          }
        }
      }
      
      // Update center force (gravity toward center)
      if (physics.gravity !== undefined) {
        fg.d3Force('center')?.strength(physics.gravity);
      }
      
      // Restart simulation with new forces
      fg.d3ReheatSimulation();
    }
  }, [physics]);

  // Filter entities based on configured entity types
  const filteredData = useMemo(() => {
    return filteredEntities.filter(entity => 
      config.entityTypes.includes(entity.type)
    );
  }, [filteredEntities, config.entityTypes]);

  // Convert entities to graph nodes
  const nodes = useMemo((): GraphNode[] => {
    return filteredData.map(entity => ({
      ...entity,
      id: entity.slug,
    }));
  }, [filteredData]);

  // Create links from enhanced relationships
  const links = useMemo((): GraphLink[] => {
    const links: GraphLink[] = [];
    const nodeIds = new Set(nodes.map(n => n.id));
    const edgeConfig = config.graph?.edges;

    // Filter relationships based on configuration
    const filteredRelationships = data.relationships.filter(rel => {
      // Check if both nodes exist in filtered data
      if (!nodeIds.has(rel.source) || !nodeIds.has(rel.target)) {
        return false;
      }

      // Filter by manual/entity relationships
      if (edgeConfig?.showManualRelationships === false && rel.isManual) {
        return false;
      }
      if (edgeConfig?.showEntityRelationships === false && !rel.isManual) {
        return false;
      }

      // Filter by relationship types
      if (edgeConfig?.relationshipTypes?.length && 
          !edgeConfig.relationshipTypes.includes(rel.type)) {
        return false;
      }

      // Filter by relationship categories
      if (edgeConfig?.relationshipCategories?.length && rel.category &&
          !edgeConfig.relationshipCategories.includes(rel.category)) {
        return false;
      }

      return true;
    });

    // Convert to graph links
    filteredRelationships.forEach(rel => {
      links.push({
        source: rel.source,
        target: rel.target,
        type: rel.type,
        weight: rel.weight,
        category: rel.category,
        isManual: rel.isManual,
        description: rel.description
      });
    });

    return links;
  }, [data.relationships, nodes, config.graph?.edges]);

  // This state holds the data for the graph, allowing us to replace it.
  const [graphData, setGraphData] = useState(() => ({
    nodes: nodes.map(n => ({ ...n })), // Initial shallow copy
    links: links.map(l => ({ ...l })), // Create a shallow copy of links as well
  }));

  // Effect to update graph data if the source nodes/links change
  useEffect(() => {
    // Create fresh copies of nodes and links to ensure the graph component updates
    setGraphData({
      nodes: nodes.map(n => ({ ...n })),
      links: links.map(l => ({ ...l })), 
    });
  }, [nodes, links]);

  // Restart the simulation with complete reset
  const handleRestartSimulation = useCallback(() => {
    console.log('=== RESTART BUTTON CLICKED ===');
    console.log('Forcing complete graph reset by creating new node and link objects');
    
    // Create a fresh set of nodes and links to discard old positions/velocities
    setGraphData({
      nodes: nodes.map(n => ({ ...n })),
      links: links.map(l => ({ ...l })), 
    });
    
    // Reheat the simulation to ensure it starts moving
    if (forceRef.current) {
      forceRef.current.d3ReheatSimulation();
    }
    
    console.log('Graph reset triggered');
  }, [nodes, links]);

  // Get node size based on configuration
  const getNodeSize = useCallback((node: GraphNode): number => {
    const sizeConfig = config.graph?.nodes.sizeBy;
    if (!sizeConfig) return 5;

    const value = sizeConfig.field.split('.').reduce((obj: any, prop: string) => {
      return obj?.[prop];
    }, node);

    if (typeof value !== 'number') return 5;    const { scale, domain = [0, 100], range = [5, 20] } = sizeConfig;
    const [domainMin, domainMax] = domain;
    const [rangeMin, rangeMax] = range as [number, number];

    // Normalize value to 0-1 range
    const normalized = Math.max(0, Math.min(1, (value - domainMin) / (domainMax - domainMin)));

    // Apply scaling
    let scaledValue = normalized;
    switch (scale) {
      case 'log':
        scaledValue = Math.log(normalized * 9 + 1) / Math.log(10);
        break;
      case 'sqrt':
        scaledValue = Math.sqrt(normalized);
        break;
      // 'linear' is default
    }

    return rangeMin + (rangeMax - rangeMin) * scaledValue;
  }, [config.graph?.nodes.sizeBy]);

  // Get node color based on configuration
  const getNodeColor = useCallback((node: GraphNode): string => {
    const colorConfig = config.graph?.nodes.colorBy;
    if (!colorConfig) return '#69b7d4';

    if (colorConfig.field === 'type') {
      const colors = colorConfig.range as string[] || ['#69b7d4'];
      const types = [...new Set(filteredData.map(e => e.type))];
      const typeIndex = types.indexOf(node.type);
      return colors[typeIndex % colors.length];
    }

    // Handle numeric color mapping
    const value = colorConfig.field.split('.').reduce((obj: any, prop: string) => {
      return obj?.[prop];
    }, node);

    if (typeof value !== 'number') return '#69b7d4';

    const colors = colorConfig.range as string[] || ['#69b7d4'];
    const { domain = [0, 100] } = colorConfig;
    const [domainMin, domainMax] = domain;
    
    const normalized = Math.max(0, Math.min(1, (value - domainMin) / (domainMax - domainMin)));
    const colorIndex = Math.floor(normalized * (colors.length - 1));
    
    return colors[colorIndex];
  }, [config.graph?.nodes.colorBy, filteredData]);

  // Get link width based on configuration
  const getLinkWidth = useCallback((link: GraphLink): number => {
    const widthConfig = config.graph?.edges.widthBy;
    if (!widthConfig) return 1;

    const value = link.weight || 1;
    const { scale, domain = [1, 10], range = [1, 5] } = widthConfig;
    const [domainMin, domainMax] = domain;
    const [rangeMin, rangeMax] = range as [number, number];

    const normalized = Math.max(0, Math.min(1, (value - domainMin) / (domainMax - domainMin)));

    let scaledValue = normalized;
    switch (scale) {
      case 'log':
        scaledValue = Math.log(normalized * 9 + 1) / Math.log(10);
        break;
      case 'sqrt':
        scaledValue = Math.sqrt(normalized);
        break;
    }

    return rangeMin + (rangeMax - rangeMin) * scaledValue;
  }, [config.graph?.edges.widthBy]);

  // Get link color based on configuration
  const getLinkColor = useCallback((link: GraphLink): string => {
    const edgeConfig = config.graph?.edges;
    const manualConfig = data.manualRelationshipsConfig;

    // Style by category if enabled and category exists
    if (edgeConfig?.styleByCategory && link.category && manualConfig?.categories) {
      const categoryConfig = manualConfig.categories[link.category];
      if (categoryConfig?.color) {
        return categoryConfig.color;
      }
    }

    // Style by type if enabled
    if (edgeConfig?.styleByType && manualConfig?.types) {
      const typeConfig = manualConfig.types[link.type];
      if (typeConfig?.color) {
        return typeConfig.color;
      }
    }

    // Default colors based on manual vs entity relationships
    if (link.isManual) {
      return '#FF6B6B'; // Red for manual relationships
    }

    return '#69b7d4'; // Default blue for entity relationships
  }, [config.graph?.edges, data.manualRelationshipsConfig]);

  // Get link style (dash pattern) based on category
  const getLinkDashArray = useCallback((link: GraphLink): number[] | null => {
    const edgeConfig = config.graph?.edges;
    const manualConfig = data.manualRelationshipsConfig;

    if (edgeConfig?.styleByCategory && link.category && manualConfig?.categories) {
      const categoryConfig = manualConfig.categories[link.category];
      switch (categoryConfig?.style) {
        case 'dashed':
          return [5, 5];
        case 'dotted':
          return [2, 3];
        default:
          return null; // solid
      }
    }

    return null;
  }, [config.graph?.edges, data.manualRelationshipsConfig]);

  // Node hover handler
  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
  }, []);

  // Node click handler
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(selectedNode?.id === node.id ? null : node);
  }, [selectedNode]);

  // Node paint function
  const paintNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D) => {
    const size = getNodeSize(node);
    const color = getNodeColor(node);

    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x || 0, node.y || 0, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();

    // Highlight selected or hovered node
    if (selectedNode?.id === node.id || hoveredNode?.id === node.id) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw label if configured
    if (config.graph?.nodes.showLabels) {
      const label = config.graph.nodes.labelField ? 
        node[config.graph.nodes.labelField as keyof GraphNode] as string || node.name :
        node.name;

      if (label) {
        ctx.font = '10px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(label, node.x || 0, (node.y || 0) + size + 12);
      }
    }
  }, [getNodeSize, getNodeColor, selectedNode, hoveredNode, config.graph?.nodes]);

  if (!config.graph) {
    return (
      <div className="graph-view">
        <div className="error-message">
          No graph configuration found. Please check your render.yaml file.
        </div>
      </div>
    );
  }
  return (
    <div className="graph-view">      <PhysicsControls
        physics={physics}
        onPhysicsChange={handlePhysicsChange}
        onReset={handlePhysicsReset}
        onRestart={handleRestartSimulation}
      />
      
      <div className="graph-controls">
        <div className="graph-stats">
          <span>Nodes: {nodes.length}</span>
          <span>Links: {links.length}</span>
        </div>
        {(hoveredNode || selectedNode) && (
          <div className="node-info">
            {hoveredNode && (
              <div className="node-tooltip">
                <strong>{hoveredNode.name}</strong>
                <div>Type: {hoveredNode.type}</div>
                {hoveredNode.description && (
                  <div>Description: {hoveredNode.description}</div>
                )}
                {hoveredNode.metrics && (
                  <div className="metrics">
                    {Object.entries(hoveredNode.metrics).map(([key, value]) => (
                      <div key={key}>
                        {key}: {typeof value === 'number' ? value.toLocaleString() : value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>      <div className="graph-container">        <ForceGraph2D
          ref={forceRef}
          graphData={graphData}
          width={config.graph.width || 800}
          height={config.graph.height || 600}
          nodeCanvasObject={paintNode}
          linkWidth={getLinkWidth}
          linkColor={getLinkColor}
          linkLineDash={getLinkDashArray}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          // Physics configuration
          d3AlphaDecay={physics.alphaDecay || defaultPhysics.alphaDecay}
          d3VelocityDecay={physics.velocityDecay || defaultPhysics.velocityDecay}
          linkDirectionalParticles={0}
          // Enable zoom and pan
          enableZoomInteraction={true}
          enablePanInteraction={true}
          // Disable default node rendering since we use custom paint
          nodeRelSize={0}
        />
      </div>

      {selectedNode && (
        <div className="node-details">
          <div className="node-details-content">
            <button 
              className="close-button" 
              onClick={() => setSelectedNode(null)}
            >
              ×
            </button>
            <h3>{selectedNode.name}</h3>
            <p><strong>Type:</strong> {selectedNode.type}</p>
            <p><strong>Slug:</strong> {selectedNode.slug}</p>
            {selectedNode.description && (
              <p><strong>Description:</strong> {selectedNode.description}</p>
            )}
            {selectedNode.website && (
              <p>
                <strong>Website:</strong>{' '}
                <a href={selectedNode.website} target="_blank" rel="noopener noreferrer">
                  {selectedNode.website}
                </a>
              </p>
            )}
            {selectedNode.github && (
              <p>
                <strong>GitHub:</strong>{' '}
                <a href={selectedNode.github} target="_blank" rel="noopener noreferrer">
                  {selectedNode.github}
                </a>
              </p>
            )}
            {selectedNode.metrics && (
              <div>
                <strong>Metrics:</strong>
                <ul>
                  {Object.entries(selectedNode.metrics).map(([key, value]) => (
                    <li key={key}>
                      {key}: {typeof value === 'number' ? value.toLocaleString() : value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedNode.tags && selectedNode.tags.length > 0 && (
              <div>
                <strong>Tags:</strong>
                <div className="tags">
                  {selectedNode.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphView;
