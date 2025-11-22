import { SieveData, ChartDataPoint } from '../types/aggregate-gradation';

/**
 * Calculate test data percentages from weight retained values
 * Exactly as implemented in the original HTML app
 */
export function calculateTestData(sieveData: SieveData[]): SieveData[] {
  const totalWeight = sieveData.reduce(
    (sum, row) => sum + (parseFloat(row.weightRetained as string) || 0),
    0
  );

  let cumulativeRetained = 0;

  return sieveData.map((row) => {
    const weight = parseFloat(row.weightRetained as string) || 0;
    const percentRetained = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
    cumulativeRetained += percentRetained;
    const percentPassing = 100 - cumulativeRetained;

    return {
      ...row,
      percentRetained: percentRetained.toFixed(0),
      cumulativeRetained: cumulativeRetained.toFixed(0),
      percentPassing: percentPassing.toFixed(0),
    };
  });
}

/**
 * Calculate fineness modulus for fine aggregates
 * Exactly as implemented in the original HTML app
 */
export function calculateFinenessModulus(
  aggregateType: 'Fine' | 'Coarse',
  sieveData: SieveData[]
): string {
  if (aggregateType !== 'Fine') return 'N/A';

  const fmSieves = ['3/8"', '#4', '#8', '#16', '#30', '#50', '#100'];
  const fmSum = sieveData
    .filter((row) => fmSieves.includes(row.name))
    .reduce((sum, row) => sum + parseFloat(row.cumulativeRetained || '0'), 0);

  return (fmSum / 100).toFixed(2);
}

/**
 * Calculate decant percentage
 * Exactly as implemented in the original HTML app
 */
export function calculateDecant(
  sieveData: SieveData[],
  washedWeight: number
): string {
  const totalWeight = sieveData.reduce(
    (sum, row) => sum + (parseFloat(row.weightRetained as string) || 0),
    0
  );
  const washed = parseFloat(washedWeight.toString()) || 0;

  if (totalWeight > 0 && washed <= totalWeight) {
    return (((totalWeight - washed) / totalWeight) * 100).toFixed(2);
  }

  return '0.00';
}

/**
 * Prepare chart data from sieve data
 * Exactly as implemented in the original HTML app
 */
export function prepareChartData(sieveData: SieveData[]): ChartDataPoint[] {
  return sieveData
    .filter((row) => row.size > 0)
    .map((row) => {
      const data: ChartDataPoint = {
        size: row.size,
        sieve: row.name,
        percentPassing: parseFloat(row.percentPassing || '0'),
      };

      if (row.c33Lower !== '-' && row.c33Lower !== null) {
        data.c33Lower = row.c33Lower as number;
      }
      if (row.c33Upper !== '-' && row.c33Upper !== null) {
        data.c33Upper = row.c33Upper as number;
      }

      return data;
    })
    .reverse();
}

/**
 * Format date for display
 * Exactly as implemented in the original HTML app
 */
export function formatDateForDisplay(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString();
}

/**
 * Validate if test passes C33 limits
 */
export function checkC33Compliance(sieveData: SieveData[]): boolean {
  for (const sieve of sieveData) {
    const passing = parseFloat(sieve.percentPassing || '0');
    
    if (sieve.c33Lower !== '-' && sieve.c33Lower !== null) {
      if (passing < (sieve.c33Lower as number)) {
        return false;
      }
    }
    
    if (sieve.c33Upper !== '-' && sieve.c33Upper !== null) {
      if (passing > (sieve.c33Upper as number)) {
        return false;
      }
    }
  }
  
  return true;
}
