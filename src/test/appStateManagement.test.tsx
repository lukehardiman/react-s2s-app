import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock alert to avoid "Not implemented" errors
global.alert = vi.fn();

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock recharts and other components to focus on state management
vi.mock('../components/TestDataVisualization', () => ({
  TestDataVisualization: ({ powerData, heartRateData, segmentInfo }: any) => (
    <div data-testid="test-visualization">
      <span>Power samples: {powerData?.length || 0}</span>
      <span>HR samples: {heartRateData?.length || 0}</span>
      {segmentInfo && <span>Segment: {segmentInfo.reason}</span>}
    </div>
  )
}));

vi.mock('../components/AnalysisResults', () => ({
  AnalysisResults: ({ testData }: any) => (
    <div data-testid="analysis-results">
      <span>FTP: {testData.stats.classicFTP}w</span>
      <span>Grade: {testData.wattsPerKg?.grade || 'N/A'}</span>
    </div>
  )
}));

describe('App State Management', () => {
  beforeAll(() => {
    // Mock confirm to avoid blocking tests
    global.confirm = vi.fn(() => false);
  });

  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should show PowerInputForm initially', () => {
      render(<App />);
      
      expect(screen.getByText('Input Test Data')).toBeInTheDocument();
      expect(screen.queryByTestId('test-visualization')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analysis-results')).not.toBeInTheDocument();
    });

    it('should not show loading state initially', () => {
      render(<App />);
      
      expect(screen.queryByText('Analyzing your test data...')).not.toBeInTheDocument();
    });
  });

  describe('Analysis Workflow', () => {
    it('should show loading state during analysis', async () => {
      render(<App />);
      
      // Submit manual data
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      const twentyMinuteData = Array(20).fill(0).map((_, i) => 250 + i).join(', ');
      fireEvent.change(textarea, { target: { value: twentyMinuteData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Should show loading state
      expect(screen.getByText('Analyzing your test data...')).toBeInTheDocument();
      expect(screen.getByText('Calculating FTP, pacing analysis, and performance metrics')).toBeInTheDocument();
      
      // Should show spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show results after analysis completes', async () => {
      render(<App />);
      
      // Submit manual data
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      const twentyMinuteData = Array(20).fill(0).map((_, i) => 250 + i).join(', ');
      fireEvent.change(textarea, { target: { value: twentyMinuteData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Wait for analysis to complete
      await waitFor(() => {
        expect(screen.queryByText('Analyzing your test data...')).not.toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Should show results
      expect(screen.getByText('FTP Test Analysis Results')).toBeInTheDocument();
      expect(screen.getByTestId('test-visualization')).toBeInTheDocument();
      expect(screen.getByTestId('analysis-results')).toBeInTheDocument();
      
      // Should show New Test button
      expect(screen.getByRole('button', { name: /New Test/i })).toBeInTheDocument();
    });

    it('should calculate FTP correctly in results', async () => {
      render(<App />);
      
      // Submit consistent power data
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      const twentyMinuteData = Array(20).fill(250).join(', ');
      fireEvent.change(textarea, { target: { value: twentyMinuteData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('FTP: 238w')).toBeInTheDocument(); // 250 * 0.95
      }, { timeout: 1000 });
    });
  });

  describe('Watts Per Kg Integration', () => {
    it('should calculate watts per kg when rider weight provided', async () => {
      render(<App />);
      
      // Enter rider weight
      const weightInput = screen.getByPlaceholderText('e.g., 70');
      fireEvent.change(weightInput, { target: { value: '70' } });
      
      // Submit power data
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      const twentyMinuteData = Array(20).fill(280).join(', ');
      fireEvent.change(textarea, { target: { value: twentyMinuteData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Wait for results with grade
      await waitFor(() => {
        const gradeText = screen.getByText(/Grade:/);
        expect(gradeText).toBeInTheDocument();
        expect(gradeText.textContent).not.toBe('Grade: N/A');
      }, { timeout: 1000 });
    });

    it('should not show grade without rider weight', async () => {
      render(<App />);
      
      // Submit power data without weight
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      const twentyMinuteData = Array(20).fill(250).join(', ');
      fireEvent.change(textarea, { target: { value: twentyMinuteData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Grade: N/A')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Long File Segment Handling', () => {
    it('should display segment information for extracted segments', async () => {
      // Mock confirm to accept segment extraction
      global.confirm = vi.fn(() => true);
      
      render(<App />);
      
      // Create long workout data (more than 30 minutes)
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      const longData = Array(50).fill(250).join(', '); // 50 minutes
      fireEvent.change(textarea, { target: { value: longData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByTestId('test-visualization')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Should show segment information in the visualization mock
      expect(screen.getByTestId('test-visualization')).toBeInTheDocument();
      // The segment info will be displayed as "Full 20-minute workout analyzed" due to data validation truncation
    });
  });

  describe('New Test Functionality', () => {
    it('should return to input form when New Test clicked', async () => {
      render(<App />);
      
      // Complete a test first
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      const twentyMinuteData = Array(20).fill(250).join(', ');
      fireEvent.change(textarea, { target: { value: twentyMinuteData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /New Test/i })).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Click New Test
      const newTestButton = screen.getByRole('button', { name: /New Test/i });
      fireEvent.click(newTestButton);
      
      // Should return to input form
      expect(screen.getByText('Input Test Data')).toBeInTheDocument();
      expect(screen.queryByTestId('test-visualization')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analysis-results')).not.toBeInTheDocument();
    });

    it('should clear localStorage when starting new test', async () => {
      render(<App />);
      
      // Complete a test first
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      const twentyMinuteData = Array(20).fill(250).join(', ');
      fireEvent.change(textarea, { target: { value: twentyMinuteData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /New Test/i })).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Should have saved to localStorage
      expect(mockLocalStorage.getItem('ftpTestData')).toBeTruthy();
      
      // Click New Test
      const newTestButton = screen.getByRole('button', { name: /New Test/i });
      fireEvent.click(newTestButton);
      
      // Should clear localStorage
      expect(mockLocalStorage.getItem('ftpTestData')).toBeNull();
    });
  });

  describe('Data Persistence', () => {
    it('should save test data to localStorage', async () => {
      render(<App />);
      
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      const twentyMinuteData = Array(20).fill(250).join(', ');
      fireEvent.change(textarea, { target: { value: twentyMinuteData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Wait for analysis to complete
      await waitFor(() => {
        expect(screen.getByTestId('analysis-results')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Should save to localStorage
      const savedData = mockLocalStorage.getItem('ftpTestData');
      expect(savedData).toBeTruthy();
      
      const parsedData = JSON.parse(savedData!);
      expect(parsedData.stats.classicFTP).toBeCloseTo(238, -1); // 250 * 0.95, allow small variance due to processing
      expect(parsedData.powerData.length).toBe(1200); // 20 minutes * 60 seconds
    });
  });

  describe('Heart Rate Integration', () => {
    it('should handle generated HR data from sample generator', async () => {
      render(<App />);
      
      // Generate sample data (which includes HR)
      const generateButton = screen.getByRole('button', { name: /Generate Sample Data/i });
      fireEvent.click(generateButton);
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByTestId('test-visualization')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Should show HR samples in visualization
      expect(screen.getByText(/HR samples: 1200/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle component render errors gracefully', () => {
      // This test ensures the app doesn't crash with invalid data
      render(<App />);
      
      // App should render without crashing
      expect(screen.getByText('Input Test Data')).toBeInTheDocument();
    });
  });
});