import type { Stats, PacingAnalysis, HeartRateStats } from '../utils/types';

interface MetricsGridProps {
  stats: Stats;
  pacing: PacingAnalysis;
  heartRateStats?: HeartRateStats;
}

export const MetricsGrid = ({ stats, pacing, heartRateStats }: MetricsGridProps) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Test Results</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Classic FTP</p>
          <p className="text-3xl font-bold">{stats.classicFTP}w</p>
          <p className="text-xs opacity-75">95% of average</p>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Normalized FTP</p>
          <p className="text-3xl font-bold">{stats.normalizedFTP}w</p>
          <p className="text-xs opacity-75">95% of NP</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Pacing Score</p>
          <p className="text-3xl font-bold">{pacing.score}/100</p>
          <p className="text-xs opacity-75">Execution quality</p>
        </div>
        
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Power Fade</p>
          <p className="text-3xl font-bold">{pacing.fadePct}%</p>
          <p className="text-xs opacity-75">First vs last quarter</p>
        </div>

        {heartRateStats && (
          <>
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
              <p className="text-sm opacity-90">LTHR</p>
              <p className="text-3xl font-bold">{heartRateStats.lthr}</p>
              <p className="text-xs opacity-75">Lactate threshold</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <p className="text-sm opacity-90">HR Drift</p>
              <p className="text-3xl font-bold">{heartRateStats.hrDrift}%</p>
              <p className="text-xs opacity-75">Cardiac drift</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};