import { useState } from 'react';
import { parseCSV, parseTrainingPeaksCSV } from '../utils/csvParser';
import { parseFitFile, fitToParseData } from '../utils/fitParser';
import { parseGPX, gpxToParseData } from '../utils/gpxParser';
import { extractBestFTPSegment } from '../utils/ftpAnalysis';

interface SegmentInfo {
  startTime: number;
  duration: number;
  reason: string;
}

interface PowerInputFormProps {
  onAnalyze: (
    powerData: number[], 
    heartRateData?: number[], 
    riderWeight?: number, 
    segmentInfo?: SegmentInfo,
    speedData?: number[],
    distanceData?: number[],
    elevationData?: number[]
  ) => void;
}

export const PowerInputForm = ({ onAnalyze }: PowerInputFormProps) => {
  const [inputMethod, setInputMethod] = useState<'fit' | 'gpx' | 'csv' | 'manual'>('fit');
  const [manualData, setManualData] = useState('');
  const [duration, setDuration] = useState(20);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [fitFile, setFitFile] = useState<File | null>(null);
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [riderWeight, setRiderWeight] = useState<number | null>(null);
  const [generatedHRData, setGeneratedHRData] = useState<number[] | null>(null);
  const [fileInfo, setFileInfo] = useState<string | null>(null);

  const generateSampleData = () => {
    // Generate realistic FTP test data with some fade
    const samples = duration * 60; // 1 sample per second
    const targetPower = 250;
    const baselineHR = 165; // Typical LTHR
    const maxHR = 185; // Typical max HR for testing
    
    const powerData = [];
    const hrData = [];

    for (let i = 0; i < samples; i++) {
      const timePct = i / samples;
      
      // Power generation
      const fade = timePct * 15; // Up to 15w fade
      const powerNoise = (Math.random() - 0.5) * 20;
      const power = Math.round(targetPower - fade + powerNoise);
      powerData.push(Math.max(0, power));
      
      // Heart rate generation (more complex pattern)
      let hr = baselineHR;
      
      // Initial ramp up (first 2 minutes)
      if (timePct < 0.1) {
        hr = baselineHR - 20 + (timePct * 10 * 20); // Ramp from 145 to 165
      } else {
        // Steady state with gradual drift
        const drift = timePct * 8; // Up to 8 bpm drift over test
        const effort = Math.max(0, Math.min(1, power / targetPower)); // Effort factor
        const effortBonus = effort * 10; // HR responds to power
        
        hr = baselineHR + drift + effortBonus;
      }
      
      // Add some HR variability (less than power)
      const hrNoise = (Math.random() - 0.5) * 6; // ±3 bpm noise
      hr = Math.round(hr + hrNoise);
      
      // Clamp to realistic bounds
      hr = Math.max(120, Math.min(maxHR, hr));
      hrData.push(hr);
    }

    // Set power data as minute averages (existing behavior)
    setManualData(powerData.filter((_, i) => i % 60 === 0).join(', '));
    
    // Store the generated HR data to use in analysis
    setGeneratedHRData(hrData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileInfo(null); // Clear previous file info
      if (inputMethod === 'fit') {
        setFitFile(file);
        setCsvFile(null);
        setGpxFile(null);
      } else if (inputMethod === 'gpx') {
        setGpxFile(file);
        setCsvFile(null);
        setFitFile(null);
      } else {
        setCsvFile(file);
        setFitFile(null);
        setGpxFile(null);
      }
    }
  };

  const validateManualData = (values: number[]): { isValid: boolean; error?: string; processedData?: number[] } => {
    const expectedMinutes = duration;
    
    // Check if we have the exact number of minute values expected
    if (values.length === expectedMinutes) {
      // Perfect match - expand to seconds
      const expanded: number[] = [];
      values.forEach(minuteAvg => {
        for (let i = 0; i < 60; i++) {
          // Add slight variation
          const variation = (Math.random() - 0.5) * 10;
          expanded.push(Math.round(minuteAvg + variation));
        }
      });
      return { isValid: true, processedData: expanded };
    }
    
    // Check if we have too many values
    if (values.length > expectedMinutes) {
      // Truncate excess values from the end
      const truncatedValues = values.slice(0, expectedMinutes);
      const expanded: number[] = [];
      truncatedValues.forEach(minuteAvg => {
        for (let i = 0; i < 60; i++) {
          const variation = (Math.random() - 0.5) * 10;
          expanded.push(Math.round(minuteAvg + variation));
        }
      });
      
      // Show warning but proceed
      const excess = values.length - expectedMinutes;
      console.warn(`Truncated ${excess} excess values for ${expectedMinutes}-minute test`);
      alert(`Too much data provided. You entered ${values.length} minute${values.length === 1 ? '' : 's'} of data for a ${expectedMinutes}-minute test. Truncated ${excess} excess value${excess === 1 ? '' : 's'} from the end.`);
      return { isValid: true, processedData: expanded };
    }
    
    // Not enough values
    if (values.length < expectedMinutes) {
      const missing = expectedMinutes - values.length;
      return { 
        isValid: false, 
        error: `Not enough data for ${expectedMinutes}-minute test. You provided ${values.length} minute${values.length === 1 ? '' : 's'} of data, but need ${expectedMinutes} minutes. Missing ${missing} minute${missing === 1 ? '' : 's'} of data.`
      };
    }
    
    return { isValid: false, error: 'Invalid data format' };
  };

  const handleDataAnalysis = (
    powerData: number[], 
    heartRateData?: number[], 
    showLongFileDialog: boolean = true,
    speedData?: number[],
    distanceData?: number[],
    elevationData?: number[]
  ) => {
    const dataLengthMinutes = powerData.length / 60;
    
    // Check if this is a long workout file (more than 30 minutes)
    if (dataLengthMinutes > 30 && showLongFileDialog) {
      const userChoice = confirm(
        `This appears to be a ${Math.round(dataLengthMinutes)}-minute workout file. For FTP analysis, we recommend using a focused effort segment.\n\n` +
        `• Click "OK" to auto-extract the best 20-minute segment\n` +
        `• Click "Cancel" to analyze the full workout (may give less accurate FTP results)`
      );
      
      if (userChoice) {
        // Extract best segment
        const extracted = extractBestFTPSegment(powerData, heartRateData, 20);
        console.log('Extracted segment:', extracted.segmentInfo.reason);
        onAnalyze(extracted.power, extracted.heartRate, riderWeight || undefined, extracted.segmentInfo, speedData, distanceData, elevationData);
        return;
      }
    }
    
    // Use full data (either short file or user chose full analysis)
    const fullWorkoutInfo: SegmentInfo = {
      startTime: 0,
      duration: powerData.length,
      reason: `Full ${Math.round(dataLengthMinutes)}-minute workout analyzed`
    };
    onAnalyze(powerData, heartRateData, riderWeight || undefined, fullWorkoutInfo, speedData, distanceData, elevationData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inputMethod === 'manual') {
      // Parse comma-separated values
      const powerArray = manualData.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));

      if (powerArray.length === 0) {
        alert('Please enter power data');
        return;
      }

      // Validate data against test duration
      const validation = validateManualData(powerArray);
      
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }

      if (validation.processedData) {
        // Use generated HR data if available, otherwise undefined
        handleDataAnalysis(validation.processedData, generatedHRData || undefined);
      }
    } else if (inputMethod === 'csv' && csvFile) {
      // Handle CSV file upload
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvContent = event.target?.result as string;
        
        // Try TrainingPeaks format first, then generic CSV
        let parsedData = parseTrainingPeaksCSV(csvContent);
        if (!parsedData) {
          parsedData = parseCSV(csvContent);
        }

        if (parsedData) {
          const durationMinutes = Math.round(parsedData.power.length / 60);
          setFileInfo(`CSV file loaded: ${durationMinutes} minutes, ${parsedData.power.length} data points`);
          handleDataAnalysis(parsedData.power, parsedData.heartRate, true, parsedData.speed, parsedData.distance, parsedData.elevation);
        } else {
          alert('Could not parse CSV file. Please check the format.');
        }
      };
      reader.readAsText(csvFile);
    } else if (inputMethod === 'fit' && fitFile) {
      // Handle FIT file upload
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fitBuffer = event.target?.result as ArrayBuffer;
        
        try {
          const fitData = await parseFitFile(fitBuffer);
          if (fitData) {
            console.log('Successfully parsed FIT file:', {
              powerSamples: fitData.power.length,
              hrSamples: fitData.heartRate?.length || 0,
              duration: `${Math.round(fitData.metadata.duration / 60)} minutes`,
              device: fitData.metadata.deviceInfo
            });
            const parsedData = fitToParseData(fitData);
            const durationMinutes = Math.round(parsedData.power.length / 60);
            setFileInfo(`FIT file loaded: ${durationMinutes} minutes, ${parsedData.power.length} data points`);
            handleDataAnalysis(parsedData.power, parsedData.heartRate, true, parsedData.speed, parsedData.distance, parsedData.elevation);
          } else {
            alert('Could not parse FIT file. Please check the browser console for detailed error information, or try uploading the file as CSV instead.');
          }
        } catch (error) {
          console.error('FIT file parsing error:', error);
          alert('Error parsing FIT file. Please try a different file.');
        }
      };
      reader.readAsArrayBuffer(fitFile);
    } else if (inputMethod === 'gpx' && gpxFile) {
      // Handle GPX file upload
      const reader = new FileReader();
      reader.onload = async (event) => {
        const gpxContent = event.target?.result as string;
        
        try {
          const gpxData = parseGPX(gpxContent);
          if (gpxData) {
            console.log('Successfully parsed GPX file:', {
              powerSamples: gpxData.power.length,
              hrSamples: gpxData.heartRate?.length || 0,
              duration: `${Math.round(gpxData.metadata.duration / 60)} minutes`,
              name: gpxData.metadata.name
            });
            const parsedData = gpxToParseData(gpxData);
            const durationMinutes = Math.round(parsedData.power.length / 60);
            setFileInfo(`GPX file loaded: ${durationMinutes} minutes, ${parsedData.power.length} data points`);
            handleDataAnalysis(parsedData.power, parsedData.heartRate, true, parsedData.speed, parsedData.distance, parsedData.elevation);
          } else {
            alert('Could not parse GPX file. Please check the browser console for detailed error information, or try uploading the file as CSV instead.');
          }
        } catch (error) {
          console.error('GPX file parsing error:', error);
          alert('Error parsing GPX file. Please try a different file.');
        }
      };
      reader.readAsText(gpxFile);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Input Test Data</h2>
      
      {/* Disclaimer and Test Guidelines */}
      <div className="mb-6 space-y-4">
        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Get An Immediate FTP Estimate</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• <strong>Upload a 20-minute FTP test</strong> for most accurate FTP calculation</p>
                <p>• <strong>Any ride duration works</strong> - we'll find the best 20 minute effort</p>
                <p>• This tool provides <strong>general estimates</strong> - it's no substitute for professional coaching.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Form Container */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rider Weight */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rider Weight (kg) - Optional
          </label>
          <input
            type="number"
            value={riderWeight || ''}
            onChange={(e) => setRiderWeight(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="e.g., 70"
            min="30"
            max="200"
            step="0.1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Enables watts per kg analysis and performance grading
          </p>
        </div>

        {/* Input Method Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Input Method
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="fit"
                checked={inputMethod === 'fit'}
                onChange={(e) => {
                  setInputMethod(e.target.value as 'fit');
                  setFileInfo(null);
                }}
                className="mr-2"
              />
              FIT File (.fit)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="gpx"
                checked={inputMethod === 'gpx'}
                onChange={(e) => {
                  setInputMethod(e.target.value as 'gpx');
                  setFileInfo(null);
                }}
                className="mr-2"
              />
              GPX File (.gpx)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="csv"
                checked={inputMethod === 'csv'}
                onChange={(e) => {
                  setInputMethod(e.target.value as 'csv');
                  setFileInfo(null);
                }}
                className="mr-2"
              />
              CSV Upload
            </label>          
            <label className="flex items-center">
              <input
                type="radio"
                value="manual"
                checked={inputMethod === 'manual'}
                onChange={(e) => {
                  setInputMethod(e.target.value as 'manual');
                  setFileInfo(null);
                }}
                className="mr-2"
              />
              Manual Entry
            </label>              
          </div>
        </div>

        {inputMethod === 'manual' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Duration (minutes)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={8}>8 minutes</option>
                <option value={20}>20 minutes (Standard)</option>
                <option value={30}>30 minutes</option>
                <option value={40}>40 minutes (Kolie Moore)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Power Data (comma-separated watts)
              </label>
              <textarea
                value={manualData}
                onChange={(e) => {
                  setManualData(e.target.value);
                  setGeneratedHRData(null); // Clear generated HR when user types manually
                }}
                placeholder={`Enter ${duration} minute averages: 280, 275, 270, 265...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={4}
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter exactly <span className="font-semibold">{duration} values</span> (one average power per minute). Extra values will be truncated.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={generateSampleData}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
              >
                Generate Sample Data
              </button>
              {generatedHRData && (
                <span className="text-sm text-green-600 font-medium">
                  ✓ Includes heart rate data ({generatedHRData.length} samples)
                </span>
              )}
            </div>
          </>
        )}

        {inputMethod === 'csv' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Supports TrainingPeaks exports and generic CSV files with Power (and optional Heart Rate) columns
            </p>
          </div>
        )}

        {inputMethod === 'fit' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload FIT File
            </label>
            <input
              type="file"
              accept=".fit"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Upload .fit files from Garmin, Wahoo, bike computers, or Zwift. Automatically includes Power and Heart Rate data.
            </p>
            {fitFile && (
              <p className="text-sm text-green-600 mt-1 font-medium">
                ✓ File selected: {fitFile.name} ({(fitFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        )}

        {inputMethod === 'gpx' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload GPX File
            </label>
            <input
              type="file"
              accept=".gpx"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Upload .gpx files with power meter data from Strava, TrainingPeaks, or converted from .fit files. Includes Power and Heart Rate data.
            </p>
            {gpxFile && (
              <p className="text-sm text-green-600 mt-1 font-medium">
                ✓ File selected: {gpxFile.name} ({(gpxFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        )}

        {fileInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center">
              <div className="text-blue-600 text-sm font-medium">
                📊 {fileInfo}
              </div>
            </div>
            {fileInfo.includes('minutes') && parseInt(fileInfo) > 30 && (
              <div className="text-blue-600 text-xs mt-1">
                💡 Long workout detected - you'll be offered to extract the best FTP segment
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={
            inputMethod === 'manual' ? !manualData.trim() : 
            inputMethod === 'csv' ? !csvFile :
            inputMethod === 'fit' ? !fitFile :
            inputMethod === 'gpx' ? !gpxFile : true
          }
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          Analyze Test
        </button>
        </form>
      </div>

      {/* Horizontal Rule */}
      <div className="my-6">
        
      </div>

      {/* FTP Test Guide Video */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-purple-600 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">🎯 New to FTP Testing?</h3>
            <p className="text-sm text-gray-600 mb-3">
              Get advice on how to do an effective FTP test here
            </p>
            
            {/* Collapsible Video Section */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors list-none flex items-center gap-2">
                <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Watch: How to Perform an FTP Test
              </summary>
              
              <div className="mt-3 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/FZnuvoeZDks"
                  title="How to Perform an FTP Test - Competitive Cyclist Guide"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscopy; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                />
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                💡 <strong>Pro tip:</strong> Follow this protocol for the most accurate results, then upload your data here for analysis!
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};