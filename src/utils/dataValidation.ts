/**
 * Data validation utilities for library items
 * Provides soft warnings (non-blocking) for unusual values
 */

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning' | 'info';
}

/**
 * Validate admixture data
 */
export const validateAdmixData = (data: {
  specificGravity?: number;
  costPerGallon?: number;
  percentWater?: number;
}): ValidationWarning[] => {
  const warnings: ValidationWarning[] = [];

  // Specific Gravity validation
  if (data.specificGravity !== undefined) {
    if (data.specificGravity < 0.8 || data.specificGravity > 2.0) {
      warnings.push({
        field: 'Specific Gravity',
        message: `Value ${data.specificGravity.toFixed(2)} is outside typical range (0.8-2.0). Please verify this is correct.`,
        severity: 'warning',
      });
    } else if (data.specificGravity < 1.0 || data.specificGravity > 1.5) {
      warnings.push({
        field: 'Specific Gravity',
        message: `Value ${data.specificGravity.toFixed(2)} is unusual but acceptable. Most admixtures are between 1.0-1.5.`,
        severity: 'info',
      });
    }
  }

  // Cost Per Gallon validation
  if (data.costPerGallon !== undefined) {
    if (data.costPerGallon < 0) {
      warnings.push({
        field: 'Cost Per Gallon',
        message: 'Cost cannot be negative. Please check your entry.',
        severity: 'warning',
      });
    } else if (data.costPerGallon > 100) {
      warnings.push({
        field: 'Cost Per Gallon',
        message: `$${data.costPerGallon.toFixed(2)} per gallon is unusually high. Please verify this is correct.`,
        severity: 'warning',
      });
    } else if (data.costPerGallon === 0) {
      warnings.push({
        field: 'Cost Per Gallon',
        message: 'Cost is set to zero. Is this intentional?',
        severity: 'info',
      });
    }
  }

  // Percent Water validation
  if (data.percentWater !== undefined) {
    if (data.percentWater < 0 || data.percentWater > 100) {
      warnings.push({
        field: 'Percent Water',
        message: 'Percentage must be between 0 and 100.',
        severity: 'warning',
      });
    } else if (data.percentWater > 90) {
      warnings.push({
        field: 'Percent Water',
        message: `${data.percentWater}% water content is very high. Please verify this is correct.`,
        severity: 'info',
      });
    }
  }

  return warnings;
};

/**
 * Validate aggregate data
 */
export const validateAggregateData = (data: {
  dryRoddedUnitWeight?: number;
  percentVoids?: number;
  absorption?: number;
  sgBulkSSD?: number;
  sgBulkOvenDry?: number;
  sgApparent?: number;
  finenessModulus?: number;
}): ValidationWarning[] => {
  const warnings: ValidationWarning[] = [];

  // Dry-Rodded Unit Weight (typical range: 85-120 lb/ft³)
  if (data.dryRoddedUnitWeight !== undefined) {
    if (data.dryRoddedUnitWeight < 50 || data.dryRoddedUnitWeight > 150) {
      warnings.push({
        field: 'Dry-Rodded Unit Weight',
        message: `${data.dryRoddedUnitWeight} lb/ft³ is outside typical range (85-120 lb/ft³). Please verify.`,
        severity: 'warning',
      });
    }
  }

  // Percent Voids (typical range: 30-50%)
  if (data.percentVoids !== undefined) {
    if (data.percentVoids < 0 || data.percentVoids > 100) {
      warnings.push({
        field: 'Percent Voids',
        message: 'Percentage must be between 0 and 100.',
        severity: 'warning',
      });
    } else if (data.percentVoids < 20 || data.percentVoids > 60) {
      warnings.push({
        field: 'Percent Voids',
        message: `${data.percentVoids}% is outside typical range (30-50%). Please verify.`,
        severity: 'info',
      });
    }
  }

  // Absorption (typical range: 0.2-5%)
  if (data.absorption !== undefined) {
    if (data.absorption < 0 || data.absorption > 20) {
      warnings.push({
        field: 'Absorption',
        message: `${data.absorption}% is outside typical range (0.2-5%). Please verify.`,
        severity: 'warning',
      });
    }
  }

  // Specific Gravity validations (typical range: 2.3-3.0)
  const sgFields = [
    { value: data.sgBulkSSD, name: 'SG Bulk SSD' },
    { value: data.sgBulkOvenDry, name: 'SG Bulk Oven Dry' },
    { value: data.sgApparent, name: 'SG Apparent' },
  ];

  sgFields.forEach(({ value, name }) => {
    if (value !== undefined) {
      if (value < 1.5 || value > 4.0) {
        warnings.push({
          field: name,
          message: `${value.toFixed(2)} is outside typical range (2.3-3.0). Please verify.`,
          severity: 'warning',
        });
      }
    }
  });

  // Fineness Modulus (typical range: 2.3-3.1 for fine aggregates)
  if (data.finenessModulus !== undefined) {
    if (data.finenessModulus < 1.5 || data.finenessModulus > 4.0) {
      warnings.push({
        field: 'Fineness Modulus',
        message: `${data.finenessModulus.toFixed(2)} is outside typical range (2.3-3.1). Please verify.`,
        severity: 'warning',
      });
    }
  }

  return warnings;
};
