import { Module } from '@nestjs/common';
import { RetuneJobService } from './retune-job.service';
import { ToneModule } from '../app/tone/tone.module';
import { SlackModule } from '../lib/slack/slack.module';

@Module({
  imports: [ToneModule, SlackModule],
  providers: [RetuneJobService],
  exports:[RetuneJobService]
})
export class JobModule {}
