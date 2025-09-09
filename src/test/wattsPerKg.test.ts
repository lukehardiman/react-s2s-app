import { describe, it, expect } from 'vitest';
import { calculateWattsPerKg, getPerformanceGrades, calculateStats } from '../utils/ftpAnalysis';

describe('Watts per Kg Analysis', () => {
  // Create test power data
  const createTestPowerData = (avgPower: number, length: number = 1200) => {
    return Array(length).fill(avgPower);
  };

  describe('calculateWattsPerKg', () => {
    it('should calculate basic watts per kg metrics correctly', () => {
      const powerData = createTestPowerData(250); // 250w average
      const stats = calculateStats(powerData);
      const riderWeight = 70; // 70kg rider
      
      const wattsPerKg = calculateWattsPerKg(stats, riderWeight);
      
      expect(wattsPerKg.classicFTPPerKg).toBeCloseTo(3.4, 1); // 238 / 70 = 3.4
      expect(wattsPerKg.normalizedFTPPerKg).toBeCloseTo(3.4, 1); // Same for steady power
      expect(wattsPerKg.averagePowerPerKg).toBeCloseTo(3.57, 2); // 250 / 70 = 3.57
      expect(wattsPerKg.maxPowerPerKg).toBeCloseTo(3.57, 2); // Same for steady power
    });

    it('should assign correct performance grades', () => {
      const powerData = createTestPowerData(300); // 300w average
      const stats = calculateStats(powerData);
      
      // Test different rider weights and expected grades (285w FTP)
      const testCases = [
        { weight: 50, expectedGrade: 'A', expectedCategory: 'Superior' }, // 5.7 w/kg
        { weight: 70, expectedGrade: 'B-', expectedCategory: 'Very Good' }, // 4.07 w/kg  
        { weight: 90, expectedGrade: 'D+', expectedCategory: 'Fair' }, // 3.17 w/kg
        { weight: 120, expectedGrade: 'D-', expectedCategory: 'Novice' } // 2.38 w/kg
      ];

      testCases.forEach(({ weight, expectedGrade, expectedCategory }) => {
        const wattsPerKg = calculateWattsPerKg(stats, weight);
        expect(wattsPerKg.grade).toBe(expectedGrade);
        expect(wattsPerKg.category).toBe(expectedCategory);
      });
    });

    it('should handle extreme values correctly', () => {
      const powerData = createTestPowerData(500); // Very high power
      const stats = calculateStats(powerData);
      
      // Elite level performance
      const eliteResult = calculateWattsPerKg(stats, 70);
      expect(eliteResult.grade).toBe('A+');
      expect(eliteResult.category).toBe('World Class');
      expect(eliteResult.percentile).toBe(99);
      
      // Very heavy rider with moderate power
      const heavyRiderResult = calculateWattsPerKg(stats, 150);
      expect(heavyRiderResult.classicFTPPerKg).toBeCloseTo(3.17, 1); // 475/150
      expect(heavyRiderResult.grade).toBe('D+'); // 3.17 w/kg falls in D+ range (3.0-3.2)
    });

    it('should handle low performance correctly', () => {
      const powerData = createTestPowerData(120); // Low power
      const stats = calculateStats(powerData);
      const riderWeight = 80;
      
      const wattsPerKg = calculateWattsPerKg(stats, riderWeight);
      
      expect(wattsPerKg.classicFTPPerKg).toBeCloseTo(1.43, 2); // 114/80
      expect(wattsPerKg.grade).toBe('F');
      expect(wattsPerKg.category).toBe('Untrained');
      expect(wattsPerKg.percentile).toBe(5);
    });
  });

  describe('Performance Grading System', () => {
    it('should have complete grade coverage', () => {
      const grades = getPerformanceGrades();
      
      expect(grades).toHaveLength(13); // F through A+
      expect(grades[0].grade).toBe('F');
      expect(grades[grades.length - 1].grade).toBe('A+');
      
      // Check grade progression
      const expectedGrades = ['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
      grades.forEach((grade, index) => {
        expect(grade.grade).toBe(expectedGrades[index]);
      });
    });

    it('should have non-overlapping ranges', () => {
      const grades = getPerformanceGrades();
      
      for (let i = 0; i < grades.length - 1; i++) {
        const current = grades[i];
        const next = grades[i + 1];
        
        expect(current.maxWattsPerKg).toBe(next.minWattsPerKg);
        expect(current.minWattsPerKg).toBeLessThan(current.maxWattsPerKg || Infinity);
      }
    });

    it('should have ascending percentiles', () => {
      const grades = getPerformanceGrades();
      
      for (let i = 0; i < grades.length - 1; i++) {
        expect(grades[i].percentile).toBeLessThan(grades[i + 1].percentile);
      }
    });

    it('should have meaningful descriptions', () => {
      const grades = getPerformanceGrades();
      
      grades.forEach(grade => {
        expect(grade.description).toBeTruthy();
        expect(grade.description.length).toBeGreaterThan(10);
        expect(grade.category).toBeTruthy();
      });
    });
  });

  describe('Real-world Performance Examples', () => {
    it('should correctly grade recreational cyclists', () => {
      const recreationalPower = createTestPowerData(200);
      const stats = calculateStats(recreationalPower);
      
      // Typical recreational cyclist: 70kg, 200w FTP
      const recreational = calculateWattsPerKg(stats, 70);
      expect(recreational.classicFTPPerKg).toBeCloseTo(2.71, 2);
      expect(recreational.grade).toBe('D');
      expect(recreational.category).toBe('Novice');
    });

    it('should correctly grade competitive cyclists', () => {
      const competitivePower = createTestPowerData(320);
      const stats = calculateStats(competitivePower);
      
      // Competitive cyclist: 70kg, 320w FTP
      const competitive = calculateWattsPerKg(stats, 70);
      expect(competitive.classicFTPPerKg).toBeCloseTo(4.34, 2);
      expect(competitive.grade).toBe('B');
      expect(competitive.category).toBe('Very Good');
    });

    it('should correctly grade elite cyclists', () => {
      const elitePower = createTestPowerData(400);
      const stats = calculateStats(elitePower);
      
      // Elite cyclist: 65kg, 400w FTP
      const elite = calculateWattsPerKg(stats, 65);
      expect(elite.classicFTPPerKg).toBeCloseTo(5.85, 2);
      expect(elite.grade).toBe('A');
      expect(elite.category).toBe('Superior');
    });

    it('should correctly grade world-class cyclists', () => {
      const worldClassPower = createTestPowerData(450);
      const stats = calculateStats(worldClassPower);
      
      // World-class cyclist: 68kg, 450w FTP
      const worldClass = calculateWattsPerKg(stats, 68);
      expect(worldClass.classicFTPPerKg).toBeCloseTo(6.29, 2);
      expect(worldClass.grade).toBe('A+');
      expect(worldClass.category).toBe('World Class');
      expect(worldClass.percentile).toBe(99);
    });
  });

  describe('Weight Variations', () => {
    it('should show how weight affects performance grade', () => {
      const powerData = createTestPowerData(280);
      const stats = calculateStats(powerData);
      
      const weights = [60, 70, 80, 90, 100];
      const results = weights.map(weight => ({
        weight,
        result: calculateWattsPerKg(stats, weight)
      }));
      
      // Verify decreasing w/kg with increasing weight
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].result.classicFTPPerKg).toBeGreaterThan(results[i + 1].result.classicFTPPerKg);
      }
      
      // Specific examples
      expect(results[0].result.classicFTPPerKg).toBeCloseTo(4.43, 2); // 60kg: 4.43 w/kg (B)
      expect(results[4].result.classicFTPPerKg).toBeCloseTo(2.66, 2); // 100kg: 2.66 w/kg (D-)
    });

    it('should handle fractional weights correctly', () => {
      const powerData = createTestPowerData(300);
      const stats = calculateStats(powerData);
      
      const wattsPerKg = calculateWattsPerKg(stats, 72.5);
      expect(wattsPerKg.classicFTPPerKg).toBeCloseTo(3.93, 2); // 285/72.5
      expect(wattsPerKg.grade).toBe('C+');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very low weight', () => {
      const powerData = createTestPowerData(200);
      const stats = calculateStats(powerData);
      
      const wattsPerKg = calculateWattsPerKg(stats, 30); // Minimum expected weight
      expect(wattsPerKg.classicFTPPerKg).toBeCloseTo(6.33, 2);
      expect(wattsPerKg.grade).toBe('A+');
    });

    it('should handle very high weight', () => {
      const powerData = createTestPowerData(200);
      const stats = calculateStats(powerData);
      
      const wattsPerKg = calculateWattsPerKg(stats, 200); // High weight
      expect(wattsPerKg.classicFTPPerKg).toBeCloseTo(0.95, 2);
      expect(wattsPerKg.grade).toBe('F');
    });

    it('should handle zero power gracefully', () => {
      const powerData = createTestPowerData(0);
      const stats = calculateStats(powerData);
      
      const wattsPerKg = calculateWattsPerKg(stats, 70);
      expect(wattsPerKg.classicFTPPerKg).toBe(0);
      expect(wattsPerKg.grade).toBe('F');
    });

    it('should maintain precision with decimal results', () => {
      const powerData = createTestPowerData(333);
      const stats = calculateStats(powerData);
      
      const wattsPerKg = calculateWattsPerKg(stats, 77.7);
      
      // Check that results are properly rounded to 2 decimal places
      expect(wattsPerKg.classicFTPPerKg.toString()).toMatch(/^\d+\.\d{2}$/);
      expect(wattsPerKg.normalizedFTPPerKg.toString()).toMatch(/^\d+\.\d{2}$/);
      expect(wattsPerKg.averagePowerPerKg.toString()).toMatch(/^\d+\.\d{2}$/);
      expect(wattsPerKg.maxPowerPerKg.toString()).toMatch(/^\d+\.\d{2}$/);
    });
  });
});