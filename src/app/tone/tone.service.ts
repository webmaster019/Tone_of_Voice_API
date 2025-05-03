import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NlpService } from '../../lib/nlp/nlp.service';
import { OpenAiService } from '../../lib/openai/openai.service';
import { v4 as uuidv4 } from 'uuid';
import { ToneSignature } from './entity/tone-signature.entity';
import { ToneSignatureDto } from './dto/tone.dto';
import { EvaluateToneDto } from './dto/evaluateTone.dto';

@Injectable()
export class ToneService {
  constructor(
    @InjectRepository(ToneSignature)
    private readonly toneRepo: Repository<ToneSignature>,
    private readonly nlpService: NlpService,
    private readonly openAi: OpenAiService
  ) {}

  async analyzeText(text: string): Promise<ToneSignatureDto> {
    const nlpMetadata = this.nlpService.analyze(text);

    const prompt = `
You are a branding expert and linguist.
Analyze the following text and return a tone-of-voice signature as JSON.

In addition to tone fields, classify the overall tone into one of the following:
Professional, Conversational, Empathetic, Inspirational, Assertive, Playful

Respond ONLY with valid JSON:
{
  "tone": "...",
  "language_style": "...",
  "formality": "...",
  "forms_of_address": "...",
  "emotional_appeal": "...",
  "classification": "..."
}

Context:
${JSON.stringify(nlpMetadata, null, 2)}

Text:
"""${text}"""
`;

    const result = await this.openAi.chat([{ role: 'user', content: prompt }]);

    let parsed: any;
    try {
      parsed = JSON.parse(result);
    } catch {
      throw new BadRequestException('OpenAI did not return valid JSON');
    }

    return {
      tone: parsed.tone || 'Unknown',
      languageStyle: parsed.language_style || 'Unknown',
      formality: parsed.formality || 'Unknown',
      formsOfAddress: parsed.forms_of_address || 'Unknown',
      emotionalAppeal: parsed.emotional_appeal || 'Unknown',
      classification: parsed.classification || 'Unclassified',
      ...nlpMetadata,
    };
  }

  async analyzeAndSave(text: string, brandId?: string) {
    const signature = await this.analyzeText(text);
    if (!brandId) brandId = uuidv4();

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
    if (!signature) {
      throw new InternalServerErrorException(`No tone signature found for brand ${brandId}`);
    }

    const prompt = `
Rewrite the following text using the tone-of-voice signature provided below:

Tone: ${signature.tone}
Language Style: ${signature.languageStyle}
Formality: ${signature.formality}
Forms of Address: ${signature.formsOfAddress}
Emotional Appeal: ${signature.emotionalAppeal}

Original text:
"""${text}"""

Rewritten version:
`;

    return this.openAi.chat([{ role: 'user', content: prompt }]);
  }

  async rewriteTextWithEvaluation(text: string, brandId: string) {
    const toneSignature = await this.getSignature(brandId);
    if (!toneSignature) {
      throw new Error(`No tone signature found for brandId: ${brandId}`);
    }

    const prompt = `
Rewrite the following text using the tone-of-voice signature provided:

Tone: ${toneSignature.tone}
Language Style: ${toneSignature.languageStyle}
Formality: ${toneSignature.formality}
Forms of Address: ${toneSignature.formsOfAddress}
Emotional Appeal: ${toneSignature.emotionalAppeal}

Original text:
"""${text}"""

Rewritten version:
`;

    const rewrittenText = await this.openAi.chat([{ role: 'user', content: prompt }]);

    const evaluation = await this.evaluateTone({
      brandId,
      originalText: text,
      rewrittenText,
    });

    return { rewrittenText, evaluation };
  }

  async listAllBrands(): Promise<string[]> {
    const brands = await this.toneRepo.find();
    return brands.map(b => b.brandId);
  }

  async detectBrand(text: string): Promise<{ match: string; confidence: string }> {
    const inputSignature = await this.analyzeText(text);
    const all = await this.toneRepo.find();

    if (all.length === 0) {
      throw new InternalServerErrorException('No brands stored.');
    }

    const profiles = all.map(b => ({
      brandId: b.brandId,
      tone: b.tone,
      languageStyle: b.languageStyle,
      formality: b.formality,
      formsOfAddress: b.formsOfAddress,
      emotionalAppeal: b.emotionalAppeal
    }));

    const prompt = `
Compare the following tone-of-voice input with existing brand tone profiles and return the best match.

Input:
${JSON.stringify(inputSignature, null, 2)}

Profiles:
${JSON.stringify(profiles, null, 2)}

Respond with:
{ "match": "brandId", "confidence": "high/medium/low" }
`;

    const result = await this.openAi.chat([{ role: 'user', content: prompt }]);
    return JSON.parse(result);
  }

  async evaluateTone(dto: EvaluateToneDto): Promise<{
    fluency: string;
    authenticity: string;
    tone_alignment: string;
    readability: string;
    strengths: string[];
    suggestions: string[];
  }> {
    const { originalText, rewrittenText, brandId } = dto;

    const toneSignature = await this.getSignature(brandId);
    if (!toneSignature) {
      throw new BadRequestException(`Tone signature not found for brandId: ${brandId}`);
    }

    const prompt = `
You are an expert tone-of-voice evaluator.

Given a brand's tone signature and two versions of a message (original + rewritten), assess how well the rewritten text matches the brand's tone and overall quality.

Return a JSON object like:
{
  "fluency": "High | Medium | Low",
  "authenticity": "High | Medium | Low",
  "tone_alignment": "High | Medium | Low",
  "readability": "Excellent | Good | Poor",
  "strengths": ["..."],
  "suggestions": ["..."]
}

Tone Signature:
${JSON.stringify(toneSignature, null, 2)}

Original Text:
"""${originalText}"""

Rewritten Text:
"""${rewrittenText}"""
`;

    const result = await this.openAi.chat([{ role: 'user', content: prompt }]);

    try {
      return JSON.parse(result);
    } catch {
      throw new Error('Invalid JSON from OpenAI: ' + result);
    }
  }
}
