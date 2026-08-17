# AXiM Roundups Bridge

Vite dashboard and Cloudflare Worker gateway for Roundups workflow monitoring.

## Cloudflare Worker setup

The Worker is configured as `roundups-edge-worker`. After its first deployment, open **Workers & Pages** in the Cloudflare dashboard, select the Worker, and add these production secrets under **Settings > Variables and Secrets**:

| Binding | Purpose |
| --- | --- |
| `API_SECRET` | Bearer token required by the trigger endpoint. Keep server-side only. |
| `ROUNDUPS_API_KEY` | Credential for the Roundups API. |
| `ROUNDUPS_API_URL` | Roundups API endpoint that creates a job. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key. Keep server-side only. |
| `SUPABASE_URL` | Supabase project URL. |

Add `ALLOWED_ORIGIN` as a plain-text variable after the Pages hostname is known. Set it to the exact dashboard origin, for example `https://axim-roundups-bridge.pages.dev`.

The trigger endpoint is `POST /api/v1/roundups/trigger` and expects:

```json
{ "campaign_id": "campaign-id" }
```

It requires `Authorization: Bearer <API_SECRET>`. Do not expose this token or the service-role key in the browser application.

For local Worker development, copy `roundups-edge-worker/.dev.vars.example` to `roundups-edge-worker/.dev.vars` and supply the same values. The real file is ignored by Git.

## Cloudflare Pages setup

Create a Pages project with build command `npm run build` and output directory `dist`. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Pages build variables, then redeploy. Only the Supabase URL and anon key belong in browser build variables; never add the Worker or Supabase service secrets with a `VITE_` prefix.
