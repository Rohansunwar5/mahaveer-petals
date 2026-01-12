import shiprocketWebhookService from './shiprocketWebhook.service';

interface WebhookJob {
  type: 'product' | 'collection';
  id: string;
  attempts: number;
  maxAttempts: number;
  nextRetry: Date;
}

class ShiprocketWebhookQueue {
  private queue: WebhookJob[] = [];
  private processing = false;
  private readonly MAX_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [5000, 30000, 300000]; // 5s, 30s, 5min

  /**
   * Add webhook to retry queue
   */
  addToQueue(type: 'product' | 'collection', id: string) {
    this.queue.push({
      type,
      id,
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS,
      nextRetry: new Date(),
    });

    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process webhook queue
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue[0];

      // Check if it's time to retry
      if (job.nextRetry > new Date()) {
        await this.sleep(1000); // Wait 1 second
        continue;
      }

      try {
        if (job.type === 'product') {
          await shiprocketWebhookService.sendProductUpdateWebhook(job.id);
        } else {
          await shiprocketWebhookService.sendCollectionUpdateWebhook(job.id);
        }

        // Success - remove from queue
        this.queue.shift();
        console.log(`[Webhook Queue] Successfully sent ${job.type} webhook:`, job.id);
      } catch (error) {
        job.attempts++;

        if (job.attempts >= job.maxAttempts) {
          // Max attempts reached - remove from queue
          this.queue.shift();
          console.error(`[Webhook Queue] Max attempts reached for ${job.type}:`, job.id);
        } else {
          // Schedule retry
          const delay = this.RETRY_DELAYS[job.attempts - 1];
          job.nextRetry = new Date(Date.now() + delay);
          console.warn(`[Webhook Queue] Retry scheduled for ${job.type} in ${delay}ms:`, job.id);
        }
      }
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      jobs: this.queue.map(job => ({
        type: job.type,
        id: job.id,
        attempts: job.attempts,
        nextRetry: job.nextRetry,
      })),
    };
  }
}

export default new ShiprocketWebhookQueue();