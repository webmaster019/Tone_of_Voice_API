import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeTextDto {
  @ApiProperty({ example: 'This is a sample brand message.' })
  text: string;
}

export class SaveToneSignatureDto {
  @ApiProperty({ example: 'acme-uuid-or-name', required: false })
  brandId?: string;

  @ApiProperty({ example: 'We help customers achieve more.' })
  text: string;
}

export class OptimizeTextDto {
  @ApiProperty({ example: 'acme-uuid-or-name' })
  brandId: string;

  @ApiProperty({ example: 'Our mission is to drive progress.' })
  text: string;
}

export class ToneSignatureDto {
  @ApiProperty()
  tone: string;

  @ApiProperty()
  languageStyle: string;

  @ApiProperty()
  formality: string;

  @ApiProperty()
  formsOfAddress: string;

  @ApiProperty()
  emotionalAppeal: string;
}
