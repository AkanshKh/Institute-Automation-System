import mongoose from 'mongoose';
import { GlobalFeedbackConfig } from '../models/feedback.model.js';
// Get MongoDB URI from environment variables

// MongoDB connection function
const connectDB = async () => {
    try {
    //   console.log(process.env.MONGODB_URI);
    // const conn = await mongoose.connect(process.env.MONGODB_URI);
    const conn = await mongoose.connect("mongodb+srv://divyansh:KrHRg7mgeh7tgNiU@cluster0.qhaz53w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await initializeGlobalConfig();
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const initializeGlobalConfig = async () => {
  try {
    await GlobalFeedbackConfig.getConfig();
    console.log('Global feedback config initialized');
  } catch (err) {
    console.error('Config initialization failed:', err);
    process.exit(1);
  }
};

// Export mongoose as well
export { mongoose,connectDB };