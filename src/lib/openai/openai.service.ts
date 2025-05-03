import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '../config/config.service';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

@Injectable()
export class OpenAiService {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get('OPENAI_API_KEY'),
    });
  }

  async chat(
    messages: ChatCompletionMessageParam[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      [key: string]: any;
    }
  ): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: options?.temperature ?? 0.7,
      ...options,
    });

    return res.choices?.[0]?.message?.content?.trim() || '';
  }
}
