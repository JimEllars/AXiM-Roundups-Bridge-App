import { buildPayload } from "./payloadBuilder.js";
const idempotencyCache = new Set();
function corsHeaders(request, env) {
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
function response(body, status, request, env, contentType = "text/plain") {
    return new Response(body, {
        status,
        headers: {
            "Content-Type": contentType,
            ...corsHeaders(request, env),
        },
    });
}
async function verifySignature(secret, signatureHex, payload) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const hex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return hex === signatureHex;
}
export default {
    async fetch(request, env, ctx) {
        const startTime = Date.now();
        const requestId = crypto.randomUUID();
        const origin = request.headers.get("Origin") || "unknown";
        const logTelemetry = (status, extra = {}) => {
            const duration = Date.now() - startTime;
            console.log(JSON.stringify({
                requestId,
                timestamp: new Date().toISOString(),
                origin,
                durationMs: duration,
                status,
                ...extra,
            }));
        };
        const _originalResponse = response;
        const responseWithLog = (body, status, req, e, contentType = "text/plain") => {
            logTelemetry(status);
            return _originalResponse(body, status, req, e, contentType);
        };
        const url = new URL(request.url);
        if (request.method === "OPTIONS") {
            if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) {
                return responseWithLog("Forbidden", 403, request, env);
            }
            return responseWithLog("", 204, request, env);
        }
        if (request.method !== "POST" || url.pathname !== "/api/v1/roundups/trigger") {
            return responseWithLog("Not Found", 404, request, env);
        }
        if (request.headers.get("Authorization") !== `Bearer ${env.API_SECRET}`) {
            return responseWithLog("Unauthorized", 401, request, env);
        }
        const idempotencyKey = request.headers.get("x-idempotency-key");
        if (idempotencyKey) {
            if (idempotencyCache.has(idempotencyKey)) {
                return responseWithLog("Conflict: Duplicate request", 409, request, env);
            }
            idempotencyCache.add(idempotencyKey);
            // Basic cleanup for memory leak in cache (in a real edge worker, this is per-isolate)
            if (idempotencyCache.size > 1000) {
                const first = idempotencyCache.values().next().value;
                if (first)
                    idempotencyCache.delete(first);
            }
        }
        const clonedRequest = request.clone();
        let rawBody = "";
        try {
            rawBody = await clonedRequest.text();
        }
        catch {
            return responseWithLog("Bad Request: Could not read body", 400, request, env);
        }
        if (env.WEBHOOK_SECRET) {
            const signatureHex = request.headers.get("X-Signature-256");
            if (!signatureHex || !(await verifySignature(env.WEBHOOK_SECRET, signatureHex, rawBody))) {
                return responseWithLog("Unauthorized: Invalid signature", 401, request, env);
            }
        }
        let payload;
        try {
            payload = JSON.parse(rawBody);
        }
        catch {
            return responseWithLog("Bad Request: Invalid JSON", 400, request, env);
        }
        if (!payload.campaign_id) {
            return responseWithLog("Bad Request: Missing campaign_id", 400, request, env);
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
            return responseWithLog("Internal Server Error: Failed to fetch campaign", 500, request, env);
        }
        const campaigns = await campaignResponse.json();
        const campaign = campaigns[0];
        if (!campaign) {
            return responseWithLog("Not Found: Campaign not found", 404, request, env);
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
                keywords: payload.keywords || (typeof campaign.keywords === "string" ? campaign.keywords : undefined),
                is_software: campaign.is_software === true,
            })),
        });
        if (roundupsResponse.status !== 202) {
            return responseWithLog(JSON.stringify({ status: "Roundups request failed", external_status: roundupsResponse.status }), 502, request, env, "application/json");
        }
        const roundupsResult = await roundupsResponse.json();
        if (!roundupsResult.id) {
            return responseWithLog("Bad Gateway: Roundups response did not include a job ID", 502, request, env);
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
            return responseWithLog("Internal Server Error: Failed to write audit log", 500, request, env);
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
                        // Example mapping to the temporal rest endpoint assuming campaign_id and roundups_job_id are arguments
                        campaign_id: payload.campaign_id,
                        roundups_job_id: roundupsResult.id,
                    }),
                });
                if (!temporalResponse.ok) {
                    console.error(`Failed to trigger Temporal workflow: ${temporalResponse.status} ${temporalResponse.statusText}`);
                }
                else {
                    console.log(`Temporal workflow triggered successfully for job: ${roundupsResult.id}`);
                }
            }
            catch (e) {
                console.error("Exception caught while triggering Temporal workflow:", e);
            }
        })());
        return responseWithLog(JSON.stringify({ status: "accepted", roundups_job_id: roundupsResult.id }), 202, request, env, "application/json");
    },
};
