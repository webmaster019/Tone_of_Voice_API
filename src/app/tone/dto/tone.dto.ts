import { ApiProperty } from '@nestjs/swagger';

export class ToneSignatureDto {
  @ApiProperty() tone: string;
  @ApiProperty() languageStyle: string;
  @ApiProperty() formality: string;
  @ApiProperty() formsOfAddress: string;
  @ApiProperty() emotionalAppeal: string;
  @ApiProperty() classification: string;

  @ApiProperty() readabilityScore: number;
  @ApiProperty() wordCount: number;
  @ApiProperty() sentenceCount: number;
  @ApiProperty() sentiment: string;

  @ApiProperty() emojiCount: number;
  @ApiProperty() questionCount: number;
  @ApiProperty() exclamationCount: number;
  @ApiProperty() avgWordLength: number;
  @ApiProperty() hasHashtags: boolean;
  @ApiProperty() hasMentions: boolean;
  @ApiProperty() punctuationDensity: number;
  @ApiProperty() emphaticCapitalWords: number;
  @ApiProperty() usesFirstPerson: boolean;
  @ApiProperty() usesSecondPerson: boolean;
  @ApiProperty() usesPassiveVoice: boolean;
}
