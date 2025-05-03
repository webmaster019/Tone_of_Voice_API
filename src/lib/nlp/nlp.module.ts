import { Module } from '@nestjs/common';
import { NlpService } from './nlp.service';

@Module({
  providers: [NlpService],
  exports: [NlpService],
})
export class NlpModule {}
