import { ApiProperty } from '@nestjs/swagger';
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
