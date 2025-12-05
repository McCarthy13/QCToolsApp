export interface SieveData {
  name: string;
  size: number;
  weightRetained: string | number;
  percentRetained?: string;
  cumulativeRetained?: string;
  percentPassing?: string;
  c33Lower?: number | '-';
  c33Upper?: number | '-';
}

export interface AggregateConfig {
  type: 'Fine' | 'Coarse';
  sieves: SieveData[];
  maxDecant?: number | null;
  maxFinenessModulus?: number | null;
}

export interface TestRecord {
  id: string;
  timestamp: number;
  aggregateName: string;
  aggregateType?: 'Fine' | 'Coarse';
  date: string;
  materialName?: string;
  sieveData: SieveData[];
  washedWeight?: number | string;
  finenessModulus?: string;
  decant?: string;
  totalWeight: number;
  passes?: boolean;
  passC33?: boolean;
}

export interface ActiveTest {
  aggregateName: string;
  date: string;
  materialName: string;
  sieveData: SieveData[];
  washedWeight: string;
  decant: string;
  finenessModulus: string;
  totalWeight: number;
  passes: boolean;
}

export interface ChartDataPoint {
  size: number;
  sieve: string;
  percentPassing: number;
  c33Lower?: number;
  c33Upper?: number;
}

