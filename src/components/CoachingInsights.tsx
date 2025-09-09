import type { PacingAnalysis, Stats } from '../utils/types';

interface CoachingInsightsProps {
  pacing: PacingAnalysis;
  stats: Stats;
}

export const CoachingInsights = ({ pacing, stats }: CoachingInsightsProps) => {
  const getInsightColor = (type: string) => {
    switch(type) {
      case 'error': return 'bg-red-100 border-red-400 text-red-700';
      case 'warning': return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      case 'success': return 'bg-green-100 border-green-400 text-green-700';
      default: return 'bg-blue-100 border-blue-400 text-blue-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Coaching Insights</h3>
      
      <div className="space-y-3">
        {pacing.insights.map((insight, index) => (
          <div key={index} className={`border-l-4 p-3 ${getInsightColor(insight.type)}`}>
            <p className="font-medium">{insight.message}</p>
            <p className="text-sm mt-1">💡 {insight.recommendation}</p>
          </div>
        ))}
      </div>
      
      {pacing.wattsLost > 0 && (
        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-purple-800">
            <span className="font-semibold">Potential improvement:</span> With optimal pacing, 
            your FTP could be approximately <span className="font-bold">{stats.classicFTP + pacing.wattsLost}w</span> 
            {' '}(+{pacing.wattsLost}w)
          </p>
        </div>
      )}

      {/* Additional Training Recommendations */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">Training Recommendations</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          {parseFloat(pacing.fadePct) > 5 && (
            <li>• Practice pacing with longer threshold intervals (2x20min @ 95% current FTP)</li>
          )}
          {stats.normalized > stats.average * 1.1 && (
            <li>• Work on steady-state power control with ERG mode or indoor trainer</li>
          )}
          <li>• Next FTP test: Target {Math.round(stats.classicFTP * 1.02)}-{Math.round(stats.classicFTP * 1.05)}w for improvement</li>
          <li>• Schedule FTP retests every 4-6 weeks during focused training blocks</li>
        </ul>
      </div>
    </div>
  );
};