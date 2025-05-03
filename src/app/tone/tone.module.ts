import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ToneSignature } from './entity/tone-signature.entity';
import { ToneService } from './tone.service';
import { ToneController } from './tone.controller';
import { OpenAiModule } from '../../lib/openai/openai.module';
import { NlpModule } from '../../lib/nlp/nlp.module';
import { ToneEvaluation } from './entity/tone-evaluation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ToneSignature, ToneEvaluation]), OpenAiModule,NlpModule],
  controllers: [ToneController],
  providers: [ToneService],
})
export class ToneModule {}
