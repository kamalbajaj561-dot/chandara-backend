import { EmailTemplateService, TemplateVariables } from '../emailTemplate.service';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
jest.mock('../redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
}));

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;
  const mockTemplateDir = '/mock/templates/email';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmailTemplateService({
      templateDir: mockTemplateDir,
      cacheEnabled: false,
    });
  });

  describe('renderTemplate', () => {
    it('should render template with variables', async () => {
      const templateContent = '<h1>Hello {{userName}}</h1><p>Welcome to {{platformName}}</p>';
      const variables: TemplateVariables = {
        userName: 'John',
        platformName: 'Chandara',
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(templateContent);

      const result = await service.renderTemplate('welcome', variables);

      expect(result).toContain('Hello John');
      expect(result).toContain('Welcome to Chandara');
      expect(fs.existsSync).toHaveBeenCalledWith(path.join(mockTemplateDir, 'welcome.html'));
      expect(fs.readFileSync).toHaveBeenCalledWith(path.join(mockTemplateDir, 'welcome.html'), 'utf-8');
    });

    it('should handle missing variables gracefully', async () => {
      const templateContent = '<h1>Hello {{userName}}</h1><p>Welcome to {{platformName}}</p>';
      const variables: TemplateVariables = {
        userName: 'John',
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(templateContent);

      const result = await service.renderTemplate('welcome', variables);

      expect(result).toContain('Hello John');
      expect(result).toContain('Welcome to '); // Empty string for missing variable
    });

    it('should throw error if template not found', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.renderTemplate('nonexistent', {})).rejects.toThrow('Failed to render template nonexistent');
    });

    it('should handle numeric variables', async () => {
      const templateContent = '<p>Order ID: {{orderId}}</p><p>Amount: {{amount}}</p>';
      const variables: TemplateVariables = {
        orderId: 12345,
        amount: 99.99,
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(templateContent);

      const result = await service.renderTemplate('order', variables);

      expect(result).toContain('Order ID: 12345');
      expect(result).toContain('Amount: 99.99');
    });
  });

  describe('getDefaultVariables', () => {
    it('should return default variables', () => {
      const defaults = service.getDefaultVariables();

      expect(defaults).toHaveProperty('platformName');
      expect(defaults).toHaveProperty('platformUrl');
      expect(defaults).toHaveProperty('supportEmail');
      expect(defaults).toHaveProperty('year');
    });

    it('should include current year', () => {
      const defaults = service.getDefaultVariables();
      const currentYear = new Date().getFullYear();

      expect(defaults.year).toBe(currentYear);
    });
  });

  describe('mergeVariables', () => {
    it('should merge custom variables with defaults', () => {
      const customVars: TemplateVariables = {
        userName: 'John',
        eventName: 'Test Event',
      };

      const merged = service.mergeVariables(customVars);

      expect(merged.userName).toBe('John');
      expect(merged.eventName).toBe('Test Event');
      expect(merged).toHaveProperty('platformName');
      expect(merged).toHaveProperty('year');
    });

    it('should override defaults with custom values', () => {
      const customVars: TemplateVariables = {
        platformName: 'Custom Platform',
      };

      const merged = service.mergeVariables(customVars);

      expect(merged.platformName).toBe('Custom Platform');
    });
  });

  describe('clearTemplateCache', () => {
    it('should clear template cache', async () => {
      await expect(service.clearTemplateCache('welcome')).resolves.not.toThrow();
    });

    it('should clear all caches when no template specified', async () => {
      await expect(service.clearTemplateCache()).resolves.not.toThrow();
    });
  });
});
