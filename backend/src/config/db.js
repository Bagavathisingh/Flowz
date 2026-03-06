import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI environment variable is missing');

    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`CRITICAL: Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
