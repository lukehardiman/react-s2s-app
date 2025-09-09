import { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PowerInputForm } from './components/PowerInputForm';
import { AnalysisResults } from './components/AnalysisResults';
import { TestDataVisualization } from './components/TestDataVisualization';
import { calculateStats, analyzePacing, calculateWattsPerKg, calculateHeartRateStats } from './utils/ftpAnalysis';

interface TestData {
  powerData: number[];
  heartRateData?: number[];
  speedData?: number[];
  distanceData?: number[];
  elevationData?: number[];
  riderWeight?: number;
  stats: any;
  pacing: any;
  wattsPerKgStats?: any;
  heartRateStats?: any;
  timestamp: string;
  segmentInfo?: {
    startTime: number;
    duration: number;
    reason: string;
  };
}

function App() {
  const [testData, setTestData] = useState<TestData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = (
    powerData: number[], 
    heartRateData?: number[], 
    riderWeight?: number,
    segmentInfo?: { startTime: number; duration: number; reason: string },
    speedData?: number[],
    distanceData?: number[],
    elevationData?: number[]
  ) => {
    setIsAnalyzing(true);
    
    // Add small delay to show loading state
    setTimeout(() => {
      const stats = calculateStats(powerData);
      const pacing = analyzePacing(powerData);
      
      let wattsPerKgStats = undefined;
      if (riderWeight) {
        wattsPerKgStats = calculateWattsPerKg(stats, riderWeight);
      }
      
      let heartRateStats = undefined;
      if (heartRateData) {
        heartRateStats = calculateHeartRateStats(heartRateData, powerData);
      }
      
      const newTestData: TestData = {
        powerData,
        heartRateData,
        speedData,
        distanceData,
        elevationData,
        riderWeight,
        stats,
        pacing,
        wattsPerKgStats,
        heartRateStats,
        timestamp: new Date().toISOString(),
        segmentInfo
      };
      
      setTestData(newTestData);
      setIsAnalyzing(false);
      
      // Save to localStorage for persistence
      localStorage.setItem('ftpTestData', JSON.stringify(newTestData));
      
      console.log('Analysis complete:', {
        ftp: stats.classicFTP,
        hrData: heartRateData ? `${heartRateData.length} samples` : 'none',
        weight: riderWeight || 'none',
        segment: segmentInfo?.reason || 'full workout'
      });
    }, 500);
  };

  const handleNewTest = () => {
    setTestData(null);
    localStorage.removeItem('ftpTestData');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {!testData && !isAnalyzing && <PowerInputForm onAnalyze={handleAnalyze} />}
        
        {isAnalyzing && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="text-lg font-medium text-gray-700">Analyzing your test data...</span>
            </div>
            <p className="text-gray-500 mt-2">Calculating FTP, pacing analysis, and performance metrics</p>
          </div>
        )}
        
        {testData && (
          <div className="space-y-8">
            {/* Header with new test button */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">FTP Test Analysis Results</h2>
                  <p className="text-gray-600">
                    Completed: {new Date(testData.timestamp).toLocaleString()}
                  </p>
                  {testData.segmentInfo && (
                    <p className="text-sm text-blue-600 mt-1">
                      📋 {testData.segmentInfo.reason}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleNewTest}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
                >
                  New Test
                </button>
              </div>
            </div>
            
            {/* Data Visualization */}
            <TestDataVisualization 
              powerData={testData.powerData}
              heartRateData={testData.heartRateData}
              segmentInfo={testData.segmentInfo}
            />
            
            {/* Analysis Results */}
            <AnalysisResults testData={testData} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
