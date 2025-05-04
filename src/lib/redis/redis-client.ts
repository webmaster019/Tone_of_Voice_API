import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '../config/config.service';
import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';

dotenv.config();
const logger = new Logger('Redis-client');
const configService = new ConfigService();
const isDevelopment = configService.get("NODE_ENV") === 'local';

const redisClient: RedisClientType = createClient({
  url: configService.get('APP_REDIS_URL'),
  socket: !isDevelopment ? { tls: true, rejectUnauthorized: false } : {},
});

redisClient
  .connect()
  .then(() => logger.debug(' Redis connected successfully'))
  .catch((error: Error) => logger.error(' Redis connection error:', error));

redisClient.on('error', (error: Error) => {
  logger.error('Redis client error:', error);
});

export { redisClient };
