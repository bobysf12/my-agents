import dotenv from 'dotenv';

dotenv.config();

export const OPENAI_API_KEY: string = process.env.OPENAI_API_KEY!;
export const JWT_SECRET: string = process.env.JWT_SECRET!;
