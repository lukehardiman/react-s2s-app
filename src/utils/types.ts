export interface Stats {
  average: number;
  normalized: number;
  max: number;
  min: number;
  variabilityIndex: string;
  stdDev: number;
  classicFTP: number;
  normalizedFTP: number;
}

export interface HeartRateStats {
  average: number;
  max: number;
  min: number;
  lthr: number; // Lactate Threshold Heart Rate (avg of test)
  hrDrift: number; // Percentage drift from first to last quarter
  cardiacDrift: number; // HR increase per watt decrease
}

export interface WattsPerKgStats {
  classicFTPPerKg: number;
  normalizedFTPPerKg: number;
  averagePowerPerKg: number;
  maxPowerPerKg: number;
  grade: string;
  category: string;
  percentile: number;
  description: string;
}

export interface PerformanceGrade {
  grade: string;
  category: string;
  minWattsPerKg: number;
  maxWattsPerKg: number | null;
  percentile: number;
  description: string;
}

export interface Insight {
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
  recommendation: string;
}

export interface PacingAnalysis {
  score: number;
  fadePct: string;
  insights: Insight[];
  avgFirstQuarter: number;
  avgLastQuarter: number;
  wattsLost: number;
}