import FitParser from 'fit-file-parser';

export interface FitData {
  power: number[];
  heartRate?: number[];
  cadence?: number[];
  speed?: number[];
  distance?: number[];
  elevation?: number[];
  time: number[];
  metadata: {
    startTime: Date;
    duration: number;
    deviceInfo?: string;
    sport?: string;
  };
}

export interface FitRecord {
  timestamp?: Date;
  power?: number;
  heart_rate?: number;
  cadence?: number;
  distance?: number;
  speed?: number;
  altitude?: number;
  enhanced_altitude?: number;
}

export const parseFitFile = (fitContent: ArrayBuffer): Promise<FitData | null> => {
  return new Promise((resolve) => {
    try {
      const fitParser = new FitParser({
        force: true,
        speedUnit: 'km/h',
        lengthUnit: 'm',
        temperatureUnit: 'celsius',
        elapsedRecordField: true,
        mode: 'cascade',
      });

      fitParser.parse(fitContent, (error: any, data: any) => {
        if (error) {
          console.error('Error parsing FIT file:', error);
          resolve(null);
          return;
        }

        // Log the complete data structure to understand what we're getting
        console.log('Raw FIT data structure:', {
          dataType: typeof data,
          isArray: Array.isArray(data),
          keys: data ? Object.keys(data) : [],
          dataPreview: data
        });

        // Log each key and its type/length to understand the structure better
        if (data && typeof data === 'object') {
          Object.keys(data).forEach(key => {
            const value = data[key];
            console.log(`Key '${key}':`, {
              type: typeof value,
              isArray: Array.isArray(value),
              length: Array.isArray(value) ? value.length : 'N/A',
              sample: Array.isArray(value) && value.length > 0 ? value[0] : value
            });
          });
        }

        try {
          const parsedData = processFitData(data);
          resolve(parsedData);
        } catch (parseError) {
          console.error('Error processing FIT data:', parseError);
          resolve(null);
        }
      });
    } catch (error) {
      console.error('Error initializing FIT parser:', error);
      resolve(null);
    }
  });
};

