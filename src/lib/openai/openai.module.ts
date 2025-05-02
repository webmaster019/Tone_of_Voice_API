import { Module } from '@nestjs/common';
import { OpenAiService } from './openai.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports:[ConfigModule],
  providers: [OpenAiService],
  exports: [OpenAiService],
})
export class OpenAiModule {}
