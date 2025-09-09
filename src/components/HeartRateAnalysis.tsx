import type { HeartRateStats } from '../utils/types';

interface HeartRateAnalysisProps {
  heartRateStats: HeartRateStats;
}

export const HeartRateAnalysis = ({ heartRateStats }: HeartRateAnalysisProps) => {
  const getHRDriftColor = (drift: number) => {
    if (drift > 5) return 'text-red-600';
    if (drift > 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getCardiacDriftInsight = () => {
    if (heartRateStats.cardiacDrift > 2) {
      return {
        type: 'warning' as const,
        message: 'High cardiac drift detected - possible dehydration or overheating',
        recommendation: 'Focus on hydration and cooling strategies'
      };
    } else if (heartRateStats.cardiacDrift > 1) {
      return {
        type: 'info' as const,
        message: 'Moderate cardiac drift - normal for sustained efforts',
        recommendation: 'Monitor hydration during longer tests'
      };
    } else {
      return {
        type: 'success' as const,
        message: 'Excellent cardiac stability throughout the test',
        recommendation: 'Good physiological response to sustained effort'
      };
    }
  };

  const cardiacInsight = getCardiacDriftInsight();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Heart Rate Analysis</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-600">Average HR</p>
          <p className="text-xl font-semibold">{heartRateStats.average} bpm</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Max HR</p>
          <p className="text-xl font-semibold">{heartRateStats.max} bpm</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">HR Drift</p>
          <p className={`text-xl font-semibold ${getHRDriftColor(heartRateStats.hrDrift)}`}>
            {heartRateStats.hrDrift}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Cardiac Drift</p>
          <p className="text-xl font-semibold">{heartRateStats.cardiacDrift} bpm/W</p>
        </div>
      </div>

      {/* HR Zones Estimation */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">Estimated Training Zones (based on LTHR)</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <div className="bg-blue-100 p-2 rounded">
            <p className="font-medium">Zone 1</p>
            <p>{Math.round(heartRateStats.lthr * 0.68)}-{Math.round(heartRateStats.lthr * 0.83)} bpm</p>
          </div>
          <div className="bg-green-100 p-2 rounded">
            <p className="font-medium">Zone 2</p>
            <p>{Math.round(heartRateStats.lthr * 0.84)}-{Math.round(heartRateStats.lthr * 0.94)} bpm</p>
          </div>
          <div className="bg-yellow-100 p-2 rounded">
            <p className="font-medium">Zone 3</p>
            <p>{Math.round(heartRateStats.lthr * 0.95)}-{Math.round(heartRateStats.lthr * 1.05)} bpm</p>
          </div>
          <div className="bg-orange-100 p-2 rounded">
            <p className="font-medium">Zone 4</p>
            <p>{Math.round(heartRateStats.lthr * 1.06)}-{Math.round(heartRateStats.lthr * 1.15)} bpm</p>
          </div>
          <div className="bg-red-100 p-2 rounded">
            <p className="font-medium">Zone 5</p>
            <p>{Math.round(heartRateStats.lthr * 1.16)}+ bpm</p>
          </div>
        </div>
      </div>

      {/* Cardiac Drift Insight */}
      <div className={`p-3 rounded border-l-4 ${
        cardiacInsight.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' :
        cardiacInsight.type === 'warning' ? 'bg-yellow-100 border-yellow-400 text-yellow-700' :
        'bg-blue-100 border-blue-400 text-blue-700'
      }`}>
        <p className="font-medium">{cardiacInsight.message}</p>
        <p className="text-sm mt-1">💡 {cardiacInsight.recommendation}</p>
      </div>
    </div>
  );
};