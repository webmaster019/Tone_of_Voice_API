import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ToneService } from '../app/tone/tone.service';
import { SlackService } from '../lib/slack/slack.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RetuneJobService {
  private readonly logger = new Logger(RetuneJobService.name);

  constructor(
    private readonly toneService: ToneService,
    private readonly slack: SlackService,
    private readonly config: ConfigService,
  ) {}
  //@Cron('*/30 * * * * *')
  @Cron('0 */60 * * * *')
  async handleToneRetune() {
    const brands = await this.toneService.listAllBrands();

    for (const brandId of brands) {
      this.logger.debug(`Processing brandId: ${brandId}`);
      const drifted = await this.toneService.findDriftedEvaluations(brandId);
      this.logger.debug(`Drifted length for ${brandId}: ${drifted.length}`);

      if (drifted.length > 0) {
        this.logger.log(`⚠️ Tone drift detected for ${brandId}`);
        const suggestion = await this.toneService.suggestUpdatedToneSignature(brandId, drifted);

        try {
          await this.slack.sendToneDriftAlert(brandId, suggestion, {
            triggeredBy: 'cron',
            mentionUserIds: this.config.get<string>('SLACK_NOTIFY_USER_IDS')?.split(','),
            mentionChannel: this.config.get<string>('SLACK_NOTIFY_CHANNEL'),
          });
          this.logger.log(`✅ Slack message sent successfully for brand ${brandId}`);
        } catch (error) {
          this.logger.error(`❌ Failed to send Slack message for brand ${brandId}: ${error.message}`);
        }
      }
    }
  }
}
