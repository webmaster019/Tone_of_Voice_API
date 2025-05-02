import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ConfigService } from './lib/config/config.service';

async function bootstrap() {
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

  await app.listen(configService.get("PORT"));
}
bootstrap();
