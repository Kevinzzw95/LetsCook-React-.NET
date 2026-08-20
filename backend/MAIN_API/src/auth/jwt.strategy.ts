import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from './auth-user.decorator';

interface TokenPayload {
  nameid?: unknown;
  unique_name?: string;
  email?: string;
  role?: string | string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS512'],
    });
  }

  validate(payload: TokenPayload): AuthenticatedUser {
    if (typeof payload.nameid !== 'string' || !payload.nameid.trim()) throw new UnauthorizedException();
    const roles = Array.isArray(payload.role) ? payload.role : payload.role ? [payload.role] : [];
    return { id: payload.nameid, username: payload.unique_name ?? '', email: payload.email ?? '', roles };
  }
}
