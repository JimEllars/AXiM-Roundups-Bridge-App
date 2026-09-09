import { buildPayload, validateCampaignPayload } from "./payloadBuilder.js";

const idempotencyCache = new Set<string>();

export interface Env {
  WEBHOOK_SECRET?: string;
  TEMPORAL_REST_URL: string;
  TEMPORAL_API_KEY: string;
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-idempotency-key, x-axim-trace-id",
    Vary: "Origin",
  };
}

function response(
  body: string,
  status: number,
  request: Request,
  env: Env,
  contentType = "text/plain",
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": contentType,
      ...corsHeaders(request, env),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      ...extraHeaders
    },
  });
}

async function verifySignature(secret: string, signatureHex: string, payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === signatureHex;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();

    // Generate or use provided trace ID
    const providedTraceId = request.headers.get("x-axim-trace-id");
    const traceId = providedTraceId || crypto.randomUUID();

    const origin = request.headers.get("Origin") || "unknown";

    const logTelemetry = (status: number, extra: any = {}) => {
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        trace_id: traceId,
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        origin,
        duration_ms: duration,
        status,
        idempotency_key: request.headers.get("x-idempotency-key") || undefined,
        ...extra,
      }));
    };

    const _originalResponse = response;
    const responseWithLog = (body: string, status: number, req: Request, e: Env, contentType = "text/plain", extraHeaders: Record<string, string> = {}) => {
      let isError = status >= 400;
      logTelemetry(status, isError ? { error: body } : {});
      return _originalResponse(body, status, req, e, contentType, { "x-axim-trace-id": traceId, ...extraHeaders });
    };

    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) {
        return responseWithLog("Forbidden", 403, request, env);
      }
      return responseWithLog("", 204, request, env);
    }

    // Health and Telemetry endpoints
    if (request.method === "GET" && (url.pathname === "/health" || url.pathname === "/telemetry")) {
      const healthData = {
        status: "ok",
        timestamp: new Date().toISOString(),
        edgeRegion: (request as any).cf?.colo || "local"
      };
      return responseWithLog(JSON.stringify(healthData), 200, request, env, "application/json", { "Cache-Control": "no-store" });
    }

    if (request.method !== "POST" || url.pathname !== "/api/v1/roundups/trigger") {
      return responseWithLog(JSON.stringify({ error: "Not Found", code: 404 }), 404, request, env, "application/json");
    }

    if (request.headers.get("Authorization") !== `Bearer ${env.API_SECRET}`) {
      return responseWithLog(JSON.stringify({ error: "Unauthorized", code: 401 }), 401, request, env, "application/json");
    }

    const idempotencyKey = request.headers.get("x-idempotency-key");
    if (idempotencyKey) {
      if (idempotencyCache.has(idempotencyKey)) {
         return responseWithLog(
            JSON.stringify({ error: "Conflict: Duplicate request", code: 409, trace_id: traceId }),
            409, request, env, "application/json"
         );
      }
      idempotencyCache.add(idempotencyKey);
      if (idempotencyCache.size > 1000) {
         const first = idempotencyCache.values().next().value;
         if (first) idempotencyCache.delete(first);
      }
    }

    const clonedRequest = request.clone();
    let rawBody = "";
    try {
      rawBody = await clonedRequest.text();
    } catch (e: any) {
      return responseWithLog(
        JSON.stringify({ error: "Bad Request: Could not read body", code: 400, message: e?.message, trace_id: traceId }),
        400, request, env, "application/json"
      );
    }

    if (env.WEBHOOK_SECRET) {
      const signatureHex = request.headers.get("X-AXiM-Signature") || request.headers.get("X-Webhook-Secret");
      if (!signatureHex || !(await verifySignature(env.WEBHOOK_SECRET, signatureHex, rawBody))) {
        return responseWithLog(
           JSON.stringify({ error: "Unauthorized: Invalid signature", code: 401, trace_id: traceId }),
           401, request, env, "application/json"
        );
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e: any) {
      return responseWithLog(
        JSON.stringify({ error: "Bad Request: Invalid JSON", code: 400, message: e?.message, trace_id: traceId }),
        400, request, env, "application/json"
      );
    }

    const validation = validateCampaignPayload(payload);
    if (!validation.isValid) {
      return responseWithLog(
        JSON.stringify({ error: "Bad Request: Validation Failed", code: 400, details: validation.error, trace_id: traceId }),
        400, request, env, "application/json"
      );
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
      return responseWithLog(
        JSON.stringify({ error: "Internal Server Error: Failed to fetch campaign", code: 500, trace_id: traceId }),
        500, request, env, "application/json"
      );
    }

    const campaigns = await campaignResponse.json() as Array<Record<string, unknown>>;
    const campaign = campaigns[0];
    if (!campaign) {
      return responseWithLog(
        JSON.stringify({ error: "Not Found: Campaign not found", code: 404, trace_id: traceId }),
        404, request, env, "application/json"
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, 10000); // 10s timeout
    let roundupsResponse: globalThis.Response;
    try {
        roundupsResponse = await fetch(env.ROUNDUPS_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.ROUNDUPS_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildPayload({
            campaign_id: String(campaign.id ?? payload.campaign_id),
            product_urls: Array.isArray(campaign.product_urls) ? campaign.product_urls.map(String) : undefined,
            affiliate_url: typeof campaign.affiliate_url === "string" ? campaign.affiliate_url : undefined,
            keywords: payload.keywords || (typeof campaign.keywords === "string" ? campaign.keywords : undefined),
            is_software: campaign.is_software === true,
          })),
          signal: controller.signal as any
        });
    } catch (e: any) {
        clearTimeout(timeout);
        return responseWithLog(
           JSON.stringify({ error: "Bad Gateway: Upstream timeout or network error", code: 502, message: e?.message, trace_id: traceId }),
           502, request, env, "application/json", { "Retry-After": "30" }
        );
    }
    clearTimeout(timeout);


    if (roundupsResponse.status !== 202) {
      return responseWithLog(
        JSON.stringify({ error: "Roundups request failed", code: 502, external_status: roundupsResponse.status, trace_id: traceId }),
        502,
        request,
        env,
        "application/json",
      );
    }

    const roundupsResult = await roundupsResponse.json() as { id?: string };
    if (!roundupsResult.id) {
      return responseWithLog(
        JSON.stringify({ error: "Bad Gateway: Roundups response did not include a job ID", code: 502, trace_id: traceId }),
        502, request, env, "application/json"
      );
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
      return responseWithLog(
        JSON.stringify({ error: "Internal Server Error: Failed to write audit log", code: 500, trace_id: traceId }),
        500, request, env, "application/json"
      );
    }

    ctx.waitUntil((async () => {
      try {
        const temporalResponse = await fetch(env.TEMPORAL_REST_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.TEMPORAL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
             campaign_id: payload.campaign_id,
             roundups_job_id: roundupsResult.id,
          }),
        });

        if (!temporalResponse.ok) {
           console.error(JSON.stringify({
              error: `Failed to trigger Temporal workflow: ${temporalResponse.status} ${temporalResponse.statusText}`,
              trace_id: traceId
           }));
        } else {
           console.log(JSON.stringify({
             message: `Temporal workflow triggered successfully for job: ${roundupsResult.id}`,
             trace_id: traceId
           }));
        }
      } catch (e: any) {
        console.error(JSON.stringify({
           error: "Exception caught while triggering Temporal workflow",
           message: e?.message,
           trace_id: traceId
        }));
      }
    })());


    return responseWithLog(
      JSON.stringify({ status: "accepted", roundups_job_id: roundupsResult.id, trace_id: traceId }),
      202,
      request,
      env,
      "application/json",
    );
  },
};
