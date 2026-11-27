import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
let supabase: any;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

const ROUNDUPS_API_KEY = process.env.ROUNDUPS_API_KEY || '';

export interface RoundupStatusResponse {
  state: 'generating' | 'draft' | 'timeout' | 'error' | string;
  article: any | null;
  errors: any | null;
}

/**
 * Executes a GET request to the Roundups API to check the status of a job.
 */
export async function checkRoundupStatus(roundupsJobId: string): Promise<RoundupStatusResponse> {
  const response = await fetch(`https://roundups.ai/api/v1/roundups/${roundupsJobId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ROUNDUPS_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // This throws an error which Temporal will automatically retry 
    // based on the Activity retry policy (e.g., 502 Bad Gateway)
    throw new Error(`Roundups API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    state: data.state,
    article: data.article || null,
    errors: data.errors || null,
  };
}

/**
 * Updates the Supabase audit log based on the final API response.
 */
export async function finalizeRoundupLog(campaignId: string, roundupsJobId: string, apiResponse: RoundupStatusResponse): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  if (apiResponse.state === 'draft' && !apiResponse.errors) {
    const { error } = await supabase
      .from('roundups_audit_logs')
      .update({
        status: 'completed',
        article_id: apiResponse.article?.id || null,
        article_url: apiResponse.article?.url || null, // Logs generated URL if available
        article_title: apiResponse.article?.title || null,
        article_content: apiResponse.article?.content || null,
        article_featured_image: apiResponse.article?.featured_image || null,
        article_meta_description: apiResponse.article?.meta_description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('campaign_id', campaignId)
      .eq('roundups_job_id', roundupsJobId);

    if (error) {
      throw new Error(`Failed to finalize roundup log in Supabase: ${error.message}`);
    }

    // Dispatch event to AXiM Core & Onyx systems
    try {
      await notifyCoreAndOnyx(campaignId, roundupsJobId, apiResponse.article);
    } catch (e) {
      console.warn('Failed to notify Core/Onyx endpoints:', e);
    }
  } else {
    // Failure cases: timeout, errors, or any other non-draft states
    const errorString = apiResponse.errors
          ? JSON.stringify(apiResponse.errors)
          : `Job terminated with unexpected state: ${apiResponse.state}`;

    const { error } = await supabase
      .from('roundups_audit_logs')
      .update({
        status: 'failed',
        error_details: errorString,
        updated_at: new Date().toISOString(),
      })
      .eq('campaign_id', campaignId)
      .eq('roundups_job_id', roundupsJobId);

    if (error) {
      throw new Error(`Failed to log error to Supabase: ${error.message}`);
    }

    // As per requirement: string error states -> explicit workflow failure
    throw new Error(`Roundup Generation Failed: ${errorString}`);
  }
}

/**
 * Notifies AXiM Core and Onyx systems of newly published affiliate articles.
 */
export async function notifyCoreAndOnyx(campaignId: string, roundupsJobId: string, article: any): Promise<void> {
  const coreWebhookUrl = process.env.AXIM_CORE_WEBHOOK_URL;
  const onyxWebhookUrl = process.env.ONYX_INGEST_WEBHOOK_URL;
  const sharedSecret = process.env.BRIDGE_SYSTEM_SECRET || process.env.API_SECRET || '';

  const notificationPayload = {
    event: 'article.published',
    source: 'axim-roundups-bridge',
    timestamp: new Date().toISOString(),
    campaignId,
    roundupsJobId,
    article: {
      id: article?.id || null,
      title: article?.title || null,
      url: article?.url || null,
      featured_image: article?.featured_image || null,
      meta_description: article?.meta_description || null,
    }
  };

  const dispatch = async (url: string, systemName: string) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': sharedSecret ? `Bearer ${sharedSecret}` : '',
          'X-AXiM-Source': 'roundups-bridge',
        },
        body: JSON.stringify(notificationPayload)
      });
      if (!res.ok) {
        console.warn(`[Integration] ${systemName} returned status ${res.status}`);
      } else {
        console.log(`[Integration] Successfully dispatched article to ${systemName}`);
      }
    } catch (err: any) {
      console.warn(`[Integration] Failed to dispatch to ${systemName}: ${err?.message}`);
    }
  };

  const promises: Promise<void>[] = [];
  if (coreWebhookUrl) {
    promises.push(dispatch(coreWebhookUrl, 'AXiM Core'));
  }
  if (onyxWebhookUrl) {
    promises.push(dispatch(onyxWebhookUrl, 'Onyx Knowledge Engine'));
  }

  await Promise.allSettled(promises);
}


/**
 * Dispatches a failure alert to external automation routing.
 */
export async function dispatchFailureAlert(campaignId: string, roundupsJobId: string, errorDetails: string): Promise<void> {
  const webhookUrl = process.env.ALBATO_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('ALBATO_WEBHOOK_URL is not set. Skipping failure alert dispatch.');
    return;
  }

  const payload = {
    campaignId,
    roundupsJobId,
    timestamp: new Date().toISOString(),
    errorDetails,
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to dispatch alert to Albato: ${response.status} ${response.statusText}`);
  }
}
