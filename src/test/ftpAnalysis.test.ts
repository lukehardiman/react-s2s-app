import { describe, it, expect } from 'vitest';
import { calculateStats, analyzePacing, calculateHeartRateStats } from '../utils/ftpAnalysis';

describe('FTP Analysis - Core Calculations', () => {
  describe('calculateStats', () => {
    it('should calculate average power correctly', () => {
      const powerData = [250, 255, 245, 260, 240];
      const stats = calculateStats(powerData);
      expect(stats.average).toBe(250); // (250+255+245+260+240)/5 = 250
    });

    it('should calculate classic FTP as 95% of average', () => {
      const powerData = [250, 250, 250, 250, 250];
      const stats = calculateStats(powerData);
      expect(stats.classicFTP).toBe(238); // 250 * 0.95 = 237.5, rounded = 238
    });

    it('should calculate normalized power for steady power', () => {
      // Create 5 minutes of steady 250w (300 seconds)
      const powerData = new Array(300).fill(250);
      const stats = calculateStats(powerData);
      expect(stats.normalized).toBe(250); // Should be same as average for steady power
      expect(stats.variabilityIndex).toBe('1.000'); // VI should be 1.0 for steady power
    });

    it('should calculate normalized power for variable power', () => {
      // Create variable power profile
      const powerData = [
        ...new Array(150).fill(300), // 2.5min at 300w
        ...new Array(150).fill(200)  // 2.5min at 200w
      ];
      const stats = calculateStats(powerData);
      
      expect(stats.average).toBe(250); // (300*150 + 200*150)/300 = 250
      expect(stats.normalized).toBeGreaterThan(250); // NP should be higher than avg for variable power
      expect(parseFloat(stats.variabilityIndex)).toBeGreaterThan(1.0); // VI > 1.0 for variable power
    });

    it('should calculate standard deviation correctly', () => {
      const powerData = [240, 250, 260]; // Perfect spread around 250
      const stats = calculateStats(powerData);
      expect(stats.stdDev).toBe(8); // std dev of [240,250,260] ≈ 8.16, rounded = 8
    });

    it('should handle max and min values', () => {
      const powerData = [100, 200, 300, 150, 250];
      const stats = calculateStats(powerData);
      expect(stats.max).toBe(300);
      expect(stats.min).toBe(100);
    });

    it('should calculate normalized FTP as 95% of normalized power', () => {
      const powerData = new Array(300).fill(260);
      const stats = calculateStats(powerData);
      expect(stats.normalizedFTP).toBe(247); // 260 * 0.95 = 247
    });
  });
});

describe('FTP Analysis - Pacing Analysis', () => {
  describe('analyzePacing', () => {
    it('should detect excellent pacing (minimal fade)', () => {
      // Steady power throughout test
      const powerData = new Array(1200).fill(250); // 20 minutes at 250w
      const pacing = analyzePacing(powerData);
      
      expect(pacing.score).toBe(100);
      expect(parseFloat(pacing.fadePct)).toBeLessThan(1);
      expect(pacing.insights).toHaveLength(1);
      expect(pacing.insights[0].type).toBe('success');
      expect(pacing.insights[0].message).toContain('Excellent pacing strategy');
    });

    it('should detect significant power fade', () => {
      // Strong start, weak finish
      const firstQuarter = new Array(300).fill(300);  // 300w for first quarter
      const restOfTest = new Array(900).fill(220);    // 220w for rest
      const powerData = [...firstQuarter, ...restOfTest];
      
      const pacing = analyzePacing(powerData);
      
      expect(pacing.score).toBeLessThan(70); // Should be heavily penalized
      expect(parseFloat(pacing.fadePct)).toBeGreaterThan(10);
      expect(pacing.insights.some(i => i.type === 'error')).toBe(true);
      expect(pacing.insights.some(i => i.message.includes('Significant power fade'))).toBe(true);
    });

    it('should detect negative split (getting stronger)', () => {
      // Easy start, strong finish
      const firstQuarter = new Array(300).fill(220);  // 220w for first quarter
      const restOfTest = new Array(900).fill(260);    // 260w for rest
      const powerData = [...firstQuarter, ...restOfTest];
      
      const pacing = analyzePacing(powerData);
      
      expect(parseFloat(pacing.fadePct)).toBeLessThan(-3);
      expect(pacing.insights.some(i => i.message.includes('Negative split detected'))).toBe(true);
    });

    it('should detect high power variability', () => {
      // Very spiky power - more extreme variability
      const powerData: number[] = [];
      for (let i = 0; i < 1200; i++) {
        powerData.push(i % 2 === 0 ? 350 : 150); // Alternating 350w/150w (more extreme)
      }
      
      const pacing = analyzePacing(powerData);
      
      expect(pacing.score).toBeLessThanOrEqual(80); // Should be penalized for variability (allow exactly 80)
      expect(pacing.insights.some(i => i.message.includes('power variability'))).toBe(true);
    });

    it('should estimate watts lost from poor pacing', () => {
      // Poor pacing: start way too hard to trigger watts lost logic
      const firstQuarter = new Array(300).fill(320);  // 320w for first quarter  
      const restOfTest = new Array(900).fill(240);    // 240w for rest (much lower)
      const powerData = [...firstQuarter, ...restOfTest];
      
      const pacing = analyzePacing(powerData);
      
      expect(pacing.wattsLost).toBeGreaterThan(0);
      // Check for either "watts lost" or "Estimated" in insights
      expect(pacing.insights.some(i => 
        i.message.includes('watts lost') || i.message.includes('Estimated')
      )).toBe(true);
    });

    it('should provide specific power recommendations', () => {
      // Test that started too hard
      const firstQuarter = new Array(300).fill(280);  // 280w
      const restOfTest = new Array(900).fill(240);    // 240w
      const powerData = [...firstQuarter, ...restOfTest];
      
      const pacing = analyzePacing(powerData);
      
      const errorInsight = pacing.insights.find(i => i.type === 'error');
      expect(errorInsight?.recommendation).toMatch(/Start \d+w next time/);
    });
  });
});

