import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '../env/config.service';

@Injectable()
export class OpenAiService {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get('OPENAI_API_KEY'),
    });
  }

  async chat(messages: OpenAI.Chat.ChatCompletionMessageParam[]): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0,
    });
    return res.choices[0].message?.content?.trim() || '';
  }
}
