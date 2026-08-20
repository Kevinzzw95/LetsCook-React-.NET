import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

export interface RedisHealth {
  configured: boolean;
  status: 'disabled' | 'up' | 'down';
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redisUrl?: string;
  private readonly connectTimeout: number;
  private client?: RedisClient;
  private connectionAttempt?: Promise<boolean>;

  constructor(private readonly config: ConfigService) {
    this.redisUrl = this.config.get<string>('REDIS_URL')?.trim() || undefined;
    const configuredTimeout = Number(this.config.get('REDIS_CONNECT_TIMEOUT_MS', '1000'));
    this.connectTimeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 1000;
  }

  async onModuleInit(): Promise<void> {
    if (!this.redisUrl) {
      this.logger.log('Redis is disabled because REDIS_URL is not configured');
      return;
    }
    await this.ensureConnected();
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client?.isOpen) return;
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  async health(): Promise<RedisHealth> {
    if (!this.redisUrl) return { configured: false, status: 'disabled' };
    try {
      if (!await this.ensureConnected()) return { configured: true, status: 'down' };
      await this.client!.ping();
      return { configured: true, status: 'up' };
    } catch {
      return { configured: true, status: 'down' };
    }
  }

  async get(key: string): Promise<string | null> {
    if (!await this.ensureConnected()) return null;
    try {
      return await this.client!.get(key);
    } catch (error) {
      this.warn('read', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!await this.ensureConnected()) return false;
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client!.set(key, value, { EX: ttlSeconds });
      } else {
        await this.client!.set(key, value);
      }
      return true;
    } catch (error) {
      this.warn('write', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!await this.ensureConnected()) return false;
    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      this.warn('delete', error);
      return false;
    }
  }

  private async ensureConnected(): Promise<boolean> {
    if (!this.redisUrl) return false;
    if (this.client?.isReady) return true;
    if (this.connectionAttempt) return this.connectionAttempt;
    this.connectionAttempt = this.connect().finally(() => {
      this.connectionAttempt = undefined;
    });
    return this.connectionAttempt;
  }

  private async connect(): Promise<boolean> {
    try {
      if (!this.client) {
        this.client = createClient({
          url: this.redisUrl,
          socket: { connectTimeout: this.connectTimeout, reconnectStrategy: false },
        });
        this.client.on('error', () => undefined);
      }
      if (!this.client.isOpen) await this.client.connect();
      this.logger.log('Redis connection established');
      return this.client.isReady;
    } catch (error) {
      this.warn('connection', error);
      return false;
    }
  }

  private warn(operation: string, error: unknown): void {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? ` (${String((error as { code?: unknown }).code)})`
      : '';
    this.logger.warn(`Redis ${operation} failed${code}; continuing without cache`);
  }
}
