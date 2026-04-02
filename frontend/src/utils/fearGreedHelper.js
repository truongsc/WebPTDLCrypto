/**
 * Calculate Fear & Greed Index classification based on value
 * Updated thresholds:
 * - 0-20: Extreme Fear
 * - 21-44: Fear
 * - 45-55: Neutral
 * - 56-75: Greed
 * - 76-100: Extreme Greed
 */
export const getFearGreedClassification = (value) => {
  if (value === null || value === undefined) return 'Unknown';
  
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  
  if (isNaN(numValue)) return 'Unknown';
  
  if (numValue <= 20) return 'Extreme Fear';
  if (numValue <= 44) return 'Fear';
  if (numValue <= 55) return 'Neutral';
  if (numValue <= 75) return 'Greed';
  return 'Extreme Greed';
};

/**
 * Normalize classification from database to ensure consistency
 */
export const normalizeFearGreedClassification = (value, classification) => {
  // If we have a value, use our calculation instead of database classification
  if (value !== null && value !== undefined) {
    return getFearGreedClassification(value);
  }
  
  // Fallback to database classification if no value
  return classification || 'Unknown';
};



