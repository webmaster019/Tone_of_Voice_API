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
      functions?: any[];
      function_call?: any;
      [key: string]: any;
    }
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    const res = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: options?.temperature ?? 0.7,
      ...options,
    });

    return res;
  }
}
