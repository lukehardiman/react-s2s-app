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

// Detect if this is a long workout and extract best FTP segment
export const extractBestFTPSegment = (
  powerData: number[], 
  heartRateData?: number[], 
  targetDurationMinutes: number = 20,
  speedData?: number[],
  distanceData?: number[],
  elevationData?: number[]
): { 
  power: number[], 
  heartRate?: number[],
  speed?: number[],
  distance?: number[],
  elevation?: number[],
  segmentInfo: { startTime: number, duration: number, reason: string }
} => {
  const targetSeconds = targetDurationMinutes * 60;
  const dataLengthMinutes = powerData.length / 60;
  
  // If data is close to target duration (within 25%), use as-is
  if (powerData.length <= targetSeconds * 1.25 && powerData.length >= targetSeconds * 0.75) {
    return {
      power: powerData,
      heartRate: heartRateData,
      speed: speedData,
      distance: distanceData,
      elevation: elevationData,
      segmentInfo: {
        startTime: 0,
        duration: powerData.length,
        reason: `Full ${Math.round(dataLengthMinutes)}-minute workout used (close to ${targetDurationMinutes}-minute target)`
      }
    };
  }
  
  // If data is shorter than target, use all available data
  if (powerData.length < targetSeconds * 0.75) {
    return {
      power: powerData,
      heartRate: heartRateData,
      speed: speedData,
      distance: distanceData,
      elevation: elevationData,
      segmentInfo: {
        startTime: 0,
        duration: powerData.length,
        reason: `Short ${Math.round(dataLengthMinutes)}-minute workout - using all available data`
      }
    };
  }
  
  // Long workout detected - find best continuous segment
  console.log(`Long workout detected: ${Math.round(dataLengthMinutes)} minutes. Extracting best ${targetDurationMinutes}-minute segment...`);
  
  let bestAverage = 0;
  let bestStartIndex = 0;
  const windowSize = targetSeconds;
  
  // Use rolling average to find highest sustained power segment
  for (let i = 0; i <= powerData.length - windowSize; i += 30) { // Check every 30 seconds for performance
    const segment = powerData.slice(i, i + windowSize);
    const segmentAverage = segment.reduce((sum, power) => sum + power, 0) / segment.length;
    
    if (segmentAverage > bestAverage) {
      bestAverage = segmentAverage;
      bestStartIndex = i;
    }
  }
  
  const bestPowerSegment = powerData.slice(bestStartIndex, bestStartIndex + windowSize);
  const bestHeartRateSegment = heartRateData?.slice(bestStartIndex, bestStartIndex + windowSize);
  const bestSpeedSegment = speedData?.slice(bestStartIndex, bestStartIndex + windowSize);
  const bestDistanceSegment = distanceData?.slice(bestStartIndex, bestStartIndex + windowSize);
  const bestElevationSegment = elevationData?.slice(bestStartIndex, bestStartIndex + windowSize);
  
  const startTimeMinutes = Math.round(bestStartIndex / 60);
  const endTimeMinutes = Math.round((bestStartIndex + windowSize) / 60);
  
  return {
    power: bestPowerSegment,
    heartRate: bestHeartRateSegment,
    speed: bestSpeedSegment,
    distance: bestDistanceSegment,
    elevation: bestElevationSegment,
    segmentInfo: {
      startTime: bestStartIndex,
      duration: windowSize,
      reason: `Best ${targetDurationMinutes}-minute segment from ${Math.round(dataLengthMinutes)}-minute workout (minutes ${startTimeMinutes}-${endTimeMinutes}, avg ${Math.round(bestAverage)}w)`
    }
  };
};

