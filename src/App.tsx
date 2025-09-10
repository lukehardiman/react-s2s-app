import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PowerInputForm } from './components/PowerInputForm';
import { AnalysisResults } from './components/AnalysisResults';
import { TestDataVisualization } from './components/TestDataVisualization';
import { calculateStats, analyzePacing, calculateWattsPerKg, calculateHeartRateStats } from './utils/ftpAnalysis';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Load saved data on mount and handle browser navigation
  useEffect(() => {
    const loadSavedData = () => {
      const saved = localStorage.getItem('ftpTestData');
      if (saved) {
        try {
          const parsedData = JSON.parse(saved);
          setTestData(parsedData);
          // Update URL hash to reflect state
          if (window.location.hash !== '#results') {
            window.history.pushState(null, '', '#results');
          }
        } catch (error) {
          console.error('Error loading saved test data:', error);
          localStorage.removeItem('ftpTestData');
        }
      }
    };

    // Handle browser back/forward navigation
    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log('Hash changed to:', hash); // Debug log
      if (hash === '' || hash === '#') {
        // User navigated to home - show form (but keep data in localStorage)
        console.log('Navigating to form'); // Debug log
        setTestData(null);
      } else if (hash === '#results') {
        // User navigated to results - load from localStorage if available
        console.log('Navigating to results'); // Debug log
        const saved = localStorage.getItem('ftpTestData');
        if (saved) {
          try {
            const parsedData = JSON.parse(saved);
            setTestData(parsedData);
            console.log('Results loaded from localStorage'); // Debug log
          } catch (error) {
            console.error('Error loading saved test data:', error);
            localStorage.removeItem('ftpTestData');
            setTestData(null);
          }
        } else {
          console.log('No saved data found'); // Debug log
          setTestData(null);
        }
      }
    };

    // Load data on initial mount and check URL state
    const initialHash = window.location.hash;
    if (initialHash === '#results') {
      loadSavedData();
    } else {
      // If not on results page, still check for saved data but don't force load
      const saved = localStorage.getItem('ftpTestData');
      if (saved && (initialHash === '' || initialHash === '#')) {
        // If we have saved data but no specific hash, show results
        try {
          const parsedData = JSON.parse(saved);
          setTestData(parsedData);
          window.history.replaceState(null, '', '#results');
        } catch (error) {
          console.error('Error loading saved test data:', error);
          localStorage.removeItem('ftpTestData');
        }
      }
    }
    
    // Listen for hash changes and popstate events (back/forward navigation)
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

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
      
      // Update URL to results page
      window.history.pushState(null, '', '#results');
      
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
    // Update URL to show form using hash
    window.history.pushState(null, '', '#');
  };

  const handleSaveResults = async () => {
    if (!testData || isGeneratingPDF) return;

    setIsGeneratingPDF(true);
    
    let pdfContainer: HTMLDivElement | null = null;
    
    try {
      // Import the PDF generation logic from PDFExport component
      const { generatePDFContent } = await import('./components/PDFExport');
      
      // Create a hidden container for PDF content
      pdfContainer = document.createElement('div');
    pdfContainer.id = 'pdf-content';
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.width = '794px'; // A4 width in pixels at 96 DPI
    pdfContainer.style.backgroundColor = 'white';
    pdfContainer.style.padding = '40px';
    pdfContainer.style.fontFamily = 'Arial, sans-serif';

    // Generate PDF content
    pdfContainer.innerHTML = generatePDFContent(testData);
    document.body.appendChild(pdfContainer);

      // Capture the content as canvas with dynamic height
      const canvas = await html2canvas(pdfContainer, {
        width: 794,
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true
      });

      // Create PDF with proper pagination
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if content exceeds A4 height
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Generate filename with timestamp
      const date = new Date(testData.timestamp);
      const filename = `FTP-Test-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.pdf`;
      
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Optionally show error message to user
    } finally {
      // Clean up
      if (pdfContainer && document.body.contains(pdfContainer)) {
        document.body.removeChild(pdfContainer);
      }
      setIsGeneratingPDF(false);
    }
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
        
        {isGeneratingPDF && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="text-lg font-medium text-gray-700">Generating PDF report...</span>
            </div>
            <p className="text-gray-500 mt-2">Creating your professional test analysis document</p>
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
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveResults}
                    disabled={isGeneratingPDF}
                    className={`px-4 py-2 text-white rounded-md transition flex items-center gap-2 ${
                      isGeneratingPDF 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                    title={isGeneratingPDF ? "Generating PDF..." : "Save test results as PDF"}
                  >
                    {isGeneratingPDF ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    )}
                    {isGeneratingPDF ? 'Generating...' : 'Save Results'}
                  </button>
                  <button
                    onClick={handleNewTest}
                    disabled={isGeneratingPDF}
                    className={`px-4 py-2 text-white rounded-md transition ${
                      isGeneratingPDF 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    New Test
                  </button>
                </div>
              </div>
            </div>
            
            {/* Data Visualization */}
            <TestDataVisualization 
              powerData={testData.powerData}
              heartRateData={testData.heartRateData}
              segmentInfo={testData.segmentInfo}
            />
            
            {/* Analysis Results */}
            <AnalysisResults testData={testData} isGeneratingPDF={isGeneratingPDF} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
