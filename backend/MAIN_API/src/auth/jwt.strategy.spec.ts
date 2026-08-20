import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'test-secret' }));

  it('accepts the NestJS nameid claim', () => {
    expect(strategy.validate({ nameid: 'user-123', unique_name: 'chef', email: 'chef@example.com' }))
      .toEqual({ id: 'user-123', username: 'chef', email: 'chef@example.com', roles: [] });
  });

  it('rejects tokens without nameid', () => {
    expect(() => strategy.validate({})).toThrow(UnauthorizedException);
  });
});
