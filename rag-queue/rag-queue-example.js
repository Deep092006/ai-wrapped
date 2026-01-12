/**
 * 📚 RAG Queue Usage Example
 * Demonstrates asynchronous document processing with BullMQ
 */

import { newChatId } from './rag-utils.js';
import { 
  queuePDFProcessing, 
  queueTextProcessing,
  queueSearch,
  getJobStatus,
  waitForJob
} from './rag-queue.js';

async function main() {
  console.log('🚀 Starting RAG Queue Example\n');

  // 🆔 Create new chat for user
  const userId = 'user_123';
  const chatId = newChatId(userId);
  console.log(`✅ Created chat: ${chatId}\n`);

  // 📄 Queue PDF processing job
  console.log('📨 Queueing PDF processing...');
  const pdfJobId = await queuePDFProcessing(
    userId, 
    chatId, 
    './nodejs_tutorial.pdf',
    { chunkSize: 500, chunkOverlap: 50 }
  );

  // 📝 Queue text processing job
  console.log('📨 Queueing text processing...');
  const textJobId = await queueTextProcessing(
    userId,
    chatId,
    'This is a sample text about Node.js and JavaScript. It will be chunked and stored in the vector database for later retrieval.',
    { chunkSize: 200, chunkOverlap: 20 }
  );

  // ⏳ Wait for PDF job to complete
  console.log(`\n⏳ Waiting for PDF job ${pdfJobId} to complete...`);
  try {
    const pdfResult = await waitForJob(pdfJobId);
    console.log('✅ PDF Result:', pdfResult);
  } catch (error) {
    console.error('❌ PDF job failed:', error.message);
  }

  // ⏳ Wait for text job to complete
  console.log(`\n⏳ Waiting for text job ${textJobId} to complete...`);
  try {
    const textResult = await waitForJob(textJobId);
    console.log('✅ Text Result:', textResult);
  } catch (error) {
    console.error('❌ Text job failed:', error.message);
  }

  // 🔍 Queue search job
  console.log('\n📨 Queueing search...');
  const searchJobId = await queueSearch(userId, chatId, 'node js', 5);

  // ⏳ Wait for search to complete
  console.log(`⏳ Waiting for search job ${searchJobId} to complete...`);
  try {
    const searchResult = await waitForJob(searchJobId);
    console.log('\n📊 Search Results:');
    searchResult.results.forEach((r, i) => {
      console.log(`\n${i + 1}. ${r.content.substring(0, 150)}...`);
    });
  } catch (error) {
    console.error('❌ Search job failed:', error.message);
  }

  // 📊 Check job status manually
  console.log('\n📊 Checking job statuses:');
  const pdfStatus = await getJobStatus(pdfJobId);
  const textStatus = await getJobStatus(textJobId);
  const searchStatus = await getJobStatus(searchJobId);
  
  console.log('PDF Job:', pdfStatus);
  console.log('Text Job:', textStatus);
  console.log('Search Job:', searchStatus);

  console.log('\n✅ Example completed!');
  
  // Note: Worker keeps running. Press Ctrl+C to stop.
  console.log('\n💡 Worker is running. Press Ctrl+C to exit.');
}

main().catch(console.error);
