import { ApiProperty } from '@nestjs/swagger';

export class SubmitFeedbackDto {
  @ApiProperty() evaluationId: string;
  @ApiProperty() userId: string;
  @ApiProperty() helpful: boolean;
}
