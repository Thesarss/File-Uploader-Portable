import FileRepository, { UploadRecordInput, UploadRecord } from './file-repository';

/**
 * HistoryService manages upload history and metadata
 * Provides retry logic with exponential backoff for database failures
 */
export class HistoryService {
  private repository: FileRepository;

  constructor(repository?: FileRepository) {
    this.repository = repository || new FileRepository();
  }

  /**
   * Record an upload with retry logic for database failures
   * Implements exponential backoff: 1s, 2s, 4s with maximum 3 attempts
   * @param record Upload record data
   * @throws Error if all retry attempts fail
   */
  async recordUpload(record: UploadRecordInput): Promise<void> {
    const maxAttempts = 3;
    const delays = [1000, 2000, 4000]; // Exponential backoff in milliseconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await this.repository.insertUploadRecord(record);
        
        // Log successful recording after retry
        if (attempt > 0) {
          console.log(`Upload record saved successfully after ${attempt + 1} attempt(s)`);
        }
        
        return; // Success - exit the function
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts - 1;
        
        console.error(
          `Failed to record upload (attempt ${attempt + 1}/${maxAttempts}):`,
          error instanceof Error ? error.message : 'Unknown error'
        );

        if (isLastAttempt) {
          // All retries exhausted
          throw new Error(
            `Failed to record upload after ${maxAttempts} attempts: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }

        // Wait before retrying (exponential backoff)
        const delay = delays[attempt];
        console.log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Get upload history for a specific session
   * @param sessionId Session identifier
   * @returns Array of upload records for the session
   */
  async getSessionHistory(sessionId: string): Promise<UploadRecord[]> {
    try {
      return await this.repository.getUploadsBySession(sessionId);
    } catch (error) {
      console.error('Error fetching session history:', error);
      throw new Error(
        `Failed to fetch session history: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get recent uploads with optional limit
   * @param limit Maximum number of records to return (default: 50)
   * @returns Array of recent upload records
   */
  async getRecentUploads(limit: number = 50): Promise<UploadRecord[]> {
    try {
      return await this.repository.getRecentUploads(limit);
    } catch (error) {
      console.error('Error fetching recent uploads:', error);
      throw new Error(
        `Failed to fetch recent uploads: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Helper method to sleep for a specified duration
   * @param ms Duration in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default HistoryService;
