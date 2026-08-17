import { buildPayload } from "./payloadBuilder.js";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ROUNDUPS_API_URL: string;
  API_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();
    console.log(`[Ingress] Received ${request.method} ${request.url}`);

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    if (request.method !== "POST" || new URL(request.url).pathname !== "/api/v1/roundups/trigger") {
      return new Response("Not Found", { status: 404 });
    }

    // Authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${env.API_SECRET}`) {
      console.log(`[Auth] Failed authentication attempt`);
      return new Response("Unauthorized", { status: 401 });
    }

    let payload;
    try {
      payload = await request.json() as { campaign_id: string };
    } catch (e) {
      return new Response("Bad Request: Invalid JSON", { status: 400 });
    }

    const { campaign_id } = payload;
    if (!campaign_id) {
      return new Response("Bad Request: Missing campaign_id", { status: 400 });
    }

    console.log(`[Process] Processing campaign_id: ${campaign_id}`);

    // Supabase Fetch
    const sbUrl = `${env.SUPABASE_URL}/rest/v1/campaigns?id=eq.${campaign_id}&select=*`;
    const sbRes = await fetch(sbUrl, {
      method: "GET",
      headers: {
        "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!sbRes.ok) {
      console.error(`[Supabase] Failed to fetch campaign ${campaign_id}`);
      return new Response("Internal Server Error: Failed to fetch campaign", { status: 500 });
    }

    const campaigns = await sbRes.json() as any[];
    if (!campaigns || campaigns.length === 0) {
      return new Response("Not Found: Campaign not found", { status: 404 });
    }

    const campaign = campaigns[0];

    // Construct Payload
    const roundupsPayload = buildPayload({
      campaign_id: campaign.id,
      product_urls: campaign.product_urls,
      affiliate_url: campaign.affiliate_url,
      keywords: campaign.keywords,
      is_software: campaign.is_software
    });

    const handoffStartTime = Date.now();
    console.log(`[Handoff] Sending payload to Roundups API:`, JSON.stringify(roundupsPayload));

    // Egress to Roundups API
    const roundupsRes = await fetch(env.ROUNDUPS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.API_SECRET}` // Assuming same secret or some other API key
      },
      body: JSON.stringify(roundupsPayload)
    });

    const handoffEndTime = Date.now();
    console.log(`[Handoff] Roundups API responded with status ${roundupsRes.status} in ${handoffEndTime - handoffStartTime}ms`);

    if (roundupsRes.status === 202) {
      const responseBody = await roundupsRes.json() as { id: string };
      const jobId = responseBody.id;

      console.log(`[Supabase] Writing audit log for job ${jobId}`);
      // Write audit log to Supabase
      const auditLogUrl = `${env.SUPABASE_URL}/rest/v1/roundups_audit_logs`;
      await fetch(auditLogUrl, {
        method: "POST",
        headers: {
          "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          job_id: jobId,
          status: "processing"
        })
      });
    }

    const endTime = Date.now();
    console.log(`[Egress] Request completed in ${endTime - startTime}ms`);

    return new Response(JSON.stringify({ status: "Success", external_status: roundupsRes.status }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
