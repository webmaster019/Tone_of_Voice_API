import { Injectable } from '@nestjs/common';
import { config } from './env.config';

@Injectable()
export class ConfigService {
  private readonly envConfig = config;

  get(key: string): string {
    return this.envConfig[key];
  }
}