export const calculateStats = (powerData: number[]): Stats => {
  if (powerData.length === 0) {
    throw new Error('Power data cannot be empty');
  }
  
  const avg = powerData.reduce((a, b) => a + b, 0) / powerData.length;
  const max = Math.max(...powerData);
  const min = Math.min(...powerData);
  
  // Normalized Power calculation - handle short data
  let normalizedPower = avg;
  if (powerData.length >= 30) {
    const rollingAvg30s: number[] = [];
    for (let i = 0; i < powerData.length - 29; i++) {
      const avg30 = powerData.slice(i, i + 30).reduce((a, b) => a + b, 0) / 30;
      rollingAvg30s.push(avg30);
    }
    if (rollingAvg30s.length > 0) {
      const fourthPowers = rollingAvg30s.map(p => Math.pow(p, 4));
      const avgFourth = fourthPowers.reduce((a, b) => a + b, 0) / fourthPowers.length;
      normalizedPower = Math.pow(avgFourth, 0.25);
    }
  }
  
  // Variability Index
  const vi = normalizedPower / avg;
  
  // Standard Deviation
  const variance = powerData.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / powerData.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    average: Math.round(avg),
    normalized: Math.round(normalizedPower),
    max: max,
    min: min,
    variabilityIndex: vi.toFixed(3),
    stdDev: Math.round(stdDev),
    classicFTP: Math.round(avg * 0.95),
    normalizedFTP: Math.round(normalizedPower * 0.95),
    intensityFactor: Number(vi.toFixed(3))
  };
};

export const analyzePacing = (powerData: number[]): PacingAnalysis => {
  const firstQuarter = powerData.slice(0, Math.floor(powerData.length / 4));
  const lastQuarter = powerData.slice(Math.floor(powerData.length * 3 / 4));
  const firstHalf = powerData.slice(0, Math.floor(powerData.length / 2));
  const secondHalf = powerData.slice(Math.floor(powerData.length / 2));
  
  const avgFirst = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
  const avgLast = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
  const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const fadePct = ((avgFirst - avgLast) / avgFirst) * 100;
  const halfSplitPct = ((avgFirstHalf - avgSecondHalf) / avgFirstHalf) * 100;
  
  // Pacing quality score (0-100)
  let score = 100;
  
  // Deduct for excessive fade
  if (fadePct > 10) score -= 30;
  else if (fadePct > 5) score -= 15;
  else if (fadePct > 3) score -= 5;
  
  // Deduct for negative split (started too easy)
  if (fadePct < -3) score -= 10;
  
  // Deduct for high variability
  const stats = calculateStats(powerData);
  const cvPct = (stats.stdDev / stats.average) * 100;
  if (cvPct > 10) score -= 20;
  else if (cvPct > 7) score -= 10;
  else if (cvPct > 5) score -= 5;
  
  // Analysis insights
  const insights: Insight[] = [];
  
  if (fadePct > 10) {
    insights.push({
      type: 'error',
      message: `Significant power fade (${fadePct.toFixed(1)}%) - started too hard`,
      recommendation: `Start ${Math.round(avgFirst * 0.95)}w next time (not ${Math.round(avgFirst)}w)`
    });
  } else if (fadePct > 5) {
    insights.push({
      type: 'warning',
      message: `Moderate power fade (${fadePct.toFixed(1)}%) detected`,
      recommendation: 'Consider starting 2-3% easier'
    });
  } else if (fadePct < -3) {
    insights.push({
      type: 'info',
      message: 'Negative split detected - you got stronger',
      recommendation: 'You could start slightly harder next time'
    });
  } else {
    insights.push({
      type: 'success',
      message: 'Excellent pacing strategy!',
      recommendation: 'Maintain this approach in future tests'
    });
  }
  
  if (cvPct > 10) {
    insights.push({
      type: 'error',
      message: `Very high power variability (CV: ${cvPct.toFixed(1)}%)`,
      recommendation: 'Focus on steady-state effort, use ERG mode if available'
    });
  } else if (cvPct > 7) {
    insights.push({
      type: 'warning',
      message: `High power variability (CV: ${cvPct.toFixed(1)}%)`,
      recommendation: 'Work on holding steady power output'
    });
  }
  
  // Estimate potential watts lost
  let wattsLost = 0;
  if (fadePct > 5) {
    wattsLost = Math.round((fadePct - 3) * 0.5); // Rough estimate
    insights.push({
      type: 'info',
      message: `Estimated ${wattsLost}w lost due to suboptimal pacing`,
      recommendation: `True FTP potentially ${stats.classicFTP + wattsLost}w with better pacing`
    });
  }
  
  // Determine pacing strategy
  let strategy = 'even';
  if (fadePct > 5) {
    strategy = 'positive-split'; // Started too hard, faded
  } else if (fadePct < -3) {
    strategy = 'negative-split'; // Got stronger
  }

  return {
    score: Math.max(0, score),
    fadePct: fadePct.toFixed(1),
    insights,
    avgFirstQuarter: Math.round(avgFirst),
    avgLastQuarter: Math.round(avgLast),
    wattsLost,
    strategy
  };
};

