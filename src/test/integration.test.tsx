import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PowerInputForm } from '../components/PowerInputForm';
import { AnalysisResults } from '../components/AnalysisResults';
import { calculateStats, analyzePacing, calculateHeartRateStats } from '../utils/ftpAnalysis';

// Mock alert to capture validation errors
global.alert = vi.fn();

// Mock recharts to avoid canvas issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: () => <div data-testid="reference-line" />
}));

describe('Integration Tests - Full Workflow', () => {
  describe('PowerInputForm Integration', () => {
    let mockOnAnalyze: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockOnAnalyze = vi.fn();
      vi.clearAllMocks();
    });

    it('should complete manual data entry workflow', async () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);

      // Select manual input
      const manualRadio = screen.getByLabelText('Manual Entry');
      fireEvent.click(manualRadio);

      // Enter test data - provide exactly 20 values for 20-minute test
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      const twentyMinuteData = Array(20).fill(0).map((_, i) => 250 + i).join(', ');
      fireEvent.change(textarea, { target: { value: twentyMinuteData } });

      // Submit form
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);

      // Verify callback was called with processed data
      expect(mockOnAnalyze).toHaveBeenCalledTimes(1);
      const [powerData] = mockOnAnalyze.mock.calls[0];
      expect(powerData).toHaveLength(1200); // 20 minutes * 60 seconds
      
      // Check that the first minute average is close to expected (250)
      const firstMinute = powerData.slice(0, 60);
      const avgFirstMinute = firstMinute.reduce((a, b) => a + b, 0) / firstMinute.length;
      expect(avgFirstMinute).toBeCloseTo(250, -1); // Average should be within ~5 watts due to random variation
    });

    it('should complete CSV upload workflow', async () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);

      // Select CSV input
      const csvRadio = screen.getByLabelText('CSV Upload');
      fireEvent.click(csvRadio);

      // Create mock CSV file
      const csvContent = `Time,Power,Heart Rate
1,250,160
2,255,162
3,245,164`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      // Upload file - query by input type file
      const fileInput = screen.getByText(/upload csv file/i).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      // Submit form
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(mockOnAnalyze).toHaveBeenCalledTimes(1);
      });

      const [powerData, heartRateData] = mockOnAnalyze.mock.calls[0];
      expect(powerData).toEqual([250, 255, 245]);
      expect(heartRateData).toEqual([160, 162, 164]);
    });

    it('should handle different test durations', async () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);

      // Change duration to 8 minutes
      const durationSelect = screen.getByDisplayValue('20 minutes (Standard)');
      fireEvent.change(durationSelect, { target: { value: '8' } });

      // Generate sample data
      const generateButton = screen.getByRole('button', { name: /Generate Sample Data/i });
      fireEvent.click(generateButton);

      // Submit
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);

      expect(mockOnAnalyze).toHaveBeenCalledTimes(1);
      const [powerData] = mockOnAnalyze.mock.calls[0];
      expect(powerData).toHaveLength(480); // 8 minutes * 60 seconds
    });
  });

  describe('AnalysisResults Integration', () => {
    const createTestData = () => {
      const powerData = new Array(1200).fill(250); // 20 minutes at 250w
      const heartRateData = new Array(1200).fill(165); // 20 minutes at 165 bpm
      const stats = calculateStats(powerData);
      const pacing = analyzePacing(powerData);
      const heartRateStats = calculateHeartRateStats(heartRateData, powerData);

      return {
        powerData,
        heartRateData,
        stats,
        pacing,
        heartRateStats,
        timestamp: new Date().toISOString()
      };
    };

    it('should display all analysis components', () => {
      const testData = createTestData();
      render(<AnalysisResults testData={testData} />);

      // Check for main sections
      expect(screen.getByText('Test Results')).toBeInTheDocument();
      expect(screen.getByText('Power Profile')).toBeInTheDocument();
      expect(screen.getByText('Heart Rate Analysis')).toBeInTheDocument();
      expect(screen.getByText('Detailed Analysis')).toBeInTheDocument();
      expect(screen.getByText('Coaching Insights')).toBeInTheDocument();
    });

    it('should display correct FTP values', () => {
      const testData = createTestData();
      render(<AnalysisResults testData={testData} />);

      // Check FTP calculations - use getAllByText since both Classic and Normalized FTP show 238w
      const ftpValues = screen.getAllByText('238w');
      expect(ftpValues).toHaveLength(2); // Both Classic and Normalized FTP
      expect(ftpValues[0]).toBeInTheDocument(); // Classic FTP (250 * 0.95)
      expect(ftpValues[1]).toBeInTheDocument(); // Normalized FTP (same for steady power)
    });

    it('should show power zones correctly', () => {
      const testData = createTestData();
      render(<AnalysisResults testData={testData} />);

      // Check for power zones (based on 238w FTP)
      expect(screen.getByText(/Zone 1 \(Active Recovery\)/)).toBeInTheDocument();
      expect(screen.getByText(/≤ 131w/)).toBeInTheDocument(); // 238 * 0.55
      expect(screen.getByText(/Zone 4 \(Lactate Threshold\)/)).toBeInTheDocument();
      expect(screen.getByText(/217-250w/)).toBeInTheDocument(); // 238 * 0.91-1.05
    });

    it('should handle power-only data (no HR)', () => {
      const testData = createTestData();
      delete testData.heartRateData;
      delete testData.heartRateStats;

      render(<AnalysisResults testData={testData} />);

      // Should not show HR analysis
      expect(screen.queryByText('Heart Rate Analysis')).not.toBeInTheDocument();
      // But should show other sections
      expect(screen.getByText('Test Results')).toBeInTheDocument();
      expect(screen.getByText('Power Profile')).toBeInTheDocument();
    });
  });

  describe('Local Storage Integration', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should save and restore test data', () => {
      const testData = {
        powerData: [250, 255, 245],
        stats: calculateStats([250, 255, 245]),
        pacing: analyzePacing([250, 255, 245]),
        timestamp: new Date().toISOString()
      };

      // Save to localStorage
      localStorage.setItem('ftpTestData', JSON.stringify(testData));

      // Retrieve and verify
      const saved = localStorage.getItem('ftpTestData');
      expect(saved).not.toBeNull();

      const parsed = JSON.parse(saved!);
      expect(parsed.powerData).toEqual([250, 255, 245]);
      expect(parsed.stats.average).toBe(250);
    });

    it('should handle corrupted localStorage data', () => {
      // Set invalid JSON
      localStorage.setItem('ftpTestData', 'invalid json');

      // Should not crash when parsing fails
      const saved = localStorage.getItem('ftpTestData');
      expect(() => JSON.parse(saved!)).toThrow();
    });
  });

  describe('End-to-End Analysis Workflow', () => {
    it('should complete full analysis from raw data to recommendations', () => {
      // Simulate poor pacing test data
      const powerData = [
        ...new Array(300).fill(280), // First quarter: too hard
        ...new Array(450).fill(250), // Middle: settling
        ...new Array(450).fill(230)  // End: fading
      ];

      const stats = calculateStats(powerData);
      const pacing = analyzePacing(powerData);

      // Verify calculations
      expect(stats.average).toBe(250); // Overall average
      expect(stats.classicFTP).toBe(238); // 95% of average
      expect(pacing.score).toBeLessThan(90); // Should be penalized for poor pacing
      expect(parseFloat(pacing.fadePct)).toBeGreaterThan(5); // Should show fade

      // Verify insights contain actionable advice
      expect(pacing.insights.length).toBeGreaterThan(0);
      const hasActionableAdvice = pacing.insights.some(insight => 
        insight.recommendation.length > 10 && 
        (insight.recommendation.includes('Start') || 
         insight.recommendation.includes('Consider') ||
         insight.recommendation.includes('Focus'))
      );
      expect(hasActionableAdvice).toBe(true);
    });

    it('should provide different recommendations for different test types', () => {
      // Short high-intensity test
      const shortTest = new Array(480).fill(320); // 8 min @ 320w
      const shortStats = calculateStats(shortTest);
      const shortPacing = analyzePacing(shortTest);

      // Long moderate-intensity test
      const longTest = new Array(2400).fill(220); // 40 min @ 220w
      const longStats = calculateStats(longTest);
      const longPacing = analyzePacing(longTest);

      // Both should give reasonable FTP estimates
      expect(shortStats.classicFTP).toBe(304); // 320 * 0.95
      expect(longStats.classicFTP).toBe(209);  // 220 * 0.95

      // Both should have good pacing if steady
      expect(shortPacing.score).toBeGreaterThan(90);
      expect(longPacing.score).toBeGreaterThan(90);
    });

    it('should handle realistic test with noise and variability', () => {
      // Generate realistic test data with deterministic variability 
      const powerData: number[] = [];
      const baselinePower = 250;
      
      for (let i = 0; i < 1200; i++) {
        const timeFactor = 1 - (i / 1200) * 0.05; // Slight fade over time
        const noise = Math.sin(i * 0.1) * 10; // ±10w deterministic noise
        const power = Math.round(baselinePower * timeFactor + noise);
        powerData.push(Math.max(0, power)); // No negative power
      }

      const stats = calculateStats(powerData);
      const pacing = analyzePacing(powerData);

      // Should produce reasonable results with deterministic data
      expect(stats.average).toBeCloseTo(baselinePower * 0.975, 0); // Account for fade (97.5% of baseline)
      expect(stats.classicFTP).toBeCloseTo(stats.average * 0.95, 0); // 95% of average
      expect(stats.normalized).toBeGreaterThanOrEqual(stats.average); // Variability inflates NP (or equals for small variation)
      expect(pacing.score).toBeGreaterThan(70); // Reasonable pacing despite noise
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle component errors gracefully', () => {
      // Test with invalid data that might cause component errors
      const invalidTestData = {
        powerData: [],
        stats: {
          average: 0,
          normalized: 0,
          max: 0,
          min: 0,
          variabilityIndex: '0.000',
          stdDev: 0,
          classicFTP: 0,
          normalizedFTP: 0
        },
        pacing: {
          score: 0,
          fadePct: '0.0',
          insights: [],
          avgFirstQuarter: 0,
          avgLastQuarter: 0,
          wattsLost: 0
        },
        timestamp: new Date().toISOString()
      };

      // Should not crash
      expect(() => {
        render(<AnalysisResults testData={invalidTestData} />);
      }).not.toThrow();
    });

    it('should validate input bounds', () => {
      const mockOnAnalyze = vi.fn();
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);

      // Try to submit without data
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      
      // Button should be disabled when no data
      expect(analyzeButton).toBeDisabled();
    });
  });
});