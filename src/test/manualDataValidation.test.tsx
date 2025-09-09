import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PowerInputForm } from '../components/PowerInputForm';

// Mock alert to capture validation errors
global.alert = vi.fn();

describe('Manual Data Validation Tests', () => {
  let mockOnAnalyze: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnAnalyze = vi.fn();
    vi.clearAllMocks();
  });

  describe('Exact Match Validation', () => {
    it('should accept exactly 20 values for 20-minute test', () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
      
      // Enter exactly 20 values
      const powerData = Array(20).fill(0).map((_, i) => 250 + i).join(', ');
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      fireEvent.change(textarea, { target: { value: powerData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      expect(mockOnAnalyze).toHaveBeenCalledTimes(1);
      expect(global.alert).not.toHaveBeenCalled();
      
      // Should expand to 1200 seconds (20 minutes * 60)
      const [expandedData] = mockOnAnalyze.mock.calls[0];
      expect(expandedData).toHaveLength(1200);
    });

    it('should accept exactly 8 values for 8-minute test', () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
      
      // Change to 8-minute test
      const durationSelect = screen.getByDisplayValue('20 minutes (Standard)');
      fireEvent.change(durationSelect, { target: { value: '8' } });
      
      // Enter exactly 8 values
      const powerData = '280, 275, 270, 265, 260, 255, 250, 245';
      const textarea = screen.getByPlaceholderText(/Enter 8 minute averages/);
      fireEvent.change(textarea, { target: { value: powerData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      expect(mockOnAnalyze).toHaveBeenCalledTimes(1);
      expect(global.alert).not.toHaveBeenCalled();
      
      // Should expand to 480 seconds (8 minutes * 60)
      const [expandedData] = mockOnAnalyze.mock.calls[0];
      expect(expandedData).toHaveLength(480);
    });
  });

  describe('Too Many Values - Truncation', () => {
    it('should truncate excess values for 20-minute test', () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
      
      // Enter 25 values (5 too many)
      const powerData = Array(25).fill(0).map((_, i) => 250 + i).join(', ');
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      fireEvent.change(textarea, { target: { value: powerData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Should proceed with warning message
      expect(mockOnAnalyze).toHaveBeenCalledTimes(1);
      expect(global.alert).toHaveBeenCalledWith(
        'Too much data provided. You entered 25 minutes of data for a 20-minute test. Truncated 5 excess values from the end.'
      );
      
      // Should still expand to exactly 1200 seconds (truncated to 20 minutes)
      const [expandedData] = mockOnAnalyze.mock.calls[0];
      expect(expandedData).toHaveLength(1200);
    });

    it('should truncate excess values for 8-minute test', () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
      
      // Change to 8-minute test
      const durationSelect = screen.getByDisplayValue('20 minutes (Standard)');
      fireEvent.change(durationSelect, { target: { value: '8' } });
      
      // Enter 12 values (4 too many)
      const powerData = Array(12).fill(0).map((_, i) => 280 - i * 2).join(', ');
      const textarea = screen.getByPlaceholderText(/Enter 8 minute averages/);
      fireEvent.change(textarea, { target: { value: powerData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Should proceed with warning message
      expect(mockOnAnalyze).toHaveBeenCalledTimes(1);
      expect(global.alert).toHaveBeenCalledWith(
        'Too much data provided. You entered 12 minutes of data for a 8-minute test. Truncated 4 excess values from the end.'
      );
      
      // Should expand to exactly 480 seconds (truncated to 8 minutes)
      const [expandedData] = mockOnAnalyze.mock.calls[0];
      expect(expandedData).toHaveLength(480);
    });
  });

  describe('Not Enough Values - Error Handling', () => {
    it('should show error for insufficient data in 20-minute test', () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
      
      // Enter only 15 values (5 short)
      const powerData = Array(15).fill(0).map((_, i) => 250 + i).join(', ');
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      fireEvent.change(textarea, { target: { value: powerData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Should show error and not proceed
      expect(mockOnAnalyze).not.toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith(
        'Not enough data for 20-minute test. You provided 15 minutes of data, but need 20 minutes. Missing 5 minutes of data.'
      );
    });

    it('should show error for insufficient data in 8-minute test', () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
      
      // Change to 8-minute test
      const durationSelect = screen.getByDisplayValue('20 minutes (Standard)');
      fireEvent.change(durationSelect, { target: { value: '8' } });
      
      // Enter only 5 values (3 short)
      const powerData = '280, 275, 270, 265, 260';
      const textarea = screen.getByPlaceholderText(/Enter 8 minute averages/);
      fireEvent.change(textarea, { target: { value: powerData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Should show error and not proceed
      expect(mockOnAnalyze).not.toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith(
        'Not enough data for 8-minute test. You provided 5 minutes of data, but need 8 minutes. Missing 3 minutes of data.'
      );
    });

    it('should handle singular vs plural correctly in error messages', () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
      
      // Change to 8-minute test and enter only 1 value
      const durationSelect = screen.getByDisplayValue('20 minutes (Standard)');
      fireEvent.change(durationSelect, { target: { value: '8' } });
      
      const powerData = '280';
      const textarea = screen.getByPlaceholderText(/Enter 8 minute averages/);
      fireEvent.change(textarea, { target: { value: powerData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Should show error with correct singular/plural
      expect(global.alert).toHaveBeenCalledWith(
        'Not enough data for 8-minute test. You provided 1 minute of data, but need 8 minutes. Missing 7 minutes of data.'
      );
    });

    it('should handle edge case of missing exactly 1 minute', () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
      
      // Change to 8-minute test and enter 7 values (1 short)
      const durationSelect = screen.getByDisplayValue('20 minutes (Standard)');
      fireEvent.change(durationSelect, { target: { value: '8' } });
      
      const powerData = '280, 275, 270, 265, 260, 255, 250';
      const textarea = screen.getByPlaceholderText(/Enter 8 minute averages/);
      fireEvent.change(textarea, { target: { value: powerData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Should show error with singular "minute"
      expect(global.alert).toHaveBeenCalledWith(
        'Not enough data for 8-minute test. You provided 7 minutes of data, but need 8 minutes. Missing 1 minute of data.'
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty input', () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
      
      // Button should be disabled when no data
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      expect(analyzeButton).toBeDisabled();
    });

    it('should handle invalid non-numeric values', () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
      
      // Enter mix of valid and invalid values
      const powerData = '250, invalid, 255, abc, 260';
      const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
      fireEvent.change(textarea, { target: { value: powerData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      // Should filter out invalid values and show error for insufficient data
      expect(mockOnAnalyze).not.toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith(
        'Not enough data for 20-minute test. You provided 3 minutes of data, but need 20 minutes. Missing 17 minutes of data.'
      );
    });

    it('should handle 8-minute test duration correctly', () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
      
      // Change to 8-minute test
      const durationSelect = screen.getByDisplayValue('20 minutes (Standard)');
      fireEvent.change(durationSelect, { target: { value: '8' } });
      
      // Enter correct number of values
      const powerData = Array(8).fill(0).map((_, i) => 250 + i).join(', ');
      const textarea = screen.getByPlaceholderText(new RegExp('Enter 8 minute averages'));
      fireEvent.change(textarea, { target: { value: powerData } });
      
      const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
      fireEvent.click(analyzeButton);
      
      expect(mockOnAnalyze).toHaveBeenCalledTimes(1);
      expect(global.alert).not.toHaveBeenCalled();
      
      // Should expand to correct number of seconds
      const [expandedData] = mockOnAnalyze.mock.calls[0];
      expect(expandedData).toHaveLength(480); // 8 * 60
    });
  });

  describe('UI Updates and Feedback', () => {
    it('should update placeholder text when duration changes', () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
      
      // Check initial placeholder
      expect(screen.getByPlaceholderText('Enter 20 minute averages: 280, 275, 270, 265...')).toBeInTheDocument();
      
      // Change to 8-minute test
      const durationSelect = screen.getByDisplayValue('20 minutes (Standard)');
      fireEvent.change(durationSelect, { target: { value: '8' } });
      
      // Check updated placeholder
      expect(screen.getByPlaceholderText('Enter 8 minute averages: 280, 275, 270, 265...')).toBeInTheDocument();
    });

    it('should update help text when duration changes', () => {
      render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
      
      // Check initial help text (text is within span)
      expect(screen.getByText('20 values')).toBeInTheDocument();
      
      // Change to 30-minute test
      const durationSelect = screen.getByDisplayValue('20 minutes (Standard)');
      fireEvent.change(durationSelect, { target: { value: '30' } });
      
      // Check updated help text
      expect(screen.getByText('30 values')).toBeInTheDocument();
    });
  });
});