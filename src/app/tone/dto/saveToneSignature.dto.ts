import { ApiProperty } from '@nestjs/swagger';

export class SaveToneSignatureDto {
  @ApiProperty({ example: 'b4a8e92e-5c25-4fae-8f26-3fd1aaf2c1e3', required: false })
  brandId?: string;

  @ApiProperty({ example: 'At nuwacom, we empower marketing and communication teams with AI-driven solutions to streamline workflows, enhance collaboration, and ensure brand consistency. Our intelligent platform helps teams find knowledge faster, create high-quality content effortlessly, and automate processes securely. Join us in shaping the future of AI-powered work. 🚀' })
  text: string;
}
