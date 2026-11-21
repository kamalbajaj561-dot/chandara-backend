import logger from '../logger';

describe('Logger', () => {
  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should have info method', () => {
    expect(logger.info).toBeDefined();
  });

  it('should have error method', () => {
    expect(logger.error).toBeDefined();
  });

  it('should have warn method', () => {
    expect(logger.warn).toBeDefined();
  });

  it('should log info message', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    logger.info('Test info message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log error message', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    logger.error('Test error message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
