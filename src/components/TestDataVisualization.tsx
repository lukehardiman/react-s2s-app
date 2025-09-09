import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart, AreaChart, BarChart, Bar } from 'recharts';

interface TestDataPoint {
  time: number; // seconds
  timeMinutes: string; // formatted time for display
  power: number;
  heartRate?: number;
}

interface TestDataVisualizationProps {
  powerData: number[];
  heartRateData?: number[];
  segmentInfo?: {
    startTime: number;
    duration: number;
    reason: string;
  };
}

export const TestDataVisualization = ({ 
  powerData, 
  heartRateData, 
  segmentInfo 
}: TestDataVisualizationProps) => {
  // Prepare data for charts - sample every 5 seconds for performance with long datasets
  const sampleInterval = Math.max(1, Math.floor(powerData.length / 240)); // Max 240 points for smooth rendering
  
  const chartData: TestDataPoint[] = powerData
    .filter((_, index) => index % sampleInterval === 0)
    .map((power, index) => {
      const timeSeconds = index * sampleInterval;
      const minutes = Math.floor(timeSeconds / 60);
      const seconds = timeSeconds % 60;
      const timeMinutes = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      return {
        time: timeSeconds,
        timeMinutes,
        power,
        heartRate: heartRateData?.[index * sampleInterval]
      };
    });

  // Calculate averages for reference lines
  const avgPower = Math.round(powerData.reduce((sum, p) => sum + p, 0) / powerData.length);
  const avgHR = heartRateData ? Math.round(heartRateData.reduce((sum, hr) => sum + hr, 0) / heartRateData.length) : undefined;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}{entry.name === 'Power' ? 'w' : entry.name === 'Heart Rate' ? ' bpm' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const durationMinutes = Math.round(powerData.length / 60);
  const maxPower = Math.max(...powerData);
  const maxHR = heartRateData ? Math.max(...heartRateData) : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Test Data Visualization</h3>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>📊 Duration: {durationMinutes} minutes</span>
          <span>⚡ Avg Power: {avgPower}w</span>
          <span>🔥 Max Power: {maxPower}w</span>
          {avgHR && <span>❤️ Avg HR: {avgHR} bpm</span>}
          {maxHR > 0 && <span>💓 Max HR: {maxHR} bpm</span>}
        </div>
        {segmentInfo && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            📋 {segmentInfo.reason}
          </div>
        )}
      </div>

      {/* Combined Power and HR Chart */}
      <div className="h-80">
        <h4 className="text-lg font-semibold text-gray-700 mb-3">Power Output Over Time</h4>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="timeMinutes" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              yAxisId="power"
              orientation="left"
              tick={{ fontSize: 12 }}
              label={{ value: 'Power (watts)', angle: -90, position: 'insideLeft' }}
            />
            {heartRateData && (
              <YAxis 
                yAxisId="hr"
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{ value: 'Heart Rate (bpm)', angle: 90, position: 'insideRight' }}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Power line */}
            <Line
              yAxisId="power"
              type="monotone"
              dataKey="power"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              name="Power"
            />
            
            {/* Heart rate line */}
            {heartRateData && (
              <Line
                yAxisId="hr"
                type="monotone"
                dataKey="heartRate"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Heart Rate"
              />
            )}
            
            {/* Average power reference line */}
            <ReferenceLine 
              yAxisId="power" 
              y={avgPower} 
              stroke="#8b5cf6" 
              strokeDasharray="8 8" 
              opacity={0.7}
              label={{ value: `Avg: ${avgPower}w`, position: "top", fontSize: 12 }}
            />
            
            {/* Average HR reference line */}
            {avgHR && (
              <ReferenceLine 
                yAxisId="hr" 
                y={avgHR} 
                stroke="#ef4444" 
                strokeDasharray="8 8" 
                opacity={0.7}
                label={{ value: `Avg: ${avgHR} bpm`, position: "bottom", fontSize: 12 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Power Distribution Histogram - Time in Power Zones */}
      <div className="h-64">
        <h4 className="text-lg font-semibold text-gray-700 mb-3">Time in Power Zones</h4>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={(() => {
            // Create power distribution histogram showing time spent in each power zone
            const minPower = Math.min(...powerData);
            const maxPower = Math.max(...powerData);
            const bucketSize = Math.max(10, Math.round((maxPower - minPower) / 12)); // ~12 buckets for clean zones
            const buckets: { [key: string]: number } = {};
            
            // Initialize buckets
            for (let power = Math.floor(minPower / bucketSize) * bucketSize; power <= maxPower; power += bucketSize) {
              const bucketLabel = `${power}-${power + bucketSize}w`;
              buckets[bucketLabel] = 0;
            }
            
            // Fill buckets with time spent in each zone
            powerData.forEach(power => {
              const bucketStart = Math.floor(power / bucketSize) * bucketSize;
              const bucketLabel = `${bucketStart}-${bucketStart + bucketSize}w`;
              if (buckets[bucketLabel] !== undefined) {
                buckets[bucketLabel]++;
              }
            });
            
            // Convert to chart data with time and percentages
            const totalSamples = powerData.length;
            return Object.entries(buckets)
              .map(([range, count]) => ({
                range,
                seconds: count,
                percentage: ((count / totalSamples) * 100).toFixed(1),
                minutes: (count / 60).toFixed(1)
              }))
              .filter(bucket => bucket.seconds > 0)
              .sort((a, b) => {
                const aStart = parseInt(a.range.split('-')[0]);
                const bStart = parseInt(b.range.split('-')[0]);
                return aStart - bStart;
              });
          })()} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="range"
              tick={{ fontSize: 10, angle: -45 }}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Time (seconds)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: any, name: string) => {
                const data = value;
                return [
                  [`${data} seconds`, 'Time'],
                  [`${((data / powerData.length) * 100).toFixed(1)}%`, 'Percentage'],
                  [`${(data / 60).toFixed(1)} min`, 'Minutes']
                ];
              }}
              labelFormatter={(label: string) => `Power Range: ${label}`}
            />
            <Bar 
              dataKey="seconds" 
              fill="#8b5cf6" 
              opacity={0.8}
              stroke="#7c3aed"
              strokeWidth={1}
            />
            
            {/* Average power reference line */}
            <ReferenceLine 
              x={(() => {
                const bucketSize = Math.max(10, Math.round((Math.max(...powerData) - Math.min(...powerData)) / 12));
                const avgBucketStart = Math.floor(avgPower / bucketSize) * bucketSize;
                return `${avgBucketStart}-${avgBucketStart + bucketSize}w`;
              })()}
              stroke="#ef4444" 
              strokeDasharray="4 4" 
              opacity={0.7}
              label={{ value: `Avg: ${avgPower}w`, position: "top", fontSize: 10 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data Quality Indicators */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-lg font-semibold text-gray-700 mb-3">Data Quality</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="font-semibold text-gray-800">Data Points</div>
            <div className="text-2xl font-bold text-purple-600">{powerData.length}</div>
            <div className="text-gray-500">samples</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="font-semibold text-gray-800">Sample Rate</div>
            <div className="text-2xl font-bold text-purple-600">1</div>
            <div className="text-gray-500">per second</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="font-semibold text-gray-800">Power Range</div>
            <div className="text-2xl font-bold text-purple-600">{maxPower - Math.min(...powerData)}</div>
            <div className="text-gray-500">watts</div>
          </div>
          {heartRateData && (
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="font-semibold text-gray-800">HR Range</div>
              <div className="text-2xl font-bold text-red-600">{maxHR - Math.min(...heartRateData)}</div>
              <div className="text-gray-500">bpm</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};