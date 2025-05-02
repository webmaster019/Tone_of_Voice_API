import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeTextDto {
  @ApiProperty({ example: 'This is a sample brand message.' })
  text: string;
}
