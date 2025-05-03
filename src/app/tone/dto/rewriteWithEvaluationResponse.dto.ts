import { ApiProperty } from '@nestjs/swagger';

export class RewriteWithEvaluationResponseDto {
  @ApiProperty() brandId: string;
  @ApiProperty() originalText: string;
  @ApiProperty() rewrittenText: string;

  @ApiProperty() fluency: string;
  @ApiProperty() authenticity: string;
  @ApiProperty() toneAlignment: string;
  @ApiProperty() readability: string;

  @ApiProperty({ type: [String] })
  strengths: string[];

  @ApiProperty({ type: [String] })
  suggestions: string[];

  @ApiProperty({ example: 0.85 })
  score: number;

  @ApiProperty({ example: 1024 })
  latencyMs: number;

  @ApiProperty({
    example: {
      fluency: 3,
      authenticity: 2,
      toneAlignment: 3,
      readability: 3,
    },
  })
  accuracyPoints: Record<string, number>;
}