export const calculateHeartRateStats = (heartRateData: number[], powerData: number[]): HeartRateStats => {
  const validHR = heartRateData.filter(hr => hr > 0);
  const avg = validHR.reduce((a, b) => a + b, 0) / validHR.length;
  const max = Math.max(...validHR);
  const min = Math.min(...validHR.filter(hr => hr > 0));
  
  // Calculate HR drift (first quarter vs last quarter)
  const firstQuarter = heartRateData.slice(0, Math.floor(heartRateData.length / 4));
  const lastQuarter = heartRateData.slice(Math.floor(heartRateData.length * 3 / 4));
  
  const avgFirstHR = firstQuarter.filter(hr => hr > 0).reduce((a, b) => a + b, 0) / firstQuarter.filter(hr => hr > 0).length;
  const avgLastHR = lastQuarter.filter(hr => hr > 0).reduce((a, b) => a + b, 0) / lastQuarter.filter(hr => hr > 0).length;
  
  const hrDrift = ((avgLastHR - avgFirstHR) / avgFirstHR) * 100;
  
  // Calculate cardiac drift (HR change per power change)
  const powerFirstQuarter = powerData.slice(0, Math.floor(powerData.length / 4));
  const powerLastQuarter = powerData.slice(Math.floor(powerData.length * 3 / 4));
  
  const avgFirstPower = powerFirstQuarter.reduce((a, b) => a + b, 0) / powerFirstQuarter.length;
  const avgLastPower = powerLastQuarter.reduce((a, b) => a + b, 0) / powerLastQuarter.length;
  
  const powerDrop = avgFirstPower - avgLastPower;
  const hrIncrease = avgLastHR - avgFirstHR;
  
  // Calculate cardiac drift as HR change per power change (absolute value)
  // Positive = HR increases faster than power (drift), Negative = HR increases slower than power
  const cardiacDrift = Math.abs(powerDrop) > 1 ? hrIncrease / Math.abs(powerDrop) : 0;
  
  // Debug logging for cardiac drift
  console.log('Cardiac Drift Calculation:', {
    avgFirstPower: avgFirstPower.toFixed(1),
    avgLastPower: avgLastPower.toFixed(1), 
    powerDrop: powerDrop.toFixed(1),
    avgFirstHR: avgFirstHR.toFixed(1),
    avgLastHR: avgLastHR.toFixed(1),
    hrIncrease: hrIncrease.toFixed(1),
    cardiacDrift: cardiacDrift.toFixed(3)
  });
  
  return {
    average: Math.round(avg),
    max: max,
    min: min,
    lthr: Math.round(avg), // LTHR approximated as average HR during test
    hrDrift: parseFloat(hrDrift.toFixed(1)),
    cardiacDrift: parseFloat(cardiacDrift.toFixed(2))
  };
};

