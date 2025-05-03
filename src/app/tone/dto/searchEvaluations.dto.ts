import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max
} from 'class-validator';

export class SearchEvaluationsDto {
  @ApiPropertyOptional({ description: 'Brand ID to filter by' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({ type: Number, description: 'Minimum score (0–1)', example: 0.5 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore: number = 0;

  @ApiPropertyOptional({ type: Number, description: 'Maximum score (0–1)', example: 1.0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  maxScore: number = 1;

  @ApiPropertyOptional({ type: String, format: 'date', description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ type: String, format: 'date', description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ type: Number, example: 1, description: 'Page number' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ type: Number, example: 10, description: 'Items per page' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit: number = 10;
}
