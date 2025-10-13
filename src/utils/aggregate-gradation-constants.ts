import { AggregateConfig } from '../types/aggregate-gradation';

// Standard sieve sizes mapping name to size in mm
export const STANDARD_SIEVES: Record<string, number> = {
  '1"': 25,
  '3/4"': 19,
  '1/2"': 12.5,
  '3/8"': 9.5,
  '#4': 4.75,
  '#8': 2.36,
  '#16': 1.18,
  '#30': 0.6,
  '#50': 0.3,
  '#100': 0.15,
  '#200': 0.075,
  'Pan': 0,
};

// Default aggregate configurations - from original HTML app
export const DEFAULT_AGGREGATES: Record<string, AggregateConfig> = {
  'Keystone #7': {
    type: 'Coarse',
    sieves: [
      { name: '3/4"', size: 19, weightRetained: '', c33Lower: 90, c33Upper: 100 },
      { name: '1/2"', size: 12.5, weightRetained: '', c33Lower: 20, c33Upper: 55 },
      { name: '3/8"', size: 9.5, weightRetained: '', c33Lower: 0, c33Upper: 15 },
      { name: '#4', size: 4.75, weightRetained: '', c33Lower: 0, c33Upper: 5 },
      { name: '#8', size: 2.36, weightRetained: '', c33Lower: '-', c33Upper: '-' },
      { name: 'Pan', size: 0, weightRetained: '', c33Lower: '-', c33Upper: '-' },
    ],
  },
  'Kraemer 9/16"': {
    type: 'Coarse',
    sieves: [
      { name: '3/4"', size: 19, weightRetained: '', c33Lower: 100, c33Upper: 100 },
      { name: '1/2"', size: 12.5, weightRetained: '', c33Lower: 90, c33Upper: 100 },
      { name: '3/8"', size: 9.5, weightRetained: '', c33Lower: 40, c33Upper: 70 },
      { name: '#4', size: 4.75, weightRetained: '', c33Lower: 0, c33Upper: 15 },
      { name: '#8', size: 2.36, weightRetained: '', c33Lower: 0, c33Upper: 5 },
      { name: 'Pan', size: 0, weightRetained: '', c33Lower: '-', c33Upper: '-' },
    ],
  },
  '#9 Gravel (St. Croix)': {
    type: 'Coarse',
    sieves: [
      { name: '1/2"', size: 12.5, weightRetained: '', c33Lower: 100, c33Upper: 100 },
      { name: '3/8"', size: 9.5, weightRetained: '', c33Lower: 85, c33Upper: 100 },
      { name: '#4', size: 4.75, weightRetained: '', c33Lower: 10, c33Upper: 30 },
      { name: '#8', size: 2.36, weightRetained: '', c33Lower: 0, c33Upper: 10 },
      { name: '#16', size: 1.18, weightRetained: '', c33Lower: 0, c33Upper: 5 },
      { name: 'Pan', size: 0, weightRetained: '', c33Lower: '-', c33Upper: '-' },
    ],
  },
  'Concrete Sand': {
    type: 'Fine',
    sieves: [
      { name: '3/8"', size: 9.5, weightRetained: '', c33Lower: 100, c33Upper: 100 },
      { name: '#4', size: 4.75, weightRetained: '', c33Lower: 95, c33Upper: 100 },
      { name: '#8', size: 2.36, weightRetained: '', c33Lower: 80, c33Upper: 100 },
      { name: '#16', size: 1.18, weightRetained: '', c33Lower: 50, c33Upper: 85 },
      { name: '#30', size: 0.6, weightRetained: '', c33Lower: 25, c33Upper: 60 },
      { name: '#50', size: 0.3, weightRetained: '', c33Lower: 10, c33Upper: 30 },
      { name: '#100', size: 0.15, weightRetained: '', c33Lower: 2, c33Upper: 10 },
      { name: 'Pan', size: 0, weightRetained: '', c33Lower: '-', c33Upper: '-' },
    ],
  },
};

// Get sieve list by aggregate type
export const getSieveList = (type: 'Fine' | 'Coarse'): string[] => {
  if (type === 'Fine') {
    return ['3/8"', '#4', '#8', '#16', '#30', '#50', '#100', '#200', 'Pan'];
  } else {
    return ['2"', '1 1/2"', '1"', '3/4"', '1/2"', '3/8"', '#4', '#8', 'Pan'];
  }
};
