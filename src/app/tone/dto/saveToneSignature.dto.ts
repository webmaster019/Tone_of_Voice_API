import { ApiProperty } from '@nestjs/swagger';

export class SaveToneSignatureDto {
  @ApiProperty({ example: 'acme-uuid-or-name', required: false })
  brandId?: string;

  @ApiProperty({ example: 'We help customers achieve more.' })
  text: string;
}
