# Science to Sport FTP Analyser

A professional React-based cycling FTP (Functional Threshold Power) analysis tool for Science to Sport's internal use. This application provides comprehensive power data analysis, educational content, and detailed performance insights for cyclists.

## 🚴‍♂️ Features

### Core Analysis
- **FTP Calculation**: Classic and Normalised Power-based FTP estimation
- **Pacing Analysis**: Detailed pacing strategy evaluation with coaching insights
- **Power Metrics**: Comprehensive power statistics including Variability Index and Intensity Factor
- **Heart Rate Analysis**: LTHR estimation, cardiac drift, and HR zone analysis
- **Watts/kg Performance**: Graded performance classification from Untrained to World Class

### Data Support
- **Multiple File Formats**: FIT files, GPX files, and manual CSV data input
- **Comprehensive Data Extraction**: Power, heart rate, speed, elevation, and GPS data
- **Smart Segment Detection**: Automatically extracts best 20-minute effort from longer workouts
- **Data Validation**: Handles missing data and provides intelligent fallbacks

### Professional Output
- **PDF Export**: A4-formatted professional reports with cyclist-focused metrics
- **Educational Integration**: Expert coaching videos from Science to Sport team
- **Performance Benchmarking**: Industry-standard performance grading system
- **Coaching Insights**: Actionable recommendations for FTP improvement

### User Experience
- **Browser State Management**: Full localStorage persistence with URL navigation
- **Responsive Design**: Works on desktop and mobile devices
- **Modal System**: Professional UI components replacing browser alerts
- **Real-time Visualisation**: Interactive charts with power smoothing and elevation profiles

## 🛡️ Privacy & Security

This tool is designed for internal Science to Sport use and includes:
- **Bot Blocking**: Comprehensive `.htaccess` configuration prevents search engine indexing
- **Meta Tag Protection**: HTML robots meta tags for additional privacy
- **No External Data**: All analysis performed client-side, no data transmission

## 🛠️ Technical Stack & Dependencies

### Core Framework
- **React 19**: Latest React with concurrent features and improved TypeScript support
- **TypeScript**: Full type safety and enhanced developer experience
- **Vite**: Lightning-fast build tool with HMR and optimised production builds

### Styling & UI
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Custom Components**: Modal system, form validation, and professional layouts

### Data Visualisation
- **Recharts**: Comprehensive charting library built on D3.js
  - Power curve visualisation with 30-second smoothing
  - Heart rate overlay charts
  - Elevation profile integration
  - Interactive legends and tooltips

### File Processing & Data Analysis
- **fit-file-parser**: Garmin FIT file parsing for cycling computer data
  - Power, heart rate, speed, distance extraction
  - GPS coordinate and elevation data processing
  - Timestamp synchronisation across data streams
- **Custom Analysis Engine**: TypeScript-based FTP calculation algorithms
  - Normalised Power calculation (30-second rolling average)
  - Pacing analysis and coaching insights generation
  - Performance grading system (Untrained to World Class)

### PDF Export & Reporting
- **jsPDF**: Client-side PDF generation with A4 formatting
- **html2canvas**: DOM-to-canvas rendering for high-quality PDF layouts
  - Multi-page pagination handling
  - Professional cycling-focused report templates
  - Embedded charts and performance metrics

### State Management & Persistence
- **React Hooks**: useState, useEffect for local state management
- **localStorage API**: Browser-native data persistence
  - Test result caching and recovery
  - URL-based navigation state handling
  - Graceful data corruption recovery

### Testing & Quality Assurance
- **Vitest**: Modern test runner with native ES modules support
- **React Testing Library**: Component testing with user-focused assertions
- **@testing-library/jest-dom**: Extended DOM matchers for better assertions
- **jsdom**: Browser environment simulation for testing
- **99 Test Suite**: Comprehensive coverage including:
  - FTP calculation algorithms
  - File parsing accuracy
  - State management scenarios
  - UI component behavior

## 🚀 Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
git clone https://github.com/lukehardiman/react-s2s-app.git
cd react-s2s-app
npm install
```

### Development Server
```bash
npm run dev
```
Access at: http://localhost:5173/react-s2s-app/

### Production Build
```bash
npm run build
```

### Testing
```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Single test run
npm run test:run
```

## 📊 Data Analysis Features

### Supported Metrics
- **Classic FTP**: 95% of 20-minute average power
- **Normalised Power FTP**: 95% of Normalised Power (accounts for variability)
- **Pacing Score**: 0-100 rating of pacing strategy execution
- **Cardiac Drift**: Heart rate drift analysis (bpm/watt)
- **Performance Grade**: A+ (World Class) to F (Untrained) classification

### Educational Content
- **Expert Coaching**: John Wakefield (Science to Sport founder, World Tour coach)
- **Protocol Guidance**: Tristan Mitchell FTP testing best practices
- **Actionable Insights**: Specific watt targets and training recommendations

## 🏥 Use Cases

- **Athlete Assessment**: Professional FTP testing and performance benchmarking
- **Coaching Analysis**: Detailed pacing and performance evaluation
- **Progress Tracking**: Historical FTP development and trend analysis
- **Education**: Learning tool with integrated expert coaching content

## 📋 Deployment

Configured for deployment at: `https://www.sciencetosport.com/react-s2s-app/`

The application includes production-ready configurations for subdirectory hosting with proper asset path handling.

## 🤝 Contributing

This is a private Science to Sport internal tool. Development and maintenance by Luke Hardiman with AI assistance from Claude Code.

## 📄 License

Private/Internal Use - Science to Sport

---

*Built with ⚡ Vite and 🚴‍♂️ passion for cycling performance analysis*