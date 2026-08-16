import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from './activities';

// Configure proxy activities with native exponential backoff and retry policies
// This ensures that unexpected API downtime (e.g., 502 Bad Gateway) is handled safely.
const { checkRoundupStatus, finalizeRoundupLog, failRoundupLog } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
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
  while (true) {
    // 1. Poll the API for current status
    const status = await checkRoundupStatus(roundupsJobId);

    // 2. Break the loop if the state is no longer "generating"
    if (status.state !== 'generating') {
      
      // 3. Database Resolution & Error Handling
      if (status.state === 'draft') {
        // Success case
        await finalizeRoundupLog(campaignId, roundupsJobId, status.article);
      } else {
        // Failure case: timeout, errors, or unknown states
        const errorString = status.errors 
          ? JSON.stringify(status.errors) 
          : `Job terminated with unexpected state: ${status.state}`;
          
        await failRoundupLog(campaignId, roundupsJobId, errorString);
      }
      
      break;
    }

    // 4. Use Temporal's native sleep to prevent blocking compute threads while waiting
    await sleep('45s');
  }
}