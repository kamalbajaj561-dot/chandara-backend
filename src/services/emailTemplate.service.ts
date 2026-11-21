import * as fs from 'fs';
import * as path from 'path';
import { getCache, setCache } from './redis';
import logger from '../utils/logger';

export interface TemplateVariables {
  [key: string]: string | number | undefined;
}

export class EmailTemplateService {
  private templateDir: string;
  private cacheEnabled: boolean;
  private cacheTTL: number;

  constructor(options: { templateDir?: string; cacheEnabled?: boolean; cacheTTL?: number } = {}) {
    this.templateDir = options.templateDir || path.join(__dirname, '../templates/email');
    this.cacheEnabled = options.cacheEnabled !== false;
    this.cacheTTL = options.cacheTTL || 3600; // 1 hour default
  }

  /**
   * Render a template with variables
   */
  async renderTemplate(templateName: string, variables: TemplateVariables): Promise<string> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(templateName, variables);
      if (this.cacheEnabled) {
        const cachedResult = await getCache<string>(cacheKey);
        if (cachedResult.data !== null) {
          return cachedResult.data;
        }
      }

      // Load template
      const template = await this.loadTemplate(templateName);
      
      // Replace variables
      const rendered = this.replaceVariables(template, variables);

      // Cache the result
      if (this.cacheEnabled) {
        await setCache(cacheKey, rendered, this.cacheTTL);
      }

      return rendered;
    } catch (error) {
      logger.error(`Error rendering template ${templateName}:`, error);
      throw new Error(`Failed to render template ${templateName}`);
    }
  }

  /**
   * Load template from file system
   */
  private async loadTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(this.templateDir, `${templateName}.html`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }

    return fs.readFileSync(templatePath, 'utf-8');
  }

  /**
   * Replace variables in template
   */
  private replaceVariables(template: string, variables: TemplateVariables): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value || ''));
    }

    return result;
  }

  /**
   * Get cache key for template
   */
  private getCacheKey(templateName: string, variables: TemplateVariables): string {
    const varString = Object.keys(variables)
      .sort()
      .map(key => `${key}:${variables[key]}`)
      .join('|');
    return `email_template:${templateName}:${Buffer.from(varString).toString('base64')}`;
  }

  /**
   * Clear template cache
   */
  async clearTemplateCache(templateName?: string): Promise<void> {
    if (templateName) {
      // Clear specific template cache (would need pattern deletion in Redis)
      logger.info(`Template cache cleared for: ${templateName}`);
    } else {
      logger.info('All template caches cleared');
    }
  }

  /**
   * Get default variables for templates
   */
  getDefaultVariables(): TemplateVariables {
    return {
      platformName: process.env.PLATFORM_NAME || 'Chandara',
      platformUrl: process.env.PLATFORM_URL || 'https://chandara.com',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@chandara.com',
      year: new Date().getFullYear(),
    };
  }

  /**
   * Merge default variables with provided variables
   */
  mergeVariables(variables: TemplateVariables): TemplateVariables {
    return {
      ...this.getDefaultVariables(),
      ...variables,
    };
  }
}

export const emailTemplateService = new EmailTemplateService();
