import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface PowerChartProps {
  powerData: number[];
  heartRateData?: number[];
  speedData?: number[];
  elevationData?: number[];
  averagePower: number;
}

export const PowerChart = ({ powerData, heartRateData, speedData, elevationData, averagePower }: PowerChartProps) => {
  // Prepare data with 30-second rolling average for smoothed power analysis
  const chartData = powerData.map((power, index) => {
    // Calculate 30-second rolling average (15 points each side for 1Hz data)
    const windowStart = Math.max(0, index - 15);
    const windowEnd = Math.min(powerData.length - 1, index + 15);
    const windowData = powerData.slice(windowStart, windowEnd + 1);
    const smoothedPower = windowData.reduce((sum, p) => sum + p, 0) / windowData.length;
    
    return {
      time: index / 60, // Convert to minutes
      power: power,
      smoothedPower: Math.round(smoothedPower),
      powerVariability: Math.abs(power - smoothedPower),
      speed: speedData?.[index] || 0,
      elevation: elevationData?.[index] || 0
    };
  });

  // Sample every 5 seconds for performance
  const sampledData = chartData.filter((_, i) => i % 5 === 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Power Smoothing Analysis</h3>
      <p className="text-sm text-gray-600 mb-4">
        30-second rolling average vs raw power data - shows pacing consistency
        {elevationData && <span> • Includes elevation profile</span>}
        {speedData && <span> • Speed data available</span>}
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={sampledData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey="time" 
            label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }}
            tick={{ fontSize: 12 }}
            type="number"
            domain={['dataMin', 'dataMax']}
            tickCount={Math.ceil(Math.max(...sampledData.map(d => d.time))) + 1}
            ticks={Array.from({length: Math.ceil(Math.max(...sampledData.map(d => d.time))) + 1}, (_, i) => i)}
          />
          <YAxis 
            yAxisId="power"
            label={{ value: 'Power (watts)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          {elevationData && (
            <YAxis 
              yAxisId="elevation"
              orientation="right"
              label={{ value: 'Elevation (m)', angle: 90, position: 'insideRight' }}
              tick={{ fontSize: 12 }}
            />
          )}
          <Tooltip 
            formatter={(value: any, name: string) => {
              if (name.includes('Elevation')) return [`${Math.round(value)}m`, name];
              if (name.includes('Speed')) return [`${Math.round(value * 10) / 10} km/h`, name];
              return [`${Math.round(value)}w`, name];
            }}
          />
          <Legend />
          
          {/* Average power reference */}
          <ReferenceLine 
            yAxisId="power"
            y={averagePower} 
            stroke="#ef4444" 
            strokeDasharray="8 8" 
            opacity={0.7}
            label={{ value: `Avg: ${averagePower}w`, position: "top", fontSize: 12 }}
          />
          
          {/* Elevation profile (if available) */}
          {elevationData && (
            <Line 
              yAxisId="elevation"
              type="monotone" 
              dataKey="elevation" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={false}
              opacity={0.6}
              name="Elevation"
            />
          )}
          
          {/* Raw power (more transparent) */}
          <Line 
            yAxisId="power"
            type="monotone" 
            dataKey="power" 
            stroke="#8b5cf6" 
            strokeWidth={1}
            dot={false}
            opacity={0.4}
            name="Raw Power"
          />
          
          {/* Smoothed power (prominent) */}
          <Line 
            yAxisId="power"
            type="monotone" 
            dataKey="smoothedPower" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={false}
            name="30s Smoothed Power"
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Power consistency insights */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
        <p className="text-gray-700">
          <span className="font-semibold">Pacing Analysis:</span> The smoothed line (green) shows your overall power trend, 
          while the raw data (purple) shows variability. Consistent pacing has minimal gap between these lines.
        </p>
      </div>
    </div>
  );
};