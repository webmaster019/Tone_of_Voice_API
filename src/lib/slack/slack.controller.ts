import { Controller, Post, Req, Res } from '@nestjs/common';
import { ToneService } from '../../app/tone/tone.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
@ApiTags('Slack')
@Controller('slack')
export class SlackController {
  constructor(private readonly toneService: ToneService) {}

  @Post('interact')
  @Post('interact')
  @ApiOperation({ summary: 'Slack action/interactivity webhook handler' })
  async handleInteraction(@Req() req, @Res() res) {
    const payload = JSON.parse(req.body.payload);
    console.log("payload",payload);
    if (payload.type === 'view_submission' && payload.view.callback_id === 'submit_rejection_comment') {
      const metadata = JSON.parse(payload.view.private_metadata || '{}');
      const comment = payload.view.state.values.rejection_comment.comment.value;
      const reviewer = payload.user.username || payload.user.name || 'unknown';
      await this.toneService.saveRejectionComment(metadata.brandId, reviewer, comment);
      return res.send({ response_action: 'clear' });
    }

    const action = payload.actions?.[0];
    const value = JSON.parse(action?.value || '{}');

    if (action?.action_id === 'approve_signature_update') {
      await this.toneService.updateSignature(value.brandId, value.suggestion);
      return res.send({
        text: `✅ Approved & saved tone update for *${value.brandId}*`,
        replace_original: true,
      });
    }

    if (action?.action_id === 'reject_signature_update') {
      return res.send({
        response_action: 'push',
        view: {
          type: 'modal',
          callback_id: 'submit_rejection_comment',
          title: { type: 'plain_text', text: 'Reject Tone Update' },
          submit: { type: 'plain_text', text: 'Submit' },
          close: { type: 'plain_text', text: 'Cancel' },
          private_metadata: JSON.stringify(value),
          blocks: [
            {
              type: 'input',
              block_id: 'rejection_comment',
              label: { type: 'plain_text', text: 'Reason for rejection' },
              element: {
                type: 'plain_text_input',
                multiline: true,
                action_id: 'comment',
              },
            },
          ],
        },
      });
    }

    return res.send();
  }
}
