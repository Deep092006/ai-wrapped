/**
 * 📨 RAG Queue System with BullMQ
 * Process document chunking and indexing jobs asynchronously
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { 
  newChatId,
  chunkPDF, 
  chunkText,
  addDocs, 
  search
} from './rag-utils.js';

// 🔴 Redis connection configuration
const connection = new IORedis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// 📥 Create job queue
const ragQueue = new Queue('rag-processing', { connection });

// 📊 Queue events listener
const queueEvents = new QueueEvents('rag-processing', { connection });

// 🎧 Listen to queue events
queueEvents.on('waiting', ({ jobId }) => {
  console.log(`⏳ Job ${jobId} is waiting`);
});

queueEvents.on('active', ({ jobId, prev }) => {
  console.log(`🔄 Job ${jobId} is now active (was: ${prev})`);
});

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`✅ Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.log(`❌ Job ${jobId} failed: ${failedReason}`);
});

queueEvents.on('progress', ({ jobId, data }, timestamp) => {
  console.log(`📈 Job ${jobId} progress: ${data}% at ${timestamp}`);
});

// 🔧 Create worker to process jobs
const worker = new Worker(
  'rag-processing',
  async job => {
    const { type, userId, chatId, data } = job.data;

    console.log(`\n🚀 Processing job ${job.id}: ${type}`);
    console.log(`   User: ${userId}, Chat: ${chatId}`);

    try {
      switch (type) {
        case 'chunk-pdf': {
          // Process PDF chunking
          const { filePath, chunkSize, chunkOverlap } = data;
          await job.updateProgress(10);
          
          const chunks = await chunkPDF(filePath, chunkSize, chunkOverlap);
          await job.updateProgress(50);
          
          // Add chunks to vector store
          await addDocs(userId, chatId, chunks);
          await job.updateProgress(100);
          
          return {
            success: true,
            chunksCount: chunks.length,
            message: `Added ${chunks.length} chunks from PDF`
          };
        }

        case 'chunk-text': {
          // Process text chunking
          const { text, chunkSize, chunkOverlap } = data;
          await job.updateProgress(20);
          
          const chunks = await chunkText(text, chunkSize, chunkOverlap);
          await job.updateProgress(60);
          
          // Add chunks to vector store
          await addDocs(userId, chatId, chunks);
          await job.updateProgress(100);
          
          return {
            success: true,
            chunksCount: chunks.length,
            message: `Added ${chunks.length} text chunks`
          };
        }

        case 'search': {
          // Process search query
          const { query, topK } = data;
          await job.updateProgress(50);
          
          const results = await search(userId, chatId, query, topK);
          await job.updateProgress(100);
          
          return {
            success: true,
            resultsCount: results.length,
            results: results.map(r => ({
              content: r.pageContent,
              metadata: r.metadata
            }))
          };
        }

        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    } catch (error) {
      console.error(`❌ Job ${job.id} error:`, error.message);
      throw error;
    }
  },
  { connection }
);

// 🎧 Worker event listeners
worker.on('completed', job => {
  console.log(`✨ Worker completed job ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.log(`💥 Worker failed job ${job?.id}: ${err.message}`);
});

// 📤 Helper functions to add jobs to queue

/**
 * Add PDF processing job to queue
 */
export async function queuePDFProcessing(userId, chatId, filePath, options = {}) {
  const job = await ragQueue.add('process-pdf', {
    type: 'chunk-pdf',
    userId,
    chatId,
    data: {
      filePath,
      chunkSize: options.chunkSize || 500,
      chunkOverlap: options.chunkOverlap || 50
    }
  });
  
  console.log(`📨 Queued PDF processing job: ${job.id}`);
  return job.id;
}

/**
 * Add text processing job to queue
 */
export async function queueTextProcessing(userId, chatId, text, options = {}) {
  const job = await ragQueue.add('process-text', {
    type: 'chunk-text',
    userId,
    chatId,
    data: {
      text,
      chunkSize: options.chunkSize || 500,
      chunkOverlap: options.chunkOverlap || 50
    }
  });
  
  console.log(`📨 Queued text processing job: ${job.id}`);
  return job.id;
}

/**
 * Add search job to queue
 */
export async function queueSearch(userId, chatId, query, topK = 5) {
  const job = await ragQueue.add('search', {
    type: 'search',
    userId,
    chatId,
    data: { query, topK }
  });
  
  console.log(`📨 Queued search job: ${job.id}`);
  return job.id;
}

/**
 * Get job status and result
 */
export async function getJobStatus(jobId) {
  const job = await ragQueue.getJob(jobId);
  if (!job) return null;
  
  const state = await job.getState();
  const progress = job.progress;
  const returnValue = job.returnvalue;
  
  return {
    id: jobId,
    state,
    progress,
    result: returnValue
  };
}

/**
 * Wait for job completion and return result
 */
export async function waitForJob(jobId, timeout = 60000) {
  const job = await ragQueue.getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  
  const result = await job.waitUntilFinished(queueEvents, timeout);
  return result;
}

// 🧹 Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await worker.close();
  await queueEvents.close();
  await connection.quit();
  process.exit(0);
});

export { ragQueue, worker, queueEvents, connection };
