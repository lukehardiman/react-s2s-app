import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Stats, PacingAnalysis, HeartRateStats, WattsPerKgStats } from '../utils/types';

interface TestData {
  powerData: number[];
  heartRateData?: number[];
  speedData?: number[];
  distanceData?: number[];
  elevationData?: number[];
  stats: Stats;
  pacing: PacingAnalysis;
  heartRateStats?: HeartRateStats;
  wattsPerKgStats?: WattsPerKgStats;
  riderWeight?: number;
  timestamp: string;
  segmentInfo?: {
    startTime: number;
    duration: number;
    reason: string;
  };
}

interface PDFExportProps {
  testData: TestData;
}

export const PDFExport = ({ testData }: PDFExportProps) => {
  const generatePDF = async () => {
    // Create a hidden container for PDF content
    const pdfContainer = document.createElement('div');
    pdfContainer.id = 'pdf-content';
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.width = '794px'; // A4 width in pixels at 96 DPI
    pdfContainer.style.backgroundColor = 'white';
    pdfContainer.style.padding = '40px';
    pdfContainer.style.fontFamily = 'Arial, sans-serif';

    // Generate PDF content
    pdfContainer.innerHTML = generatePDFContent(testData);
    document.body.appendChild(pdfContainer);

    try {
      // Capture the content as canvas with dynamic height
      const canvas = await html2canvas(pdfContainer, {
        width: 794,
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true
      });

      // Create PDF with proper pagination
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if content exceeds A4 height
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Generate filename with timestamp
      const date = new Date(testData.timestamp);
      const filename = `FTP-Test-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.pdf`;
      
      pdf.save(filename);
    } finally {
      // Clean up
      document.body.removeChild(pdfContainer);
    }
  };

  return (
    <div className="flex justify-center mt-8">
      <button
        onClick={generatePDF}
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-lg text-lg shadow-lg transition duration-200 flex items-center gap-3"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export Test Results as PDF
      </button>
    </div>
  );
};

