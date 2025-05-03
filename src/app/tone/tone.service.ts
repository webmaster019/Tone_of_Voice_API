import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NlpService } from '../../lib/nlp/nlp.service';
import { OpenAiService } from '../../lib/openai/openai.service';
import { v4 as uuidv4 } from 'uuid';
import { ToneSignature } from './entity/tone-signature.entity';
import { ToneSignatureDto } from './dto/tone.dto';
import { EvaluateToneDto } from './dto/evaluateTone.dto';
import { ToneEvaluation } from './entity/tone-evaluation.entity';
import { SearchEvaluationsDto } from './dto/searchEvaluations.dto';

@Injectable()
export class ToneService {
  constructor(
    @InjectRepository(ToneSignature)
    private readonly toneRepo: Repository<ToneSignature>,
    @InjectRepository(ToneEvaluation)
    private readonly evaluationRepo: Repository<ToneEvaluation>,
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
    if (!toneSignature) throw new Error(`No tone signature found for brandId: ${brandId}`);

    const prompt = `
You are a brand-aware copy editor.

Rewrite the following content so that it matches the brand's tone of voice and communication style.

Tone signature:
{
  "tone": "${toneSignature.tone}",
  "languageStyle": "${toneSignature.languageStyle}",
  "formality": "${toneSignature.formality}",
  "formsOfAddress": "${toneSignature.formsOfAddress}",
  "emotionalAppeal": "${toneSignature.emotionalAppeal}"
}

Guidelines:
- Maintain the original message and intent
- Adjust the tone, style, and formality to match the signature
- Do NOT invent or remove information
- Output only the rewritten text

Original content:
"""${text}"""
`;

    const start = Date.now();
    const rewrittenText = await this.openAi.chat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.7 }
    );
    const latencyMs = Date.now() - start;

    const evaluation = await this.evaluateTone({ brandId, originalText: text, rewrittenText });

    // Scoring logic
    const scoreMap = {
      fluency: { High: 3, Medium: 2, Low: 1 },
      authenticity: { High: 3, Medium: 2, Low: 1 },
      tone_alignment: { High: 3, Medium: 2, Low: 1 },
      readability: { Excellent: 3, Good: 2, Poor: 1 },
    };

    const accuracyPoints = {
      fluency: scoreMap.fluency[evaluation.fluency] || 0,
      authenticity: scoreMap.authenticity[evaluation.authenticity] || 0,
      toneAlignment: scoreMap.tone_alignment[evaluation.tone_alignment] || 0,
      readability: scoreMap.readability[evaluation.readability] || 0,
    };

    const rawScore =
      accuracyPoints.toneAlignment * 2 +
      accuracyPoints.fluency * 1.5 +
      accuracyPoints.authenticity * 1 +
      accuracyPoints.readability * 1;

    const maxScore = 6 + 4.5 + 3 + 3; // 16.5
    const suggestionPenalty = Math.min(evaluation.suggestions.length * 0.5, 3);
    const finalRaw = Math.max(rawScore - suggestionPenalty, 0);
    const normalizedScore = parseFloat((finalRaw / maxScore).toFixed(2)); // range: 0.00–1.00

    await this.evaluationRepo.save({
      brandId,
      originalText: text,
      rewrittenText,
      fluency: evaluation.fluency,
      authenticity: evaluation.authenticity,
      toneAlignment: evaluation.tone_alignment,
      readability: evaluation.readability,
      strengths: evaluation.strengths,
      suggestions: evaluation.suggestions,
      score: normalizedScore,
      latencyMs,
      accuracyPoints,
    });

    return {
      brandId,
      originalText: text,
      rewrittenText,
      fluency: evaluation.fluency,
      authenticity: evaluation.authenticity,
      toneAlignment: evaluation.tone_alignment,
      readability: evaluation.readability,
      strengths: evaluation.strengths,
      suggestions: evaluation.suggestions,
      score: normalizedScore,
      latencyMs,
      accuracyPoints,
    };
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

  async getEvaluationMatrix() {
    const evaluations = await this.evaluationRepo.find({ order: { createdAt: 'DESC' } });
    return evaluations.map(e => ({
      brandId: e.brandId,
      fluency: e.fluency,
      authenticity: e.authenticity,
      toneAlignment: e.toneAlignment,
      readability: e.readability,
      score: e.score,
      latencyMs: e.latencyMs,
      timestamp: e.createdAt,
      accuracyPoints: e.accuracyPoints,
    }));
  }

  async searchEvaluations(query: SearchEvaluationsDto) {
    const {
      brandId,
      minScore,
      maxScore,
      startDate,
      endDate,
      page,
      limit,
    } = query;

    const qb = this.evaluationRepo.createQueryBuilder('eval')
      .where('eval.score BETWEEN :minScore AND :maxScore', { minScore, maxScore });

    if (brandId) qb.andWhere('eval.brandId = :brandId', { brandId });
    if (startDate) qb.andWhere('eval.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('eval.createdAt <= :endDate', { endDate });

    qb.orderBy('eval.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [results, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      results,
    };
  }
}
