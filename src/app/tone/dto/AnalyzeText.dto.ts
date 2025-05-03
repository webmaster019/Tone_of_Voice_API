import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeTextDto {
  @ApiProperty({ example: "At nuwacom, we empower marketing and communication teams with AI-driven solutions to streamline workflows, enhance collaboration, and ensure brand consistency. Our intelligent platform helps teams find knowledge faster, create high-quality content effortlessly, and automate processes securely. Join us in shaping the future of AI-powered work. 🚀" })
  text: string;
}
