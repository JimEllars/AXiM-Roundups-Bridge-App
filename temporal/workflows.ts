import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from './activities.js';

// Configure proxy activities with native exponential backoff and retry policies
// This ensures that unexpected API downtime (e.g., 502 Bad Gateway) is handled safely.
const { checkRoundupStatus, finalizeRoundupLog, dispatchFailureAlert } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '15s',
    backoffCoefficient: 2,
    maximumInterval: '2m',
    maximumAttempts: 10, // Adjust based on how long you want to tolerate API downtime
  },
});

/**
 * Temporal workflow to poll the Roundups API and update the Supabase state.
 */
export async function RoundupGenerationWorkflow(campaignId: string, roundupsJobId: string): Promise<void> {
  // Configured polling strategy: 20 seconds with exponential backoff to 45 seconds maximum
  let currentSleepInterval = 20;
  const maxSleepInterval = 45;

  while (true) {
    // 1. Poll the API for current status
    const status = await checkRoundupStatus(roundupsJobId);

    // 2. Break the loop if the state is no longer "generating"
    if (status.state !== 'generating') {
      
      // 3. Database Resolution & Error Handling
      // "draft" -> Success; extract article.id, article.title, article.content, article.featured_image, and article.meta_description.
      // "timeout" or error string -> Mark workflow failed with detailed reason.
      
      if (status.state === 'timeout' || status.state === 'error' || status.state !== 'draft') {
        try {
          const errorDetails = status.errors ? JSON.stringify(status.errors) : `Job failed with state: ${status.state}`;
          await dispatchFailureAlert(campaignId, roundupsJobId, errorDetails);
        } catch (e) {
          // Graceful failure for the alert
          console.warn('Failed to dispatch failure alert:', e);
        }
      }

      await finalizeRoundupLog(campaignId, roundupsJobId, status);
      break;
    }

    // 4. Use Temporal's native sleep to prevent blocking compute threads while waiting
    await sleep(`${currentSleepInterval}s`);

    // Calculate exponential backoff up to max
    currentSleepInterval = Math.min(currentSleepInterval * 1.5, maxSleepInterval);
  }
}
