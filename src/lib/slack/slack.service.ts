import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { KnownBlock, SectionBlock, ActionsBlock } from '@slack/types';
import { ConfigService } from '../config/config.service';
import { ToneService } from '../../app/tone/tone.service';

@Injectable()
export class SlackService {
  private readonly webhookUrl: string;
  private readonly logger = new Logger(SlackService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly toneService: ToneService,
  ) {
    this.webhookUrl = this.config.get('SLACK_WEBHOOK_URL');
  }

  async send(text: string, blocks?: KnownBlock[]) {
    if (!this.webhookUrl) {
      this.logger.warn('⚠️ Slack webhook URL is not configured.');
      return;
    }

    if (!text && !blocks?.length) {
      this.logger.warn('⚠️ Slack message requires either text or blocks.');
      return;
    }

    try {
      const response = await axios.post(this.webhookUrl, { text, blocks });
      console.log("response",response);
      this.logger.log(`✅ Slack notification sent: ${response.status} ${response.statusText}`);
    } catch (err) {
      this.logger.error('❌ Slack notification failed', err.message);
    }
  }

  async sendToResponseUrl(responseUrl: string, body: any) {
    try {
      await axios.post(responseUrl, body);
      this.logger.log(`✅ Slack message sent to response URL.`,responseUrl);
    } catch (err) {
      console.log(err.response.data);
      this.logger.error(`❌ Failed to send Slack message to response URL:`, err.message);
    }
  }

  async sendAppHome(userId: string, blocks: KnownBlock[]) {
    const slackToken = this.config.get('SLACK_BOT_TOKEN');
    try {
      await axios.post('https://slack.com/api/views.publish', {
        user_id: userId,
        view: {
          type: 'home',
          blocks,
        },
      }, {
        headers: {
          Authorization: `Bearer ${slackToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(`✅ App home updated for user ${userId}`);
    } catch (err) {
      this.logger.error(`❌ Failed to update app home:`, err.message);
    }
  }

  async sendToneDriftAlert(
    brandId: string,
    suggestion: any,
    metadata: { triggeredBy: string; mentionUserIds?: string[]; mentionChannel?: string }
  ) {
    const mentionLine = metadata.mentionUserIds?.map(id => `<@${id}>`).join(' ') ?? '';

    const blocks: KnownBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📢 *Tone Drift Detected* for brand \`${brandId}\`\nTriggered by: ${metadata.triggeredBy}\n${mentionLine}`,
        },
      } as SectionBlock,
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Suggested tone signature update:*\n\n\`\`\`${JSON.stringify(suggestion, null, 2)}\`\`\``,
        },
      } as SectionBlock,
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Approve & Save' },
            style: 'primary',
            action_id: 'approve_signature_update',
            value: JSON.stringify({ brandId, suggestion }),
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❌ Reject with Comment' },
            style: 'danger',
            action_id: 'reject_signature_update',
            value: JSON.stringify({ brandId }),
          },
        ],
      } as ActionsBlock,
    ];

    await this.send(`Tone drift detected for brand ${brandId}`, blocks);
  }

  async updateSignatureAndNotify(brandId: string, suggestion: any, userId: string) {
    await this.sendAppHome(userId, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ Signature for brand \`${brandId}\` updated successfully.`,
        },
      } as SectionBlock,
    ]);
  }

  async getStatsBlock(brandId: string): Promise<KnownBlock[]> {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📊 Stats for brand \`${brandId}\`: _placeholder_`,
        },
      } as SectionBlock,
    ];
  }

  async rewriteAndEvaluate(brandId: string, text: string) {
    return {
      text: `✍️ Rewritten and evaluated text for brand ${brandId}:
> "${text}"`,
    };
  }



  async analyzeText(text: string) {
    const result = await this.toneService.analyzeText(text);
    return  JSON.stringify(result, null, 2) + '```' ;
  }



  async detectBrand(text: string) {
    const result = await this.toneService.detectBrand(text);
    return { text: `🔎 Brand Match: ${result.match} (Confidence: ${result.confidence})` };
  }


  async getMatrix() {
    const data = await this.toneService.getEvaluationMatrix();
    return {
      text: '🧮 Evaluation Matrix (latest):',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '```' + JSON.stringify(data.slice(0, 5), null, 2) + '```',
          },
        },
      ],
    };
  }

  async searchEvaluations(brandId: string, filters: string) {
    const dto = {
      brandId,
      minScore: 0,
      maxScore: 1,
      page: 1,
      limit: 5,
    };
    const result = await this.toneService.searchEvaluations(dto);
    return {
      text: `🔍 Search Results (${result.total} found):`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '```' + JSON.stringify(result.results, null, 2) + '```',
          },
        },
      ],
    };
  }

  async getToneInsights(brandId: string) {
    const insights = await this.toneService.getToneTraitScoreCorrelations(brandId);
    return {
      text: '📈 Trait Insights:',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '```' + JSON.stringify(insights.slice(0, 10), null, 2) + '```',
          },
        },
      ],
    };
  }

  async getRejections() {
    const all = await this.toneService.getAllRejections();
    return {
      text: '🚫 Tone Rejections:',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '```' + JSON.stringify(all.slice(0, 10), null, 2) + '```',
          },
        },
      ],
    };
  }

  async saveSignature(brandId: string, text: string) {
    const saved = await this.toneService.analyzeAndSave(text, brandId);
    return {
      text: `💾 Signature for \`${brandId}\` saved.`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '```' + JSON.stringify(saved, null, 2) + '```',
          },
        },
      ],
    };
  }

  async rewriteTone(brandId: string, text: string) {
    const result = await this.toneService.rewriteText(text, brandId);
    return { text: `✍️ Rewritten text:\n> ${result}` };
  }

  async getChart(brandId: string) {
    const imageBuffer = await this.toneService.renderLineChart(brandId);
    return {
      response_type: 'in_channel',
      blocks: [
        {
          type: 'image',
          image_url: 'data:image/png;base64,' + imageBuffer.toString('base64'),
          alt_text: `Chart for ${brandId}`,
        },
      ],
    };
  }

  async evaluateTone(brandId: string, text: string) {
    const result = await this.toneService.rewriteTextWithEvaluation(text, brandId);
    return {
      text: `🧪 Evaluation Result for \`${brandId}\``,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '```' + JSON.stringify(result, null, 2) + '```',
          },
        },
      ],
    };
  }
}
