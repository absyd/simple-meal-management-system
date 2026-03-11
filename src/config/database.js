import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment configuration
const envPath = join(__dirname, '../../.env.json');
let envConfig;

try {
  envConfig = JSON.parse(readFileSync(envPath, 'utf8'));
} catch (error) {
  console.error('Error loading environment configuration:', error);
  process.exit(1);
}

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(envConfig.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

export const getEnvConfig = () => envConfig;
