import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('health') health() { return { status: 'ok' }; }
  @Get('ready') async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1 FROM "Recipes" LIMIT 1`;
      return { status: 'ready' };
    } catch { throw new ServiceUnavailableException('Database unavailable or not initialized'); }
  }
}
