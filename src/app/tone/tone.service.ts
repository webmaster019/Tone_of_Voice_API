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
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';
import { ToneFeedback } from './entity/tone-feedback.entity';
import { RedisService } from '../../lib/redis/redis.service';
import { SubmitFeedbackDto } from './dto/submitFeedback.dto';
import { ToneRejection } from './entity/tone-rejection.entity';

@Injectable()
export class ToneService {
  constructor(
    @InjectRepository(ToneSignature)
    private readonly toneRepo: Repository<ToneSignature>,
    @InjectRepository(ToneEvaluation)
    private readonly evaluationRepo: Repository<ToneEvaluation>,
    @InjectRepository(ToneFeedback)
    private readonly feedbackRepo: Repository<ToneFeedback>,
    @InjectRepository(ToneRejection)
    private readonly rejectionRepo: Repository<ToneRejection>,
    private readonly nlpService: NlpService,
    private readonly openAi: OpenAiService,
    private readonly redisService: RedisService,
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

    const response = await this.openAi.chat([{ role: 'user', content: prompt }]);
    const result = response.choices[0].message?.content ?? '';

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

    const response = await this.openAi.chat([{ role: 'user', content: prompt }]);
    return response.choices[0].message?.content?.trim() || '';
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
    const response = await this.openAi.chat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.7 }
    );
    const rewrittenText = response.choices[0].message?.content?.trim() || '';
    const latencyMs = Date.now() - start;

    const evaluation = await this.evaluateTone({ brandId, originalText: text, rewrittenText });
    const { normalizedScore, accuracyPoints } = this.calculateNormalizedScore(evaluation);

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

  async evaluateTone(dto: EvaluateToneDto) {
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

    const response = await this.openAi.chat([{ role: 'user', content: prompt }]);
    const result = response.choices[0].message?.content ?? '';

    try {
      return JSON.parse(result);
    } catch {
      throw new Error('Invalid JSON from OpenAI: ' + result);
    }
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
      emotionalAppeal: b.emotionalAppeal,
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

    const response = await this.openAi.chat([{ role: 'user', content: prompt }]);
    const result = response.choices[0].message?.content ?? '';
    return JSON.parse(result);
  }

  async suggestUpdatedToneSignature(brandId: string, failures: ToneEvaluation[]) {
    const signature = await this.getSignature(brandId);
    if (!signature) throw new Error('No tone signature found');

    const functionSchema = {
      name: 'suggestToneCorrection',
      description: 'Suggest tone signature updates based on misalignment feedback',
      parameters: {
        type: 'object',
        properties: {
          tone: { type: 'string' },
          language_style: { type: 'string' },
          formality: { type: 'string' },
          forms_of_address: { type: 'string' },
          emotional_appeal: { type: 'string' },
          classification: { type: 'string' },
        },
        required: ['tone', 'language_style', 'formality', 'forms_of_address'],
      },
    };

    const failuresList = failures.map(f => ({
      originalText: f.originalText,
      rewrittenText: f.rewrittenText,
      feedbackSummary: f.suggestions?.join('; ') || '',
    }));

    const response = await this.openAi.chat(
      [
        {
          role: 'user',
          content: `Here are examples of tone misalignment. Suggest corrections to the tone-of-voice signature.`,
        },
        {
          role: 'function',
          name: 'suggestToneCorrection',
          content: JSON.stringify({
            toneSignature: signature,
            failures: failuresList,
          }),
        },
      ],
      {
        functions: [functionSchema],
        function_call: { name: 'suggestToneCorrection' },
      }
    );

    try {
      const args = response?.choices?.[0]?.message?.function_call?.arguments;
      if (args) {
        return JSON.parse(args);
      }
      throw new Error('OpenAI did not return valid function_call arguments');
    } catch (e) {
      console.error('[suggestUpdatedToneSignature] Failed to parse OpenAI response:', response);
      throw new Error(
        `OpenAI did not return valid JSON. Raw content:\n${JSON.stringify(response)}\nParse error: ${(e as Error).message}`
      );
    }
  }

  // ... the rest of your service stays the same



  private calculateNormalizedScore(evaluation: {
    fluency: string;
    authenticity: string;
    tone_alignment: string;
    readability: string;
    strengths?: string[];
    suggestions: string[];
  }): { normalizedScore: number; accuracyPoints: Record<string, number> } {
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
    const suggestionPenalty = Math.min((evaluation.suggestions?.length || 0) * 0.5, 3);
    const finalRaw = Math.max(rawScore - suggestionPenalty, 0);
    const normalizedScore = parseFloat((finalRaw / maxScore).toFixed(2));
    return { normalizedScore, accuracyPoints };
  }

  async listAllBrands(): Promise<string[]> {
    const brands = await this.toneRepo.find();
    return brands.map(b => b.brandId);
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

  async getChartData(brandId: string) {
    const evaluations = await this.evaluationRepo.find({
      where: { brandId },
      order: { createdAt: 'ASC' },
    });

    return evaluations.map(e => ({
      timestamp: e.createdAt,
      score: e.score,
      fluency: e.accuracyPoints?.fluency ?? 0,
      toneAlignment: e.accuracyPoints?.toneAlignment ?? 0,
      authenticity: e.accuracyPoints?.authenticity ?? 0,
      readability: e.accuracyPoints?.readability ?? 0,
    }));
  }

  async getChartPreview(brandId: string) {
    const evaluations = await this.evaluationRepo.find({
      where: { brandId },
      order: { createdAt: 'ASC' },
    });

    const timestamps = evaluations.map(e => e.createdAt);
    const scores = evaluations.map(e => e.score);

    const radar = evaluations.map(e => ({
      timestamp: e.createdAt,
      data: {
        fluency: e.accuracyPoints?.fluency ?? 0,
        toneAlignment: e.accuracyPoints?.toneAlignment ?? 0,
        authenticity: e.accuracyPoints?.authenticity ?? 0,
        readability: e.accuracyPoints?.readability ?? 0,
      },
    }));

    const area = {
      fluency: evaluations.map(e => ({ x: e.createdAt, y: e.accuracyPoints?.fluency ?? 0 })),
      toneAlignment: evaluations.map(e => ({ x: e.createdAt, y: e.accuracyPoints?.toneAlignment ?? 0 })),
      authenticity: evaluations.map(e => ({ x: e.createdAt, y: e.accuracyPoints?.authenticity ?? 0 })),
      readability: evaluations.map(e => ({ x: e.createdAt, y: e.accuracyPoints?.readability ?? 0 })),
    };

    return {
      line: {
        labels: timestamps,
        data: scores,
      },
      radar,
      area,
    };
  }

async renderLineChart(brandId: string): Promise<Buffer> {
  const evaluations = await this.evaluationRepo.find({
    where: { brandId },
    order: { createdAt: 'ASC' },
  });

  const width = 800;
  const height = 400;
  const chart = new ChartJSNodeCanvas({ width, height });

  const configuration: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: evaluations.map(e => e.createdAt.toISOString().split('T')[0]),
      datasets: [
        {
          label: 'Score',
          data: evaluations.map(e => e.score),
          fill: false,
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: false,
      scales: {
        y: { min: 0, max: 1 },
      },
    },
  };

  return await chart.renderToBuffer(configuration as ChartConfiguration<'line'>);
}
  async getScoreStats(brandId: string) {
    const evaluations = await this.evaluationRepo.find({ where: { brandId } });

    if (!evaluations.length) {
      return {
        brandId,
        count: 0,
        avgScore: 0,
        minScore: 0,
        maxScore: 0,
      };
    }

    const scores = evaluations.map(e => e.score);
    const total = scores.reduce((sum, val) => sum + val, 0);

    const avgScore = parseFloat((total / scores.length).toFixed(2));
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    return {
      brandId,
      count: scores.length,
      avgScore,
      minScore,
      maxScore,
    };
  }
  async recordFeedback(dto: SubmitFeedbackDto): Promise<{ success: boolean }> {
    const feedback = this.feedbackRepo.create(dto);
    await this.feedbackRepo.save(feedback);

    await this.redisService.hincrby(
      `feedback:${dto.evaluationId}`,
      dto.helpful ? 'helpful' : 'unhelpful',
      1
    );

    return { success: true };
  }

  async getFeedbackSummary(evaluationId: string) {
    return await this.redisService.hgetall(`feedback:${evaluationId}`);
  }


  async getToneTraitScoreCorrelations(brandId: string) {
    const evaluations = await this.evaluationRepo.find({ where: { brandId } });
    const signatures = await this.toneRepo.find({ where: { brandId } });

    const correlations: Record<string, { count: number; totalScore: number }> = {};

    for (const evalEntry of evaluations) {
      const sig = signatures.find(s => s.brandId === evalEntry.brandId);
      if (!sig) continue;

      const traits = [
        `tone:${sig.tone}`,
        `formality:${sig.formality}`,
        `style:${sig.languageStyle}`,
        `appeal:${sig.emotionalAppeal}`,
      ];

      for (const trait of traits) {
        correlations[trait] ??= { count: 0, totalScore: 0 };
        correlations[trait].count += 1;
        correlations[trait].totalScore += evalEntry.score ?? 0;
      }
    }

    return Object.entries(correlations).map(([trait, { count, totalScore }]) => ({
      trait,
      count,
      avgScore: parseFloat((totalScore / count).toFixed(2)),
    })).sort((a, b) => b.avgScore - a.avgScore);
  }

  async chartTraitScores(brandId: string, type: 'bar' | 'radar' = 'bar'): Promise<Buffer> {
    const traits = await this.getToneTraitScoreCorrelations(brandId);
    const labels = traits.map(t => t.trait);
    const data = traits.map(t => t.avgScore);

    const chartJS = new ChartJSNodeCanvas({ width: 800, height: 600 });

    const config = {
      type,
      data: {
        labels,
        datasets: [
          {
            label: 'Average Score by Trait',
            data,
            backgroundColor: type === 'bar' ? 'rgba(54, 162, 235, 0.5)' : 'rgba(255, 99, 132, 0.3)',
            borderColor: type === 'bar' ? 'rgba(54, 162, 235, 1)' : 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            fill: true,
          },
        ],
      },
      options: {
        responsive: false,
        scales: type === 'bar'
          ? { y: { beginAtZero: true, max: 1 } }
          : {},
      },
    };

    return await chartJS.renderToBuffer(config as any);
  }

  async findDriftedEvaluations(brandId: string) {
    const all = await this.evaluationRepo.find({ where: { brandId } });
    return all.filter(e => e.toneAlignment === 'Low');
  }


  async updateSignature(brandId: string, update: Partial<ToneSignature>) {
    const signature = await this.getSignature(brandId);
    if (!signature) throw new Error('No tone signature found');
    const updated = this.toneRepo.merge(signature, update);
    return await this.toneRepo.save(updated);
  }

  async saveRejectionComment(brandId: string, reviewer: string, comment: string) {
    const entry = this.rejectionRepo.create({ brandId, reviewer, comment });
    await this.rejectionRepo.save(entry);
  }

  async getAllRejections() {
    return this.rejectionRepo.find({ order: { createdAt: 'DESC' } });
  }

  async chartRejectionStats(): Promise<Buffer> {
    const stats = await this.getReviewerStats();
    const labels = stats.map(s => s.reviewer);
    const values = stats.map(s => s.count);

    const chart = new ChartJSNodeCanvas({ width: 800, height: 400 });
    const config = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Rejection Count by Reviewer',
            data: values,
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Tone Rejections Leaderboard',
          },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    };

    return await chart.renderToBuffer(config as any);
  }
  async getReviewerStats() {
    const all = await this.rejectionRepo.find();

    const grouped = all.reduce((acc, r) => {
      const name = r.reviewer || 'unknown';
      acc[name] = acc[name] || { count: 0, totalLength: 0, last: r.createdAt };
      acc[name].count += 1;
      acc[name].totalLength += r.comment.length;
      acc[name].last = acc[name].last > r.createdAt ? acc[name].last : r.createdAt;
      return acc;
    }, {} as Record<string, { count: number; totalLength: number; last: Date }>);

    return Object.entries(grouped).map(([reviewer, data]) => ({
      reviewer,
      count: data.count,
      lastRejection: data.last,
      avgLength: Math.round(data.totalLength / data.count),
    }));
  }
}
