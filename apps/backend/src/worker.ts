import dotenv from 'dotenv';
import { videoProcessingQueue } from './jobs/videoProcessor';

dotenv.config();

console.log('Starting Pauser Backend Worker...');

// Keep process alive and handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing queues...`);
  await videoProcessingQueue.close();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

console.log('Worker is running and listening for jobs...');
