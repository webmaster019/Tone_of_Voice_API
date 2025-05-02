import { ApiProperty } from '@nestjs/swagger';

export class OptimizeTextDto {
  @ApiProperty({ example: 'acme-uuid-or-name' })
  brandId: string;

  @ApiProperty({ example: 'Our mission is to drive progress.' })
  text: string;
}
