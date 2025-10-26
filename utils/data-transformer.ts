import * as fs from 'fs';
import * as path from 'path';

interface HealthMetric {
  timestamp: string;
  metric_type: string;
  value: number;
  unit: string;
  provider: string;
  metadata?: Record<string, any>;
}

interface TransformConfig {
  inputFormat: 'csv' | 'json' | 'xml';
  outputFormat: 'csv' | 'json';
  provider: string;
  metricType: string;
  mappings: Record<string, string>;
}

class DataTransformer {
  private config: TransformConfig;

  constructor(config: TransformConfig) {
    this.config = config;
  }

  async transformFile(inputPath: string, outputPath: string): Promise<void> {
    console.log(`🔄 Transforming ${inputPath} -> ${outputPath}`);

    try {
      const inputData = this.readInputFile(inputPath);
      const transformedData = this.transformData(inputData);
      this.writeOutputFile(outputPath, transformedData);

      console.log(`✓ Transformed ${transformedData.length} records`);
    } catch (error: any) {
      console.error('❌ Transformation error:', error.message);
      throw error;
    }
  }

  private readInputFile(inputPath: string): any[] {
    const content = fs.readFileSync(inputPath, 'utf8');
    const ext = path.extname(inputPath).toLowerCase();

    switch (ext) {
      case '.json':
        return JSON.parse(content);
      case '.csv':
        return this.parseCsv(content);
      default:
        throw new Error(`Unsupported input format: ${ext}`);
    }
  }

