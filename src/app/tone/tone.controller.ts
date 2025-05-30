import { Controller, Post, Get, Param, Body, Query, Res } from '@nestjs/common';
import { ToneService } from './tone.service';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiQuery, ApiProduces } from '@nestjs/swagger';
import { OptimizeTextDto } from './dto/optimizeText.dto';
import { SaveToneSignatureDto } from './dto/saveToneSignature.dto';
import { ToneSignatureDto } from './dto/tone.dto';
import { AnalyzeTextDto } from './dto/AnalyzeText.dto';
import { EvaluateToneDto } from './dto/evaluateTone.dto';
import { RewriteWithEvaluationResponseDto } from './dto/rewriteWithEvaluationResponse.dto';
import { SearchEvaluationsDto } from './dto/searchEvaluations.dto';
import { Request, Response } from 'express';

@ApiTags('Tone')
@Controller('tone')
export class ToneController {
  constructor(private readonly toneService: ToneService) {}

  @ApiOperation({ summary: 'Analyze tone and return full signature (with NLP metadata)' })
  @ApiBody({ type: AnalyzeTextDto })
  @ApiResponse({ status: 200, type: ToneSignatureDto })
  @Post('signature/analyze')
  analyze(@Body() dto: AnalyzeTextDto) {
    return this.toneService.analyzeText(dto.text);
  }

  @ApiOperation({ summary: 'Analyze tone and save signature to DB' })
  @ApiResponse({ status: 201, description: 'Signature saved successfully' })
  @Post('signature/save')
  save(@Body() dto: SaveToneSignatureDto) {
    return this.toneService.analyzeAndSave(dto.text, dto.brandId);
  }

  @ApiOperation({ summary: 'Rewrite text using stored tone-of-voice signature' })
  @ApiResponse({ status: 200, description: 'Text rewritten successfully' })
  @Post('signature/rewrite')
  rewrite(@Body() dto: OptimizeTextDto) {
    return this.toneService.rewriteText(dto.text, dto.brandId);
  }

  @ApiOperation({ summary: 'Get the tone-of-voice signature for a brandId' })
  @ApiResponse({ status: 200, type: ToneSignatureDto })
  @Get('signature/:brandId')
  getSignature(@Param('brandId') brandId: string) {
    return this.toneService.getSignature(brandId);
  }

  @ApiOperation({ summary: 'List all known brandIds with stored signatures' })
  @ApiResponse({ status: 200, type: [String] })
  @Get('brand')
  listBrands() {
    return this.toneService.listAllBrands();
  }

  @ApiOperation({ summary: 'Detect which brand matches the tone of this text' })
  @ApiBody({ type: AnalyzeTextDto })
  @ApiResponse({ status: 200, schema: {
      example: { match: "brandId", confidence: "high" }
    }})
  @Post('brand/detect')
  detectBrand(@Body() dto: AnalyzeTextDto) {
    return this.toneService.detectBrand(dto.text);
  }

  @ApiOperation({ summary: 'Rewrite and evaluate tone in one step' })
  @ApiBody({ type: OptimizeTextDto })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        rewrittenText: "Transcending commerce with a touch of elegance.",
        evaluation: {
          fluency: "High",
          authenticity: "Medium",
          tone_alignment: "High",
          readability: "Excellent",
          strengths: ["Good alignment with emotional appeal"],
          suggestions: ["Increase use of brand-specific phrases"]
        }
      }
    }
  })

  @ApiOperation({ summary: 'Rewrite and evaluate tone in one step' })
  @ApiResponse({ status: 200, type: RewriteWithEvaluationResponseDto })
  @Post('signature/rewrite-with-evaluation')
  rewriteWithEvaluation(@Body() dto: OptimizeTextDto) {
    return this.toneService.rewriteTextWithEvaluation(dto.text, dto.brandId);
  }

}
