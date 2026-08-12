import mongoose from 'mongoose';
import { getEnv } from './lib/env';

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(getEnv().MONGODB_URI);
  console.log('MongoDB connected successfully');
}
