import config from '../index';

describe('Config', () => {
  it('should be defined', () => {
    expect(config).toBeDefined();
  });

  it('should have nodeEnv', () => {
    expect(config.nodeEnv).toBeDefined();
  });

  it('should have port', () => {
    expect(config.port).toBeDefined();
    expect(typeof config.port).toBe('number');
  });

  it('should have apiPrefix', () => {
    expect(config.apiPrefix).toBeDefined();
  });

  it('should have firebase config', () => {
    expect(config.firebase).toBeDefined();
    expect(config.firebase.projectId).toBeDefined();
    expect(config.firebase.privateKey).toBeDefined();
    expect(config.firebase.clientEmail).toBeDefined();
  });

  it('should have livekit config', () => {
    expect(config.livekit).toBeDefined();
    expect(config.livekit.url).toBeDefined();
    expect(config.livekit.apiKey).toBeDefined();
    expect(config.livekit.apiSecret).toBeDefined();
  });

  it('should have redis config', () => {
    expect(config.redis).toBeDefined();
    expect(config.redis.host).toBeDefined();
    expect(config.redis.port).toBeDefined();
  });

  it('should have jwt config', () => {
    expect(config.jwt).toBeDefined();
    expect(config.jwt.secret).toBeDefined();
    expect(config.jwt.expiresIn).toBeDefined();
  });

  it('should have cors config', () => {
    expect(config.cors).toBeDefined();
    expect(config.cors.origin).toBeDefined();
  });

  it('should have rateLimit config', () => {
    expect(config.rateLimit).toBeDefined();
    expect(config.rateLimit.windowMs).toBeDefined();
    expect(config.rateLimit.maxRequests).toBeDefined();
  });

  it('should have logging config', () => {
    expect(config.logging).toBeDefined();
    expect(config.logging.level).toBeDefined();
    expect(config.logging.filePath).toBeDefined();
  });

  it('should have socket config', () => {
    expect(config.socket).toBeDefined();
    expect(config.socket.corsOrigin).toBeDefined();
  });
});
