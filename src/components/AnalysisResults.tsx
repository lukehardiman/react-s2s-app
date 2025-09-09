import { PowerChart } from './PowerChart';
import { MetricsGrid } from './MetricsGrid';
import { DetailedStats } from './DetailedStats';
import { CoachingInsights } from './CoachingInsights';
import { HeartRateAnalysis } from './HeartRateAnalysis';
import { WattsPerKgAnalysis } from './WattsPerKgAnalysis';
import type { Stats, PacingAnalysis, HeartRateStats, WattsPerKgStats } from '../utils/types';

interface TestData {
  powerData: number[];
  heartRateData?: number[];
  speedData?: number[];
  distanceData?: number[];
  elevationData?: number[];
  stats: Stats;
  pacing: PacingAnalysis;
  heartRateStats?: HeartRateStats;
  wattsPerKgStats?: WattsPerKgStats;
  riderWeight?: number;
  timestamp: string;
}

interface AnalysisResultsProps {
  testData: TestData;
}

export const AnalysisResults = ({ testData }: AnalysisResultsProps) => {
  const { powerData, heartRateData, speedData, distanceData, elevationData, stats, pacing, heartRateStats, wattsPerKgStats, riderWeight } = testData;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <MetricsGrid stats={stats} pacing={pacing} heartRateStats={heartRateStats} />

      {/* Power Chart */}
      <PowerChart 
        powerData={powerData} 
        heartRateData={heartRateData}
        speedData={speedData}
        elevationData={elevationData}
        averagePower={stats.average}
      />

      {/* Watts per Kg Analysis (if weight provided) */}
      {wattsPerKgStats && riderWeight && (
        <WattsPerKgAnalysis 
          wattsPerKgStats={wattsPerKgStats}
          riderWeight={riderWeight}
        />
      )}

      {/* Heart Rate Analysis (if available) */}
      {heartRateData && heartRateStats && (
        <HeartRateAnalysis 
          heartRateData={heartRateData}
          heartRateStats={heartRateStats}
          powerData={powerData}
        />
      )}

      {/* Detailed Stats */}
      <DetailedStats stats={stats} heartRateStats={heartRateStats} />

      {/* Coaching Insights */}
      <CoachingInsights pacing={pacing} stats={stats} />
    </div>
  );
};