import { buildPayload } from "./payloadBuilder.js";

export interface Env {
  ALLOWED_ORIGIN?: string;
  API_SECRET: string;
  ROUNDUPS_API_KEY: string;
  ROUNDUPS_API_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin");
  if (!origin || origin !== env.ALLOWED_ORIGIN) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function response(
  body: string,
  status: number,
  request: Request,
  env: Env,
  contentType = "text/plain",
): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": contentType,
      ...corsHeaders(request, env),
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) {
        return response("Forbidden", 403, request, env);
      }

      return response("", 204, request, env);
    }

    if (request.method !== "POST" || url.pathname !== "/api/v1/roundups/trigger") {
      return response("Not Found", 404, request, env);
    }

    if (request.headers.get("Authorization") !== `Bearer ${env.API_SECRET}`) {
      return response("Unauthorized", 401, request, env);
    }

    let payload: { campaign_id?: string };
    try {
      payload = await request.json();
    } catch {
      return response("Bad Request: Invalid JSON", 400, request, env);
    }

    if (!payload.campaign_id) {
      return response("Bad Request: Missing campaign_id", 400, request, env);
    }

    const campaignUrl = new URL("/rest/v1/campaigns", env.SUPABASE_URL);
    campaignUrl.searchParams.set("id", `eq.${payload.campaign_id}`);
    campaignUrl.searchParams.set("select", "*");

    const campaignResponse = await fetch(campaignUrl, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!campaignResponse.ok) {
      return response("Internal Server Error: Failed to fetch campaign", 500, request, env);
    }

    const campaigns = await campaignResponse.json() as Array<Record<string, unknown>>;
    const campaign = campaigns[0];
    if (!campaign) {
      return response("Not Found: Campaign not found", 404, request, env);
    }

    const roundupsResponse = await fetch(env.ROUNDUPS_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.ROUNDUPS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload({
        campaign_id: String(campaign.id ?? payload.campaign_id),
        product_urls: Array.isArray(campaign.product_urls) ? campaign.product_urls.map(String) : undefined,
        affiliate_url: typeof campaign.affiliate_url === "string" ? campaign.affiliate_url : undefined,
        keywords: typeof campaign.keywords === "string" ? campaign.keywords : undefined,
        is_software: campaign.is_software === true,
      })),
    });

    if (roundupsResponse.status !== 202) {
      return response(
        JSON.stringify({ status: "Roundups request failed", external_status: roundupsResponse.status }),
        502,
        request,
        env,
        "application/json",
      );
    }

    const roundupsResult = await roundupsResponse.json() as { id?: string };
    if (!roundupsResult.id) {
      return response("Bad Gateway: Roundups response did not include a job ID", 502, request, env);
    }

    const auditLogResponse = await fetch(new URL("/rest/v1/roundups_audit_logs", env.SUPABASE_URL), {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        campaign_id: payload.campaign_id,
        roundups_job_id: roundupsResult.id,
        status: "generating",
      }),
    });

    if (!auditLogResponse.ok) {
      return response("Internal Server Error: Failed to write audit log", 500, request, env);
    }

    return response(
      JSON.stringify({ status: "accepted", roundups_job_id: roundupsResult.id }),
      202,
      request,
      env,
      "application/json",
    );
  },
};
