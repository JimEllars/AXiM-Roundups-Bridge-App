import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const ROUNDUPS_API_KEY = process.env.ROUNDUPS_API_KEY || '';

export interface RoundupStatusResponse {
  state: 'generating' | 'draft' | 'timeout' | 'error';
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
 * Updates the Supabase audit log for a successful roundup generation.
 */
export async function finalizeRoundupLog(campaignId: string, roundupsJobId: string, articleData: any): Promise<void> {
  const { error } = await supabase
    .from('roundups_audit_logs')
    .update({
      status: 'completed',
      article_id: articleData?.id,
      article_url: articleData?.url || null, // Logs generated URL if available
      updated_at: new Date().toISOString(),
    })
    .eq('campaign_id', campaignId)
    .eq('roundups_job_id', roundupsJobId);

  if (error) {
    throw new Error(`Failed to finalize roundup log in Supabase: ${error.message}`);
  }
}

/**
 * Updates the Supabase audit log for a failed roundup generation.
 */
export async function failRoundupLog(campaignId: string, roundupsJobId: string, errorString: string): Promise<void> {
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
}