import type { WattsPerKgStats } from '../utils/types';
import { getPerformanceGrades } from '../utils/ftpAnalysis';

interface WattsPerKgAnalysisProps {
  wattsPerKgStats: WattsPerKgStats;
  riderWeight: number;
}

export const WattsPerKgAnalysis = ({ wattsPerKgStats, riderWeight }: WattsPerKgAnalysisProps) => {
  const grades = getPerformanceGrades();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-2xl font-bold mb-4 text-gray-800">Watts per Kg Analysis</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Key Metrics */}
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-3">Performance Metrics</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Rider Weight:</span>
                <span className="font-semibold">{riderWeight} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Classic FTP/kg:</span>
                <span className="font-semibold text-lg">{wattsPerKgStats.classicFTPPerKg} w/kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Normalized FTP/kg:</span>
                <span className="font-semibold">{wattsPerKgStats.normalizedFTPPerKg} w/kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Power/kg:</span>
                <span className="font-semibold">{wattsPerKgStats.averagePowerPerKg} w/kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Max Power/kg:</span>
                <span className="font-semibold">{wattsPerKgStats.maxPowerPerKg} w/kg</span>
              </div>
            </div>
          </div>

          {/* Performance Grade */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-4 rounded-lg border-2 border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-2">Performance Grade</h4>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">{wattsPerKgStats.grade}</div>
              <div className="text-lg font-semibold text-purple-700">{wattsPerKgStats.category}</div>
              <div className="text-sm text-purple-600 mt-1">
                {wattsPerKgStats.percentile}th percentile
              </div>
              <div className="text-sm text-gray-600 mt-2 italic">
                {wattsPerKgStats.description}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Scale */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700">Performance Scale</h4>
          <div className="space-y-2">
            {grades.map((grade) => {
              const isCurrentGrade = grade.grade === wattsPerKgStats.grade;
              const minRange = grade.minWattsPerKg.toFixed(1);
              const maxRange = grade.maxWattsPerKg ? grade.maxWattsPerKg.toFixed(1) : '∞';
              
              return (
                <div
                  key={grade.grade}
                  className={`flex justify-between items-center p-2 rounded ${
                    isCurrentGrade
                      ? 'bg-purple-200 border-2 border-purple-400 font-semibold'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 text-center font-bold ${
                      isCurrentGrade ? 'text-purple-700' : 'text-gray-600'
                    }`}>
                      {grade.grade}
                    </span>
                    <span className={`text-sm ${
                      isCurrentGrade ? 'text-purple-700' : 'text-gray-600'
                    }`}>
                      {grade.category}
                    </span>
                  </div>
                  <span className={`text-sm ${
                    isCurrentGrade ? 'text-purple-700' : 'text-gray-500'
                  }`}>
                    {minRange} - {maxRange} w/kg
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};