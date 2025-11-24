import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: process.env.PORT || 4000,
  DATABASE_URL: process.env.DATABASE_URL,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || null,
};