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

  it('should write info and error messages through its transports', () => {
    // winston writes via its own transports, not console.log; assert on the transport stream.
    const winston = require('winston');
    const Transport = require('winston-transport');
    const received: any[] = [];
    class Capture extends Transport {
      log(info: any, cb: () => void) { received.push(info); cb(); }
    }
    const transport = new Capture();
    logger.add(transport as any);
    logger.info('Test info message');
    logger.error('Test error message');
    logger.remove(transport as any);
    expect(received.map((r) => r.message)).toEqual(expect.arrayContaining(['Test info message', 'Test error message']));
    expect(winston).toBeDefined();
  });
});
