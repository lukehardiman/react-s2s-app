import { PowerChart } from './PowerChart';
import { MetricsGrid } from './MetricsGrid';
import { DetailedStats } from './DetailedStats';
import { CoachingInsights } from './CoachingInsights';
import { HeartRateAnalysis } from './HeartRateAnalysis';
import { WattsPerKgAnalysis } from './WattsPerKgAnalysis';
import { PDFExport } from './PDFExport';
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
  segmentInfo?: {
    startTime: number;
    duration: number;
    reason: string;
  };
}

interface AnalysisResultsProps {
  testData: TestData;
}

export const AnalysisResults = ({ testData }: AnalysisResultsProps) => {
  const { powerData, heartRateData, speedData, elevationData, stats, pacing, heartRateStats, wattsPerKgStats, riderWeight } = testData;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <MetricsGrid stats={stats} pacing={pacing} heartRateStats={heartRateStats} />

      {/* Watts per Kg Analysis (if weight provided) */}
      {wattsPerKgStats && riderWeight && (
        <WattsPerKgAnalysis 
          wattsPerKgStats={wattsPerKgStats}
          riderWeight={riderWeight}
        />
      )}

      {/* FTP Improvement Guide */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="border-b border-gray-200 pb-4 mb-4">
          <h3 className="text-xl font-bold text-gray-800 mb-2">🚀 Ready to Improve Your FTP?</h3>
          <p className="text-gray-600 text-sm">
            Learn from <strong>John Wakefield</strong>, one of the Science to Sport founders and World Tour cycling coach
          </p>
        </div>
        
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/LknN-hRRnaU"
            title="How to Improve Your FTP - Expert Cycling Coach Guide"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="rounded-lg"
          />
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          💡 <strong>Pro Tip:</strong> Watch this expert guidance to understand exactly how to train and improve the FTP you just measured!
        </div>
      </div>

      {/* Power Chart */}
      <PowerChart 
        powerData={powerData} 
        heartRateData={heartRateData}
        speedData={speedData}
        elevationData={elevationData}
        averagePower={stats.average}
      />

      {/* Heart Rate Analysis (if available) */}
      {heartRateData && heartRateStats && (
        <HeartRateAnalysis 
          heartRateStats={heartRateStats}
        />
      )}

      {/* Detailed Stats */}
      <DetailedStats stats={stats} heartRateStats={heartRateStats} />

      {/* Coaching Insights */}
      <CoachingInsights pacing={pacing} stats={stats} />

      {/* PDF Export */}
      <PDFExport testData={testData} />
    </div>
  );
};