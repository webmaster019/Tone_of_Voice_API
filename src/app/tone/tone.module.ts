import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ToneSignature } from './entity/tone-signature.entity';
import { ToneService } from './tone.service';
import { ToneController } from './tone.controller';
import { OpenAiModule } from '../../lib/openai/openai.module';
import { NlpModule } from '../../lib/nlp/nlp.module';
import { ToneEvaluation } from './entity/tone-evaluation.entity';
import { ToneFeedback } from './entity/tone-feedback.entity';
import { RedisModule } from '../../lib/redis/redis.module';
import { EvaluationController } from './ evaluation.controller';
import { SlackModule } from '../../lib/slack/slack.module';
import { ToneRejection } from './entity/tone-rejection.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ToneSignature, ToneEvaluation, ToneFeedback,ToneRejection]), OpenAiModule,NlpModule, RedisModule, SlackModule],
  controllers: [ToneController,EvaluationController],
  providers: [ToneService],
  exports:[ToneService]
})
export class ToneModule {}