describe('FTP Analysis - Heart Rate Analysis', () => {
  describe('calculateHeartRateStats', () => {
    it('should calculate basic HR statistics', () => {
      const hrData = [160, 165, 170, 175, 180];
      const powerData = [250, 250, 250, 250, 250];
      
      const hrStats = calculateHeartRateStats(hrData, powerData);
      
      expect(hrStats.average).toBe(170);
      expect(hrStats.max).toBe(180);
      expect(hrStats.min).toBe(160);
      expect(hrStats.lthr).toBe(170); // Approximated as average
    });

    it('should calculate HR drift correctly', () => {
      // HR increases over time while power stays steady
      const hrData = [
        ...new Array(300).fill(160), // First quarter: 160 bpm
        ...new Array(600).fill(165), // Middle: 165 bpm
        ...new Array(300).fill(175)  // Last quarter: 175 bpm
      ];
      const powerData = new Array(1200).fill(250);
      
      const hrStats = calculateHeartRateStats(hrData, powerData);
      
      expect(hrStats.hrDrift).toBeGreaterThan(5); // Should show significant drift
    });

    it('should calculate cardiac drift (HR/power relationship)', () => {
      // HR increases while power decreases
      const hrData = [
        ...new Array(600).fill(160), // First half: 160 bpm
        ...new Array(600).fill(170)  // Second half: 170 bpm
      ];
      const powerData = [
        ...new Array(600).fill(270), // First half: 270w
        ...new Array(600).fill(240)  // Second half: 240w (30w drop)
      ];
      
      const hrStats = calculateHeartRateStats(hrData, powerData);
      
      expect(hrStats.cardiacDrift).toBeGreaterThan(0); // HR up, power down = positive drift
      expect(hrStats.cardiacDrift).toBeCloseTo(0.33, 1); // 10 bpm / 30w ≈ 0.33
    });

    it('should handle invalid HR data (zeros)', () => {
      const hrData = [0, 160, 0, 165, 0, 170];
      const powerData = [250, 250, 250, 250, 250, 250];
      
      const hrStats = calculateHeartRateStats(hrData, powerData);
      
      expect(hrStats.average).toBe(165); // Should ignore zeros
      expect(hrStats.min).toBe(160); // Should ignore zeros
    });
  });
});

