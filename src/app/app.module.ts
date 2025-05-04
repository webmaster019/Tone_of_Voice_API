import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ToneModule } from './tone/tone.module';
import { ConfigService } from '../lib/config/config.service';
import { ScheduleModule } from '@nestjs/schedule';
import { JobModule } from '../retune-job/retune-job.module';

const configService= new ConfigService()
@Module({
  imports: [
    ConfigModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: configService.get('DATABASE_HOST'),
      port: parseInt(configService.get('DATABASE_PORT'), 10),
      username: configService.get('DATABASE_USER'),
      password: configService.get('DATABASE_PASSWORD'),
      database: configService.get('DATABASE_DB'),
      autoLoadEntities: true,
      synchronize: true,
    }),
    ToneModule,
    ScheduleModule.forRoot(),
    JobModule,

  ],
})
export class AppModule {}
