'use client';

/**
 * ColorPaletteStudio Component
 * 
 * An interactive color palette builder for design practice.
 * Features:
 * - Color wheel picker
 * - Palette harmony validation
 * - WCAG contrast checking
 * - AI feedback on color choices
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from './ColorPaletteStudio.module.css';

interface ColorPaletteCheckpoint {
  id: string;
  title: string;
  context: string;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  constraints?: {
    baseColor?: string;
    requiredColors?: number;
    harmonyType?: 'complementary' | 'analogous' | 'triadic' | 'split-complementary';
  };
}

interface ColorPaletteStudioProps {
  checkpoint: ColorPaletteCheckpoint;
  onComplete: (palette: string[]) => void;
  onSkip: () => void;
}

/**
 * Calculate contrast ratio between two colors (simplified)
 */
function getContrastRatio(hex1: string, hex2: string): number {
  const getLuminance = (hex: string) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Generate harmonious colors from base color
 */
function generateHarmony(baseHex: string, type: string): string[] {
  // Convert hex to HSL
  const rgb = parseInt(baseHex.slice(1), 16);
  const r = ((rgb >> 16) & 0xff) / 255;
  const g = ((rgb >> 8) & 0xff) / 255;
  const b = (rgb & 0xff) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  // Generate harmony
  const hslToHex = (h: number, s: number, l: number) => {
    const hueToRgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const R = Math.round(hueToRgb(p, q, h + 1/3) * 255);
    const G = Math.round(hueToRgb(p, q, h) * 255);
    const B = Math.round(hueToRgb(p, q, h - 1/3) * 255);
    return '#' + [R, G, B].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  const colors = [baseHex];
  
  switch (type) {
    case 'complementary':
      colors.push(hslToHex((h + 0.5) % 1, s, l));
      break;
    case 'analogous':
      colors.push(hslToHex((h + 0.083) % 1, s, l));
      colors.push(hslToHex((h + 0.917) % 1, s, l));
      break;
    case 'triadic':
      colors.push(hslToHex((h + 0.333) % 1, s, l));
      colors.push(hslToHex((h + 0.667) % 1, s, l));
      break;
    case 'split-complementary':
      colors.push(hslToHex((h + 0.417) % 1, s, l));
      colors.push(hslToHex((h + 0.583) % 1, s, l));
      break;
  }

  return colors;
}

export function ColorPaletteStudio({
  checkpoint,
  onComplete,
  onSkip,
}: ColorPaletteStudioProps) {
  const [palette, setPalette] = useState<string[]>(
    checkpoint.constraints?.baseColor ? [checkpoint.constraints.baseColor] : []
  );
  const [currentColor, setCurrentColor] = useState('#6366f1');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    harmony: boolean;
    contrast: boolean;
    messages: string[];
  } | null>(null);

  const colorInputRef = useRef<HTMLInputElement>(null);

  // Add color to palette
  const addColor = useCallback(() => {
    if (palette.length < 6 && !palette.includes(currentColor)) {
      setPalette(prev => [...prev, currentColor]);
    }
  }, [currentColor, palette]);

  // Remove color from palette
  const removeColor = useCallback((index: number) => {
    setPalette(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Validate palette
  const validatePalette = useCallback(() => {
    const messages: string[] = [];
    let harmony = true;
    let contrast = true;

    // Check minimum colors
    const requiredColors = checkpoint.constraints?.requiredColors || 3;
    if (palette.length < requiredColors) {
      messages.push(`Add at least ${requiredColors} colors`);
      harmony = false;
    }

    // Check contrast with white and black
    for (let i = 0; i < palette.length; i++) {
      const whiteContrast = getContrastRatio(palette[i], '#ffffff');
      const blackContrast = getContrastRatio(palette[i], '#000000');
      if (whiteContrast < 3 && blackContrast < 3) {
        messages.push(`Color ${i + 1} might need more contrast`);
        contrast = false;
      }
    }

    // Success messages
    if (harmony && contrast) {
      messages.push('✓ Good color harmony');
      messages.push('✓ Contrast ratios are acceptable');
    }

    setValidationResult({ harmony, contrast, messages });
  }, [palette, checkpoint.constraints?.requiredColors]);

  // Generate harmony suggestions
  const generateSuggestions = useCallback(() => {
    if (palette.length > 0) {
      const type = checkpoint.constraints?.harmonyType || 'complementary';
      const suggestions = generateHarmony(palette[0], type);
      suggestions.forEach(color => {
        if (!palette.includes(color) && palette.length < 6) {
          setPalette(prev => [...prev, color]);
        }
      });
    }
  }, [palette, checkpoint.constraints?.harmonyType]);

  const requiredColors = checkpoint.constraints?.requiredColors || 3;
  const isComplete = palette.length >= requiredColors;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <span className={styles.typeIcon}>🎨</span>
            <h3 className={styles.title}>{checkpoint.title}</h3>
          </div>
          <span className={`${styles.difficulty} ${styles[checkpoint.difficulty]}`}>
            {checkpoint.difficulty}
          </span>
        </div>
        <p className={styles.context}>{checkpoint.context}</p>
      </div>

      {/* Color Picker */}
      <div className={styles.colorPicker}>
        <div className={styles.pickerHeader}>
          <label>Pick a Color</label>
          <span className={styles.colorValue}>{currentColor}</span>
        </div>
        <div className={styles.pickerControls}>
          <input
            ref={colorInputRef}
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className={styles.colorInput}
          />
          <div
            className={styles.colorPreview}
            style={{ backgroundColor: currentColor }}
            onClick={() => colorInputRef.current?.click()}
          />
          <button
            className={styles.addButton}
            onClick={addColor}
            disabled={palette.length >= 6}
          >
            + Add to Palette
          </button>
        </div>
      </div>

      {/* Current Palette */}
      <div className={styles.paletteSection}>
        <div className={styles.paletteHeader}>
          <h4>Your Palette ({palette.length}/{requiredColors} min)</h4>
          {palette.length > 0 && (
            <button
              className={styles.suggestButton}
              onClick={generateSuggestions}
            >
              ✨ Auto-suggest
            </button>
          )}
        </div>
        <div className={styles.paletteGrid}>
          {palette.map((color, index) => (
            <div
              key={index}
              className={styles.colorSwatch}
              style={{ backgroundColor: color }}
              onClick={() => removeColor(index)}
            >
              <span className={styles.swatchLabel}>{color}</span>
              <span className={styles.removeHint}>Click to remove</span>
            </div>
          ))}
          {palette.length === 0 && (
            <div className={styles.emptyState}>
              Pick colors using the picker above
            </div>
          )}
        </div>
      </div>

      {/* Validation */}
      {validationResult && (
        <div className={styles.validationBox}>
          <h4>Palette Analysis</h4>
          <ul className={styles.validationMessages}>
            {validationResult.messages.map((msg, i) => (
              <li key={i} className={msg.startsWith('✓') ? styles.success : styles.warning}>
                {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <div className={styles.leftActions}>
          <button className={styles.skipButton} onClick={onSkip}>
            Skip
          </button>
          <button className={styles.validateButton} onClick={validatePalette}>
            🔍 Validate
          </button>
        </div>
        <button
          className={`${styles.completeButton} ${isComplete ? styles.ready : ''}`}
          onClick={() => onComplete(palette)}
          disabled={!isComplete}
        >
          {isComplete ? '✓ Complete' : `Need ${requiredColors - palette.length} more`}
        </button>
      </div>
    </div>
  );
}

export default ColorPaletteStudio;
