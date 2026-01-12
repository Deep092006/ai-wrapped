/**
 * 🧪 Simple test to verify BullMQ and Redis connection
 */

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

console.log('🔴 Testing Redis connection...');

connection.on('connect', () => {
  console.log('✅ Connected to Redis!');
  testQueue();
});

connection.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

async function testQueue() {
  // Create a simple test queue
  const testQueue = new Queue('test-queue', { connection });

  // Create a worker to process jobs
  const worker = new Worker(
    'test-queue',
    async job => {
      console.log(`🔄 Processing job ${job.id}:`, job.data);
      return { processed: true, data: job.data };
    },
    { connection }
  );

  worker.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result);
  });

  // Add a test job
  console.log('\n📨 Adding test job to queue...');
  const job = await testQueue.add('test-job', { 
    message: 'Hello BullMQ!',
    timestamp: new Date().toISOString()
  });

  console.log(`📋 Job added with ID: ${job.id}`);

  // Wait a bit and then cleanup
  setTimeout(async () => {
    console.log('\n🧹 Cleaning up...');
    await worker.close();
    await connection.quit();
    console.log('✅ Test completed successfully!');
    process.exit(0);
  }, 3000);
}
