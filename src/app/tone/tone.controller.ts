import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ToneService } from './tone.service';
import { AnalyzeTextDto, SaveToneSignatureDto, OptimizeTextDto } from './dto/tone.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Tone')
@Controller('tone')
export class ToneController {
  constructor(private readonly toneService: ToneService) {}

  @ApiOperation({ summary: 'Analyze tone and return signature (JSON structure)' })
  @Post('signature/analyze')
  analyze(@Body() dto: AnalyzeTextDto) {
    return this.toneService.analyzeText(dto.text);
  }

  @ApiOperation({ summary: 'Analyze tone and save signature to DB' })
  @Post('signature/save')
  save(@Body() dto: SaveToneSignatureDto) {
    return this.toneService.analyzeAndSave(dto.text, dto.brandId);
  }

  @ApiOperation({ summary: 'Rewrite text using stored tone-of-voice signature' })
  @Post('signature/rewrite')
  rewrite(@Body() dto: OptimizeTextDto) {
    return this.toneService.rewriteText(dto.text, dto.brandId);
  }

  @ApiOperation({ summary: 'Get the tone-of-voice signature for a brandId' })
  @Get('signature/:brandId')
  getSignature(@Param('brandId') brandId: string) {
    return this.toneService.getSignature(brandId);
  }

  @ApiOperation({ summary: 'List all known brandIds with stored signatures' })
  @Get('brand')
  listBrands() {
    return this.toneService.listAllBrands();
  }

  @ApiOperation({ summary: 'Detect which brand matches the tone of this text' })
  @Post('brand/detect')
  detectBrand(@Body() dto: AnalyzeTextDto) {
    return this.toneService.detectBrand(dto.text);
  }
}
