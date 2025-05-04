import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Res,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiProduces,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ToneService } from './tone.service';
import { SubmitFeedbackDto } from './dto/submitFeedback.dto';
import { SearchEvaluationsDto } from './dto/searchEvaluations.dto';
import { EvaluateToneDto } from './dto/evaluateTone.dto';
import { ChartType } from './dto/chart-type.enum';
import { ToneRejectionDto } from './dto/ toneRejection.dto';
@ApiTags('Evaluation')
@Controller('tone/evaluation')
export class EvaluationController {
  constructor(private readonly toneService: ToneService) {}

  @Post('feedback')
  @ApiOperation({ summary: 'Submit feedback for evaluation' })
  @ApiBody({ type: SubmitFeedbackDto })
  submitFeedback(@Body() dto: SubmitFeedbackDto) {
    return this.toneService.recordFeedback(dto);
  }

  @Post('signature/evaluate')
  @ApiOperation({ summary: 'Evaluate rewritten text using tone signature from brandId' })
  @ApiBody({ type: EvaluateToneDto })
  evaluate(@Body() dto: EvaluateToneDto) {
    return this.toneService.evaluateTone(dto);
  }

  @Get('matrix')
  @ApiOperation({ summary: 'List all tone evaluation results as matrix' })
  async getEvaluations() {
    return this.toneService.getEvaluationMatrix();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search evaluations with filters and pagination' })
  async searchEvaluations(@Query() query: SearchEvaluationsDto) {
    return this.toneService.searchEvaluations(query);
  }

  @Get('chart')
  @ApiOperation({ summary: 'Get evaluation scores over time (for chart)' })
  @ApiQuery({ name: 'brandId', required: true })
  getChartData(@Query('brandId') brandId: string) {
    return this.toneService.getChartData(brandId);
  }

  @Get('chart/preview')
  @ApiOperation({ summary: 'Get preview chart data for a brand' })
  @ApiQuery({ name: 'brandId', required: true })
  getChartPreview(@Query('brandId') brandId: string) {
    return this.toneService.getChartPreview(brandId);
  }

  @Get('chart/image')
  @ApiOperation({ summary: 'Get evaluation line chart as image (PNG)' })
  @ApiProduces('image/png')
  async getChartImage(@Res() res: Response, @Query('brandId') brandId: string) {
    const buffer = await this.toneService.renderLineChart(brandId);
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get score statistics for a brand' })
  @ApiQuery({ name: 'brandId', required: true, type: String, description: 'Brand ID to compute stats for' })
  async getScoreStats(@Query('brandId') brandId: string) {
    return this.toneService.getScoreStats(brandId);
  }

  @Get('feedback/:evaluationId')
  @ApiOperation({ summary: 'Get feedback summary for an evaluation' })
  getFeedback(@Param('evaluationId') evaluationId: string) {
    return this.toneService.getFeedbackSummary(evaluationId);
  }

  @Get('tone-insights')
  @ApiOperation({ summary: 'Which tone traits lead to the best scores?' })
  @ApiQuery({ name: 'brandId', required: true })
  insights(@Query('brandId') brandId: string) {
    return this.toneService.getToneTraitScoreCorrelations(brandId);
  }

  @Get('chart/traits')
  @ApiOperation({ summary: 'Visual chart of best-performing tone traits' })
  @ApiQuery({ name: 'brandId', required: true })
  @ApiQuery({ name: 'type', enum: ChartType, required: false, description: 'Chart type (bar or radar)' })
  async traitChart(
    @Query('brandId') brandId: string,
    @Query('type') type: ChartType = ChartType.Bar,
    @Res() res: Response,
  ) {
    const buffer = await this.toneService.chartTraitScores(brandId, type);
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  }

  @Get('rejections')
  @ApiOperation({ summary: 'List all tone update rejections' })
  async getRejections(): Promise<ToneRejectionDto[]> {
    const rejections = await this.toneService.getAllRejections();
    return rejections.map(this.toRejectionDto);
  }

  private toRejectionDto(entity: any): ToneRejectionDto {
    return {
      id: entity.id,
      brandId: entity.brandId,
      reviewer: entity.reviewer,
      comment: entity.comment,
      createdAt: entity.createdAt,
    };
  }

  @Get('rejections/chart')
  @ApiOperation({ summary: 'Bar chart of tone rejections per reviewer' })
  @ApiProduces('image/png')
  async renderRejectionChart(@Res() res: Response) {
    const buffer = await this.toneService.chartRejectionStats();
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  }
}
