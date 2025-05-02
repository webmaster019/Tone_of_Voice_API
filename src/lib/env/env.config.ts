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
};
