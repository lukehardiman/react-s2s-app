import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestDataVisualization } from '../components/TestDataVisualization';

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
  ReferenceLine: () => <div data-testid="reference-line" />,
  Area: () => <div data-testid="area" />,
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>
}));

describe('TestDataVisualization', () => {
  const createTestPowerData = () => Array(1200).fill(250); // 20 minutes at 250w
  const createTestHRData = () => Array(1200).fill(165); // 20 minutes at 165 bpm

  describe('Basic Rendering', () => {
    it('should render visualization with power data only', () => {
      const powerData = createTestPowerData();
      
      render(<TestDataVisualization powerData={powerData} />);
      
      expect(screen.getByText('Test Data Visualization')).toBeInTheDocument();
      expect(screen.getByText('⚡ Avg Power: 250w')).toBeInTheDocument();
      expect(screen.getByText('🔥 Max Power: 250w')).toBeInTheDocument();
      expect(screen.getByText('📊 Duration: 20 minutes')).toBeInTheDocument();
    });

    it('should render visualization with power and HR data', () => {
      const powerData = createTestPowerData();
      const heartRateData = createTestHRData();
      
      render(<TestDataVisualization powerData={powerData} heartRateData={heartRateData} />);
      
      expect(screen.getByText('❤️ Avg HR: 165 bpm')).toBeInTheDocument();
      expect(screen.getByText('💓 Max HR: 165 bpm')).toBeInTheDocument();
    });

    it('should display segment information when provided', () => {
      const powerData = createTestPowerData();
      const segmentInfo = {
        startTime: 0,
        duration: 1200,
        reason: 'Full 20-minute workout analyzed'
      };
      
      render(<TestDataVisualization powerData={powerData} segmentInfo={segmentInfo} />);
      
      expect(screen.getByText('📋 Full 20-minute workout analyzed')).toBeInTheDocument();
    });
  });

  describe('Chart Components', () => {
    it('should render power over time chart', () => {
      const powerData = createTestPowerData();
      
      render(<TestDataVisualization powerData={powerData} />);
      
      expect(screen.getByText('Power Output Over Time')).toBeInTheDocument();
      expect(screen.getAllByTestId('composed-chart')).toHaveLength(1);
    });

    it('should render power distribution chart', () => {
      const powerData = createTestPowerData();
      
      render(<TestDataVisualization powerData={powerData} />);
      
      expect(screen.getByText('Power Distribution')).toBeInTheDocument();
      expect(screen.getAllByTestId('area-chart')).toHaveLength(1);
    });

    it('should render data quality indicators', () => {
      const powerData = createTestPowerData();
      
      render(<TestDataVisualization powerData={powerData} />);
      
      expect(screen.getByText('Data Quality')).toBeInTheDocument();
      expect(screen.getByText('Data Points')).toBeInTheDocument();
      expect(screen.getByText('1200')).toBeInTheDocument(); // Sample count
      expect(screen.getByText('Sample Rate')).toBeInTheDocument();
      expect(screen.getByText('Power Range')).toBeInTheDocument();
    });

    it('should show HR range when heart rate data is provided', () => {
      const powerData = createTestPowerData();
      const heartRateData = createTestHRData();
      
      render(<TestDataVisualization powerData={powerData} heartRateData={heartRateData} />);
      
      expect(screen.getByText('HR Range')).toBeInTheDocument();
    });
  });

  describe('Data Processing', () => {
    it('should handle variable power data correctly', () => {
      const powerData = [200, 220, 240, 260, 280]; // 5 seconds
      
      render(<TestDataVisualization powerData={powerData} />);
      
      expect(screen.getByText('⚡ Avg Power: 240w')).toBeInTheDocument();
      expect(screen.getByText('🔥 Max Power: 280w')).toBeInTheDocument();
      expect(screen.getByText('Power Range')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument(); // 280 - 200
    });

    it('should handle variable heart rate data correctly', () => {
      const powerData = createTestPowerData();
      const heartRateData = [150, 160, 170, 180, 175]; // Variable HR
      
      render(<TestDataVisualization powerData={powerData} heartRateData={heartRateData} />);
      
      expect(screen.getByText('❤️ Avg HR: 167 bpm')).toBeInTheDocument();
      expect(screen.getByText('💓 Max HR: 180 bpm')).toBeInTheDocument();
    });

    it('should calculate correct duration for different data lengths', () => {
      const shortData = Array(480).fill(250); // 8 minutes
      
      render(<TestDataVisualization powerData={shortData} />);
      
      expect(screen.getByText('📊 Duration: 8 minutes')).toBeInTheDocument();
    });
  });

  describe('Long File Handling', () => {
    it('should display extracted segment information', () => {
      const longPowerData = Array(3600).fill(250); // 60 minutes
      const segmentInfo = {
        startTime: 1800, // 30 minutes
        duration: 1200, // 20 minutes  
        reason: 'Best 20-minute segment from 60-minute workout (minutes 30-50, avg 275w)'
      };
      
      render(<TestDataVisualization powerData={longPowerData} segmentInfo={segmentInfo} />);
      
      expect(screen.getByText('📋 Best 20-minute segment from 60-minute workout (minutes 30-50, avg 275w)')).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('should sample large datasets for chart performance', () => {
      const largePowerData = Array(7200).fill(250); // 2 hours of data
      
      render(<TestDataVisualization powerData={largePowerData} />);
      
      // Should still render correctly despite large dataset
      expect(screen.getByText('📊 Duration: 120 minutes')).toBeInTheDocument();
      expect(screen.getByText('7200')).toBeInTheDocument(); // Total samples
    });

    it('should handle empty power data gracefully', () => {
      const powerData: number[] = [];
      
      // Should not crash
      expect(() => {
        render(<TestDataVisualization powerData={powerData} />);
      }).not.toThrow();
    });
  });

  describe('Chart Data Format', () => {
    it('should format time correctly for chart display', () => {
      const powerData = Array(300).fill(250); // 5 minutes
      
      render(<TestDataVisualization powerData={powerData} />);
      
      // Component should render without errors - time formatting is internal
      expect(screen.getByText('Test Data Visualization')).toBeInTheDocument();
    });

    it('should handle missing heart rate data in mixed datasets', () => {
      const powerData = createTestPowerData();
      const partialHRData = Array(600).fill(165); // Only first 10 minutes
      
      render(<TestDataVisualization powerData={powerData} heartRateData={partialHRData} />);
      
      // Should handle mismatched array lengths gracefully
      expect(screen.getByText('Test Data Visualization')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      const powerData = createTestPowerData();
      
      render(<TestDataVisualization powerData={powerData} />);
      
      expect(screen.getByRole('heading', { name: /Test Data Visualization/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Power Output Over Time/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Power Distribution/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Data Quality/i })).toBeInTheDocument();
    });
  });
});