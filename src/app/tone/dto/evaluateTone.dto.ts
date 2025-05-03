import { ApiProperty } from '@nestjs/swagger';

export class EvaluateToneDto {
  @ApiProperty({ example: 'Original input text before rewriting.' })
  originalText: string;

  @ApiProperty({ example: 'Rewritten version of the text.' })
  rewrittenText: string;

  @ApiProperty({ example: 'f3d8d2a0-761b-4c1a-a9a4-93b8e5f8e7b1' })
  brandId: string;
}
