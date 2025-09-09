import type { Stats, HeartRateStats } from '../utils/types';

interface DetailedStatsProps {
  stats: Stats;
  heartRateStats?: HeartRateStats;
}

export const DetailedStats = ({ stats, heartRateStats }: DetailedStatsProps) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Detailed Analysis</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-600">Average Power</p>
          <p className="text-xl font-semibold">{stats.average}w</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Normalized Power</p>
          <p className="text-xl font-semibold">{stats.normalized}w</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Variability Index</p>
          <p className="text-xl font-semibold">{stats.variabilityIndex}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Max Power</p>
          <p className="text-xl font-semibold">{stats.max}w</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Min Power</p>
          <p className="text-xl font-semibold">{stats.min}w</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Std Deviation</p>
          <p className="text-xl font-semibold">{stats.stdDev}w</p>
        </div>
      </div>

      {heartRateStats && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-700 mb-3">Heart Rate Details</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Average HR</p>
              <p className="text-xl font-semibold">{heartRateStats.average} bpm</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Max HR</p>
              <p className="text-xl font-semibold">{heartRateStats.max} bpm</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Min HR</p>
              <p className="text-xl font-semibold">{heartRateStats.min} bpm</p>
            </div>
          </div>
        </div>
      )}

      {/* Power Training Zones */}
      <div className="border-t pt-4 mt-4">
        <h4 className="font-semibold text-gray-700 mb-2">Estimated Training Zones (based on FTP)</h4>
        <p class="text-sm mb-3">Consult with a Science to Sport coach for accurate training zones based on metabolic testing.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          <div className="bg-blue-100 p-3 rounded">
            <p className="font-medium">Zone 1 (Active Recovery)</p>
            <p>≤ {Math.round(stats.classicFTP * 0.55)}w (≤55% FTP)</p>
          </div>
          <div className="bg-green-100 p-3 rounded">
            <p className="font-medium">Zone 2 (Endurance)</p>
            <p>{Math.round(stats.classicFTP * 0.56)}-{Math.round(stats.classicFTP * 0.75)}w (56-75% FTP)</p>
          </div>
          <div className="bg-yellow-100 p-3 rounded">
            <p className="font-medium">Zone 3 (Tempo)</p>
            <p>{Math.round(stats.classicFTP * 0.76)}-{Math.round(stats.classicFTP * 0.90)}w (76-90% FTP)</p>
          </div>
          <div className="bg-orange-100 p-3 rounded">
            <p className="font-medium">Zone 4 (Lactate Threshold)</p>
            <p>{Math.round(stats.classicFTP * 0.91)}-{Math.round(stats.classicFTP * 1.05)}w (91-105% FTP)</p>
          </div>
          <div className="bg-red-100 p-3 rounded">
            <p className="font-medium">Zone 5 (VO2 Max)</p>
            <p>{Math.round(stats.classicFTP * 1.06)}-{Math.round(stats.classicFTP * 1.20)}w (106-120% FTP)</p>
          </div>
          <div className="bg-purple-100 p-3 rounded">
            <p className="font-medium">Zone 6 (Anaerobic)</p>
            <p>{Math.round(stats.classicFTP * 1.21)}+w (121%+ FTP)</p>
          </div>
        </div>
      </div>
    </div>
  );
};