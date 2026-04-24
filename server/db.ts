import mongoose from 'mongoose';
import { getEnv } from './lib/env';

export async function connectDB() {
  await mongoose.connect(getEnv().MONGODB_URI);
  console.log('MongoDB connected successfully');
}
