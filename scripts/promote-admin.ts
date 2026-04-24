import mongoose from 'mongoose';
import { UserModel } from './server/models';
import 'dotenv/config';

async function promoteAdmin() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/knowledge-vault";
  await mongoose.connect(uri);
  
  const email = "samimrrza1@gmail.com";
  const result = await UserModel.findOneAndUpdate(
    { email: email.toLowerCase() },
    { isAdmin: true },
    { new: true }
  );

  if (result) {
    console.log(`✅ Success! User ${email} is now an Administrator.`);
  } else {
    console.log(`❌ Error: User with email ${email} not found.`);
  }

  await mongoose.disconnect();
}

promoteAdmin();
