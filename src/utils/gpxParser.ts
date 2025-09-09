export interface GpxData {
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
    name?: string;
    totalDistance?: number;
  };
}

export const parseGPX = (gpxContent: string): GpxData | null => {
  try {
    // Parse the XML content
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('GPX XML parsing error:', parseError.textContent);
      return null;
    }

    console.log('GPX file structure:', {
      rootElement: xmlDoc.documentElement.tagName,
      tracks: xmlDoc.querySelectorAll('trk').length,
      trackSegments: xmlDoc.querySelectorAll('trkseg').length,
      trackPoints: xmlDoc.querySelectorAll('trkpt').length
    });

    // Find track points (trkpt elements)
    const trackPoints = xmlDoc.querySelectorAll('trkpt');
    if (trackPoints.length === 0) {
      throw new Error('No track points found in GPX file');
    }

    const power: number[] = [];
    const heartRate: number[] = [];
    const cadence: number[] = [];
    const time: number[] = [];
    let startTime: Date | null = null;
    let hasValidPower = false;
    let hasValidHR = false;

    console.log(`Processing ${trackPoints.length} track points...`);

    trackPoints.forEach((trkpt, index) => {
      // Log first few track points for debugging
      if (index < 3) {
        console.log(`Track point ${index}:`, {
          lat: trkpt.getAttribute('lat'),
          lon: trkpt.getAttribute('lon'),
          time: trkpt.querySelector('time')?.textContent,
          extensions: trkpt.querySelector('extensions') ? 'present' : 'missing',
          allElements: Array.from(trkpt.children).map(child => child.tagName)
        });
      }

      // Extract timestamp
      const timeElement = trkpt.querySelector('time');
      if (!timeElement) return;

      const timestamp = new Date(timeElement.textContent || '');
      if (isNaN(timestamp.getTime())) return;

      // Set start time from first valid track point
      if (!startTime) {
        startTime = timestamp;
      }

      // Calculate elapsed time in seconds
      const elapsedSeconds = Math.floor((timestamp.getTime() - startTime.getTime()) / 1000);
      time.push(elapsedSeconds);

      // Look for power data in extensions
      let powerValue = 0;
      const extensions = trkpt.querySelector('extensions');
      if (extensions) {
        // Check various common power field names in GPX extensions
        const powerElements = [
          extensions.querySelector('power'),
          extensions.querySelector('gpxtpx\\:power, tpx\\:power'), // Garmin TrackPointExtension
          extensions.querySelector('ns3\\:power'), // Other namespaces
          extensions.querySelector('[power]'), // Attribute
        ].filter(Boolean);

        for (const powerEl of powerElements) {
          const powerText = powerEl?.textContent || powerEl?.getAttribute?.('power');
          const parsed = parseFloat(powerText || '0');
          if (!isNaN(parsed) && parsed >= 0) {
            powerValue = parsed;
            hasValidPower = true;
            break;
          }
        }
      }
      power.push(Math.round(powerValue));

      // Look for heart rate data
      let hrValue = 0;
      if (extensions) {
        const hrElements = [
          extensions.querySelector('hr'),
          extensions.querySelector('heartrate'),
          extensions.querySelector('gpxtpx\\:hr, tpx\\:hr'), // Garmin TrackPointExtension
          extensions.querySelector('ns3\\:hr'),
          extensions.querySelector('[hr]'), // Attribute
        ].filter(Boolean);

        for (const hrEl of hrElements) {
          const hrText = hrEl?.textContent || hrEl?.getAttribute?.('hr');
          const parsed = parseFloat(hrText || '0');
          if (!isNaN(parsed) && parsed > 0) {
            hrValue = parsed;
            hasValidHR = true;
            break;
          }
        }
      }
      heartRate.push(Math.round(hrValue));

      // Look for cadence data (optional)
      let cadenceValue = 0;
      if (extensions) {
        const cadenceElements = [
          extensions.querySelector('cadence'),
          extensions.querySelector('cad'),
          extensions.querySelector('gpxtpx\\:cad, tpx\\:cad'),
          extensions.querySelector('ns3\\:cad'),
        ].filter(Boolean);

        for (const cadEl of cadenceElements) {
          const cadText = cadEl?.textContent;
          const parsed = parseFloat(cadText || '0');
          if (!isNaN(parsed) && parsed >= 0) {
            cadenceValue = parsed;
            break;
          }
        }
      }
      cadence.push(Math.round(cadenceValue));
    });

    console.log('GPX parsing results:', {
      totalPoints: trackPoints.length,
      processedPoints: time.length,
      validPowerPoints: power.filter(p => p > 0).length,
      validHRPoints: heartRate.filter(hr => hr > 0).length,
      hasValidPower,
      hasValidHR,
      duration: time.length > 0 ? Math.max(...time) : 0
    });

    if (!hasValidPower) {
      const samplePowers = power.slice(0, 10);
      throw new Error(`No valid power data found in GPX file. Found ${trackPoints.length} track points, first 10 power values: [${samplePowers.join(', ')}]. Check if your GPX export includes power meter data.`);
    }

    // Calculate duration and get metadata
    const duration = time.length > 0 ? Math.max(...time) : 0;
    const trackName = xmlDoc.querySelector('trk name')?.textContent || 'GPX Workout';

    return {
      power,
      heartRate: hasValidHR ? heartRate : undefined,
      cadence: cadence.some(c => c > 0) ? cadence : undefined,
      time,
      metadata: {
        startTime: startTime || new Date(),
        duration,
        name: trackName
      }
    };

  } catch (error) {
    console.error('Error parsing GPX:', error);
    return null;
  }
};

// Helper function to validate GPX file format
export const isGpxFile = (file: File): boolean => {
  return file.name.toLowerCase().endsWith('.gpx') || 
         file.type === 'application/gpx+xml' ||
         file.type === 'text/xml';
};

// Convert GPX data to our existing ParsedData format for compatibility
export const gpxToParseData = (gpxData: GpxData) => {
  return {
    power: gpxData.power,
    heartRate: gpxData.heartRate,
    speed: gpxData.speed,
    distance: gpxData.distance,
    elevation: gpxData.elevation,
    time: gpxData.time
  };
};