  private parseCsv(content: string): any[] {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });
  }

  private transformData(inputData: any[]): HealthMetric[] {
    return inputData.map(record => {
      const metric: HealthMetric = {
        timestamp: this.mapField(record, 'timestamp'),
        metric_type: this.config.metricType,
        value: parseFloat(this.mapField(record, 'value')),
        unit: this.mapField(record, 'unit') || this.inferUnit(this.config.metricType),
        provider: this.config.provider,
        metadata: this.extractMetadata(record),
      };

      return metric;
    });
  }

  private mapField(record: any, targetField: string): string {
    const sourceField = this.config.mappings[targetField];
    if (!sourceField) {
      throw new Error(`No mapping found for field: ${targetField}`);
    }

    const value = record[sourceField];
    if (value === undefined || value === null) {
      throw new Error(`Missing required field: ${sourceField}`);
    }

    if (targetField === 'timestamp') {
      return this.normalizeTimestamp(value);
    }

    return String(value);
  }

  private normalizeTimestamp(value: string): string {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp: ${value}`);
    }
    return date.toISOString();
  }

  private inferUnit(metricType: string): string {
    const unitMap: Record<string, string> = {
      'glucose': 'mg/dL',
      'heart_rate': 'bpm',
      'steps': 'count',
      'sleep': 'minutes',
      'weight': 'kg',
      'temperature': 'celsius',
      'blood_pressure_systolic': 'mmHg',
      'blood_pressure_diastolic': 'mmHg',
      'spo2': '%',
    };

    return unitMap[metricType] || 'unknown';
  }

  private extractMetadata(record: any): Record<string, any> {
    const metadata: Record<string, any> = {};
    const standardFields = ['timestamp', 'value', 'unit'];

    Object.entries(record).forEach(([key, value]) => {
      const isMappedField = Object.values(this.config.mappings).includes(key);
      if (!isMappedField && !standardFields.includes(key)) {
        metadata[key] = value;
      }
    });

    return Object.keys(metadata).length > 0 ? metadata : undefined!;
  }

  private writeOutputFile(outputPath: string, data: HealthMetric[]): void {
    const ext = path.extname(outputPath).toLowerCase();

    switch (ext) {
      case '.json':
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        break;
      case '.csv':
        const csv = this.convertToCsv(data);
        fs.writeFileSync(outputPath, csv);
        break;
      default:
        throw new Error(`Unsupported output format: ${ext}`);
    }
  }

  private convertToCsv(data: HealthMetric[]): string {
    if (data.length === 0) return '';

    const headers = ['timestamp', 'metric_type', 'value', 'unit', 'provider'];
    const rows = data.map(record => [
      record.timestamp,
      record.metric_type,
      record.value,
      record.unit,
      record.provider,
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  static createPresetConfig(provider: string): TransformConfig {
    const presets: Record<string, TransformConfig> = {
      dexcom: {
        inputFormat: 'csv',
        outputFormat: 'json',
        provider: 'dexcom',
        metricType: 'glucose',
        mappings: {
          timestamp: 'Timestamp (YYYY-MM-DDThh:mm:ss)',
          value: 'Glucose Value (mg/dL)',
          unit: 'Unit',
        },
      },
      fitbit: {
        inputFormat: 'json',
        outputFormat: 'json',
        provider: 'fitbit',
        metricType: 'steps',
        mappings: {
          timestamp: 'dateTime',
          value: 'value',
          unit: 'unit',
        },
      },
      oura: {
        inputFormat: 'json',
        outputFormat: 'json',
        provider: 'oura',
        metricType: 'sleep',
        mappings: {
          timestamp: 'bedtime_start',
          value: 'total_sleep_duration',
          unit: 'unit',
        },
      },
      terra: {
        inputFormat: 'json',
        outputFormat: 'json',
        provider: 'terra',
        metricType: 'heart_rate',
        mappings: {
          timestamp: 'timestamp',
          value: 'value',
          unit: 'unit',
        },
      },
    };

    if (!presets[provider]) {
      throw new Error(`No preset config for provider: ${provider}`);
    }

    return presets[provider];
  }
}

class BatchTransformer {
  async processDirectory(inputDir: string, outputDir: string, config: TransformConfig): Promise<void> {
    console.log(`📂 Processing directory: ${inputDir}`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const files = fs.readdirSync(inputDir);
    const inputFiles = files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ext === `.${config.inputFormat}`;
    });

    console.log(`Found ${inputFiles.length} files to process`);

    for (const file of inputFiles) {
      const inputPath = path.join(inputDir, file);
      const outputFile = path.basename(file, path.extname(file)) + `.${config.outputFormat}`;
      const outputPath = path.join(outputDir, outputFile);

      const transformer = new DataTransformer(config);
      await transformer.transformFile(inputPath, outputPath);
    }

    console.log(`✓ Batch processing complete`);
  }

  async mergeFiles(inputFiles: string[], outputFile: string): Promise<void> {
    console.log(`🔗 Merging ${inputFiles.length} files into ${outputFile}`);

    const allData: any[] = [];

    for (const file of inputFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const data = JSON.parse(content);
      allData.push(...(Array.isArray(data) ? data : [data]));
    }

    fs.writeFileSync(outputFile, JSON.stringify(allData, null, 2));
    console.log(`✓ Merged ${allData.length} records into ${outputFile}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
USAGE:
  data-transformer transform <provider> <input> <output>
  data-transformer batch <provider> <input-dir> <output-dir>
  data-transformer merge <output> <input1> <input2> ...

EXAMPLES:
  data-transformer transform dexcom glucose.csv glucose.json
  data-transformer batch fitbit ./raw-data ./processed-data
  data-transformer merge combined.json file1.json file2.json
    `);
    return;
  }

  switch (command) {
    case 'transform': {
      const [, provider, input, output] = args;
      const config = DataTransformer.createPresetConfig(provider);
      const transformer = new DataTransformer(config);
      await transformer.transformFile(input, output);
      break;
    }
    case 'batch': {
      const [, provider, inputDir, outputDir] = args;
      const config = DataTransformer.createPresetConfig(provider);
      const batchTransformer = new BatchTransformer();
      await batchTransformer.processDirectory(inputDir, outputDir, config);
      break;
    }
    case 'merge': {
      const [, output, ...inputs] = args;
      const batchTransformer = new BatchTransformer();
      await batchTransformer.mergeFiles(inputs, output);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { DataTransformer, BatchTransformer };
