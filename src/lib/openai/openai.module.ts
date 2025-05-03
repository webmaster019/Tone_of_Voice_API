import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { OpenAiService } from './openai.service';

@Module({
  imports:[ConfigModule],
  providers: [OpenAiService],
  exports: [OpenAiService],
})
export class OpenAiModule {}
