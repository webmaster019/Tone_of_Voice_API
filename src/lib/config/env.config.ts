import * as dotenv from 'dotenv';

dotenv.config();
export const config = {
  PORT: process.env.PORT,
  DATABASE_HOST: process.env.DATABASE_HOST,
  DATABASE_PORT: process.env.DATABASE_PORT,
  DATABASE_USER: process.env.DATABASE_USER,
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
  DATABASE_DB: process.env.DATABASE_DB,
  OPENAI_KEY: process.env.OPENAI_KEY,
  APP_REDIS_URL: process.env.APP_REDIS_URL,
  NODE_ENV: process.env.NODE_ENV,
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  SLACK_NOTIFY_USER_ID: process.env.SLACK_NOTIFY_USER_ID,
  SLACK_NOTIFY_CHANNEL: process.env.SLACK_NOTIFY_CHANNEL,
};