const processFitData = (data: any): FitData | null => {
  console.log('Processing FIT data:', {
    hasRecords: !!data?.records,
    recordCount: data?.records?.length || 0,
    hasActivity: !!data?.activity,
    activityType: typeof data?.activity,
    dataKeys: Object.keys(data || {}),
    sampleRecord: data?.records?.[0]
  });

  // Try to find records in different possible locations
  let records = null;
  
  // Check standard locations first
  if (data?.records && Array.isArray(data.records) && data.records.length > 0) {
    records = data.records;
    console.log('Found records in data.records');
  } 
  // NEW: Check data.activity.sessions[0].laps for records arrays
  else if (data?.activity?.sessions?.[0]?.laps) {
    console.log('Checking activity.sessions[0].laps for records...');
    const laps = data.activity.sessions[0].laps;
    console.log('Found laps:', {
      lapCount: laps?.length || 0,
      firstLap: laps?.[0],
      firstLapKeys: laps?.[0] ? Object.keys(laps[0]) : [],
      hasRecords: !!laps?.[0]?.records,
      recordCount: laps?.[0]?.records?.length || 0
    });
    
    if (Array.isArray(laps) && laps.length > 0) {
      // Combine records from all laps
      const allRecords: any[] = [];
      laps.forEach((lap, lapIndex) => {
        if (lap.records && Array.isArray(lap.records)) {
          console.log(`Lap ${lapIndex} has ${lap.records.length} records`);
          allRecords.push(...lap.records);
        }
      });
      
      if (allRecords.length > 0) {
        records = allRecords;
        console.log(`Combined ${allRecords.length} records from ${laps.length} laps`);
      }
    }
  }
  // Check other standard locations
  else if (data?.activity && Array.isArray(data.activity) && data.activity.length > 0) {
    records = data.activity;
    console.log('Found records in data.activity');
  } else if (data?.session && Array.isArray(data.session) && data.session.length > 0) {
    records = data.session;
    console.log('Found records in data.session');
  } else if (Array.isArray(data)) {
    // Sometimes the data itself is the records array
    records = data;
    console.log('Data itself is an array');
  } else {
    // Look for any array property that might contain records
    console.log('Searching all keys for record arrays...');
    for (const key of Object.keys(data || {})) {
      const value = data[key];
      if (Array.isArray(value) && value.length > 0) {
        console.log(`Checking array '${key}' with ${value.length} items:`, {
          firstItem: value[0],
          hasTimestamp: !!value[0]?.timestamp,
          hasPower: !!value[0]?.power,
          hasHeartRate: !!value[0]?.heart_rate,
          allKeys: value[0] ? Object.keys(value[0]) : []
        });
        
        // More flexible check for record-like objects
        const firstItem = value[0];
        if (firstItem && typeof firstItem === 'object') {
          const itemKeys = Object.keys(firstItem);
          const hasDataFields = itemKeys.some(k => 
            k.includes('power') || k.includes('heart') || k.includes('timestamp') || 
            k.includes('time') || k.includes('hr') || k.includes('watts')
          );
          
          if (hasDataFields) {
            records = value;
            console.log(`Selected records from '${key}' - has data fields:`, itemKeys);
            break;
          }
        }
      }
    }
  }

  if (!records || records.length === 0) {
    // Provide more helpful error messages based on what we found
    console.log('No record arrays found. Analyzing file structure for helpful error...');
    
    const dataKeys = Object.keys(data || {});
    let errorMessage = 'No workout record data found in FIT file.';
    let suggestion = '';
    
    if (data?.activity?.sessions?.[0]?.laps) {
      const laps = data.activity.sessions[0].laps;
      const hasEmptyLaps = laps.length > 0 && laps.every((lap: any) => !lap.records || lap.records.length === 0);
      
      if (hasEmptyLaps) {
        errorMessage = 'FIT file contains workout structure but no detailed power/HR records in lap data.';
        suggestion = 'This appears to be a summary-only export. Try exporting with "Export Original" or detailed data option from Strava, or use a different export source.';
      } else {
        errorMessage = 'FIT file has activity structure but laps contain no recognizable record data.';
        suggestion = 'The file structure may not be compatible. Try converting to GPX or CSV format instead.';
      }
    } else if (data?.activity && typeof data.activity === 'object') {
      errorMessage = 'FIT file contains activity data but lacks the detailed lap/record structure needed for FTP analysis.';
      suggestion = 'This appears to be a summary-style FIT file. Try exporting with "Export Original" or detailed data option, or convert to GPX/CSV format.';
    } else if (dataKeys.length > 0) {
      errorMessage = `FIT file parsed but contains no recognizable workout data structure. Found: ${dataKeys.join(', ')}.`;
      suggestion = 'This file may not contain cycling workout data, or uses an unsupported FIT file format.';
    }
    
    const fullError = suggestion ? `${errorMessage} ${suggestion}` : errorMessage;
    throw new Error(fullError);
  }

  console.log(`Found ${records.length} records in FIT data`);

  const fitRecords: FitRecord[] = records;
  const power: number[] = [];
  const heartRate: number[] = [];
  const cadence: number[] = [];
  const speed: number[] = [];
  const distance: number[] = [];
  const elevation: number[] = [];
  const time: number[] = [];

  let startTime: Date | null = null;
  let hasValidPower = false;
  let hasValidHR = false;
  let hasValidSpeed = false;
  let hasValidDistance = false;
  let hasValidElevation = false;

  fitRecords.forEach((record: FitRecord, index: number) => {
    // Log first few records for debugging
    if (index < 3) {
      console.log(`Record ${index}:`, {
        timestamp: record.timestamp,
        power: record.power,
        heart_rate: record.heart_rate,
        altitude: record.altitude,
        enhanced_altitude: record.enhanced_altitude,
        speed: record.speed,
        distance: record.distance,
        allKeys: Object.keys(record)
      });
    }

    // Skip records without timestamp
    if (!record.timestamp) return;

    // Set start time from first valid record
    if (!startTime) {
      startTime = record.timestamp;
    }

    // Calculate elapsed time in seconds
    const elapsedSeconds = startTime 
      ? Math.floor((record.timestamp.getTime() - startTime.getTime()) / 1000)
      : index;

    time.push(elapsedSeconds);

    // Process power data - check multiple possible field names
    let powerValue = 0;
    if (typeof record.power === 'number' && record.power >= 0) {
      powerValue = record.power;
      hasValidPower = true;
    } else if (typeof (record as any).watts === 'number' && (record as any).watts >= 0) {
      powerValue = (record as any).watts;
      hasValidPower = true;
    } else if (typeof (record as any).avg_power === 'number' && (record as any).avg_power >= 0) {
      powerValue = (record as any).avg_power;
      hasValidPower = true;
    }
    power.push(Math.round(powerValue));

    // Process heart rate data - check multiple possible field names
    let hrValue = 0;
    if (typeof record.heart_rate === 'number' && record.heart_rate > 0) {
      hrValue = record.heart_rate;
      hasValidHR = true;
    } else if (typeof (record as any).hr === 'number' && (record as any).hr > 0) {
      hrValue = (record as any).hr;
      hasValidHR = true;
    } else if (typeof (record as any).heartrate === 'number' && (record as any).heartrate > 0) {
      hrValue = (record as any).heartrate;
      hasValidHR = true;
    }
    heartRate.push(Math.round(hrValue));

    // Process cadence data (optional) - check multiple possible field names
    let cadenceValue = 0;
    if (typeof record.cadence === 'number' && record.cadence >= 0) {
      cadenceValue = record.cadence;
    } else if (typeof (record as any).rpm === 'number' && (record as any).rpm >= 0) {
      cadenceValue = (record as any).rpm;
    }
    cadence.push(Math.round(cadenceValue));

    // Process speed data (convert m/s to km/h)
    let speedValue = 0;
    if (typeof record.speed === 'number' && record.speed >= 0) {
      speedValue = record.speed * 3.6; // Convert m/s to km/h
      hasValidSpeed = true;
    } else if (typeof (record as any).enhanced_speed === 'number' && (record as any).enhanced_speed >= 0) {
      speedValue = (record as any).enhanced_speed * 3.6;
      hasValidSpeed = true;
    }
    speed.push(Math.round(speedValue * 10) / 10); // Round to 1 decimal place

    // Process distance data
    let distanceValue = 0;
    if (typeof record.distance === 'number' && record.distance >= 0) {
      distanceValue = record.distance; // Usually in meters
      hasValidDistance = true;
    } else if (typeof (record as any).total_distance === 'number' && (record as any).total_distance >= 0) {
      distanceValue = (record as any).total_distance;
      hasValidDistance = true;
    }
    distance.push(Math.round(distanceValue));

    // Process elevation data
    let elevationValue = 0;
    if (typeof record.altitude === 'number') {
      elevationValue = record.altitude;
      hasValidElevation = true;
    } else if (typeof record.enhanced_altitude === 'number') {
      elevationValue = record.enhanced_altitude;
      hasValidElevation = true;
    } else if (typeof (record as any).elevation === 'number') {
      elevationValue = (record as any).elevation;
      hasValidElevation = true;
    }
    
    // Log elevation processing for first few records
    if (index < 5 && elevationValue > 0) {
      console.log(`Elevation ${index}:`, {
        altitude: record.altitude,
        enhanced_altitude: record.enhanced_altitude,
        otherElevation: (record as any).elevation,
        finalValue: elevationValue
      });
    }
    
    elevation.push(Math.round(elevationValue));
  });

  console.log('Final processing results:', {
    totalRecords: fitRecords.length,
    validPowerRecords: power.filter(p => p > 0).length,
    validHRRecords: heartRate.filter(hr => hr > 0).length,
    validSpeedRecords: speed.filter(s => s > 0).length,
    validDistanceRecords: distance.filter(d => d > 0).length,
    validElevationRecords: elevation.filter(e => e !== 0).length,
    duration: time.length > 0 ? Math.max(...time) : 0,
    hasValidPower,
    hasValidHR,
    hasValidSpeed,
    hasValidDistance,
    hasValidElevation,
    elevationRange: hasValidElevation ? {
      min: Math.min(...elevation.filter(e => e !== 0)),
      max: Math.max(...elevation.filter(e => e !== 0)),
      first10: elevation.slice(0, 10),
      last10: elevation.slice(-10)
    } : 'No elevation data'
  });

  if (!hasValidPower) {
    const powerValues = power.slice(0, 10); // First 10 values for debugging
    throw new Error(`No valid power data found in FIT file. Found ${fitRecords.length} records, first 10 power values: [${powerValues.join(', ')}]`);
  }

  // Calculate duration
  const duration = time.length > 0 ? Math.max(...time) : 0;

  // Extract device info and sport from file_id and sport messages
  let deviceInfo = 'Unknown Device';
  let sport = 'cycling';

  if (data.file_id && data.file_id.length > 0) {
    const fileId = data.file_id[0];
    if (fileId.manufacturer) {
      deviceInfo = `${fileId.manufacturer}`;
      if (fileId.product) {
        deviceInfo += ` ${fileId.product}`;
      }
    }
  }

  if (data.sport && data.sport.length > 0) {
    sport = data.sport[0].sport || 'cycling';
  }

  return {
    power,
    heartRate: hasValidHR ? heartRate : undefined,
    cadence: cadence.some(c => c > 0) ? cadence : undefined,
    speed: hasValidSpeed ? speed : undefined,
    distance: hasValidDistance ? distance : undefined,
    elevation: hasValidElevation ? elevation : undefined,
    time,
    metadata: {
      startTime: startTime || new Date(),
      duration,
      deviceInfo,
      sport
    }
  };
};

// Helper function to validate FIT file format
export const isFitFile = (file: File): boolean => {
  return file.name.toLowerCase().endsWith('.fit') || 
         file.type === 'application/octet-stream';
};

// Convert FIT data to our existing ParsedData format for compatibility
export const fitToParseData = (fitData: FitData) => {
  return {
    power: fitData.power,
    heartRate: fitData.heartRate,
    speed: fitData.speed,
    distance: fitData.distance,
    elevation: fitData.elevation,
    time: fitData.time
  };
};