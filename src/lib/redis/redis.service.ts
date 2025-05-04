import { Injectable } from '@nestjs/common';
import { redisClient } from './redis-client';

@Injectable()
export class RedisService {
  private readonly client = redisClient;

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl = 3600) {
    await this.client.set(key, value, { EX: ttl });
  }

  async hincrby(key: string, field: string, amount = 1): Promise<number> {
    return await this.client.hIncrBy(key, field, amount);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hGetAll(key);
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }
}
