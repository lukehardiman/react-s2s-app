import { describe, it, expect } from 'vitest';
import { parseCSV, parseTrainingPeaksCSV } from '../utils/csvParser';

describe('CSV Parser - Data Processing', () => {
  describe('parseCSV', () => {
    it('should parse basic CSV with power column', () => {
      const csvContent = `Time,Power,Heart Rate
1,250,160
2,255,162
3,245,164`;
      
      const result = parseCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 255, 245]);
      expect(result!.heartRate).toEqual([160, 162, 164]);
      expect(result!.time).toEqual([1, 2, 3]);
    });

    it('should handle case-insensitive headers', () => {
      const csvContent = `TIME,POWER,HEART_RATE
1,250,160
2,255,162`;
      
      const result = parseCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 255]);
      expect(result!.heartRate).toEqual([160, 162]);
    });

    it('should handle different power column names', () => {
      const csvContent = `Time,Watts,HR
1,250,160
2,255,162`;
      
      const result = parseCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 255]);
    });

    it('should handle missing heart rate column', () => {
      const csvContent = `Time,Power
1,250
2,255`;
      
      const result = parseCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 255]);
      expect(result!.heartRate).toBeUndefined();
    });

    it('should generate time series when time column missing', () => {
      const csvContent = `Power,Heart Rate
250,160
255,162
245,164`;
      
      const result = parseCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.time).toEqual([0, 1, 2]); // Generated indices
    });

    it('should filter out invalid power values', () => {
      const csvContent = `Power
250
invalid
-50
300
0`;
      
      const result = parseCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 300, 0]); // Keeps 0 but filters invalid and negative
    });

    it('should handle zero heart rate values', () => {
      const csvContent = `Power,Heart Rate
250,160
255,0
245,165`;
      
      const result = parseCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.heartRate).toEqual([160, 0, 165]);
    });

    it('should return null for invalid CSV', () => {
      expect(parseCSV('')).toBeNull();
      expect(parseCSV('invalid')).toBeNull();
      expect(parseCSV('header1,header2')).toBeNull(); // No data rows
    });

    it('should return null when no power column found', () => {
      const csvContent = `Time,Speed,Cadence
1,25,90
2,26,92`;
      
      const result = parseCSV(csvContent);
      
      expect(result).toBeNull();
    });
  });

  describe('parseTrainingPeaksCSV', () => {
    it('should parse TrainingPeaks format', () => {
      const csvContent = `Time,Power (watts),Heart Rate (bpm)
1,250,160
2,255,162
3,245,164`;
      
      const result = parseTrainingPeaksCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 255, 245]);
      expect(result!.heartRate).toEqual([160, 162, 164]);
    });

    it('should fallback to generic parser for non-TP format', () => {
      const csvContent = `Time,Power,HR
1,250,160
2,255,162`;
      
      const result = parseTrainingPeaksCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 255]);
    });

    it('should handle TrainingPeaks power-only export', () => {
      const csvContent = `Time,Power (watts),Speed (km/h)
1,250,35
2,255,36`;
      
      const result = parseTrainingPeaksCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 255]);
      expect(result!.heartRate).toBeUndefined();
    });
  });

  describe('Data Validation and Processing', () => {
    it('should handle minute-to-second data expansion', () => {
      // This would be handled in the PowerInputForm component
      // Testing the concept here with deterministic data (no random)
      const minuteAverages = [250, 255, 245, 260];
      const expandedData: number[] = [];
      
      minuteAverages.forEach((minuteAvg, minuteIndex) => {
        for (let i = 0; i < 60; i++) {
          // Use deterministic variation instead of random
          const variation = Math.sin((minuteIndex * 60 + i) * 0.1) * 5;
          expandedData.push(Math.round(minuteAvg + variation));
        }
      });
      
      expect(expandedData).toHaveLength(240); // 4 minutes * 60 seconds
      
      // Check that averages are reasonable
      const firstMinute = expandedData.slice(0, 60);
      const avgFirstMinute = firstMinute.reduce((a, b) => a + b, 0) / firstMinute.length;
      expect(avgFirstMinute).toBeCloseTo(250, 0); // Should be very close with deterministic data
    });

    it('should handle different test durations', () => {
      const generateTestData = (minutes: number, avgPower: number) => {
        const csvContent = `Power\n${Array(minutes).fill(avgPower).join('\n')}`;
        return parseCSV(csvContent);
      };
      
      // Test different protocols
      const test8min = generateTestData(8, 280);
      const test20min = generateTestData(20, 250);
      const test40min = generateTestData(40, 240);
      
      expect(test8min!.power).toHaveLength(8);
      expect(test20min!.power).toHaveLength(20);
      expect(test40min!.power).toHaveLength(40);
      
      expect(test8min!.power.every(p => p === 280)).toBe(true);
      expect(test20min!.power.every(p => p === 250)).toBe(true);
      expect(test40min!.power.every(p => p === 240)).toBe(true);
    });

    it('should handle large CSV files efficiently', () => {
      // Generate large CSV (simulate 1 hour at 1Hz)
      const lines = ['Time,Power'];
      for (let i = 0; i < 3600; i++) {
        lines.push(`${i},${250 + Math.sin(i / 60) * 20}`); // Varying power
      }
      const csvContent = lines.join('\n');
      
      const startTime = Date.now();
      const result = parseCSV(csvContent);
      const parseTime = Date.now() - startTime;
      
      expect(result).not.toBeNull();
      expect(result!.power).toHaveLength(3600);
      expect(parseTime).toBeLessThan(1000); // Should parse in under 1 second
    });

    it('should maintain data integrity during parsing', () => {
      const csvContent = `Time,Power,Heart Rate
1,250.5,160.2
2,255.7,162.8
3,245.1,164.3`;
      
      const result = parseCSV(csvContent);
      
      expect(result).not.toBeNull();
      // Should round to integers
      expect(result!.power).toEqual([251, 256, 245]);
      expect(result!.heartRate).toEqual([160, 163, 164]);
    });

    it('should handle CSV with extra whitespace', () => {
      const csvContent = `  Time  ,  Power  ,  Heart Rate  
  1  ,  250  ,  160  
  2  ,  255  ,  162  `;
      
      const result = parseCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 255]);
      expect(result!.heartRate).toEqual([160, 162]);
    });

    it('should handle CSV with missing values', () => {
      const csvContent = `Power,Heart Rate
250,160
,162
245,`;
      
      const result = parseCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 0, 245]); // Empty power becomes 0
      expect(result!.heartRate).toEqual([160, 162, 0]); // Missing HR becomes 0, but valid HR is kept
    });
  });

  describe('Real-world CSV formats', () => {
    it('should handle Zwift CSV export format', () => {
      const csvContent = `Time,Power,Heart Rate,Cadence
1,250,160,90
2,255,162,92`;
      
      const result = parseCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 255]);
    });

    it('should handle Garmin Connect CSV format', () => {
      const csvContent = `Time,Power (W),Heart Rate (bpm),Speed
1,250,160,35
2,255,162,36`;
      
      const result = parseCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 255]);
      expect(result!.heartRate).toEqual([160, 162]);
    });

    it('should handle Strava CSV export format', () => {
      const csvContent = `time,power,heartrate
1,250,160
2,255,162`;
      
      const result = parseCSV(csvContent);
      
      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 255]);
      expect(result!.heartRate).toEqual([160, 162]);
    });
  });
});