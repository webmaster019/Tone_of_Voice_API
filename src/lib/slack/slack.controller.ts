import { Body, Controller, Logger, Post, Req, Res } from '@nestjs/common';
import { SlackService } from './slack.service';
import { Request, Response } from 'express';

@Controller('slack')
export class SlackController {
  private readonly logger = new Logger(SlackController.name);

  constructor(private readonly slackService: SlackService) {}

  @Post('interact')
  async handleInteraction(@Req() req: Request, @Res() res: Response) {
    const payloadStr = req.body.payload;
    let payload: any;

    try {
      payload = JSON.parse(payloadStr);
    } catch (e) {
      this.logger.error('Invalid JSON in Slack payload');
      return res.status(400).send('Bad payload');
    }

    const { type, user, actions, response_url } = payload;
    const userId = user?.id;

    if (type === 'block_actions' && actions?.length) {
      const action = actions[0];
      const actionId = action.action_id;

      if (actionId === 'approve_signature_update') {
        const { brandId, suggestion } = JSON.parse(action.value);
        await this.slackService.sendToResponseUrl(response_url, {
          text: `✅ Approved tone signature for \`${brandId}\``,
        });
        await this.slackService.updateSignatureAndNotify(brandId, suggestion, userId);
      }

      if (actionId === 'reject_signature_update') {
        await this.slackService.sendToResponseUrl(response_url, {
          text: '📝 Please reply with your rejection comment.',
        });
      }
    }

    return res.status(200).send();
  }

  @Post('commands')
  async handleCommand(@Body() body: any, @Res() res: Response) {
    const { command, text, response_url } = body;
    console.log(body);
    const responseUrl = response_url;
    const args = (text || '').toString().trim().split(' ');
    const brandId = args[0];
    const remainingText = args.slice(1).join(' ');

    try {
      switch (command) {
        case '/rewrite':
          const rewriteResult = await this.slackService.rewriteAndEvaluate(brandId, remainingText);
          if (responseUrl) await this.slackService.sendToResponseUrl(responseUrl, rewriteResult);
          break;

        case '/stats':
          const stats = await this.slackService.getStatsBlock(brandId);
          if (responseUrl) await this.slackService.sendToResponseUrl(responseUrl, stats);
          break;

        case '/matrix':
          const matrix = await this.slackService.getMatrix();
          if (responseUrl) await this.slackService.sendToResponseUrl(responseUrl, matrix);
          break;

        case '/tone-search':
          const results = await this.slackService.searchEvaluations(brandId, remainingText);
          if (responseUrl) await this.slackService.sendToResponseUrl(responseUrl, results);
          break;

        case '/insights':
          const insights = await this.slackService.getToneInsights(brandId);
          if (responseUrl) await this.slackService.sendToResponseUrl(responseUrl, insights);
          break;

        case '/chart':
          const chart = await this.slackService.getChart(brandId);
          if (responseUrl) await this.slackService.sendToResponseUrl(responseUrl, chart);
          break;

        case '/rejections':
          const rejections = await this.slackService.getRejections();
          if (responseUrl) await this.slackService.sendToResponseUrl(responseUrl, rejections);
          break;

        case '/analyze':
          const analyzeResult = await this.slackService.analyzeText(text);
          console.log("analyzeResult", analyzeResult);
          if (responseUrl) {
            await this.slackService.sendToResponseUrl(responseUrl, {
              text: '🔍 Tone Signature:',
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: analyzeResult,
                  },
                },
              ],
            });
          }
          break;

        case '/save-signature':
          const saveSig = await this.slackService.saveSignature(brandId, remainingText);
          if (responseUrl) await this.slackService.sendToResponseUrl(responseUrl, saveSig);
          break;

        case '/rewrite-tone':
          const rewritten = await this.slackService.rewriteTone(brandId, remainingText);
          if (responseUrl) await this.slackService.sendToResponseUrl(responseUrl, rewritten);
          break;

        case '/detect-brand':
          const detection = await this.slackService.detectBrand(text);
          if (responseUrl) await this.slackService.sendToResponseUrl(responseUrl, detection);
          break;

        case '/evaluate':
          const evaluation = await this.slackService.evaluateTone(brandId, remainingText);
          if (responseUrl) await this.slackService.sendToResponseUrl(responseUrl, evaluation);
          break;

        default:
          if (responseUrl) {
            await this.slackService.sendToResponseUrl(responseUrl, {
              text: `❓ Unknown command: \`${command}\``,
            });
          }
          break;
      }

      return res.status(200).send();
    } catch (err) {
      this.logger.error(`Error handling command ${command}`, err);
      if (responseUrl) {
        await this.slackService.sendToResponseUrl(responseUrl, {
          text: `❌ Error processing \`${command}\`: ${err.message}`,
        });
      }
      return res.status(500).send();
    }
  }

  @Post('event-subscriptions')
  async eventSubscriptions(@Req() req: Request, @Res() res: Response) {
    const payload = req.body;

    try {
      if (payload?.type === 'url_verification') {
        return res.send(payload.challenge);
      }

      if (payload?.type === 'event_callback') {
        const event = payload.event;
        if (event?.type === 'app_home_opened') {
          const userId = event.user;

          await this.slackService.sendAppHome(userId, [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `👋 Welcome to *ToneAssistant*!`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Use /rewrite or /stats commands to interact.\nYou’ll get tone drift alerts and suggestions here.`,
              },
            },
          ]);
        }
      }

      return res.status(200).send();
    } catch (e) {
      this.logger.error('Error in eventSubscriptions', e);
      return res.status(500).send('Internal error');
    }
  }
}