// Performance grading based on watts per kg (FTP)
const PERFORMANCE_GRADES: PerformanceGrade[] = [
  { grade: 'F', category: 'Untrained', minWattsPerKg: 0, maxWattsPerKg: 2.0, percentile: 5, description: 'New to cycling or very sedentary' },
  { grade: 'D-', category: 'Novice', minWattsPerKg: 2.0, maxWattsPerKg: 2.5, percentile: 15, description: 'Recreational cyclist, getting started' },
  { grade: 'D', category: 'Novice', minWattsPerKg: 2.5, maxWattsPerKg: 3.0, percentile: 25, description: 'Regular recreational riding' },
  { grade: 'D+', category: 'Fair', minWattsPerKg: 3.0, maxWattsPerKg: 3.2, percentile: 35, description: 'Developing fitness base' },
  { grade: 'C-', category: 'Fair', minWattsPerKg: 3.2, maxWattsPerKg: 3.4, percentile: 40, description: 'Solid recreational cyclist' },
  { grade: 'C', category: 'Good', minWattsPerKg: 3.4, maxWattsPerKg: 3.7, percentile: 50, description: 'Above average fitness' },
  { grade: 'C+', category: 'Good', minWattsPerKg: 3.7, maxWattsPerKg: 4.0, percentile: 60, description: 'Strong recreational rider' },
  { grade: 'B-', category: 'Very Good', minWattsPerKg: 4.0, maxWattsPerKg: 4.3, percentile: 70, description: 'Club level competitive' },
  { grade: 'B', category: 'Very Good', minWattsPerKg: 4.3, maxWattsPerKg: 4.6, percentile: 80, description: 'Strong club racer' },
  { grade: 'B+', category: 'Excellent', minWattsPerKg: 4.6, maxWattsPerKg: 5.0, percentile: 87, description: 'Regional competitive level' },
  { grade: 'A-', category: 'Excellent', minWattsPerKg: 5.0, maxWattsPerKg: 5.4, percentile: 93, description: 'Cat 2-3 racing level' },
  { grade: 'A', category: 'Superior', minWattsPerKg: 5.4, maxWattsPerKg: 6.0, percentile: 97, description: 'Cat 1-2 racing level' },
  { grade: 'A+', category: 'World Class', minWattsPerKg: 6.0, maxWattsPerKg: null, percentile: 99, description: 'Professional/elite level' }
];

export const calculateWattsPerKg = (stats: Stats, riderWeight: number): WattsPerKgStats => {
  const classicFTPPerKg = stats.classicFTP / riderWeight;
  const normalizedFTPPerKg = stats.normalizedFTP / riderWeight;
  const averagePowerPerKg = stats.average / riderWeight;
  const maxPowerPerKg = stats.max / riderWeight;

  // Find performance grade based on classic FTP per kg
  let grade = PERFORMANCE_GRADES[PERFORMANCE_GRADES.length - 1]; // Default to lowest grade
  for (let i = 0; i < PERFORMANCE_GRADES.length; i++) {
    const g = PERFORMANCE_GRADES[i];
    if (classicFTPPerKg >= g.minWattsPerKg && 
        (g.maxWattsPerKg === null || classicFTPPerKg < g.maxWattsPerKg)) {
      grade = g;
      break;
    }
  }

  return {
    classicFTPPerKg: parseFloat(classicFTPPerKg.toFixed(2)),
    normalizedFTPPerKg: parseFloat(normalizedFTPPerKg.toFixed(2)),
    averagePowerPerKg: parseFloat(averagePowerPerKg.toFixed(2)),
    maxPowerPerKg: parseFloat(maxPowerPerKg.toFixed(2)),
    grade: grade.grade,
    category: grade.category,
    percentile: grade.percentile,
    description: grade.description
  };
};

export const getPerformanceGrades = (): PerformanceGrade[] => PERFORMANCE_GRADES;

// Explicit re-exports to ensure TypeScript module resolution
export type { HeartRateStats, Stats, PacingAnalysis, WattsPerKgStats, PerformanceGrade, Insight };