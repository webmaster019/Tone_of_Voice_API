import { ApiProperty } from '@nestjs/swagger';

export class ToneRejectionDto {
  @ApiProperty() id: string;
  @ApiProperty() brandId: string;
  @ApiProperty() reviewer: string;
  @ApiProperty() comment: string;
  @ApiProperty() createdAt: Date;
}
