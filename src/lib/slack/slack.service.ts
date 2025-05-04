import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '../config/config.service';
import { KnownBlock } from '@slack/types';

@Injectable()
export class SlackService {
  private readonly webhookUrl: string;

  constructor(private readonly config: ConfigService) {
    this.webhookUrl = this.config.get('SLACK_WEBHOOK_URL');
  }

  async send(text: string, blocks?: KnownBlock[]) {
    console.log("send");
    if (!this.webhookUrl) {
      console.warn('⚠️ Slack webhook URL is not configured.');
      return;
    }

    if (!text && !blocks?.length) {
      console.warn('⚠️ Slack message requires either text or blocks.');
      return;
    }

    try {
      const response = await axios.post(this.webhookUrl, { text, blocks });
      console.log(`Slack notification sent: ${response.status} ${response.statusText}`);
    } catch (err) {
      console.error('❌ Slack notification failed', err.message);
    }
  }

  async sendToneDriftAlert(
    brandId: string,
    suggestion: Record<string, any>,
    options?: {
      mentionUserIds?: string[];
      mentionChannel?: string;
    }
  ) {
    const mention = options?.mentionUserIds?.length
      ? options.mentionUserIds.map(id => `<@${id}>`).join(' ') + ' '
      : options?.mentionChannel
        ? `${options.mentionChannel} `
        : '';

    const text = `${mention}📢 *Tone Drift Detected* for brand \`${brandId}\``;

    const blocks: KnownBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Suggested tone signature update:*\n\`\`\`${JSON.stringify(suggestion, null, 2)}\`\`\``,
        },
      },
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
      },
    ];

    await this.send(text, blocks);
  }

}