export function generatePDFContent(testData: TestData): string {
  const { stats, pacing, wattsPerKgStats, heartRateStats, riderWeight, timestamp, segmentInfo } = testData;
  const date = new Date(timestamp);
  const testDuration = Math.round(testData.powerData.length / 60);

  // Performance level description
  const getPerformanceDescription = () => {
    if (!wattsPerKgStats) return 'Performance level not calculated (rider weight needed)';
    
    const level = wattsPerKgStats.category.toLowerCase();
    if (level.includes('untrained')) return 'Starting your cycling journey - great potential ahead!';
    if (level.includes('novice')) return 'Building your cycling fitness foundation';
    if (level.includes('fair')) return 'Developing solid cycling fitness';
    if (level.includes('good')) return 'Well-trained recreational cyclist';
    if (level.includes('very good')) return 'Strong competitive cyclist';
    if (level.includes('excellent')) return 'Elite-level cycling performance';
    return 'Outstanding cycling performance';
  };

  return `
    <div style="max-width: 714px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.5;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #8b5cf6; padding-bottom: 20px;">
        <h1 style="color: #6b46c1; font-size: 28px; margin: 0 0 10px 0; font-weight: bold;">FTP Test Results</h1>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">${date.toLocaleDateString()} • ${testDuration} minutes • ${segmentInfo?.reason || 'FTP Test'}</p>
      </div>

      <!-- Key Performance Metrics -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #374151; font-size: 22px; margin-bottom: 20px; border-left: 4px solid #8b5cf6; padding-left: 15px;">🎯 Your Performance</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <!-- FTP Box -->
          <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Functional Threshold Power</div>
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px;">${stats.classicFTP}w</div>
            <div style="font-size: 12px; opacity: 0.8;">20-min avg × 0.95</div>
          </div>
          
          ${wattsPerKgStats ? `
          <!-- Watts/kg Box -->
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Power-to-Weight Ratio</div>
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px;">${wattsPerKgStats.classicFTPPerKg}w/kg</div>
            <div style="font-size: 12px; opacity: 0.8;">${riderWeight}kg rider weight</div>
          </div>
          ` : `
          <!-- No Weight Box -->
          <div style="background: #f3f4f6; color: #6b7280; padding: 20px; border-radius: 12px; text-align: center; border: 2px dashed #d1d5db;">
            <div style="font-size: 14px; margin-bottom: 5px;">Power-to-Weight Ratio</div>
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">Not Available</div>
            <div style="font-size: 12px;">Enter rider weight for w/kg analysis</div>
          </div>
          `}
        </div>

        ${wattsPerKgStats ? `
        <!-- Performance Grade -->
        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
            <div>
              <div style="font-size: 18px; color: #374151; margin-bottom: 5px;">Performance Grade</div>
              <div style="font-size: 48px; font-weight: bold; color: #8b5cf6;">${wattsPerKgStats.grade}</div>
            </div>
            <div style="text-align: left;">
              <div style="font-size: 20px; font-weight: bold; color: #374151;">${wattsPerKgStats.category}</div>
              <div style="font-size: 14px; color: #6b7280; margin: 5px 0;">${wattsPerKgStats.percentile}th percentile</div>
              <div style="font-size: 12px; color: #8b5cf6; font-style: italic;">${getPerformanceDescription()}</div>
            </div>
          </div>
        </div>
        ` : ''}
      </div>

      <!-- Power Analysis -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #374151; font-size: 22px; margin-bottom: 20px; border-left: 4px solid #8b5cf6; padding-left: 15px;">⚡ Power Analysis</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Average Power</div>
            <div style="font-size: 20px; font-weight: bold; color: #374151;">${stats.average}w</div>
          </div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Normalized Power</div>
            <div style="font-size: 20px; font-weight: bold; color: #374151;">${stats.normalized}w</div>
          </div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Variability Index</div>
            <div style="font-size: 20px; font-weight: bold; color: ${Number(stats.variabilityIndex) > 1.1 ? '#ef4444' : Number(stats.variabilityIndex) > 1.05 ? '#f59e0b' : '#10b981'};">${stats.variabilityIndex}</div>
          </div>
        </div>

        <!-- Pacing Analysis -->
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px;">
          <div style="font-size: 14px; font-weight: bold; color: #92400e; margin-bottom: 8px;">🎯 Pacing Strategy</div>
          <div style="font-size: 13px; color: #78350f;">
            <strong>Power fade:</strong> ${pacing.fadePct}% • 
            <strong>Strategy:</strong> ${pacing.strategy} • 
            ${pacing.wattsLost > 0 ? `<strong>Potential gain:</strong> +${pacing.wattsLost}w with better pacing` : 'Excellent pacing consistency'}
          </div>
        </div>
      </div>

      ${heartRateStats ? `
      <!-- Heart Rate Analysis -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #374151; font-size: 22px; margin-bottom: 20px; border-left: 4px solid #8b5cf6; padding-left: 15px;">❤️ Heart Rate Analysis</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #991b1b; margin-bottom: 5px;">Average HR</div>
            <div style="font-size: 20px; font-weight: bold; color: #dc2626;">${heartRateStats.average} bpm</div>
          </div>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #991b1b; margin-bottom: 5px;">Est. LTHR</div>
            <div style="font-size: 20px; font-weight: bold; color: #dc2626;">${heartRateStats.lthr} bpm</div>
          </div>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #991b1b; margin-bottom: 5px;">HR Drift</div>
            <div style="font-size: 20px; font-weight: bold; color: ${Number(heartRateStats.hrDrift) > 5 ? '#dc2626' : Number(heartRateStats.hrDrift) > 3 ? '#f59e0b' : '#16a34a'};">${heartRateStats.hrDrift}%</div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Detailed Performance Statistics -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #374151; font-size: 22px; margin-bottom: 20px; border-left: 4px solid #8b5cf6; padding-left: 15px;">📊 Detailed Statistics</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Maximum Power</div>
            <div style="font-size: 18px; font-weight: bold; color: #374151;">${stats.max}w</div>
          </div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Minimum Power</div>
            <div style="font-size: 18px; font-weight: bold; color: #374151;">${stats.min}w</div>
          </div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Intensity Factor</div>
            <div style="font-size: 18px; font-weight: bold; color: #374151;">${stats.intensityFactor}</div>
          </div>
        </div>

        ${heartRateStats ? `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #991b1b; margin-bottom: 5px;">Max Heart Rate</div>
            <div style="font-size: 18px; font-weight: bold; color: #dc2626;">${heartRateStats.max} bpm</div>
          </div>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #991b1b; margin-bottom: 5px;">Cardiac Drift</div>
            <div style="font-size: 18px; font-weight: bold; color: #dc2626;">${heartRateStats.cardiacDrift} bpm/W</div>
          </div>
        </div>
        ` : ''}
      </div>

      <!-- Coaching Insights -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #374151; font-size: 22px; margin-bottom: 20px; border-left: 4px solid #8b5cf6; padding-left: 15px;">💡 Performance Insights</h2>
        
        <div style="background: #f3f4f6; border-radius: 12px; padding: 20px;">
          <div style="margin-bottom: 15px;">
            <div style="font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 8px;">Pacing Analysis</div>
            <div style="font-size: 13px; color: #6b7280; line-height: 1.5;">
              ${pacing.strategy === 'even' ? 'Excellent pacing! You maintained consistent power throughout the test, which is optimal for FTP testing.' : 
                pacing.strategy === 'negative-split' ? 'You finished stronger than you started - great mental strength! Consider starting slightly harder for even better results.' :
                pacing.strategy === 'positive-split' ? 'You started strong but faded towards the end. Try starting more conservatively to maintain power throughout the test.' :
                'Your pacing shows some variability. Focus on maintaining steady effort for more accurate FTP measurement.'}
            </div>
          </div>
          
          ${Number(stats.variabilityIndex) > 1.1 ? `
          <div style="margin-bottom: 15px;">
            <div style="font-size: 14px; font-weight: bold; color: #dc2626; margin-bottom: 8px;">⚠️ Power Consistency</div>
            <div style="font-size: 13px; color: #6b7280; line-height: 1.5;">
              Your power output varied significantly (VI: ${stats.variabilityIndex}). For more accurate FTP testing, try to maintain steadier power output. This will give you a better estimate of your sustainable threshold power.
            </div>
          </div>
          ` : Number(stats.variabilityIndex) > 1.05 ? `
          <div style="margin-bottom: 15px;">
            <div style="font-size: 14px; font-weight: bold; color: #f59e0b; margin-bottom: 8px;">📊 Power Consistency</div>
            <div style="font-size: 13px; color: #6b7280; line-height: 1.5;">
              Good power consistency (VI: ${stats.variabilityIndex}). Small improvements in maintaining steady effort could yield even more accurate results.
            </div>
          </div>
          ` : `
          <div style="margin-bottom: 15px;">
            <div style="font-size: 14px; font-weight: bold; color: #10b981; margin-bottom: 8px;">✅ Excellent Consistency</div>
            <div style="font-size: 13px; color: #6b7280; line-height: 1.5;">
              Outstanding power consistency (VI: ${stats.variabilityIndex})! This indicates excellent pacing and provides a highly reliable FTP estimate.
            </div>
          </div>
          `}

          ${wattsPerKgStats ? `
          <div>
            <div style="font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 8px;">🎯 Performance Level</div>
            <div style="font-size: 13px; color: #6b7280; line-height: 1.5;">
              Your power-to-weight ratio of ${wattsPerKgStats.classicFTPPerKg}w/kg places you in the <strong>${wattsPerKgStats.category}</strong> category (${wattsPerKgStats.percentile}th percentile). ${getPerformanceDescription()}
            </div>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Training Zones -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #374151; font-size: 22px; margin-bottom: 20px; border-left: 4px solid #8b5cf6; padding-left: 15px;">🎯 Your Training Zones</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; margin-bottom: 15px;">
          <div style="background: #dcfce7; padding: 12px; border-radius: 6px;">
            <strong>Zone 1 (Active Recovery):</strong><br>
            ${Math.round(stats.classicFTP * 0.55)} - ${Math.round(stats.classicFTP * 0.75)}w
            <div style="font-size: 11px; color: #059669; margin-top: 4px;">Easy recovery rides</div>
          </div>
          <div style="background: #dbeafe; padding: 12px; border-radius: 6px;">
            <strong>Zone 2 (Endurance):</strong><br>
            ${Math.round(stats.classicFTP * 0.76)} - ${Math.round(stats.classicFTP * 0.90)}w
            <div style="font-size: 11px; color: #2563eb; margin-top: 4px;">Base building efforts</div>
          </div>
          <div style="background: #fef3c7; padding: 12px; border-radius: 6px;">
            <strong>Zone 3 (Tempo):</strong><br>
            ${Math.round(stats.classicFTP * 0.91)} - ${Math.round(stats.classicFTP * 1.05)}w
            <div style="font-size: 11px; color: #d97706; margin-top: 4px;">Steady rhythm rides</div>
          </div>
          <div style="background: #fed7aa; padding: 12px; border-radius: 6px;">
            <strong>Zone 4 (Threshold):</strong><br>
            ${Math.round(stats.classicFTP * 1.06)} - ${Math.round(stats.classicFTP * 1.20)}w
            <div style="font-size: 11px; color: #ea580c; margin-top: 4px;">FTP intervals</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
          <div style="background: #fee2e2; padding: 12px; border-radius: 6px;">
            <strong>Zone 5 (VO2 Max):</strong><br>
            ${Math.round(stats.classicFTP * 1.21)} - ${Math.round(stats.classicFTP * 1.50)}w
            <div style="font-size: 11px; color: #dc2626; margin-top: 4px;">High intensity intervals</div>
          </div>
          <div style="background: #fce7f3; padding: 12px; border-radius: 6px;">
            <strong>Zone 6 (Anaerobic):</strong><br>
            ${Math.round(stats.classicFTP * 1.51)}w+
            <div style="font-size: 11px; color: #be185d; margin-top: 4px;">Neuromuscular power</div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 11px;">
        <p style="margin: 0;">Generated by React FTP Analyzer • ${date.toLocaleString()}</p>
        <p style="margin: 5px 0 0 0;">This report provides estimated training zones based on your FTP test. Consult with a cycling coach for personalized training guidance.</p>
      </div>
    </div>
  `;
}