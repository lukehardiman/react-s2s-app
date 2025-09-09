export interface ParsedData {
  power: number[];
  heartRate?: number[];
  speed?: number[];
  distance?: number[];
  elevation?: number[];
  time: number[];
}

export const parseCSV = (csvContent: string): ParsedData | null => {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return null;
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Find column indices
    const powerIndex = headers.findIndex(h => 
      h.includes('power') || h.includes('watts') || h.includes('avg_power')
    );
    const hrIndex = headers.findIndex(h => 
      h.includes('heart') || h.includes('hr') || h.includes('bpm')
    );
    const timeIndex = headers.findIndex(h => 
      h.includes('time') || h.includes('elapsed') || h.includes('seconds')
    );
    
    if (powerIndex === -1) {
      throw new Error('No power column found in CSV');
    }
    
    const power: number[] = [];
    const heartRate: number[] = [];
    const time: number[] = [];
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      
      // Parse power
      const powerValue = parseFloat(values[powerIndex]?.trim() || '0');
      if (!isNaN(powerValue) && powerValue >= 0) {
        power.push(Math.round(powerValue));
      }
      
      // Parse heart rate if available
      if (hrIndex !== -1) {
        const hrValue = parseFloat(values[hrIndex]?.trim() || '0');
        if (!isNaN(hrValue) && hrValue > 0) {
          heartRate.push(Math.round(hrValue));
        } else {
          heartRate.push(0);
        }
      }
      
      // Parse time if available
      if (timeIndex !== -1) {
        const timeValue = parseFloat(values[timeIndex]?.trim() || '0');
        if (!isNaN(timeValue)) {
          time.push(timeValue);
        }
      } else {
        // Generate time series (assume 1 second intervals)
        time.push(i - 1);
      }
    }
    
    if (power.length === 0) {
      throw new Error('No valid power data found');
    }
    
    return {
      power,
      heartRate: hrIndex !== -1 ? heartRate : undefined,
      time
    };
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return null;
  }
};

// Parse TrainingPeaks specific format
export const parseTrainingPeaksCSV = (csvContent: string): ParsedData | null => {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return null;
    
    // TrainingPeaks often has specific headers
    const headers = lines[0].split(',').map(h => h.trim());
    
    const powerIndex = headers.findIndex(h => 
      h.toLowerCase().includes('power') || 
      h.toLowerCase().includes('watts') ||
      h === 'Power (watts)'
    );
    
    const hrIndex = headers.findIndex(h => 
      h.toLowerCase().includes('heart rate') || 
      h.toLowerCase().includes('hr') ||
      h === 'Heart Rate (bpm)'
    );
    
    if (powerIndex === -1) {
      // Try generic CSV parser
      return parseCSV(csvContent);
    }
    
    const power: number[] = [];
    const heartRate: number[] = [];
    const time: number[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      
      const powerValue = parseFloat(values[powerIndex]?.trim() || '0');
      if (!isNaN(powerValue) && powerValue >= 0) {
        power.push(Math.round(powerValue));
        time.push(i - 1); // Assume 1-second intervals
        
        if (hrIndex !== -1) {
          const hrValue = parseFloat(values[hrIndex]?.trim() || '0');
          heartRate.push(!isNaN(hrValue) && hrValue > 0 ? Math.round(hrValue) : 0);
        }
      }
    }
    
    return {
      power,
      heartRate: hrIndex !== -1 ? heartRate : undefined,
      time
    };
  } catch (error) {
    console.error('Error parsing TrainingPeaks CSV:', error);
    return null;
  }
};