import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ToneSignature } from './entity/tone-signature.entity';
import { OpenAiService } from '../../lib/openai/openai.service';
import { ToneSignatureDto } from './dto/tone.dto';

@Injectable()
export class ToneService {
  constructor(
    @InjectRepository(ToneSignature)
    private readonly toneRepo: Repository<ToneSignature>,
    private readonly openAi: OpenAiService,
  ) {}

  async analyzeText(text: string): Promise<ToneSignatureDto> {
    const prompt = `Analyze the tone of voice of the following text and output as JSON:
- tone
- language_style
- formality
- forms_of_address
- emotional_appeal

Text:
"""${text}"""`;

    const response = await this.openAi.chat([{ role: 'user', content: prompt }]);

    let raw: any = {};
    try {
      raw = JSON.parse(response);
    } catch {
      throw new InternalServerErrorException('OpenAI did not return valid JSON');
    }

    return {
      tone: raw.tone || 'Unknown',
      languageStyle: raw.language_style || 'Unknown',
      formality: raw.formality || 'Unknown',
      formsOfAddress: raw.forms_of_address || 'Unknown',
      emotionalAppeal: raw.emotional_appeal || 'Unknown',
    };
  }

  async analyzeAndSave(text: string, brandId?: string) {
    const signature = await this.analyzeText(text);

    if (!brandId) {
      brandId = uuidv4();
    }

    const existing = await this.toneRepo.findOneBy({ brandId });
    const entity = existing
      ? this.toneRepo.merge(existing, signature)
      : this.toneRepo.create({ brandId, ...signature });

    return this.toneRepo.save(entity);
  }

  async getSignature(brandId: string): Promise<ToneSignature | null> {
    return this.toneRepo.findOneBy({ brandId });
  }

  async rewriteText(text: string, brandId: string): Promise<string> {
    const signature = await this.getSignature(brandId);
    if (!signature) throw new InternalServerErrorException(`No tone signature found for brand ${brandId}`);

    const prompt = `Rewrite the following text using this tone-of-voice:
Tone: ${signature.tone}
Language Style: ${signature.languageStyle}
Formality: ${signature.formality}
Forms of Address: ${signature.formsOfAddress}
Emotional Appeal: ${signature.emotionalAppeal}

Original text:
"""${text}"""

Rewritten text:`;

    return this.openAi.chat([{ role: 'user', content: prompt }]);
  }

  async listAllBrands(): Promise<string[]> {
    const brands = await this.toneRepo.find();
    return brands.map((b) => b.brandId);
  }

  async detectBrand(text: string): Promise<{ match: string; confidence: string }> {
    const inputSignature = await this.analyzeText(text);
    const all = await this.toneRepo.find();

    if (all.length === 0) {
      throw new InternalServerErrorException('No brands stored.');
    }

    const comparison = all.map((b) => {
      return `Brand: ${b.brandId}
Tone: ${b.tone}
Language Style: ${b.languageStyle}
Formality: ${b.formality}
Forms of Address: ${b.formsOfAddress}
Emotional Appeal: ${b.emotionalAppeal}`;
    });

    const prompt = `Given the following tone-of-voice profiles and a new input tone, determine the most similar brand.

Profiles:
${comparison.join('\n\n')}

Input tone:
Tone: ${inputSignature.tone}
Language Style: ${inputSignature.languageStyle}
Formality: ${inputSignature.formality}
Forms of Address: ${inputSignature.formsOfAddress}
Emotional Appeal: ${inputSignature.emotionalAppeal}

Which brand is the closest match? Respond with JSON:
{ "match": "brandId", "confidence": "high/medium/low" }`;

    const result = await this.openAi.chat([{ role: 'user', content: prompt }]);
    return JSON.parse(result);
  }
}
