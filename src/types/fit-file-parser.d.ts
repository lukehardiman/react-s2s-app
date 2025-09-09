declare module 'fit-file-parser' {
  interface FitParserOptions {
    force?: boolean;
    speedUnit?: string;
    lengthUnit?: string;
    temperatureUnit?: string;
    elapsedRecordField?: boolean;
    mode?: string;
  }

  interface FitRecord {
    timestamp?: Date;
    power?: number;
    heart_rate?: number;
    cadence?: number;
    distance?: number;
    speed?: number;
    [key: string]: any;
  }

  interface FitData {
    records: FitRecord[];
    file_id?: any[];
    sport?: any[];
    [key: string]: any;
  }

  class FitParser {
    constructor(options?: FitParserOptions);
    parse(content: ArrayBuffer, callback: (error: any, data: FitData) => void): void;
  }

  export = FitParser;
}