import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  it('is disabled when REDIS_URL is not configured', async () => {
    const service = new RedisService(new ConfigService({}));
    await service.onModuleInit();
    await expect(service.health()).resolves.toEqual({ configured: false, status: 'disabled' });
    await expect(service.get('missing')).resolves.toBeNull();
    await expect(service.set('key', 'value')).resolves.toBe(false);
  });

  it('does not fail startup for an invalid Redis URL', async () => {
    const service = new RedisService(new ConfigService({ REDIS_URL: 'not-a-redis-url' }));
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    await expect(service.health()).resolves.toEqual({ configured: true, status: 'down' });
  });
});
