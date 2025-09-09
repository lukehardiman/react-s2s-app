import { describe, it, expect, vi } from 'vitest';
import { parseFitFile, isFitFile, fitToParseData } from '../utils/fitParser';

// Mock fit-file-parser since we can't easily create real FIT files in tests
vi.mock('fit-file-parser', () => {
  const mockFitParser = {
    parse: vi.fn()
  };
  
  return {
    default: vi.fn(() => mockFitParser)
  };
});

describe('FIT File Parser', () => {
  describe('isFitFile', () => {
    it('should identify .fit files correctly', () => {
      const fitFile = new File([''], 'test.fit', { type: 'application/octet-stream' });
      const csvFile = new File([''], 'test.csv', { type: 'text/csv' });
      const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
      
      expect(isFitFile(fitFile)).toBe(true);
      expect(isFitFile(csvFile)).toBe(false);
      expect(isFitFile(txtFile)).toBe(false);
    });

    it('should handle case insensitive extensions', () => {
      const fitFileUpper = new File([''], 'TEST.FIT', { type: 'application/octet-stream' });
      const fitFileMixed = new File([''], 'test.Fit', { type: 'application/octet-stream' });
      
      expect(isFitFile(fitFileUpper)).toBe(true);
      expect(isFitFile(fitFileMixed)).toBe(true);
    });

    it('should identify by mime type when extension is missing', () => {
      const fitFile = new File([''], 'workout', { type: 'application/octet-stream' });
      expect(isFitFile(fitFile)).toBe(true);
    });
  });

  describe('fitToParseData', () => {
    it('should convert FIT data to ParsedData format', () => {
      const fitData = {
        power: [250, 255, 245, 260],
        heartRate: [160, 162, 164, 165],
        cadence: [85, 87, 83, 88],
        time: [0, 1, 2, 3],
        metadata: {
          startTime: new Date(),
          duration: 3,
          deviceInfo: 'Garmin Edge 830',
          sport: 'cycling'
        }
      };

      const result = fitToParseData(fitData);

      expect(result.power).toEqual([250, 255, 245, 260]);
      expect(result.heartRate).toEqual([160, 162, 164, 165]);
      expect(result.time).toEqual([0, 1, 2, 3]);
    });

    it('should handle FIT data without heart rate', () => {
      const fitData = {
        power: [250, 255, 245],
        time: [0, 1, 2],
        metadata: {
          startTime: new Date(),
          duration: 2,
          deviceInfo: 'Unknown Device',
          sport: 'cycling'
        }
      };

      const result = fitToParseData(fitData);

      expect(result.power).toEqual([250, 255, 245]);
      expect(result.heartRate).toBeUndefined();
      expect(result.time).toEqual([0, 1, 2]);
    });
  });

  describe('parseFitFile integration', () => {
    it('should handle successful FIT parsing', async () => {
      const FitParser = await import('fit-file-parser');
      const mockParser = new FitParser.default();
      
      // Mock successful parsing
      mockParser.parse = vi.fn((buffer, callback) => {
        callback(null, {
          records: [
            { timestamp: new Date('2023-01-01T10:00:00Z'), power: 250, heart_rate: 160 },
            { timestamp: new Date('2023-01-01T10:00:01Z'), power: 255, heart_rate: 162 },
            { timestamp: new Date('2023-01-01T10:00:02Z'), power: 245, heart_rate: 164 }
          ],
          file_id: [{ manufacturer: 'Garmin', product: 'Edge 830' }],
          sport: [{ sport: 'cycling' }]
        });
      });

      const buffer = new ArrayBuffer(1024);
      const result = await parseFitFile(buffer);

      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 255, 245]);
      expect(result!.heartRate).toEqual([160, 162, 164]);
      expect(result!.time).toEqual([0, 1, 2]);
      expect(result!.metadata.deviceInfo).toBe('Garmin Edge 830');
      expect(result!.metadata.sport).toBe('cycling');
    });

    it('should handle FIT parsing errors gracefully', async () => {
      const FitParser = await import('fit-file-parser');
      const mockParser = new FitParser.default();
      
      // Mock parsing error
      mockParser.parse = vi.fn((buffer, callback) => {
        callback(new Error('Invalid FIT file'), null);
      });

      const buffer = new ArrayBuffer(1024);
      const result = await parseFitFile(buffer);

      expect(result).toBeNull();
    });

    it('should handle empty or invalid FIT data', async () => {
      const FitParser = await import('fit-file-parser');
      const mockParser = new FitParser.default();
      
      // Mock empty data
      mockParser.parse = vi.fn((buffer, callback) => {
        callback(null, { records: [] });
      });

      const buffer = new ArrayBuffer(1024);
      const result = await parseFitFile(buffer);

      expect(result).toBeNull();
    });

    it('should filter invalid power data', async () => {
      const FitParser = await import('fit-file-parser');
      const mockParser = new FitParser.default();
      
      // Mock data with invalid power values
      mockParser.parse = vi.fn((buffer, callback) => {
        callback(null, {
          records: [
            { timestamp: new Date('2023-01-01T10:00:00Z'), power: 250, heart_rate: 160 },
            { timestamp: new Date('2023-01-01T10:00:01Z'), power: -50, heart_rate: 162 }, // Invalid negative power
            { timestamp: new Date('2023-01-01T10:00:02Z'), power: undefined, heart_rate: 164 }, // Missing power
            { timestamp: new Date('2023-01-01T10:00:03Z'), power: 245, heart_rate: 0 } // Valid power, no HR
          ]
        });
      });

      const buffer = new ArrayBuffer(1024);
      const result = await parseFitFile(buffer);

      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 0, 0, 245]); // Invalid power becomes 0
      expect(result!.heartRate).toEqual([160, 162, 164, 0]); // Missing HR becomes 0
    });

    it('should calculate elapsed time correctly', async () => {
      const FitParser = await import('fit-file-parser');
      const mockParser = new FitParser.default();
      
      const startTime = new Date('2023-01-01T10:00:00Z');
      
      mockParser.parse = vi.fn((buffer, callback) => {
        callback(null, {
          records: [
            { timestamp: startTime, power: 250 },
            { timestamp: new Date(startTime.getTime() + 5000), power: 255 }, // +5 seconds
            { timestamp: new Date(startTime.getTime() + 10000), power: 245 } // +10 seconds
          ]
        });
      });

      const buffer = new ArrayBuffer(1024);
      const result = await parseFitFile(buffer);

      expect(result).not.toBeNull();
      expect(result!.time).toEqual([0, 5, 10]);
      expect(result!.metadata.duration).toBe(10);
      expect(result!.metadata.startTime).toEqual(startTime);
    });

    it('should handle records without timestamps', async () => {
      const FitParser = await import('fit-file-parser');
      const mockParser = new FitParser.default();
      
      mockParser.parse = vi.fn((buffer, callback) => {
        callback(null, {
          records: [
            { timestamp: new Date('2023-01-01T10:00:00Z'), power: 250 },
            { power: 255 }, // No timestamp - should be skipped
            { timestamp: new Date('2023-01-01T10:00:02Z'), power: 245 }
          ]
        });
      });

      const buffer = new ArrayBuffer(1024);
      const result = await parseFitFile(buffer);

      expect(result).not.toBeNull();
      expect(result!.power).toEqual([250, 245]); // Middle record skipped
      expect(result!.time).toEqual([0, 2]);
    });

    it('should handle files without valid power data', async () => {
      const FitParser = await import('fit-file-parser');
      const mockParser = new FitParser.default();
      
      mockParser.parse = vi.fn((buffer, callback) => {
        callback(null, {
          records: [
            { timestamp: new Date(), heart_rate: 160 }, // No power
            { timestamp: new Date(), heart_rate: 162 }  // No power
          ]
        });
      });

      const buffer = new ArrayBuffer(1024);
      const result = await parseFitFile(buffer);

      expect(result).toBeNull();
    });

    it('should parse device info from file_id', async () => {
      const FitParser = await import('fit-file-parser');
      const mockParser = new FitParser.default();
      
      mockParser.parse = vi.fn((buffer, callback) => {
        callback(null, {
          records: [
            { timestamp: new Date(), power: 250 }
          ],
          file_id: [{ manufacturer: 'Wahoo', product: 'KICKR' }]
        });
      });

      const buffer = new ArrayBuffer(1024);
      const result = await parseFitFile(buffer);

      expect(result).not.toBeNull();
      expect(result!.metadata.deviceInfo).toBe('Wahoo KICKR');
    });

    it('should handle missing metadata gracefully', async () => {
      const FitParser = await import('fit-file-parser');
      const mockParser = new FitParser.default();
      
      mockParser.parse = vi.fn((buffer, callback) => {
        callback(null, {
          records: [
            { timestamp: new Date(), power: 250 }
          ]
          // No file_id or sport data
        });
      });

      const buffer = new ArrayBuffer(1024);
      const result = await parseFitFile(buffer);

      expect(result).not.toBeNull();
      expect(result!.metadata.deviceInfo).toBe('Unknown Device');
      expect(result!.metadata.sport).toBe('cycling');
    });
  });
});