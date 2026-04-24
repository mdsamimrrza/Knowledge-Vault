import "dotenv/config";
import mongoose from 'mongoose';
import { UserModel } from './server/models';

async function cleanup() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const emailToDelete = "test@gmail.com";
    console.log(`Searching for user: ${emailToDelete}`);
    
    const result = await UserModel.deleteOne({ email: emailToDelete.toLowerCase() });
    
    if (result.deletedCount > 0) {
      console.log(`✅ Successfully deleted user: ${emailToDelete}`);
    } else {
      console.log(`ℹ️ User ${emailToDelete} was not found in the database.`);
    }

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

cleanup();
