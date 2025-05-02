import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ConfigService } from './lib/config/config.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Main');
  const configService= new ConfigService()
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Tone of Voice API')
    .setDescription('API to analyze, store, and rewrite text based on brand tone')
    .setVersion('1.0')
    .addTag('Tone')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/doc', app, document);

  const app_port=configService.get("PORT")
  await app.listen(app_port);
  logger.log(`App running on http://localhost:${app_port} Swagger: http://localhost:${app_port}/api/doc`);
}
bootstrap();
