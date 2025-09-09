import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PowerInputForm } from '../components/PowerInputForm';

describe('Sample HR Data Generator', () => {
  let mockOnAnalyze: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnAnalyze = vi.fn();
    vi.clearAllMocks();
  });

  it('should generate heart rate data with sample power data', () => {
    render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
    
    // Generate sample data
    const generateButton = screen.getByRole('button', { name: /Generate Sample Data/i });
    fireEvent.click(generateButton);
    
    // Should show HR data indicator
    expect(screen.getByText(/✓ Includes heart rate data/)).toBeInTheDocument();
    expect(screen.getByText(/samples\)/)).toBeInTheDocument();
    
    // Should populate power data in textarea
    const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
    expect(textarea.value).toBeTruthy();
    expect(textarea.value.split(',').length).toBe(20); // 20 minute averages
  });

  it('should include HR data when analyzing sample data', () => {
    render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
    
    // Generate sample data
    const generateButton = screen.getByRole('button', { name: /Generate Sample Data/i });
    fireEvent.click(generateButton);
    
    // Submit the analysis
    const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
    fireEvent.click(analyzeButton);
    
    // Should have been called with HR data
    expect(mockOnAnalyze).toHaveBeenCalledTimes(1);
    const [powerData, heartRateData] = mockOnAnalyze.mock.calls[0];
    
    expect(powerData).toHaveLength(1200); // 20 minutes * 60 seconds
    expect(heartRateData).toHaveLength(1200); // Same length HR data
    expect(heartRateData).toBeTruthy();
    
    // HR data should be realistic (120-185 bpm range)
    heartRateData.forEach((hr: number) => {
      expect(hr).toBeGreaterThanOrEqual(120);
      expect(hr).toBeLessThanOrEqual(185);
      expect(Number.isInteger(hr)).toBe(true);
    });
  });

  it('should clear HR data when manually editing power data', () => {
    render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
    
    // Generate sample data first
    const generateButton = screen.getByRole('button', { name: /Generate Sample Data/i });
    fireEvent.click(generateButton);
    
    // Verify HR indicator is shown
    expect(screen.getByText(/✓ Includes heart rate data/)).toBeInTheDocument();
    
    // Edit the textarea
    const textarea = screen.getByPlaceholderText(/Enter 20 minute averages/);
    fireEvent.change(textarea, { target: { value: '250, 255, 245' } });
    
    // HR indicator should be gone
    expect(screen.queryByText(/✓ Includes heart rate data/)).not.toBeInTheDocument();
    
    // Now submit - should not have HR data
    const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
    fireEvent.click(analyzeButton);
    
    expect(mockOnAnalyze).not.toHaveBeenCalled(); // Should fail validation (not enough data)
  });

  it('should generate different HR patterns for different durations', () => {
    render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
    
    // Test 8-minute duration
    const durationSelect = screen.getByDisplayValue('20 minutes (Standard)');
    fireEvent.change(durationSelect, { target: { value: '8' } });
    
    const generateButton = screen.getByRole('button', { name: /Generate Sample Data/i });
    fireEvent.click(generateButton);
    
    // Should show correct sample count
    expect(screen.getByText(/480 samples\)/)).toBeInTheDocument(); // 8 * 60
    
    // Submit and check
    const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
    fireEvent.click(analyzeButton);
    
    const [powerData, heartRateData] = mockOnAnalyze.mock.calls[0];
    expect(powerData).toHaveLength(480);
    expect(heartRateData).toHaveLength(480);
  });

  it('should generate realistic HR patterns with initial ramp and drift', () => {
    render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
    
    // Generate sample data
    const generateButton = screen.getByRole('button', { name: /Generate Sample Data/i });
    fireEvent.click(generateButton);
    
    const analyzeButton = screen.getByRole('button', { name: /Analyze Test/i });
    fireEvent.click(analyzeButton);
    
    const [, heartRateData] = mockOnAnalyze.mock.calls[0];
    
    // Check initial ramp-up (first 2 minutes should be lower than steady state)
    const initialMinute = heartRateData.slice(0, 60);
    const midTest = heartRateData.slice(600, 660); // 10th minute
    const avgInitial = initialMinute.reduce((a: number, b: number) => a + b, 0) / initialMinute.length;
    const avgMid = midTest.reduce((a: number, b: number) => a + b, 0) / midTest.length;
    
    // Should ramp up from initial to mid-test
    expect(avgMid).toBeGreaterThan(avgInitial);
    
    // Check for upward drift over time
    const earlyTest = heartRateData.slice(300, 360); // 5th minute
    const lateTest = heartRateData.slice(1020, 1080); // 17th minute
    const avgEarly = earlyTest.reduce((a: number, b: number) => a + b, 0) / earlyTest.length;
    const avgLate = lateTest.reduce((a: number, b: number) => a + b, 0) / lateTest.length;
    
    // Should show cardiac drift (HR increase over time)
    expect(avgLate).toBeGreaterThanOrEqual(avgEarly);
  });

  it('should not interfere with CSV upload mode', () => {
    render(<PowerInputForm onAnalyze={mockOnAnalyze} />);
    
    // Switch to CSV mode
    const csvRadio = screen.getByLabelText('CSV Upload');
    fireEvent.click(csvRadio);
    
    // Generate Sample Data button should not be visible
    expect(screen.queryByRole('button', { name: /Generate Sample Data/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/✓ Includes heart rate data/)).not.toBeInTheDocument();
  });
});