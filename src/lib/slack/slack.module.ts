import { Module, Global, forwardRef } from '@nestjs/common';
import { SlackService } from './slack.service';
import { ConfigModule } from '../config/config.module';
import { ToneModule } from '../../app/tone/tone.module';
import { SlackController } from './slack.controller';

@Global()
@Module({
  imports: [ConfigModule, forwardRef(() => ToneModule),],
  providers: [SlackService],
  controllers:[SlackController],
  exports: [SlackService],
})
export class SlackModule {}
