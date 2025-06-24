import React, { useState, useCallback } from 'react';
import { GraphPhysics } from '../types/types';

interface PhysicsControlsProps {
  physics: GraphPhysics;
  onPhysicsChange: (physics: GraphPhysics) => void;
  onReset: () => void;
  onRestart?: () => void;
}

// Predefined physics presets
const PHYSICS_PRESETS: { [key: string]: { name: string; physics: GraphPhysics } } = {
  default: {
    name: 'Default',
    physics: {
      alphaDecay: 0.0228,
      chargeStrength: -30,
      linkDistance: 30,
      linkStrength: 1,
      velocityDecay: 0.4,
      gravity: 0
    }
  },
  tight: {
    name: 'Tight Clustering',
    physics: {
      alphaDecay: 0.01,
      chargeStrength: -10,
      linkDistance: 15,
      linkStrength: 1.5,
      velocityDecay: 0.3,
      gravity: 0.1
    }
  },
  loose: {
    name: 'Loose Layout',
    physics: {
      alphaDecay: 0.05,
      chargeStrength: -100,
      linkDistance: 80,
      linkStrength: 0.5,
      velocityDecay: 0.6,
      gravity: 0
    }
  },
  centered: {
    name: 'Centered',
    physics: {
      alphaDecay: 0.0228,
      chargeStrength: -30,
      linkDistance: 30,
      linkStrength: 1,
      velocityDecay: 0.4,
      gravity: 0.3
    }
  }
};

const PhysicsControls: React.FC<PhysicsControlsProps> = ({
  physics,
  onPhysicsChange,
  onReset,
  onRestart
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleValueChange = useCallback((key: keyof GraphPhysics, value: number) => {
    onPhysicsChange({
      ...physics,
      [key]: value
    });
  }, [physics, onPhysicsChange]);

  const handlePresetChange = useCallback((presetKey: string) => {
    const preset = PHYSICS_PRESETS[presetKey];
    if (preset) {
      onPhysicsChange(preset.physics);
    }
  }, [onPhysicsChange]);

  const controls = [
    {
      key: 'alphaDecay' as keyof GraphPhysics,
      label: 'Alpha Decay',
      min: 0.001,
      max: 0.1,
      step: 0.001,
      description: 'How quickly the simulation cools down'
    },
    {
      key: 'velocityDecay' as keyof GraphPhysics,
      label: 'Velocity Decay',
      min: 0.1,
      max: 0.9,
      step: 0.01,
      description: 'Node movement damping factor'
    },
    {
      key: 'chargeStrength' as keyof GraphPhysics,
      label: 'Charge Strength',
      min: -300,
      max: 0,
      step: 5,
      description: 'Node repulsion force (negative = repel)'
    },
    {
      key: 'linkDistance' as keyof GraphPhysics,
      label: 'Link Distance',
      min: 10,
      max: 200,
      step: 5,
      description: 'Desired distance between connected nodes'
    },
    {
      key: 'linkStrength' as keyof GraphPhysics,
      label: 'Link Strength',
      min: 0.1,
      max: 2,
      step: 0.1,
      description: 'How strongly links pull nodes together'
    },
    {
      key: 'gravity' as keyof GraphPhysics,
      label: 'Gravity',
      min: 0,
      max: 2,
      step: 0.01,
      description: 'Force pulling nodes toward center'
    }
  ];

  return (
    <div className="physics-controls">
      <div className="physics-controls-header">
        <button
          className="toggle-button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <span className="toggle-icon">{isExpanded ? '−' : '+'}</span>
          Physics Controls
        </button>
        {isExpanded && (          <div className="physics-controls-actions">
            <select 
              className="preset-selector"
              onChange={(e) => handlePresetChange(e.target.value)}
              value=""
            >
              <option value="">Load Preset...</option>
              {Object.entries(PHYSICS_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.name}
                </option>
              ))}
            </select>
            {onRestart && (
              <button className="restart-button" onClick={onRestart}>
                Restart Simulation
              </button>
            )}
            <button className="reset-button" onClick={onReset}>
              Reset to Defaults
            </button>
          </div>
        )}
      </div>
        {isExpanded && (
        <div className="physics-controls-content">
          <div className="controls-help">
            <p>Adjust the physics parameters to control how the graph behaves. Use presets for quick setups, or fine-tune individual parameters. Changes apply in real-time.</p>
          </div>
          <div className="controls-grid">
            {controls.map(({ key, label, min, max, step, description }) => (
              <div key={key} className="control-group">
                <label className="control-label">
                  <span className="label-text">{label}</span>
                  <span className="control-value">
                    {(physics[key] || 0).toFixed(step < 0.01 ? 3 : 2)}
                  </span>
                </label>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={physics[key] || 0}
                  onChange={(e) => handleValueChange(key, parseFloat(e.target.value))}
                  className="control-slider"
                />
                <div className="control-description">{description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysicsControls;