describe('FTP Analysis - Edge Cases', () => {
  it('should handle very short tests', () => {
    const powerData = [250, 255, 245]; // Only 3 seconds
    const stats = calculateStats(powerData);
    
    expect(stats.average).toBe(250);
    expect(stats.classicFTP).toBe(238);
    // Should not crash on short normalized power calculation
    expect(stats.normalized).toBeGreaterThan(0);
  });

  it('should handle all identical values', () => {
    const powerData = new Array(1200).fill(250);
    const stats = calculateStats(powerData);
    
    expect(stats.average).toBe(250);
    expect(stats.normalized).toBe(250);
    expect(stats.variabilityIndex).toBe('1.000');
    expect(stats.stdDev).toBe(0);
  });

  it('should handle zero power values', () => {
    const powerData = [0, 250, 0, 250, 0];
    const stats = calculateStats(powerData);
    
    expect(stats.average).toBe(100); // (0+250+0+250+0)/5 = 100
    expect(stats.min).toBe(0);
  });

  it('should handle unrealistic power spikes', () => {
    const powerData = [250, 250, 2000, 250, 250]; // 2000w spike
    const stats = calculateStats(powerData);
    
    expect(stats.max).toBe(2000);
    expect(stats.average).toBe(600); // Should include the spike
    // For very short data, NP calculation falls back to average
    expect(stats.normalized).toBeGreaterThanOrEqual(stats.average); // NP >= average (could be equal for short data)
  });

  it('should handle empty power data gracefully', () => {
    expect(() => calculateStats([])).toThrow();
  });

  it('should validate pacing analysis bounds', () => {
    // Test that generates extreme fade
    const firstQuarter = new Array(300).fill(400);  // Unrealistic start
    const restOfTest = new Array(900).fill(100);    // Crash and burn
    const powerData = [...firstQuarter, ...restOfTest];
    
    const pacing = analyzePacing(powerData);
    
    expect(pacing.score).toBeGreaterThanOrEqual(0);   // Never below 0
    expect(pacing.score).toBeLessThanOrEqual(100);    // Never above 100
    expect(parseFloat(pacing.fadePct)).toBeGreaterThan(50); // Should show massive fade
  });
});

describe('FTP Analysis - Business Logic Validation', () => {
  it('should generate reasonable FTP estimates for typical cyclist', () => {
    // Simulate typical recreational cyclist test
    const powerData = new Array(1200).fill(220); // 20 min @ 220w
    const stats = calculateStats(powerData);
    
    expect(stats.classicFTP).toBe(209); // 220 * 0.95
    expect(stats.classicFTP).toBeGreaterThan(100); // Minimum reasonable FTP
    expect(stats.classicFTP).toBeLessThan(500);    // Maximum reasonable FTP
  });

  it('should generate appropriate recommendations for different test durations', () => {
    // 8-minute test (higher intensity)
    const shortTestData = new Array(480).fill(280); // 8 min @ 280w
    const shortStats = calculateStats(shortTestData);
    
    // 40-minute test (lower intensity)  
    const longTestData = new Array(2400).fill(240); // 40 min @ 240w
    const longStats = calculateStats(longTestData);
    
    expect(shortStats.classicFTP).toBe(266); // 280 * 0.95
    expect(longStats.classicFTP).toBe(228);  // 240 * 0.95
    
    // Both should be reasonable
    expect(shortStats.classicFTP).toBeGreaterThan(200);
    expect(longStats.classicFTP).toBeGreaterThan(200);
  });

  it('should handle protocol-specific power profiles', () => {
    // Ramp test simulation (increasing power)
    const rampData: number[] = [];
    for (let i = 0; i < 1200; i++) {
      rampData.push(200 + Math.floor(i / 60) * 10); // +10w per minute
    }
    
    const stats = calculateStats(rampData);
    
    expect(stats.average).toBeGreaterThan(200);
    expect(stats.normalized).toBeGreaterThan(stats.average); // Variable power inflates NP
    expect(parseFloat(stats.variabilityIndex)).toBeGreaterThan(1.0);
  });

  it('should provide bounded recommendations', () => {
    // Test extreme pacing scenarios
    const badPacingData = [
      ...new Array(300).fill(350), // Way too hard start
      ...new Array(900).fill(150)  // Complete collapse
    ];
    
    const pacing = analyzePacing(badPacingData);
    const stats = calculateStats(badPacingData);
    
    // Check that recommendations are reasonable
    const errorInsight = pacing.insights.find(i => i.type === 'error');
    if (errorInsight) {
      const recommendedWatts = parseInt(errorInsight.recommendation.match(/\d+/)?.[0] || '0');
      expect(recommendedWatts).toBeGreaterThan(100);
      expect(recommendedWatts).toBeLessThan(400);
      expect(recommendedWatts).toBeLessThan(350); // Should recommend starting easier
    }
  });
});