import { ExportOptions } from '../types';
import logger from '../utils/logger';

/**
 * Export Service
 * Handles exporting analytics data in various formats
 */
export class ExportService {
  /**
   * Export data as CSV
   */
  async exportAsCSV(data: any[]): Promise<string> {
    if (data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Handle nested objects and arrays
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Export data as JSON
   */
  async exportAsJSON(data: any[]): Promise<string> {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Export data as Excel (simplified CSV-based approach)
   * For full Excel support, would need xlsx library
   */
  async exportAsExcel(data: any[]): Promise<string> {
    // For now, return CSV with .xlsx extension
    // In production, use xlsx library for true Excel format
    logger.warn('Excel export using CSV format. Install xlsx library for true Excel support.');
    return this.exportAsCSV(data);
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(data: any[], options: ExportOptions): Promise<{
    content: string;
    contentType: string;
    filename: string;
  }> {
    const timestamp = new Date().toISOString().split('T')[0];
    let filename = `analytics-${timestamp}.${options.format}`;
    let content: string;
    let contentType: string;

    switch (options.format) {
      case 'csv':
        content = await this.exportAsCSV(data);
        contentType = 'text/csv';
        filename = `analytics-${timestamp}.csv`;
        break;
      case 'json':
        content = await this.exportAsJSON(data);
        contentType = 'application/json';
        break;
      case 'xlsx':
        content = await this.exportAsExcel(data);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `analytics-${timestamp}.xlsx`;
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    return { content, contentType, filename };
  }

  /**
   * Flatten nested objects for CSV export
   */
  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(result, this.flattenObject(value, newKey));
        } else if (Array.isArray(value)) {
          result[newKey] = JSON.stringify(value);
        } else {
          result[newKey] = value;
        }
      }
    }

    return result;
  }

  /**
   * Prepare data for export
   */
  prepareDataForExport(data: any[]): any[] {
    return data.map(item => this.flattenObject(item));
  }
}

export const exportService = new ExportService();
